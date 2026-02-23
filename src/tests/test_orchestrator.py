"""Unit tests for Orchestrator."""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.orchestrator import (
    InceptionOrchestrator,
    ModeType,
    GateFailureError,
    ConstitutionalViolationError,
)


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
        {"prompt": "Test project"},
        validate_constitution=False,
    )

    assert "vision_document" in result
    assert "session_id" in result
    assert "agent_count" in result


def test_execute_plan_mode():
    orchestrator = InceptionOrchestrator()
    result = orchestrator.execute_mode(
        ModeType.PLAN,
        {"prompt": "Test plan"},
        validate_constitution=False,
    )

    assert "technical_specification" in result
    assert "session_id" in result


@patch.object(InceptionOrchestrator, "_validate_ship_gates")
def test_execute_ship_mode(mock_gates):
    mock_gates.return_value = None
    orchestrator = InceptionOrchestrator()
    result = orchestrator.execute_mode(
        ModeType.SHIP,
        {"prompt": "Test app", "direct_prompt": True},
        validate_constitution=False,
    )

    assert "production_url" in result
    assert "documentation_url" in result
    assert result["code_complete"] is True
    assert result["deployed_to_production"] is True


@patch.object(InceptionOrchestrator, "_validate_ship_gates")
def test_execute_validate_mode(mock_gates):
    mock_gates.return_value = None
    orchestrator = InceptionOrchestrator()

    # First ship something
    ship_result = orchestrator.execute_mode(
        ModeType.SHIP,
        {"prompt": "Test", "direct_prompt": True},
        validate_constitution=False,
    )

    # Then validate
    validation = orchestrator.execute_mode(
        ModeType.VALIDATE,
        {"build_output": ship_result},
        validate_constitution=False,
    )

    assert "validation_passed" in validation
    assert "results" in validation


@patch.object(InceptionOrchestrator, "_validate_ship_gates")
def test_express_workflow(mock_gates):
    mock_gates.return_value = None
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


def test_ship_gates_failure():
    """Test that SHIP mode raises when gates fail."""
    orchestrator = InceptionOrchestrator()
    with pytest.raises(Exception):
        orchestrator.execute_mode(
            ModeType.SHIP,
            {"prompt": "Test", "direct_prompt": True},
            validate_constitution=False,
        )
