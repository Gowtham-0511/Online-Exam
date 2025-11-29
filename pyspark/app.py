from flask import Flask, request, jsonify, g
from flask_cors import CORS
import traceback
import sys
import os
import redis
import logging
from pyspark.sql import SparkSession

# Import security modules
from code_validator import validate_code
from security_middleware import (
    init_security_middleware, 
    rate_limit_middleware, 
    validate_request_schema,
    PySparkRequest
)
from secure_executor import create_secure_executor
from cache_manager import create_cache_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize Redis
redis_host = os.environ.get('REDIS_HOST', 'redis')
redis_port = int(os.environ.get('REDIS_PORT', 6379))
redis_client = redis.Redis(
    host=redis_host, 
    port=redis_port, 
    decode_responses=True
)

# Initialize security middleware
rate_limiter = init_security_middleware(
    app, 
    redis_client,
    requests_per_minute=int(os.environ.get('RATE_LIMIT_PER_MINUTE', 10)),
    requests_per_hour=int(os.environ.get('RATE_LIMIT_PER_HOUR', 100))
)

# Initialize Cache Manager
cache_manager = create_cache_manager(redis_client)

# Initialize Spark Session (reuse across requests)
spark = None
secure_executor = None

def get_spark_session():
    global spark, secure_executor
    if spark is None:
        # Optimized configuration for single-container execution
        spark = SparkSession.builder \
            .appName("DatabricksExecutor") \
            .master("local[*]") \
            .config("spark.driver.memory", "512m") \
            .config("spark.executor.memory", "512m") \
            .config("spark.sql.shuffle.partitions", "4") \
            .config("spark.default.parallelism", "2") \
            .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
            .config("spark.driver.bindAddress", "127.0.0.1") \
            .getOrCreate()
        
        # Set log level to ERROR to reduce noise
        spark.sparkContext.setLogLevel("ERROR")
        
        # Create secure executor
        secure_executor = create_secure_executor(
            spark,
            max_memory_mb=int(os.environ.get('MAX_MEMORY_MB', 512)),
            enable_timeout=True
        )
    
    return spark, secure_executor


@app.route("/run-pyspark", methods=["POST"])
@rate_limit_middleware(rate_limiter)
@validate_request_schema(PySparkRequest)
def run_pyspark():
    """Execute PySpark code with security validation and caching"""
    try:
        # Get validated data from middleware
        validated_data = g.validated_data
        code = validated_data.code
        inputs = validated_data.inputs
        timeout = validated_data.timeout
        
        # Step 1: Check Cache
        cached_result = cache_manager.get(code, inputs)
        if cached_result:
            logger.info("Cache HIT for code execution")
            response = jsonify(cached_result)
            response.headers['X-Cache'] = 'HIT'
            return response, 200
        
        # Step 2: Validate code for security violations
        is_valid, violations = validate_code(code, strict_mode=True)
        
        if not is_valid:
            return jsonify({
                "success": False,
                "error": "Security validation failed",
                "violations": violations,
                "message": "Your code contains security violations. Please review and fix them."
            }), 400
        
        # Step 3: Get Spark session and secure executor
        spark_session, executor = get_spark_session()
        
        # Step 4: Execute code in secure environment
        result = executor.execute_safe(code, inputs, timeout)
        
        # Step 5: Cache Result (if successful)
        if result['success']:
            cache_manager.set(code, inputs, result)
            
            # Update stats
            try:
                redis_client.hincrby('exam:stats:pyspark', 'completed', 1)
            except:
                pass
        else:
            try:
                redis_client.hincrby('exam:stats:pyspark', 'failed', 1)
            except:
                pass
        
        response = jsonify(result)
        response.headers['X-Cache'] = 'MISS'
        return response, 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Flask error: {error_trace}", file=sys.stderr)
        
        # Don't expose stack traces in production
        if os.environ.get('FLASK_ENV') == 'production':
            return jsonify({
                "success": False,
                "error": "An unexpected error occurred",
                "output": ""
            }), 500
        else:
            return jsonify({
                "success": False,
                "error": f"Server error: {str(e)}",
                "output": "",
                "stderr": error_trace
            }), 500


