"""
Inception Engine - Deep Health Checks

Kubernetes-ready health, readiness, and liveness probes
with dependency checking for Redis, PostgreSQL, and Celery.

HELIX DELTA - Phase 4 & 5: Horizontal Scaling + Observability
"""

import asyncio
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Callable

logger = logging.getLogger(__name__)


class DependencyStatus(str, Enum):
    """Status of a dependency health check."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class DependencyHealth:
    """Health status of a single dependency."""
    name: str
    status: DependencyStatus = DependencyStatus.UNKNOWN
    latency_ms: float = 0.0
    message: str = ""
    last_checked: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemHealth:
    """Overall system health report."""
    status: DependencyStatus = DependencyStatus.HEALTHY
    version: str = "4.0.0"
    uptime_seconds: float = 0.0
    timestamp: str = ""
    dependencies: Dict[str, DependencyHealth] = field(default_factory=dict)
    checks_passed: int = 0
    checks_failed: int = 0


class HealthChecker:
    """
    Deep health check system with Kubernetes probe support.

    Supports three probe types:
    - /health/live  - Is the process alive? (liveness)
    - /health/ready - Can the service handle requests? (readiness)
    - /health       - Full dependency health report
    """

    def __init__(self):
        self._start_time = time.monotonic()
        self._checks: Dict[str, Callable] = {}
        self._last_results: Dict[str, DependencyHealth] = {}
        self._register_default_checks()

    def _register_default_checks(self):
        """Register built-in health checks."""
        self.register_check("system", self._check_system)

    def register_check(self, name: str, check_fn: Callable):
        """Register a new health check function."""
        self._checks[name] = check_fn

    async def _check_system(self) -> DependencyHealth:
        """Basic system health check."""
        import platform
        return DependencyHealth(
            name="system",
            status=DependencyStatus.HEALTHY,
            latency_ms=0.0,
            message="System operational",
            last_checked=datetime.utcnow().isoformat(),
            details={
                "python_version": platform.python_version(),
                "platform": platform.platform(),
            }
        )

    async def check_redis(self, redis_pool) -> DependencyHealth:
        """Check Redis connectivity and latency."""
        start = time.monotonic()
        try:
            if redis_pool is None:
                return DependencyHealth(
                    name="redis",
                    status=DependencyStatus.UNHEALTHY,
                    message="Redis pool not initialized",
                    last_checked=datetime.utcnow().isoformat()
                )
            pong = await redis_pool.ping()
            latency = (time.monotonic() - start) * 1000
            info = await redis_pool.info("memory")
            return DependencyHealth(
                name="redis",
                status=DependencyStatus.HEALTHY if pong else DependencyStatus.UNHEALTHY,
                latency_ms=round(latency, 2),
                message="Connected" if pong else "Ping failed",
                last_checked=datetime.utcnow().isoformat(),
                details={
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "connected_clients": info.get("connected_clients", 0),
                }
            )
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            return DependencyHealth(
                name="redis",
                status=DependencyStatus.UNHEALTHY,
                latency_ms=round(latency, 2),
                message=f"Connection failed: {str(e)}",
                last_checked=datetime.utcnow().isoformat()
            )

    async def check_database(self, db_pool) -> DependencyHealth:
        """Check PostgreSQL connectivity and latency."""
        start = time.monotonic()
        try:
            if db_pool is None:
                return DependencyHealth(
                    name="database",
                    status=DependencyStatus.UNHEALTHY,
                    message="Database pool not initialized",
                    last_checked=datetime.utcnow().isoformat()
                )
            async with db_pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                latency = (time.monotonic() - start) * 1000
                db_size = await conn.fetchval(
                    "SELECT pg_database_size(current_database())"
                )
                return DependencyHealth(
                    name="database",
                    status=DependencyStatus.HEALTHY,
                    latency_ms=round(latency, 2),
                    message="Connected",
                    last_checked=datetime.utcnow().isoformat(),
                    details={
                        "pool_size": db_pool.get_size(),
                        "pool_free": db_pool.get_idle_size(),
                        "db_size_bytes": db_size,
                    }
                )
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            return DependencyHealth(
                name="database",
                status=DependencyStatus.UNHEALTHY,
                latency_ms=round(latency, 2),
                message=f"Connection failed: {str(e)}",
                last_checked=datetime.utcnow().isoformat()
            )

    async def check_celery(self) -> DependencyHealth:
        """Check Celery worker availability."""
        start = time.monotonic()
        try:
            from celery import Celery
            app = Celery(broker="redis://localhost:6379/1")
            inspector = app.control.inspect(timeout=2.0)
            active = inspector.active()
            latency = (time.monotonic() - start) * 1000
            if active is not None:
                worker_count = len(active)
                return DependencyHealth(
                    name="celery",
                    status=DependencyStatus.HEALTHY if worker_count > 0 else DependencyStatus.DEGRADED,
                    latency_ms=round(latency, 2),
                    message=f"{worker_count} worker(s) active",
                    last_checked=datetime.utcnow().isoformat(),
                    details={"workers": worker_count}
                )
            return DependencyHealth(
                name="celery",
                status=DependencyStatus.DEGRADED,
                latency_ms=round(latency, 2),
                message="No workers responding",
                last_checked=datetime.utcnow().isoformat()
            )
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            return DependencyHealth(
                name="celery",
                status=DependencyStatus.UNHEALTHY,
                latency_ms=round(latency, 2),
                message=f"Check failed: {str(e)}",
                last_checked=datetime.utcnow().isoformat()
            )

    async def liveness_check(self) -> Dict[str, Any]:
        """Kubernetes liveness probe - is the process alive?"""
        return {
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": round(time.monotonic() - self._start_time, 2)
        }

    async def readiness_check(
        self, redis_pool=None, db_pool=None
    ) -> Dict[str, Any]:
        """Kubernetes readiness probe - can the service accept traffic?"""
        checks = []
        if redis_pool:
            checks.append(await self.check_redis(redis_pool))
        if db_pool:
            checks.append(await self.check_database(db_pool))

        all_healthy = all(
            c.status in (DependencyStatus.HEALTHY, DependencyStatus.DEGRADED)
            for c in checks
        )
        return {
            "status": "ready" if all_healthy else "not_ready",
            "timestamp": datetime.utcnow().isoformat(),
            "dependencies": {
                c.name: c.status.value for c in checks
            }
        }

    async def full_health_check(
        self, redis_pool=None, db_pool=None
    ) -> SystemHealth:
        """Complete health check with all dependency details."""
        health = SystemHealth(
            version="4.0.0",
            uptime_seconds=round(time.monotonic() - self._start_time, 2),
            timestamp=datetime.utcnow().isoformat()
        )

        # Run registered custom checks
        for name, check_fn in self._checks.items():
            try:
                result = await check_fn()
                health.dependencies[name] = result
                if result.status == DependencyStatus.HEALTHY:
                    health.checks_passed += 1
                else:
                    health.checks_failed += 1
            except Exception as e:
                health.dependencies[name] = DependencyHealth(
                    name=name,
                    status=DependencyStatus.UNHEALTHY,
                    message=str(e),
                    last_checked=datetime.utcnow().isoformat()
                )
                health.checks_failed += 1

        # Check infrastructure dependencies
        if redis_pool:
            result = await self.check_redis(redis_pool)
            health.dependencies["redis"] = result
            if result.status == DependencyStatus.HEALTHY:
                health.checks_passed += 1
            else:
                health.checks_failed += 1

        if db_pool:
            result = await self.check_database(db_pool)
            health.dependencies["database"] = result
            if result.status == DependencyStatus.HEALTHY:
                health.checks_passed += 1
            else:
                health.checks_failed += 1

        # Determine overall status
        if health.checks_failed == 0:
            health.status = DependencyStatus.HEALTHY
        elif health.checks_passed > 0:
            health.status = DependencyStatus.DEGRADED
        else:
            health.status = DependencyStatus.UNHEALTHY

        return health

    def to_dict(self, health: SystemHealth) -> Dict[str, Any]:
        """Convert SystemHealth to JSON-serializable dict."""
        return {
            "status": health.status.value,
            "version": health.version,
            "uptime_seconds": health.uptime_seconds,
            "timestamp": health.timestamp,
            "checks": {
                "passed": health.checks_passed,
                "failed": health.checks_failed,
                "total": health.checks_passed + health.checks_failed
            },
            "dependencies": {
                name: {
                    "status": dep.status.value,
                    "latency_ms": dep.latency_ms,
                    "message": dep.message,
                    "last_checked": dep.last_checked,
                    "details": dep.details
                }
                for name, dep in health.dependencies.items()
            }
        }
