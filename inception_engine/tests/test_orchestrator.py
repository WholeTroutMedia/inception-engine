"""
Unit tests for Orchestrator
"""

import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.orchestrator import InceptionOrchestrator, ModeType


def test_orchestrator_initialization():
    orchestrator = InceptionOrchestrator()
    assert orchestrator.mode_manager is not None
    assert orchestrator.agent_loader is not None
    assert orchestrator.gate_validator is not None
    assert orchestrator.constitutional_guard is not None


def test_execute_ideate_mode():
    orchestrator = InceptionOrchestrator()
    result = orchestrator.execute_mode(
        ModeType.IDEATE,
        {"prompt": "Test project"}
    )
    
    assert "vision_document" in result
    assert "session_id" in result
    assert result["agent_count"] > 0


def test_execute_ship_mode():
    orchestrator = InceptionOrchestrator()
    result = orchestrator.execute_mode(
        ModeType.SHIP,
        {"prompt": "Test app", "direct_prompt": True}
    )
    
    assert "production_url" in result
    assert "documentation_url" in result
    assert result["code_complete"] is True
    assert result["deployed_to_production"] is True


def test_execute_validate_mode():
    orchestrator = InceptionOrchestrator()
    
    # First ship something
    ship_result = orchestrator.execute_mode(
        ModeType.SHIP,
        {"prompt": "Test", "direct_prompt": True}
    )
    
    # Then validate
    validation = orchestrator.execute_mode(
        ModeType.VALIDATE,
        {"build_output": ship_result}
    )
    
    assert "validation_passed" in validation
    assert "results" in validation


def test_express_workflow():
    orchestrator = InceptionOrchestrator()
    result = orchestrator.execute_express_workflow("Quick test app")
    
    assert "workflow" in result
    assert result["workflow"] == "express"
    assert "shipping" in result
    assert "validation" in result


def test_get_status():
    orchestrator = InceptionOrchestrator()
    status = orchestrator.get_status()
    
    assert "active_agents" in status
    assert "workflow_history_count" in status
    assert "mode_manager" in status
