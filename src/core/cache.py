"""
Inception Engine - Cache Manager

Multi-layer caching with Redis backend for high-performance
response caching, session storage, and result memoization.

HELIX DELTA - Phase 1: Backend Performance Infrastructure
"""
import hashlib
import json
import logging
import time
from typing import Optional, Dict, Any, Callable
from functools import wraps
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """Cache configuration."""
    default_ttl: int = 300
    max_ttl: int = 3600
    key_prefix: str = "inception:"
    enable_compression: bool = True
    compression_threshold: int = 1024
    enable_metrics: bool = True


@dataclass
class CacheMetrics:
    """Track cache performance."""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    avg_hit_time_ms: float = 0.0
    _hit_times: list = field(default_factory=list)

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0

    def record_hit(self, duration_ms: float):
        self._hit_times.append(duration_ms)
        if len(self._hit_times) > 1000:
            self._hit_times = self._hit_times[-500:]
        self.avg_hit_time_ms = sum(self._hit_times) / len(self._hit_times)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "deletes": self.deletes,
            "errors": self.errors,
            "hit_rate": round(self.hit_rate, 2),
            "avg_hit_ms": round(self.avg_hit_time_ms, 2)
        }


class CacheManager:
    """
    Async Redis cache manager for Inception Engine.

    Features:
    - Key-prefix namespacing to avoid collisions
    - TTL management with configurable defaults
    - JSON serialization for complex objects
    - Optional brotli compression for large values
    - Cache invalidation patterns (single, prefix, all)
    - Performance metrics tracking
    - Decorator for automatic function result caching
    """

    def __init__(self, redis_pool, config: Optional[CacheConfig] = None):
        self.redis_pool = redis_pool
        self.config = config or CacheConfig()
        self.metrics = CacheMetrics()

    def _make_key(self, key: str) -> str:
        """Create a namespaced cache key."""
        return f"{self.config.key_prefix}{key}"

    def _hash_key(self, *args, **kwargs) -> str:
        """Generate a deterministic hash key from arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.sha256(key_data.encode()).hexdigest()[:16]

    def _serialize(self, value: Any) -> str:
        """Serialize a value for storage."""
        serialized = json.dumps(value, default=str)
        if (self.config.enable_compression and
                len(serialized) > self.config.compression_threshold):
            try:
                import brotli
                compressed = brotli.compress(serialized.encode())
                return json.dumps({"__compressed__": True, "data": compressed.hex()})
            except ImportError:
                pass
        return serialized

    def _deserialize(self, raw: str) -> Any:
        """Deserialize a stored value."""
        data = json.loads(raw)
        if isinstance(data, dict) and data.get("__compressed__"):
            try:
                import brotli
                decompressed = brotli.decompress(bytes.fromhex(data["data"]))
                return json.loads(decompressed)
            except ImportError:
                logger.warning("brotli not available for decompression")
                return None
        return data

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        full_key = self._make_key(key)
        start = time.monotonic()
        try:
            async with self.redis_pool.get_client() as client:
                raw = await client.get(full_key)
            if raw is None:
                self.metrics.misses += 1
                return None
            duration_ms = (time.monotonic() - start) * 1000
            self.metrics.hits += 1
            self.metrics.record_hit(duration_ms)
            return self._deserialize(raw)
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache get error for {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set a value in cache with optional TTL."""
        full_key = self._make_key(key)
        ttl = min(ttl or self.config.default_ttl, self.config.max_ttl)
        try:
            serialized = self._serialize(value)
            async with self.redis_pool.get_client() as client:
                await client.setex(full_key, ttl, serialized)
            self.metrics.sets += 1
            return True
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache set error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        full_key = self._make_key(key)
        try:
            async with self.redis_pool.get_client() as client:
                await client.delete(full_key)
            self.metrics.deletes += 1
            return True
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache delete error for {key}: {e}")
            return False

    async def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching a prefix pattern."""
        pattern = self._make_key(f"{prefix}*")
        count = 0
        try:
            async with self.redis_pool.get_client() as client:
                async for key in client.scan_iter(match=pattern, count=100):
                    await client.delete(key)
                    count += 1
            self.metrics.deletes += count
            logger.info(f"Invalidated {count} keys with prefix: {prefix}")
            return count
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache invalidate_prefix error: {e}")
            return 0

    async def flush_all(self) -> bool:
        """Flush all keys in the cache namespace."""
        return await self.invalidate_prefix("") > 0

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        full_key = self._make_key(key)
        try:
            async with self.redis_pool.get_client() as client:
                return await client.exists(full_key) > 0
        except Exception as e:
            self.metrics.errors += 1
            return False

    async def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key."""
        full_key = self._make_key(key)
        try:
            async with self.redis_pool.get_client() as client:
                return await client.ttl(full_key)
        except Exception as e:
            self.metrics.errors += 1
            return -1

    def cached(self, ttl: Optional[int] = None, key_prefix: str = "fn"):
        """
        Decorator to cache function results.

        Usage:
            @cache_manager.cached(ttl=60, key_prefix="workflow")
            async def get_workflow_result(workflow_id: str):
                ...
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                cache_key = f"{key_prefix}:{func.__name__}:{self._hash_key(*args, **kwargs)}"
                cached_result = await self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl=ttl)
                return result
            return wrapper
        return decorator

    def get_metrics(self) -> Dict[str, Any]:
        """Get cache metrics."""
        return self.metrics.to_dict()


class SessionCache:
    """
    Specialized cache for orchestrator session data.
    Provides typed access for mode sessions and workflow state.
    """

    def __init__(self, cache: CacheManager):
        self.cache = cache
        self._prefix = "session"

    async def store_session(self, session_id: str, data: Dict[str, Any],
                            ttl: int = 1800) -> bool:
        return await self.cache.set(f"{self._prefix}:{session_id}", data, ttl=ttl)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return await self.cache.get(f"{self._prefix}:{session_id}")

    async def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        existing = await self.get_session(session_id)
        if existing is None:
            return False
        existing.update(updates)
        return await self.store_session(session_id, existing)

    async def delete_session(self, session_id: str) -> bool:
        return await self.cache.delete(f"{self._prefix}:{session_id}")

    async def list_active_sessions(self) -> int:
        """Count active sessions."""
        try:
            async with self.cache.redis_pool.get_client() as client:
                count = 0
                pattern = self.cache._make_key(f"{self._prefix}:*")
                async for _ in client.scan_iter(match=pattern, count=100):
                    count += 1
                return count
        except Exception:
            return 0


class ResultCache:
    """
    Specialized cache for mode execution results.
    Stores workflow outputs for quick retrieval.
    """

    def __init__(self, cache: CacheManager):
        self.cache = cache
        self._prefix = "result"

    async def store_result(self, mode: str, session_id: str,
                           result: Dict[str, Any], ttl: int = 3600) -> bool:
        key = f"{self._prefix}:{mode}:{session_id}"
        return await self.cache.set(key, result, ttl=ttl)

    async def get_result(self, mode: str, session_id: str) -> Optional[Dict[str, Any]]:
        key = f"{self._prefix}:{mode}:{session_id}"
        return await self.cache.get(key)

    async def invalidate_mode_results(self, mode: str) -> int:
        return await self.cache.invalidate_prefix(f"{self._prefix}:{mode}")

    async def invalidate_session_results(self, session_id: str) -> int:
        count = 0
        for mode in ["ideate", "plan", "ship", "validate"]:
            if await self.cache.delete(f"{self._prefix}:{mode}:{session_id}"):
                count += 1
        return count
