"""
Inception Engine - Connection Pool Manager

Async connection pooling for database and Redis connections.
Provides managed pools with health checks, automatic reconnection,
and configurable limits for production scaling.

HELIX DELTA - Phase 1: Backend Performance Infrastructure
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PoolConfig:
    """Configuration for connection pools."""
    # Database pool settings
    db_url: str = "postgresql+asyncpg://localhost/inception_engine"
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 3600
    db_echo: bool = False

    # Redis pool settings
    redis_url: str = "redis://localhost:6379/0"
    redis_max_connections: int = 50
    redis_decode_responses: bool = True
    redis_socket_timeout: float = 5.0
    redis_retry_on_timeout: bool = True

    # Health check settings
    health_check_interval: int = 30
    connection_max_age: int = 3600


@dataclass
class PoolMetrics:
    """Track pool performance metrics."""
    total_connections_created: int = 0
    total_connections_closed: int = 0
    active_connections: int = 0
    pool_hits: int = 0
    pool_misses: int = 0
    errors: int = 0
    avg_checkout_time_ms: float = 0.0
    _checkout_times: list = field(default_factory=list)

    def record_checkout(self, duration_ms: float):
        """Record a connection checkout time."""
        self._checkout_times.append(duration_ms)
        if len(self._checkout_times) > 1000:
            self._checkout_times = self._checkout_times[-500:]
        self.avg_checkout_time_ms = sum(self._checkout_times) / len(self._checkout_times)

    def to_dict(self) -> Dict[str, Any]:
        """Export metrics as dictionary."""
        return {
            "total_created": self.total_connections_created,
            "total_closed": self.total_connections_closed,
            "active": self.active_connections,
            "pool_hits": self.pool_hits,
            "pool_misses": self.pool_misses,
            "errors": self.errors,
            "avg_checkout_ms": round(self.avg_checkout_time_ms, 2)
        }


class DatabasePool:
    """
    Async database connection pool using SQLAlchemy async engine.

    Features:
    - Configurable pool size with overflow
    - Automatic connection recycling
    - Health check support
    - Connection checkout metrics
    """

    def __init__(self, config: PoolConfig):
        self.config = config
        self.engine = None
        self.session_factory = None
        self.metrics = PoolMetrics()
        self._initialized = False

    async def initialize(self):
        """Initialize the async database engine and session factory."""
        if self._initialized:
            return
        try:
            from sqlalchemy.ext.asyncio import (
                create_async_engine,
                AsyncSession,
                async_sessionmaker
            )
            self.engine = create_async_engine(
                self.config.db_url,
                pool_size=self.config.db_pool_size,
                max_overflow=self.config.db_max_overflow,
                pool_timeout=self.config.db_pool_timeout,
                pool_recycle=self.config.db_pool_recycle,
                echo=self.config.db_echo,
                pool_pre_ping=True,
            )
            self.session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            self._initialized = True
            self.metrics.total_connections_created += 1
            logger.info(
                f"Database pool initialized: "
                f"size={self.config.db_pool_size}, "
                f"overflow={self.config.db_max_overflow}"
            )
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Failed to initialize database pool: {e}")
            raise

    @asynccontextmanager
    async def get_session(self):
        """Get an async database session from the pool."""
        if not self._initialized:
            await self.initialize()
        start = time.monotonic()
        session = self.session_factory()
        checkout_ms = (time.monotonic() - start) * 1000
        self.metrics.record_checkout(checkout_ms)
        self.metrics.active_connections += 1
        self.metrics.pool_hits += 1
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            self.metrics.errors += 1
            raise
        finally:
            await session.close()
            self.metrics.active_connections -= 1

    async def health_check(self) -> Dict[str, Any]:
        """Run a health check on the database pool."""
        try:
            from sqlalchemy import text
            async with self.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                result.scalar()
            return {
                "status": "healthy",
                "pool_size": self.config.db_pool_size,
                "active": self.metrics.active_connections,
                "metrics": self.metrics.to_dict()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "metrics": self.metrics.to_dict()
            }

    async def close(self):
        """Close the database pool."""
        if self.engine:
            await self.engine.dispose()
            self._initialized = False
            self.metrics.total_connections_closed += 1
            logger.info("Database pool closed")


class RedisPool:
    """
    Async Redis connection pool using redis[hiredis].

    Features:
    - High-performance hiredis parser
    - Configurable connection limits
    - Automatic reconnection with retry
    - Health monitoring
    """

    def __init__(self, config: PoolConfig):
        self.config = config
        self.pool = None
        self.metrics = PoolMetrics()
        self._initialized = False

    async def initialize(self):
        """Initialize the Redis connection pool."""
        if self._initialized:
            return
        try:
            import redis.asyncio as aioredis
            self.pool = aioredis.ConnectionPool.from_url(
                self.config.redis_url,
                max_connections=self.config.redis_max_connections,
                decode_responses=self.config.redis_decode_responses,
                socket_timeout=self.config.redis_socket_timeout,
                retry_on_timeout=self.config.redis_retry_on_timeout,
            )
            self._initialized = True
            self.metrics.total_connections_created += 1
            logger.info(
                f"Redis pool initialized: "
                f"max_connections={self.config.redis_max_connections}"
            )
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Failed to initialize Redis pool: {e}")
            raise

    @asynccontextmanager
    async def get_client(self):
        """Get an async Redis client from the pool."""
        if not self._initialized:
            await self.initialize()
        import redis.asyncio as aioredis
        start = time.monotonic()
        client = aioredis.Redis(connection_pool=self.pool)
        checkout_ms = (time.monotonic() - start) * 1000
        self.metrics.record_checkout(checkout_ms)
        self.metrics.active_connections += 1
        self.metrics.pool_hits += 1
        try:
            yield client
        except Exception:
            self.metrics.errors += 1
            raise
        finally:
            await client.close()
            self.metrics.active_connections -= 1

    async def health_check(self) -> Dict[str, Any]:
        """Run a health check on the Redis pool."""
        try:
            async with self.get_client() as client:
                await client.ping()
                info = await client.info("memory")
            return {
                "status": "healthy",
                "max_connections": self.config.redis_max_connections,
                "active": self.metrics.active_connections,
                "memory_used": info.get("used_memory_human", "unknown"),
                "metrics": self.metrics.to_dict()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "metrics": self.metrics.to_dict()
            }

    async def close(self):
        """Close the Redis pool."""
        if self.pool:
            await self.pool.disconnect()
            self._initialized = False
            self.metrics.total_connections_closed += 1
            logger.info("Redis pool closed")


class ConnectionManager:
    """
    Unified connection manager for all pool types.
    Designed for FastAPI lifespan integration.
    """

    def __init__(self, config: Optional[PoolConfig] = None):
        self.config = config or PoolConfig()
        self.db = DatabasePool(self.config)
        self.redis = RedisPool(self.config)
        self._running = False

    async def __aenter__(self):
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def initialize(self):
        """Initialize all connection pools."""
        logger.info("Initializing connection pools...")
        await asyncio.gather(
            self.db.initialize(),
            self.redis.initialize(),
            return_exceptions=True
        )
        self._running = True
        logger.info("All connection pools initialized")

    async def close(self):
        """Close all connection pools."""
        logger.info("Closing connection pools...")
        await asyncio.gather(
            self.db.close(),
            self.redis.close(),
            return_exceptions=True
        )
        self._running = False
        logger.info("All connection pools closed")

    @asynccontextmanager
    async def db_session(self):
        """Get a database session."""
        async with self.db.get_session() as session:
            yield session

    @asynccontextmanager
    async def redis_client(self):
        """Get a Redis client."""
        async with self.redis.get_client() as client:
            yield client

    async def health_check(self) -> Dict[str, Any]:
        """Run health checks on all pools."""
        db_health, redis_health = await asyncio.gather(
            self.db.health_check(),
            self.redis.health_check(),
            return_exceptions=True
        )
        if isinstance(db_health, Exception):
            db_health = {"status": "error", "error": str(db_health)}
        if isinstance(redis_health, Exception):
            redis_health = {"status": "error", "error": str(redis_health)}
        overall = "healthy" if (
            db_health.get("status") == "healthy" and
            redis_health.get("status") == "healthy"
        ) else "degraded"
        return {
            "status": overall,
            "database": db_health,
            "redis": redis_health,
            "running": self._running
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Get metrics from all pools."""
        return {
            "database": self.db.metrics.to_dict(),
            "redis": self.redis.metrics.to_dict()
        }
