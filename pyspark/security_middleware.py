"""
Security Middleware Module for PySpark Execution Service

Provides rate limiting, request validation, and security headers
for the Flask application.
"""

from flask import Flask, request, jsonify, g
from functools import wraps
from typing import Optional, Callable, Any
from datetime import datetime, timedelta
import time
import hashlib
from redis import Redis
from pydantic import BaseModel, Field, ValidationError, validator


class PySparkRequest(BaseModel):
    """Request schema for PySpark code execution"""
    code: str = Field(..., min_length=1, max_length=100000, description="Python/PySpark code to execute")
    inputs: Optional[Any] = Field(None, description="Optional test inputs")
    timeout: int = Field(15, ge=1, le=60, description="Execution timeout in seconds")
    
    @validator('code')
    def code_must_not_be_empty(cls, v):
        if not v or v.strip() == '':
            raise ValueError('Code cannot be empty')
        return v
    
    @validator('timeout')
    def timeout_must_be_reasonable(cls, v):
        if v < 1 or v > 60:
            raise ValueError('Timeout must be between 1 and 60 seconds')
        return v


class RateLimiter:
    """
    Redis-based rate limiter for API endpoints.
    """
    
    def __init__(self, redis_client: Redis, requests_per_minute: int = 10, requests_per_hour: int = 100):
        """
        Initialize rate limiter.
        
        Args:
            redis_client: Redis connection
            requests_per_minute: Maximum requests per minute per IP
            requests_per_hour: Maximum requests per hour per IP
        """
        self.redis = redis_client
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
    
    def _get_client_identifier(self) -> str:
        """Get unique identifier for the client (IP address)"""
        # Try to get real IP from headers (in case behind proxy)
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip:
            # Take first IP if multiple are present
            ip = ip.split(',')[0].strip()
        else:
            ip = request.remote_addr or 'unknown'
        return ip
    
    def _get_rate_limit_key(self, identifier: str, window: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"ratelimit:{identifier}:{window}"
    
    def is_allowed(self) -> tuple[bool, dict]:
        """
        Check if request is allowed based on rate limits.
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        identifier = self._get_client_identifier()
        current_time = int(time.time())
        
        # Check minute window
        minute_key = self._get_rate_limit_key(identifier, f"minute:{current_time // 60}")
        minute_count = self.redis.incr(minute_key)
        
        if minute_count == 1:
            # Set expiry on first request in this window
            self.redis.expire(minute_key, 60)
        
        # Check hour window
        hour_key = self._get_rate_limit_key(identifier, f"hour:{current_time // 3600}")
        hour_count = self.redis.incr(hour_key)
        
        if hour_count == 1:
            # Set expiry on first request in this window
            self.redis.expire(hour_key, 3600)
        
        # Determine if allowed
        minute_allowed = minute_count <= self.requests_per_minute
        hour_allowed = hour_count <= self.requests_per_hour
        is_allowed = minute_allowed and hour_allowed
        
        # Calculate retry after time
        retry_after = 0
        if not minute_allowed:
            retry_after = 60 - (current_time % 60)
        elif not hour_allowed:
            retry_after = 3600 - (current_time % 3600)
        
        rate_limit_info = {
            'limit_minute': self.requests_per_minute,
            'limit_hour': self.requests_per_hour,
            'remaining_minute': max(0, self.requests_per_minute - minute_count),
            'remaining_hour': max(0, self.requests_per_hour - hour_count),
            'reset_minute': 60 - (current_time % 60),
            'reset_hour': 3600 - (current_time % 3600),
            'retry_after': retry_after,
        }
        
        return is_allowed, rate_limit_info
    
    def get_status(self) -> dict:
        """Get current rate limit status for the client"""
        identifier = self._get_client_identifier()
        current_time = int(time.time())
        
        minute_key = self._get_rate_limit_key(identifier, f"minute:{current_time // 60}")
        hour_key = self._get_rate_limit_key(identifier, f"hour:{current_time // 3600}")
        
        try:
            minute_count = int(self.redis.get(minute_key) or 0)
            hour_count = int(self.redis.get(hour_key) or 0)
        except:
            minute_count = 0
            hour_count = 0
        
        return {
            'identifier': identifier,
            'limit_minute': self.requests_per_minute,
            'limit_hour': self.requests_per_hour,
            'used_minute': minute_count,
            'used_hour': hour_count,
            'remaining_minute': max(0, self.requests_per_minute - minute_count),
            'remaining_hour': max(0, self.requests_per_hour - hour_count),
            'reset_minute': 60 - (current_time % 60),
            'reset_hour': 3600 - (current_time % 3600),
        }


def rate_limit_middleware(rate_limiter: RateLimiter):
    """
    Decorator to apply rate limiting to Flask routes.
    
    Args:
        rate_limiter: RateLimiter instance
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                is_allowed, rate_info = rate_limiter.is_allowed()
                
                # Add rate limit headers to response
                g.rate_limit_info = rate_info
                
                if not is_allowed:
                    return jsonify({
                        'success': False,
                        'error': 'Rate limit exceeded',
                        'message': f"Too many requests. Please try again in {rate_info['retry_after']} seconds.",
                        'rate_limit': rate_info
                    }), 429
                
                # Call the actual route handler
                response = f(*args, **kwargs)
                
                # Add rate limit headers to successful response
                if isinstance(response, tuple):
                    response_data, status_code = response
                else:
                    response_data = response
                    status_code = 200
                
                # Create response with headers
                if hasattr(response_data, 'headers'):
                    response_data.headers['X-RateLimit-Limit-Minute'] = str(rate_info['limit_minute'])
                    response_data.headers['X-RateLimit-Limit-Hour'] = str(rate_info['limit_hour'])
                    response_data.headers['X-RateLimit-Remaining-Minute'] = str(rate_info['remaining_minute'])
                    response_data.headers['X-RateLimit-Remaining-Hour'] = str(rate_info['remaining_hour'])
                    response_data.headers['X-RateLimit-Reset-Minute'] = str(rate_info['reset_minute'])
                    response_data.headers['X-RateLimit-Reset-Hour'] = str(rate_info['reset_hour'])
                
                return response_data, status_code
                
            except Exception as e:
                # If rate limiting fails, allow the request but log the error
                print(f"Rate limiting error: {e}")
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def validate_request_schema(schema_class: type[BaseModel]):
    """
    Decorator to validate request JSON against Pydantic schema.
    
    Args:
        schema_class: Pydantic model class for validation
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get JSON data
                data = request.get_json()
                if not data:
                    return jsonify({
                        'success': False,
                        'error': 'Invalid request',
                        'message': 'Request body must be valid JSON'
                    }), 400
                
                # Validate against schema
                try:
                    validated_data = schema_class(**data)
                    # Store validated data in Flask's g object
                    g.validated_data = validated_data
                except ValidationError as e:
                    errors = []
                    for error in e.errors():
                        field = ' -> '.join(str(x) for x in error['loc'])
                        errors.append(f"{field}: {error['msg']}")
                    
                    return jsonify({
                        'success': False,
                        'error': 'Validation error',
                        'message': 'Request data is invalid',
                        'details': errors
                    }), 400
                
                # Call the actual route handler
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': 'Request validation failed',
                    'message': str(e)
                }), 400
        
        return decorated_function
    return decorator


def add_security_headers(app: Flask):
    """
    Add security headers to all responses.
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def set_security_headers(response):
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Content Security Policy
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        
        # Referrer policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Remove server header
        response.headers.pop('Server', None)
        
        return response


def log_request(app: Flask):
    """
    Log all incoming requests for audit trail.
    
    Args:
        app: Flask application instance
    """
    @app.before_request
    def log_request_info():
        # Generate request ID
        request_id = hashlib.md5(
            f"{request.remote_addr}{time.time()}".encode()
        ).hexdigest()[:12]
        
        g.request_id = request_id
        g.request_start_time = time.time()
        
        # Log request details (sanitized)
        log_data = {
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat(),
            'method': request.method,
            'path': request.path,
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown')[:100],
        }
        
        print(f"[REQUEST] {log_data}")
    
    @app.after_request
    def log_response_info(response):
        if hasattr(g, 'request_start_time'):
            duration = time.time() - g.request_start_time
            
            log_data = {
                'request_id': getattr(g, 'request_id', 'unknown'),
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2),
            }
            
            print(f"[RESPONSE] {log_data}")
            
            # Add request ID to response headers
            response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
        
        return response


def init_security_middleware(app: Flask, redis_client: Redis, 
                            requests_per_minute: int = 10,
                            requests_per_hour: int = 100) -> RateLimiter:
    """
    Initialize all security middleware for the Flask app.
    
    Args:
        app: Flask application instance
        redis_client: Redis connection
        requests_per_minute: Rate limit per minute
        requests_per_hour: Rate limit per hour
        
    Returns:
        RateLimiter instance
    """
    # Add security headers
    add_security_headers(app)
    
    # Add request logging
    log_request(app)
    
    # Create and return rate limiter
    rate_limiter = RateLimiter(
        redis_client,
        requests_per_minute=requests_per_minute,
        requests_per_hour=requests_per_hour
    )
    
    return rate_limiter
