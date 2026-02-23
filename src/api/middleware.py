"""
Inception Engine - API Middleware

Rate limiting, response compression, request timing,
and security headers for production API hardening.

HELIX DELTA - Phase 2: API Performance Layer
"""
import time
import logging
from typing import Optional, Dict, Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import FastAPI

logger = logging.getLogger(__name__)


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Add X-Response-Time header to all responses.
    Tracks request duration for monitoring.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
        response.headers["X-Request-ID"] = getattr(
            request.state, "request_id", "unknown"
        )
        if duration_ms > 100:
            logger.warning(
                f"Slow request: {request.method} {request.url.path} "
                f"took {duration_ms:.2f}ms"
            )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Limit request body size to prevent abuse.
    """

    def __init__(self, app, max_size_mb: float = 10.0):
        super().__init__(app)
        self.max_size_bytes = int(max_size_mb * 1024 * 1024)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size_bytes:
            return Response(
                content='{"error": "Request body too large"}',
                status_code=413,
                media_type="application/json"
            )
        return await call_next(request)


def setup_rate_limiting(app: FastAPI, default_limit: str = "100/minute"):
    """
    Configure rate limiting using slowapi.

    Args:
        app: FastAPI application
        default_limit: Default rate limit string
    """
    try:
        from slowapi import Limiter, _rate_limit_exceeded_handler
        from slowapi.util import get_remote_address
        from slowapi.errors import RateLimitExceeded

        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[default_limit],
            storage_uri="memory://",
        )
        app.state.limiter = limiter
        app.add_exception_handler(
            RateLimitExceeded,
            _rate_limit_exceeded_handler
        )
        logger.info(f"Rate limiting configured: {default_limit}")
        return limiter

    except ImportError:
        logger.warning("slowapi not installed, rate limiting disabled")
        return None


def setup_compression(app: FastAPI, minimum_size: int = 500):
    """
    Configure response compression using GZip.

    Args:
        app: FastAPI application
        minimum_size: Minimum response size in bytes to compress
    """
    from starlette.middleware.gzip import GZipMiddleware
    app.add_middleware(GZipMiddleware, minimum_size=minimum_size)
    logger.info(f"GZip compression enabled: min_size={minimum_size}")


def configure_middleware(app: FastAPI, config: Optional[Dict] = None):
    """
    Configure all middleware for the FastAPI application.
    Order matters - middleware is executed in reverse order of addition.

    Args:
        app: FastAPI application
        config: Optional configuration dictionary
    """
    config = config or {}

    # 1. Security headers (outermost - runs first on response)
    app.add_middleware(SecurityHeadersMiddleware)

    # 2. Request timing
    app.add_middleware(RequestTimingMiddleware)

    # 3. Request size limit
    max_size = config.get("max_request_size_mb", 10.0)
    app.add_middleware(RequestSizeLimitMiddleware, max_size_mb=max_size)

    # 4. GZip compression
    min_size = config.get("compression_min_size", 500)
    setup_compression(app, minimum_size=min_size)

    # 5. Rate limiting
    rate_limit = config.get("rate_limit", "100/minute")
    limiter = setup_rate_limiting(app, default_limit=rate_limit)

    logger.info("All middleware configured")
    return {"limiter": limiter}
