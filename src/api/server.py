"""Inception Engine - API Server

FastAPI server with REST and WebSocket support for all four modes.
Enhanced with performance middleware, health checks, and monitoring.

HELIX DELTA - Phase 3: API Performance + Phase 5: Observability
"""

import asyncio
import os
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from inception_engine.core.orchestrator import InceptionOrchestrator
from inception_engine.core.mode_manager import ModeManager
from inception_engine.core.constitutional_guard import ConstitutionalGuard

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==============================================================
# Lifespan Manager - Resource initialization and cleanup
# ==============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: startup and shutdown."""
    logger.info("Inception Engine starting up...")

    # Initialize connection pools
    app.state.redis_pool = None
    app.state.db_pool = None
    app.state.start_time = time.monotonic()

    try:
        # Initialize Redis connection pool
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            from src.core.pool import ConnectionPoolManager
            pool_manager = ConnectionPoolManager()
            app.state.redis_pool = await pool_manager.get_redis_pool(redis_url)
            logger.info("Redis connection pool initialized")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")

        # Initialize health checker
        from src.monitoring.health import HealthChecker
        app.state.health_checker = HealthChecker()
        logger.info("Health checker initialized")

        # Initialize orchestrator
        app.state.orchestrator = InceptionOrchestrator()
        logger.info("Orchestrator initialized")

        logger.info("Inception Engine ready to serve requests")
        yield

    finally:
        # Cleanup resources
        logger.info("Inception Engine shutting down...")
        if app.state.redis_pool:
            await app.state.redis_pool.close()
            logger.info("Redis pool closed")
        logger.info("Shutdown complete")


# ==============================================================
# Initialize FastAPI with lifespan
# ==============================================================

