"""
Inception Engine - Performance Tests

Unit and integration tests for HELIX DELTA performance modules.
Tests connection pooling, caching, monitoring, and middleware.
"""
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import dataclass


# ============================================================
# Pool Tests
# ============================================================

class TestPoolConfig:
    """Test PoolConfig defaults."""

    def test_default_config(self):
        from src.core.pool import PoolConfig
        config = PoolConfig()
        assert config.db_pool_size == 20
        assert config.db_max_overflow == 10
        assert config.redis_max_connections == 50
        assert config.health_check_interval == 30

    def test_custom_config(self):
        from src.core.pool import PoolConfig
        config = PoolConfig(db_pool_size=50, redis_max_connections=100)
        assert config.db_pool_size == 50
        assert config.redis_max_connections == 100


class TestPoolMetrics:
    """Test PoolMetrics tracking."""

    def test_record_checkout(self):
        from src.core.pool import PoolMetrics
        metrics = PoolMetrics()
        metrics.record_checkout(5.0)
        metrics.record_checkout(10.0)
        assert metrics.avg_checkout_time_ms == 7.5

    def test_metrics_to_dict(self):
        from src.core.pool import PoolMetrics
        metrics = PoolMetrics()
        metrics.pool_hits = 100
        metrics.pool_misses = 5
        result = metrics.to_dict()
        assert result["pool_hits"] == 100
        assert result["pool_misses"] == 5
        assert "avg_checkout_ms" in result

    def test_rolling_window(self):
        from src.core.pool import PoolMetrics
        metrics = PoolMetrics()
        for i in range(1100):
            metrics.record_checkout(float(i))
        assert len(metrics._checkout_times) <= 1000


# ============================================================
# Cache Tests
# ============================================================

class TestCacheConfig:
    """Test CacheConfig defaults."""

    def test_default_config(self):
        from src.core.cache import CacheConfig
        config = CacheConfig()
        assert config.default_ttl == 300
        assert config.max_ttl == 3600
        assert config.key_prefix == "inception:"

    def test_custom_prefix(self):
        from src.core.cache import CacheConfig
        config = CacheConfig(key_prefix="test:")
        assert config.key_prefix == "test:"


class TestCacheMetrics:
    """Test CacheMetrics tracking."""

    def test_hit_rate_calculation(self):
        from src.core.cache import CacheMetrics
        metrics = CacheMetrics()
        metrics.hits = 80
        metrics.misses = 20
        assert metrics.hit_rate == 80.0

    def test_hit_rate_zero_total(self):
        from src.core.cache import CacheMetrics
        metrics = CacheMetrics()
        assert metrics.hit_rate == 0.0

    def test_metrics_to_dict(self):
        from src.core.cache import CacheMetrics
        metrics = CacheMetrics()
        metrics.hits = 50
        metrics.sets = 25
        result = metrics.to_dict()
        assert result["hits"] == 50
        assert result["sets"] == 25
        assert "hit_rate" in result


class TestCacheManager:
    """Test CacheManager key operations."""

    def test_make_key(self):
        from src.core.cache import CacheManager, CacheConfig
        config = CacheConfig(key_prefix="test:")
        manager = CacheManager(redis_pool=MagicMock(), config=config)
        assert manager._make_key("foo") == "test:foo"

    def test_hash_key_deterministic(self):
        from src.core.cache import CacheManager
        manager = CacheManager(redis_pool=MagicMock())
        hash1 = manager._hash_key("arg1", key="val")
        hash2 = manager._hash_key("arg1", key="val")
        assert hash1 == hash2

    def test_hash_key_different_args(self):
        from src.core.cache import CacheManager
        manager = CacheManager(redis_pool=MagicMock())
        hash1 = manager._hash_key("arg1")
        hash2 = manager._hash_key("arg2")
        assert hash1 != hash2

    def test_serialize_deserialize(self):
        from src.core.cache import CacheManager, CacheConfig
        config = CacheConfig(enable_compression=False)
        manager = CacheManager(redis_pool=MagicMock(), config=config)
        data = {"key": "value", "number": 42}
        serialized = manager._serialize(data)
        deserialized = manager._deserialize(serialized)
        assert deserialized == data


# ============================================================
# Monitoring Tests
# ============================================================

class TestMonitoringConfig:
    """Test MonitoringConfig."""

    def test_defaults(self):
        from src.core.monitoring import MonitoringConfig
        config = MonitoringConfig()
        assert config.sentry_environment == "development"
        assert config.slow_request_threshold_ms == 100.0
        assert config.otel_service_name == "inception-engine"


