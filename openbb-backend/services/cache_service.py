import json
import redis
from typing import Optional, Any
from datetime import timedelta
from config import settings

class CacheService:
    def __init__(self):
        self.redis_client = None
        
        # Use AWS ElastiCache if configured, otherwise fall back to local Redis
        redis_url = settings.REDIS_URL
        if settings.AWS_REDIS_HOST:
            redis_url = f"redis://{settings.AWS_REDIS_HOST}:{settings.AWS_REDIS_PORT}"
        
        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True
            )
            self.redis_client.ping()
            print(f"Connected to Redis at: {redis_url}")
        except Exception as e:
            print(f"Redis connection failed: {e}. Caching disabled.")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
            
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache with optional TTL"""
        if not self.redis_client:
            return False
            
        try:
            ttl = ttl or settings.CACHE_TTL
            self.redis_client.setex(
                key,
                timedelta(seconds=ttl),
                json.dumps(value)
            )
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
        return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis_client:
            return False
            
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
        return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        if not self.redis_client:
            return 0
            
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
        return 0

# Global cache service instance
cache_service = CacheService()