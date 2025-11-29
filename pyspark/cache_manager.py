"""
Cache Manager Module for PySpark Service

Handles caching of execution results using Redis to improve performance
for repeated requests with identical code and inputs.
"""

import hashlib
import json
import os
import redis
from typing import Optional, Dict, Any

class CacheManager:
    """
    Manages caching of execution results.
    """
    
    def __init__(self, redis_client: redis.Redis, ttl_seconds: int = 3600):
        """
        Initialize cache manager.
        
        Args:
            redis_client: Redis client instance
            ttl_seconds: Time to live for cached results in seconds (default: 1 hour)
        """
        self.redis = redis_client
        self.ttl = ttl_seconds
        self.prefix = "pyspark:cache:"
        
    def _generate_key(self, code: str, inputs: Optional[Any] = None) -> str:
        """
        Generate a unique cache key based on code and inputs.
        
        Args:
            code: The PySpark code
            inputs: Optional inputs provided to the code
            
        Returns:
            Cache key string
        """
        # Create a dictionary to hash
        data = {
            "code": code,
            "inputs": inputs
        }
        
        # Serialize to JSON with sorted keys for consistency
        serialized = json.dumps(data, sort_keys=True)
        
        # Generate SHA-256 hash
        hash_obj = hashlib.sha256(serialized.encode('utf-8'))
        return f"{self.prefix}{hash_obj.hexdigest()}"
        
    def get(self, code: str, inputs: Optional[Any] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached result if available.
        
        Args:
            code: The PySpark code
            inputs: Optional inputs
            
        Returns:
            Cached result dictionary or None if not found
        """
        try:
            key = self._generate_key(code, inputs)
            cached_data = self.redis.get(key)
            
            if cached_data:
                return json.loads(cached_data)
            return None
            
        except Exception as e:
            # Fail silently on cache errors to avoid disrupting execution
            print(f"Cache get error: {e}")
            return None
            
    def set(self, code: str, inputs: Optional[Any], result: Dict[str, Any]) -> None:
        """
        Store execution result in cache.
        
        Args:
            code: The PySpark code
            inputs: Optional inputs
            result: Execution result to cache
        """
        try:
            # Only cache successful executions
            if not result.get('success', False):
                return
                
            key = self._generate_key(code, inputs)
            
            # Store in Redis with TTL
            self.redis.setex(
                key,
                self.ttl,
                json.dumps(result)
            )
            
        except Exception as e:
            print(f"Cache set error: {e}")

def create_cache_manager(redis_client: redis.Redis) -> CacheManager:
    """
    Factory function to create CacheManager.
    """
    return CacheManager(redis_client)