app = FastAPI(
    title="Inception Engine API",
    description="Four-Mode AI Development Engine - Production Performance",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# ==============================================================
# Middleware Stack (order matters - first added = outermost)
# ==============================================================

# Gzip compression for responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS - configurable origins (tightened from allow_origins=["*"])
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Add X-Response-Time header and X-Request-ID tracking."""
    import uuid
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.monotonic()

    response = await call_next(request)

    duration_ms = (time.monotonic() - start) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    response.headers["X-Request-ID"] = request_id

    # Log slow requests
    if duration_ms > 100:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} "
            f"took {duration_ms:.2f}ms [req_id={request_id}]"
        )

    return response


# ==============================================================
# Pydantic models
# ==============================================================

class IdeateRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for ideation")
    context: Optional[Dict[str, Any]] = Field(default=None)

class PlanRequest(BaseModel):
    project_id: str = Field(..., description="Project to plan")
    scope: Optional[str] = Field(default="full")

class ShipRequest(BaseModel):
    project_id: str = Field(..., description="Project to ship")
    target: str = Field(default="production")

class ValidateRequest(BaseModel):
    project_id: str = Field(..., description="Project to validate")
    checks: Optional[List[str]] = Field(default=None)


# ==============================================================
# Health Check Endpoints (Kubernetes-ready)
# ==============================================================

@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    """Full health check with dependency status."""
    checker = request.app.state.health_checker
    health = await checker.full_health_check(
        redis_pool=request.app.state.redis_pool,
        db_pool=request.app.state.db_pool
    )
    status_code = 200 if health.status.value == "healthy" else 503
    return JSONResponse(
        content=checker.to_dict(health),
        status_code=status_code,
        headers={"Cache-Control": "no-cache, no-store"}
    )

@app.get("/health/live", tags=["Health"])
async def liveness_probe(request: Request):
    """Kubernetes liveness probe."""
    checker = request.app.state.health_checker
    return await checker.liveness_check()

@app.get("/health/ready", tags=["Health"])
async def readiness_probe(request: Request):
    """Kubernetes readiness probe."""
    checker = request.app.state.health_checker
    result = await checker.readiness_check(
        redis_pool=request.app.state.redis_pool,
        db_pool=request.app.state.db_pool
    )
    status_code = 200 if result["status"] == "ready" else 503
    return JSONResponse(content=result, status_code=status_code)


# ==============================================================
# Metrics Endpoint
# ==============================================================

@app.get("/metrics", tags=["Monitoring"])
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )
    except ImportError:
        return JSONResponse(
            content={"message": "prometheus_client not installed"},
            status_code=501
        )


# ==============================================================
# API v1 Endpoints
# ==============================================================

@app.get("/api/v1/status", tags=["Status"])
async def get_status(request: Request):
    """Get current engine status with performance metadata."""
    orchestrator = request.app.state.orchestrator
    uptime = time.monotonic() - request.app.state.start_time
    return {
        "engine": "Inception Engine",
        "version": "4.0.0",
        "status": "operational",
        "uptime_seconds": round(uptime, 2),
        "current_mode": getattr(orchestrator, 'current_mode', 'IDLE'),
        "timestamp": datetime.utcnow().isoformat(),
        "meta": {
            "redis_connected": request.app.state.redis_pool is not None,
            "environment": os.getenv("ENVIRONMENT", "development"),
        }
    }

@app.get("/api/v1/agents", tags=["Agents"])
async def list_agents(request: Request):
    """List all registered agents."""
    orchestrator = request.app.state.orchestrator
    agents = getattr(orchestrator, 'agents', {})
    return {
        "agents": [
            {
                "name": name,
                "type": getattr(agent, 'agent_type', 'unknown'),
                "status": "active"
            }
            for name, agent in agents.items()
        ],
        "count": len(agents)
    }

@app.post("/api/v1/modes/ideate", tags=["Modes"])
async def execute_ideate(request_body: IdeateRequest, request: Request):
    """Execute IDEATE mode."""
    orchestrator = request.app.state.orchestrator
    try:
        result = orchestrator.execute_mode("IDEATE", {
            "prompt": request_body.prompt,
            "context": request_body.context or {}
        })
        return {"mode": "IDEATE", "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"IDEATE mode failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/modes/plan", tags=["Modes"])
async def execute_plan(request_body: PlanRequest, request: Request):
    """Execute PLAN mode."""
    orchestrator = request.app.state.orchestrator
    try:
        result = orchestrator.execute_mode("PLAN", {
            "project_id": request_body.project_id,
            "scope": request_body.scope
        })
        return {"mode": "PLAN", "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"PLAN mode failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/modes/ship", tags=["Modes"])
async def execute_ship(request_body: ShipRequest, request: Request):
    """Execute SHIP mode."""
    orchestrator = request.app.state.orchestrator
    try:
        result = orchestrator.execute_mode("SHIP", {
            "project_id": request_body.project_id,
            "target": request_body.target
        })
        return {"mode": "SHIP", "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"SHIP mode failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/modes/validate", tags=["Modes"])
async def execute_validate(request_body: ValidateRequest, request: Request):
    """Execute VALIDATE mode."""
    orchestrator = request.app.state.orchestrator
    try:
        result = orchestrator.execute_mode("VALIDATE", {
            "project_id": request_body.project_id,
            "checks": request_body.checks
        })
        return {"mode": "VALIDATE", "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"VALIDATE mode failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================
# WebSocket Endpoint
# ==============================================================

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time mode execution streaming."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            mode = data.get("mode", "IDEATE")
            await websocket.send_json({
                "type": "ack",
                "mode": mode,
                "status": "processing",
                "timestamp": datetime.utcnow().isoformat()
            })
            await websocket.send_json({
                "type": "complete",
                "mode": mode,
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


# ==============================================================
# CDN-Ready Response Headers
# ==============================================================

@app.middleware("http")
async def cdn_headers_middleware(request: Request, call_next):
    """Add CDN-ready caching headers."""
    response = await call_next(request)

    # Static assets get immutable caching
    if request.url.path.startswith("/static/") or request.url.path.startswith("/design-system/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["Vary"] = "Accept-Encoding"

    # API responses get no-cache by default
    elif request.url.path.startswith("/api/"):
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    return response
