"""
Inception Engine - Error Handlers

Structured error responses, exception mapping, and
Sentry integration for comprehensive error management.

HELIX DELTA - Phase 3: Error Tracking & Monitoring
"""
import logging
import traceback
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API error with structured response."""

    def __init__(self, message: str, status_code: int = 500,
                 error_code: str = "INTERNAL_ERROR",
                 details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class OrchestrationAPIError(APIError):
    """Orchestration-specific errors."""

    def __init__(self, message: str, mode: Optional[str] = None,
                 details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=500,
            error_code="ORCHESTRATION_ERROR",
            details={**(details or {}), "mode": mode}
        )


class ConstitutionalAPIError(APIError):
    """Constitutional violation errors."""

    def __init__(self, message: str, violations: Optional[list] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="CONSTITUTIONAL_VIOLATION",
            details={"violations": violations or []}
        )


class GateFailureAPIError(APIError):
    """SHIP gate failure errors."""

    def __init__(self, message: str, failed_gates: Optional[list] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="GATE_FAILURE",
            details={"failed_gates": failed_gates or []}
        )


class RateLimitAPIError(APIError):
    """Rate limit exceeded."""

    def __init__(self):
        super().__init__(
            message="Rate limit exceeded. Please retry later.",
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED"
        )


def build_error_response(error: APIError, request_id: str = "unknown") -> Dict[str, Any]:
    """Build a structured error response."""
    return {
        "error": {
            "code": error.error_code,
            "message": error.message,
            "details": error.details,
            "status_code": error.status_code,
        },
        "meta": {
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }


def configure_error_handlers(app: FastAPI, monitor=None):
    """
    Register all error handlers on the FastAPI app.

    Args:
        app: FastAPI application
        monitor: Optional PerformanceMonitor for Sentry integration
    """

    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(f"APIError [{exc.error_code}]: {exc.message}")
        if monitor:
            monitor.sentry.capture_exception(exc, {
                "error_code": exc.error_code,
                "endpoint": str(request.url.path),
            })
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_response(exc, request_id)
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = getattr(request.state, "request_id", "unknown")
        api_error = APIError(
            message=str(exc.detail),
            status_code=exc.status_code,
            error_code=f"HTTP_{exc.status_code}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_response(api_error, request_id)
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {exc}\n"
            f"{traceback.format_exc()}"
        )
        if monitor:
            monitor.sentry.capture_exception(exc, {
                "endpoint": str(request.url.path),
                "method": request.method,
            })
        api_error = APIError(
            message="An internal error occurred",
            status_code=500,
            error_code="UNHANDLED_ERROR"
        )
        return JSONResponse(
            status_code=500,
            content=build_error_response(api_error, request_id)
        )

    logger.info("Error handlers configured")
