"""
Creative Liberation Engine v5 — THE Server

The ONE and ONLY entry point. No split brain. No dual FastAPI apps.
This is the merge of v4's start_engine.py (722 lines) and main.py (422 lines)
into a single, clean server.

Lineage: v4 start_engine.py + inception_engine/main.py → v5 server.py (unified)
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inception.config.env import load_config, get_config
from inception.config.constants import ENGINE_NAME, ENGINE_VERSION
from inception.config.tiers import AccessTier, get_tier_config, check_agent_access
from inception.constitution.guard import ConstitutionalGuard
from inception.engine.modes import ModeType, ModeManager
from inception.engine.gates import GateValidator
from inception.engine.router import TaskRouter
from inception.engine.types import TaskResult, EngineStatus
from inception.agents.registry import AgentRegistry
from inception.agents.base import AgentResult

logger = logging.getLogger(__name__)

# ============================================================
# Global state — initialized at boot
# ============================================================

_boot_time: float = 0.0
_start_time: float = 0.0
_registry: AgentRegistry = AgentRegistry()
_guard: ConstitutionalGuard = ConstitutionalGuard()
_mode_manager: ModeManager = ModeManager()
_gate_validator: GateValidator = GateValidator()
_router: TaskRouter | None = None
_task_count: int = 0


# ============================================================
# Request/Response models
# ============================================================

class TaskRequest(BaseModel):
    """Incoming task request."""
    task: str
    mode: str = "ship"
    agent: str | None = None  # Force specific agent
    context: dict[str, Any] = {}


class TaskResponse(BaseModel):
    """Task execution response."""
    success: bool
    task_id: int
    agent: str
    result: dict[str, Any]
    mode: str
    reasoning: str | None = None
    execution_time_ms: float
    constitutional_compliant: bool
    model_used: str


class BootInfo(BaseModel):
    """Boot information response."""
    engine: str
    version: str
    boot_time_ms: float
    agents_loaded: int
    tier: str
    mode: str
    offline: bool


# ============================================================
# Boot sequence
# ============================================================

def _load_agents() -> None:
    """Load all agents into the registry. Import here to avoid circular deps."""
    # Agent definitions are imported and registered
    # This will grow as agents are added in Phase 2
    try:
        from inception.agents.hives.aurora.bolt import bolt
        _registry.register(bolt)
    except ImportError:
        logger.debug("BOLT agent not yet available")

    try:
        from inception.agents.hives.aurora.comet import comet
        _registry.register(comet)
    except ImportError:
        logger.debug("COMET agent not yet available")

    try:
        from inception.agents.hives.aurora.aurora_agent import aurora
        _registry.register(aurora)
    except ImportError:
        logger.debug("Aurora agent not yet available")

    try:
        from inception.agents.hives.keeper.keeper import keeper
        _registry.register(keeper)
    except ImportError:
        logger.debug("KEEPER agent not yet available")

    try:
        from inception.agents.hives.keeper.arch import arch
        _registry.register(arch)
    except ImportError:
        logger.debug("ARCH agent not yet available")

    try:
        from inception.agents.hives.keeper.codex import codex
        _registry.register(codex)
    except ImportError:
        logger.debug("CODEX agent not yet available")

    try:
        from inception.agents.hives.lex.lex_agent import lex
        _registry.register(lex)
    except ImportError:
        logger.debug("LEX agent not yet available")

    try:
        from inception.agents.hives.lex.compass import compass
        _registry.register(compass)
    except ImportError:
        logger.debug("COMPASS agent not yet available")

    try:
        from inception.agents.hives.switchboard.relay import relay
        _registry.register(relay)
    except ImportError:
        logger.debug("RELAY agent not yet available")

    try:
        from inception.agents.hives.broadcast.signal_agent import signal
        _registry.register(signal)
    except ImportError:
        logger.debug("SIGNAL agent not yet available")

    try:
        from inception.agents.hives.averi.averi_trinity import averi
        _registry.register(averi)
    except ImportError:
        logger.debug("AVERI Trinity agent not yet available")

    try:
        from inception.agents.hives.averi.oracle_council import oracle_council
        _registry.register(oracle_council)
    except ImportError:
        logger.debug("Oracle Council agent not yet available")

    try:
        from inception.agents.hives.broadcast.broadcast_crew import broadcast_crew
        _registry.register(broadcast_crew)
    except ImportError:
        logger.debug("Broadcast Crew agent not yet available")

    try:
        from inception.agents.hives.broadcast.echo import echo
        _registry.register(echo)
    except ImportError:
        logger.debug("ECHO agent not yet available")

    try:
        from inception.agents.hives.broadcast.atlas import atlas
        _registry.register(atlas)
    except ImportError:
        logger.debug("ATLAS agent not yet available")

    try:
        from inception.agents.hives.broadcast.ram_crew import ram_crew
        _registry.register(ram_crew)
    except ImportError:
        logger.debug("RAM Crew agent not yet available")

    try:
        from inception.agents.hives.keeper.scribe import scribe
        _registry.register(scribe)
    except ImportError:
        logger.debug("SCRIBE agent not yet available")

    try:
        from inception.agents.hives.keeper.cosmos import cosmos
        _registry.register(cosmos)
    except ImportError:
        logger.debug("COSMOS agent not yet available")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Boot and shutdown sequence."""
    global _boot_time, _start_time, _router

    boot_start = time.perf_counter()
    _start_time = time.time()

    # 1. Load config
    config = load_config()
    logger.info(f"⚡ {ENGINE_NAME} v{ENGINE_VERSION} — Booting...")
    logger.info(f"   Tier: {config.access_tier}")
    logger.info(f"   Model: {config.default_model}")
    logger.info(f"   Offline: {config.is_offline}")

    # 2. Load agents
    _load_agents()
    logger.info(f"   Agents: {_registry.count()} loaded")

    # 3. Initialize router
    _router = TaskRouter(_registry)

    # 4. Boot complete
    _boot_time = (time.perf_counter() - boot_start) * 1000
    logger.info(f"✅ {ENGINE_NAME} v{ENGINE_VERSION} — Boot complete in {_boot_time:.0f}ms")

    yield

    # Shutdown
    logger.info(f"🛑 {ENGINE_NAME} — Shutting down (processed {_task_count} tasks)")