class TestMetricsCollector:
    """Test MetricsCollector."""

    def test_record_request(self):
        from src.core.monitoring import MetricsCollector, RequestMetric
        collector = MetricsCollector()
        metric = RequestMetric(
            endpoint="/health",
            method="GET",
            status_code=200,
            duration_ms=5.0,
            timestamp="2024-01-01T00:00:00"
        )
        collector.record_request(metric)
        stats = collector.get_request_stats()
        assert stats["total_requests"] == 1
        assert stats["error_count"] == 0

    def test_error_tracking(self):
        from src.core.monitoring import MetricsCollector, RequestMetric
        collector = MetricsCollector()
        metric = RequestMetric(
            endpoint="/api/v1/modes/ideate",
            method="POST",
            status_code=500,
            duration_ms=150.0,
            timestamp="2024-01-01T00:00:00",
            error="Test error"
        )
        collector.record_request(metric)
        stats = collector.get_request_stats()
        assert stats["error_count"] == 1
        assert stats["error_rate"] == 100.0

    def test_mode_timing(self):
        from src.core.monitoring import MetricsCollector
        collector = MetricsCollector()
        collector.record_mode_timing("ideate", 50.0)
        collector.record_mode_timing("ideate", 100.0)
        stats = collector.get_mode_stats()
        assert "ideate" in stats
        assert stats["ideate"]["count"] == 2
        assert stats["ideate"]["avg_ms"] == 75.0

    def test_percentile_stats(self):
        from src.core.monitoring import MetricsCollector, RequestMetric
        collector = MetricsCollector()
        for i in range(100):
            metric = RequestMetric(
                endpoint="/test",
                method="GET",
                status_code=200,
                duration_ms=float(i),
                timestamp="2024-01-01T00:00:00"
            )
            collector.record_request(metric)
        stats = collector.get_request_stats()
        assert stats["p50_latency_ms"] == 50.0
        assert stats["p95_latency_ms"] == 95.0

    def test_gauge_and_counter(self):
        from src.core.monitoring import MetricsCollector
        collector = MetricsCollector()
        collector.set_gauge("active_sessions", 5)
        collector.increment_counter("total_requests", 1)
        collector.increment_counter("total_requests", 1)
        metrics = collector.get_all_metrics()
        assert metrics["gauges"]["active_sessions"] == 5
        assert metrics["counters"]["total_requests"] == 2


# ============================================================
# Middleware Tests
# ============================================================

class TestMiddleware:
    """Test middleware configuration."""

    def test_configure_middleware(self):
        from unittest.mock import MagicMock
        from src.api.middleware import configure_middleware
        app = MagicMock()
        app.state = MagicMock()
        result = configure_middleware(app, config={
            "rate_limit": "50/minute",
            "max_request_size_mb": 5.0
        })
        assert app.add_middleware.called


# ============================================================
# Error Handler Tests
# ============================================================

class TestErrorHandlers:
    """Test error handler classes."""

    def test_api_error(self):
        from src.api.error_handlers import APIError
        error = APIError("Test error", status_code=400, error_code="TEST")
        assert error.message == "Test error"
        assert error.status_code == 400
        assert error.error_code == "TEST"

    def test_orchestration_error(self):
        from src.api.error_handlers import OrchestrationAPIError
        error = OrchestrationAPIError("Mode failed", mode="IDEATE")
        assert error.status_code == 500
        assert error.details["mode"] == "IDEATE"

    def test_constitutional_error(self):
        from src.api.error_handlers import ConstitutionalAPIError
        error = ConstitutionalAPIError("Violation", violations=["Article 0"])
        assert error.status_code == 422
        assert "Article 0" in error.details["violations"]

    def test_build_error_response(self):
        from src.api.error_handlers import APIError, build_error_response
        error = APIError("Test", status_code=400, error_code="TEST")
        response = build_error_response(error, request_id="req-123")
        assert response["error"]["code"] == "TEST"
        assert response["meta"]["request_id"] == "req-123"
        assert "timestamp" in response["meta"]


# ============================================================
# Integration / Performance Benchmarks
# ============================================================

class TestPerformanceBenchmarks:
    """Benchmark tests to validate performance targets."""

    def test_cache_key_generation_speed(self):
        """Cache key generation should be sub-millisecond."""
        from src.core.cache import CacheManager
        manager = CacheManager(redis_pool=MagicMock())
        start = time.monotonic()
        for _ in range(1000):
            manager._hash_key("test_arg", key="test_val")
        duration = (time.monotonic() - start) * 1000
        avg_ms = duration / 1000
        assert avg_ms < 1.0, f"Key generation too slow: {avg_ms:.3f}ms avg"

    def test_metrics_recording_speed(self):
        """Metrics recording should be sub-millisecond."""
        from src.core.monitoring import MetricsCollector, RequestMetric
        collector = MetricsCollector()
        metric = RequestMetric(
            endpoint="/test",
            method="GET",
            status_code=200,
            duration_ms=5.0,
            timestamp="2024-01-01T00:00:00"
        )
        start = time.monotonic()
        for _ in range(10000):
            collector.record_request(metric)
        duration = (time.monotonic() - start) * 1000
        avg_ms = duration / 10000
        assert avg_ms < 0.1, f"Metrics recording too slow: {avg_ms:.4f}ms avg"

    def test_serialization_speed(self):
        """JSON serialization should handle complex objects quickly."""
        from src.core.cache import CacheManager, CacheConfig
        config = CacheConfig(enable_compression=False)
        manager = CacheManager(redis_pool=MagicMock(), config=config)
        data = {"key_" + str(i): "value_" + str(i) for i in range(100)}
        start = time.monotonic()
        for _ in range(1000):
            serialized = manager._serialize(data)
            manager._deserialize(serialized)
        duration = (time.monotonic() - start) * 1000
        avg_ms = duration / 1000
        assert avg_ms < 5.0, f"Serialization too slow: {avg_ms:.3f}ms avg"
