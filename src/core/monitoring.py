"""
Inception Engine - Performance Monitoring

OpenTelemetry integration, Sentry error tracking, and custom
metrics collection for production observability.

HELIX DELTA - Phase 3: Error Tracking & Monitoring
"""
import logging
import time
import os
from typing import Optional, Dict, Any, Callable
from functools import wraps
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class MonitoringConfig:
    """Monitoring configuration."""
    sentry_dsn: str = ""
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = 0.1
    otel_service_name: str = "inception-engine"
    otel_endpoint: str = "http://localhost:4317"
    enable_sentry: bool = True
    enable_otel: bool = True
    enable_custom_metrics: bool = True
    slow_request_threshold_ms: float = 100.0


@dataclass
class RequestMetric:
    """Single request metric."""
    endpoint: str
    method: str
    status_code: int
    duration_ms: float
    timestamp: str
    error: Optional[str] = None


class MetricsCollector:
    """
    Collects and aggregates custom performance metrics.

    Tracks:
    - Request latencies per endpoint
    - Error rates
    - Mode execution times
    - Active sessions
    - Cache performance
    - Connection pool stats
    """

    def __init__(self, config: Optional[MonitoringConfig] = None):
        self.config = config or MonitoringConfig()
        self._request_metrics: list = []
        self._mode_timings: Dict[str, list] = {}
        self._error_counts: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._counters: Dict[str, int] = {}

    def record_request(self, metric: RequestMetric):
        """Record an API request metric."""
        self._request_metrics.append(metric)
        if len(self._request_metrics) > 10000:
            self._request_metrics = self._request_metrics[-5000:]
        if metric.error:
            key = f"{metric.endpoint}:{metric.status_code}"
            self._error_counts[key] = self._error_counts.get(key, 0) + 1

    def record_mode_timing(self, mode: str, duration_ms: float):
        """Record a mode execution timing."""
        if mode not in self._mode_timings:
            self._mode_timings[mode] = []
        self._mode_timings[mode].append(duration_ms)
        if len(self._mode_timings[mode]) > 1000:
            self._mode_timings[mode] = self._mode_timings[mode][-500:]

    def set_gauge(self, name: str, value: float):
        """Set a gauge metric."""
        self._gauges[name] = value

    def increment_counter(self, name: str, amount: int = 1):
        """Increment a counter metric."""
        self._counters[name] = self._counters.get(name, 0) + amount

    def get_request_stats(self) -> Dict[str, Any]:
        """Get aggregated request statistics."""
        if not self._request_metrics:
            return {"total_requests": 0}
        durations = [m.duration_ms for m in self._request_metrics]
        errors = [m for m in self._request_metrics if m.error]
        sorted_d = sorted(durations)
        p50 = sorted_d[len(sorted_d) // 2] if sorted_d else 0
        p95 = sorted_d[int(len(sorted_d) * 0.95)] if sorted_d else 0
        p99 = sorted_d[int(len(sorted_d) * 0.99)] if sorted_d else 0
        return {
            "total_requests": len(self._request_metrics),
            "error_count": len(errors),
            "error_rate": round(len(errors) / len(self._request_metrics) * 100, 2),
            "avg_latency_ms": round(sum(durations) / len(durations), 2),
            "p50_latency_ms": round(p50, 2),
            "p95_latency_ms": round(p95, 2),
            "p99_latency_ms": round(p99, 2),
            "slow_requests": len([d for d in durations
                                  if d > self.config.slow_request_threshold_ms])
        }

    def get_mode_stats(self) -> Dict[str, Any]:
        """Get mode execution statistics."""
        stats = {}
        for mode, timings in self._mode_timings.items():
            if timings:
                sorted_t = sorted(timings)
                stats[mode] = {
                    "count": len(timings),
                    "avg_ms": round(sum(timings) / len(timings), 2),
                    "p95_ms": round(sorted_t[int(len(sorted_t) * 0.95)], 2),
                    "max_ms": round(max(timings), 2)
                }
        return stats

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        return {
            "requests": self.get_request_stats(),
            "modes": self.get_mode_stats(),
            "errors": dict(self._error_counts),
            "gauges": dict(self._gauges),
            "counters": dict(self._counters),
            "timestamp": datetime.utcnow().isoformat()
        }


class SentryIntegration:
    """
    Sentry error tracking integration.
    """

    def __init__(self, config: MonitoringConfig):
        self.config = config
        self._initialized = False

    def initialize(self):
        """Initialize Sentry SDK."""
        if not self.config.enable_sentry or not self.config.sentry_dsn:
            logger.info("Sentry disabled or no DSN configured")
            return
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
            sentry_sdk.init(
                dsn=self.config.sentry_dsn,
                environment=self.config.sentry_environment,
                traces_sample_rate=self.config.sentry_traces_sample_rate,
                integrations=[
                    FastApiIntegration(transaction_style="endpoint"),
                    SqlalchemyIntegration(),
                ],
                send_default_pii=False,
            )
            self._initialized = True
            logger.info(f"Sentry initialized: env={self.config.sentry_environment}")
        except ImportError:
            logger.warning("sentry-sdk not installed")
        except Exception as e:
            logger.error(f"Sentry init failed: {e}")

    def capture_exception(self, error: Exception, context: Optional[Dict] = None):
        """Capture an exception to Sentry."""
        if not self._initialized:
            return
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                if context:
                    for key, value in context.items():
                        scope.set_extra(key, value)
                sentry_sdk.capture_exception(error)
        except Exception as e:
            logger.error(f"Failed to capture Sentry exception: {e}")

    def capture_message(self, message: str, level: str = "info"):
        """Capture a message to Sentry."""
        if not self._initialized:
            return
        try:
            import sentry_sdk
            sentry_sdk.capture_message(message, level=level)
        except Exception:
            pass


class PerformanceMonitor:
    """
    Unified performance monitoring system.
    Combines metrics, Sentry, and OpenTelemetry.
    """

    def __init__(self, config: Optional[MonitoringConfig] = None):
        self.config = config or MonitoringConfig()
        self.metrics = MetricsCollector(self.config)
        self.sentry = SentryIntegration(self.config)
        self._initialized = False

    def initialize(self):
        """Initialize all monitoring systems."""
        self.sentry.initialize()
        self._initialized = True
        logger.info("Performance monitoring initialized")

    def track_request(self, endpoint: str, method: str = "GET"):
        """Decorator to track request performance."""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start = time.monotonic()
                error_msg = None
                status = 200
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    error_msg = str(e)
                    status = 500
                    self.sentry.capture_exception(e, {"endpoint": endpoint})
                    raise
                finally:
                    duration = (time.monotonic() - start) * 1000
                    self.metrics.record_request(RequestMetric(
                        endpoint=endpoint,
                        method=method,
                        status_code=status,
                        duration_ms=duration,
                        timestamp=datetime.utcnow().isoformat(),
                        error=error_msg
                    ))
            return wrapper
        return decorator

    def track_mode(self, mode: str):
        """Decorator to track mode execution time."""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start = time.monotonic()
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    self.sentry.capture_exception(e, {"mode": mode})
                    raise
                finally:
                    duration = (time.monotonic() - start) * 1000
                    self.metrics.record_mode_timing(mode, duration)
            return wrapper
        return decorator

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get all monitoring data for dashboard display."""
        return {
            "metrics": self.metrics.get_all_metrics(),
            "health": {
                "monitoring_active": self._initialized,
                "sentry_active": self.sentry._initialized,
            },
            "config": {
                "environment": self.config.sentry_environment,
                "slow_threshold_ms": self.config.slow_request_threshold_ms,
            }
        }