@app.route("/health", methods=["GET"])
@app.route("/", methods=["GET"])
def health():
    """Health check endpoint"""
    try:
        # Test Spark session
        spark_session, _ = get_spark_session()
        version = spark_session.version
        
        return jsonify({
            "status": "healthy",
            "service": "PySpark/Databricks Executor (Secured)",
            "spark_version": version,
            "security_features": [
                "AST-based code validation",
                "Rate limiting",
                "Resource limits",
                "Sandboxed execution",
                "Result caching"
            ],
            "message": "PySpark Executor is running 🚀🔒⚡"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "PySpark/Databricks Executor",
            "error": str(e),
            "message": "PySpark Executor failed to start"
        }), 500


@app.route("/spark-info", methods=["GET"])
def spark_info():
    """Get Spark session information"""
    try:
        spark_session, _ = get_spark_session()
        
        return jsonify({
            "spark_version": spark_session.version,
            "master": spark_session.sparkContext.master,
            "app_name": spark_session.sparkContext.appName,
            "default_parallelism": spark_session.sparkContext.defaultParallelism,
            "config": {
                "driver_memory": spark_session.conf.get("spark.driver.memory"),
                "shuffle_partitions": spark_session.conf.get("spark.sql.shuffle.partitions"),
                "arrow_enabled": spark_session.conf.get("spark.sql.execution.arrow.pyspark.enabled")
            }
        }), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/rate-limit-status", methods=["GET"])
def rate_limit_status():
    """Get current rate limit status for the client"""
    try:
        status = rate_limiter.get_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/security-info", methods=["GET"])
def security_info():
    """Get information about security features"""
    from code_validator import CodeValidator
    
    return jsonify({
        "security_features": {
            "code_validation": {
                "enabled": True,
                "type": "AST-based analysis",
                "checks": [
                    "Dangerous function calls",
                    "Unauthorized module imports",
                    "File operations",
                    "Network operations",
                    "Code complexity limits"
                ]
            },
            "rate_limiting": {
                "enabled": True,
                "limits": {
                    "per_minute": rate_limiter.requests_per_minute,
                    "per_hour": rate_limiter.requests_per_hour
                }
            },
            "resource_limits": {
                "max_memory_mb": int(os.environ.get('MAX_MEMORY_MB', 512)),
                "default_timeout_seconds": 15,
                "max_timeout_seconds": 60
            },
            "caching": {
                "enabled": True,
                "ttl_seconds": 3600
            },
            "allowed_modules": list(CodeValidator.ALLOWED_MODULES),
            "dangerous_operations": {
                "blocked_builtins": list(CodeValidator.DANGEROUS_BUILTINS),
                "blocked_modules": list(CodeValidator.DANGEROUS_MODULES)
            }
        }
    }), 200


@app.errorhandler(Exception)
def handle_exception(e):
    """Global exception handler"""
    error_trace = traceback.format_exc()
    print(f"Unhandled exception: {error_trace}", file=sys.stderr)
    
    # Don't expose details in production
    if os.environ.get('FLASK_ENV') == 'production':
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred"
        }), 500
    else:
        return jsonify({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "traceback": error_trace
        }), 500


if __name__ == "__main__":
    # Initialize Spark on startup
    try:
        get_spark_session()
        print("✓ Spark session initialized successfully")
        print("✓ Security features enabled")
        print("✓ Result caching enabled")
        print(f"✓ Rate limiting: {rate_limiter.requests_per_minute}/min, {rate_limiter.requests_per_hour}/hour")
    except Exception as e:
        print(f"✗ Failed to initialize Spark: {e}")
        sys.exit(1)
    
    app.run(
        host="0.0.0.0",
        port=5005,
        threaded=True,
        debug=False
    )