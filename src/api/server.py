"""Inception Engine - API Server

FastAPI server with REST and WebSocket support for all four modes.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from inception_engine.core.orchestrator import InceptionOrchestrator, ModeType
from inception_engine.core.mode_manager import ModeManager
from inception_engine.core.constitutional_guard import ConstitutionalGuard

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Inception Engine API",
    description="Four-Mode AI Development Engine",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance
orchestrator = InceptionOrchestrator()


# Pydantic models
class IdeateRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for ideation")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")


class PlanRequest(BaseModel):
    vision_document: str = Field(..., description="Vision document from IDEATE mode")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")


class ShipRequest(BaseModel):
    technical_specification: str = Field(..., description="Technical spec from PLAN mode")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")


class ValidateRequest(BaseModel):
    build_output: Dict[str, Any] = Field(..., description="Build output from SHIP mode")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")


class ExpressWorkflowRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for express workflow")


class RapidWorkflowRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for rapid workflow")


class FullLifecycleRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for full lifecycle")


class ConstitutionalCheckRequest(BaseModel):
    context: Dict[str, Any] = Field(..., description="Context to validate")


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "4.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "modes": ["IDEATE", "PLAN", "SHIP", "VALIDATE"]
    }


# Mode endpoints
@app.post("/api/v1/modes/ideate")
async def execute_ideate(request: IdeateRequest, background_tasks: BackgroundTasks):
    """Execute IDEATE mode."""
    try:
        logger.info(f"IDEATE mode request: {request.prompt[:50]}...")
        
        result = orchestrator.execute_mode(
            mode=ModeType.IDEATE,
            input_data={"prompt": request.prompt, **request.context}
        )
        
        return {
            "status": "success",
            "mode": "IDEATE",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"IDEATE mode error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/modes/plan")
async def execute_plan(request: PlanRequest):
    """Execute PLAN mode."""
    try:
        logger.info("PLAN mode request")
        
        result = orchestrator.execute_mode(
            mode=ModeType.PLAN,
            input_data={"vision_document": request.vision_document, **request.context}
        )
        
        return {
            "status": "success",
            "mode": "PLAN",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"PLAN mode error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/modes/ship")
async def execute_ship(request: ShipRequest):
    """Execute SHIP mode."""
    try:
        logger.info("SHIP mode request")
        
        result = orchestrator.execute_mode(
            mode=ModeType.SHIP,
            input_data={"technical_specification": request.technical_specification, **request.context}
        )
        
        return {
            "status": "success",
            "mode": "SHIP",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"SHIP mode error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/modes/validate")
async def execute_validate(request: ValidateRequest):
    """Execute VALIDATE mode."""
    try:
        logger.info("VALIDATE mode request")
        
        result = orchestrator.execute_mode(
            mode=ModeType.VALIDATE,
            input_data={"build_output": request.build_output, **request.context}
        )
        
        return {
            "status": "success",
            "mode": "VALIDATE",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"VALIDATE mode error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Workflow endpoints
@app.post("/api/v1/workflows/express")
async def execute_express_workflow(request: ExpressWorkflowRequest):
    """Execute express workflow (SHIP → VALIDATE)."""
    try:
        logger.info(f"Express workflow request: {request.prompt[:50]}...")
        
        result = orchestrator.execute_express_workflow(request.prompt)
        
        return {
            "status": "success",
            "workflow": "express",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Express workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/workflows/rapid")
async def execute_rapid_workflow(request: RapidWorkflowRequest):
    """Execute rapid workflow (IDEATE → SHIP → VALIDATE)."""
    try:
        logger.info(f"Rapid workflow request: {request.prompt[:50]}...")
        
        result = orchestrator.execute_rapid_workflow(request.prompt)
        
        return {
            "status": "success",
            "workflow": "rapid",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Rapid workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/workflows/full")
async def execute_full_lifecycle(request: FullLifecycleRequest):
    """Execute full lifecycle (IDEATE → PLAN → SHIP → VALIDATE)."""
    try:
        logger.info(f"Full lifecycle request: {request.prompt[:50]}...")
        
        result = orchestrator.execute_full_lifecycle(request.prompt)
        
        return {
            "status": "success",
            "workflow": "full_lifecycle",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Full lifecycle error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Constitutional compliance
@app.post("/api/v1/constitutional/check")
async def check_constitutional_compliance(request: ConstitutionalCheckRequest):
    """Check constitutional compliance."""
    try:
        guard = ConstitutionalGuard()
        result = guard.validate_all_articles(request.context)
        
        return {
            "status": "success",
            "compliance": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Constitutional check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Agent registry
@app.get("/api/v1/agents")
async def list_agents():
    """List all agents."""
    try:
        # Load from agent registry
        import json
        with open("CORE_FOUNDATION/agents/.agent-status.json", "r") as f:
            registry = json.load(f)
        
        return {
            "status": "success",
            "registry": registry,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Agent list error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket for real-time updates
@app.websocket("/ws/mode")
async def websocket_mode_updates(websocket: WebSocket):
    """WebSocket endpoint for real-time mode updates."""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            # Receive command from client
            data = await websocket.receive_json()
            
            mode = data.get("mode")
            input_data = data.get("input_data", {})
            
            # Send progress updates
            await websocket.send_json({
                "type": "status",
                "message": f"Starting {mode} mode..."
            })
            
            # Execute mode (would need async implementation)
            # For now, send mock updates
            await websocket.send_json({
                "type": "progress",
                "mode": mode,
                "progress": 50,
                "message": "Processing..."
            })
            
            await asyncio.sleep(2)
            
            await websocket.send_json({
                "type": "complete",
                "mode": mode,
                "progress": 100,
                "result": {"status": "success"}
            })
    
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Inception Engine API Server...")
    logger.info("Documentation: http://localhost:8000/docs")
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