# ============================================================
# FastAPI App — THE ONE
# ============================================================

app = FastAPI(
    title=ENGINE_NAME,
    version=ENGINE_VERSION,
    description="Creative Liberation Engine v5 — Artist Liberation Through Sovereign AI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Narrowed in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from inception.engine.vfx_routes import vfx_router
app.include_router(vfx_router, prefix="/api/v1/vfx", tags=["vfx"])


# ============================================================
# API Routes
# ============================================================

@app.get("/", response_model=BootInfo)
async def root():
    """Engine info endpoint."""
    config = get_config()
    return BootInfo(
        engine=ENGINE_NAME,
        version=ENGINE_VERSION,
        boot_time_ms=round(_boot_time, 2),
        agents_loaded=_registry.count(),
        tier=config.access_tier,
        mode=_mode_manager.current_mode.value if _mode_manager.current_mode else "idle",
        offline=config.is_offline,
    )


@app.get("/status", response_model=EngineStatus)
async def status():
    """Detailed engine status."""
    config = get_config()
    uptime = time.time() - _start_time if _start_time else 0
    return EngineStatus(
        version=ENGINE_VERSION,
        running=True,
        mode=_mode_manager.current_mode.value if _mode_manager.current_mode else "idle",
        agents_loaded=_registry.count(),
        agents_available=_registry.list_all(),
        tier=config.access_tier,
        memory_connected=False,  # Updated when memory package is integrated
        model=config.default_model,
        uptime_seconds=round(uptime, 1),
        boot_time_ms=round(_boot_time, 2),
        total_tasks=_task_count,
        constitutional_scans=_guard.total_scans,
    )


@app.post("/task", response_model=TaskResponse)
async def submit_task(request: TaskRequest):
    """
    Submit a task for agent execution.

    This is the main entry point for all work. The pipeline:
    1. Tier check
    2. Route to agent(s)
    3. Constitutional pre-flight
    4. Agent execution
    5. Constitutional post-flight
    6. Return typed result
    """
    global _task_count
    _task_count += 1
    task_id = _task_count

    config = get_config()
    tier = AccessTier(config.access_tier)

    # 1. Route to agent
    if request.agent:
        # Forced agent
        agent = _registry.get(request.agent)
        if agent is None:
            raise HTTPException(404, f"Agent '{request.agent}' not found")
        if not check_agent_access(tier, agent.hive):
            raise HTTPException(403, f"Tier '{tier.value}' cannot access agent '{request.agent}'")
    else:
        # Auto-route
        if _router is None:
            raise HTTPException(500, "Router not initialized")
        matches = _router.route(request.task, mode=request.mode, tier=config.access_tier)
        if not matches:
            raise HTTPException(422, "No agent could be matched for this task")
        agent = _registry.get(matches[0][0])
        if agent is None:
            raise HTTPException(500, f"Routed agent '{matches[0][0]}' not in registry")

    # 2. Constitutional pre-flight
    context = {
        "task": request.task,
        "mode": request.mode,
        "tier": config.access_tier,
        **request.context,
    }
    pre_check = _guard.pre_flight_check(context, agent_name=agent.name, mode=request.mode)
    if pre_check.has_blockers:
        violations = [
            f"Article {v.article} ({v.article_name}): {v.description}"
            for v in pre_check.critical_violations
        ]
        raise HTTPException(
            403,
            f"Constitutional violation(s): {'; '.join(violations)}"
        )

    # 3. Execute agent
    result: AgentResult = await agent.execute(context)

    # 4. Constitutional post-flight
    post_check = _guard.post_flight_check(result.output, agent_name=agent.name)

    return TaskResponse(
        success=result.success,
        task_id=task_id,
        agent=result.agent_name,
        result=result.output,
        mode=request.mode,
        reasoning=result.reasoning,
        execution_time_ms=result.execution_time_ms,
        constitutional_compliant=pre_check.compliant and post_check.compliant,
        model_used=result.model_used,
    )


@app.get("/agents")
async def list_agents():
    """List all registered agents with capabilities."""
    config = get_config()
    tier = AccessTier(config.access_tier)
    agents = _registry.by_tier(config.access_tier)
    return {
        "tier": config.access_tier,
        "total": len(agents),
        "agents": [a.get_capabilities() for a in agents],
    }


@app.get("/agents/{agent_name}")
async def get_agent(agent_name: str):
    """Get specific agent details."""
    agent = _registry.get(agent_name)
    if agent is None:
        raise HTTPException(404, f"Agent '{agent_name}' not found")
    return agent.get_capabilities()


@app.get("/modes")
async def list_modes():
    """List all modes with their gates."""
    return {
        mode.value: {
            "gates": _gate_validator.list_gates(mode.value),
            "gate_count": len(_gate_validator.list_gates(mode.value)),
        }
        for mode in ModeType
    }


@app.get("/modes/history")
async def mode_history():
    """Get mode transition history."""
    return {"history": _mode_manager.get_history()}


@app.get("/constitution")
async def constitution():
    """Get all constitutional articles."""
    from inception.constitution.articles import ARTICLES
    return {
        "total_articles": len(ARTICLES),
        "articles": [
            {
                "number": a.number,
                "numeral": a.numeral,
                "name": a.name,
                "summary": a.summary,
                "enforcement": a.enforcement,
                "immutable": a.immutable,
            }
            for a in ARTICLES
        ],
    }


@app.get("/route")
async def explain_route(task: str):
    """Explain how a task would be routed (Article IV: Transparency)."""
    if _router is None:
        raise HTTPException(500, "Router not initialized")
    return _router.explain_routing(task)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket for real-time updates during task execution."""
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            # Echo back with engine status for now
            await ws.send_json({
                "type": "status",
                "engine": ENGINE_NAME,
                "version": ENGINE_VERSION,
                "agents": _registry.count(),
                "tasks": _task_count,
                "received": data,
            })
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")


# ============================================================
# Entry point
# ============================================================

def run_server():
    """Run the engine server. For CLI: `inception boot`"""
    import uvicorn

    config = load_config()
    uvicorn.run(
        "inception.engine.server:app",
        host=config.host,
        port=config.port,
        reload=config.debug,
        log_level="info",
    )


if __name__ == "__main__":
    run_server()
