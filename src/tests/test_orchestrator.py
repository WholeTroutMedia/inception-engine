"""Unit tests for Orchestrator."""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.orchestrator import (
    InceptionOrchestrator,
    ModeType,
    GateFailureError,
    ConstitutionalViolationError,
)
from core.mode_manager import ModeSession, ModeStatus


def _make_session(mode=ModeType.IDEATE):
    """Create a mock ModeSession for testing."""
    return ModeSession(
        session_id=f"test_{mode.value.lower()}_001",
        mode=mode,
        status=ModeStatus.ACTIVE,
        start_time=datetime.now(),
        end_time=None,
        input_data={},
        output_data=None,
        checkpoints=[],
        errors=[],
    )


def _make_orchestrator():
    """Create an orchestrator with mocked subsystems."""
    orch = InceptionOrchestrator()
    # Patch mode_manager.start_mode to return ModeSession objects
    original_start = orch.mode_manager.start_mode
    def patched_start(mode, input_data):
        session = _make_session(mode)
        orch.mode_manager.active_session = session
        orch.mode_manager.session_history.append(session)
        return session
    orch.mode_manager.start_mode = patched_start
    # Patch complete_mode to work with ModeSession
    def patched_complete(output_data):
        if orch.mode_manager.active_session:
            orch.mode_manager.active_session.status = ModeStatus.COMPLETE
            orch.mode_manager.active_session.end_time = datetime.now()
            orch.mode_manager.active_session.output_data = output_data
            orch.mode_manager.active_session = None
        return ModeSession(
            session_id="done",
            mode=ModeType.IDEATE,
            status=ModeStatus.COMPLETE,
            start_time=datetime.now(),
            end_time=datetime.now(),
            input_data={},
            output_data=output_data,
            checkpoints=[],
            errors=[],
        )
    orch.mode_manager.complete_mode = patched_complete
    # Patch fail_mode
    def patched_fail(error):
        if orch.mode_manager.active_session:
            orch.mode_manager.active_session.status = ModeStatus.FAILED
            orch.mode_manager.active_session = None
    orch.mode_manager.fail_mode = patched_fail
    return orch


def test_orchestrator_initialization():
    orchestrator = InceptionOrchestrator()
    assert orchestrator.mode_manager is not None
    assert orchestrator.agent_loader is not None
    assert orchestrator.gate_validator is not None
    assert orchestrator.constitutional_guard is not None


def test_execute_ideate_mode():
    orchestrator = _make_orchestrator()
    result = orchestrator.execute_mode(
        ModeType.IDEATE,
        {"prompt": "Test project"},
        validate_constitution=False,
    )

    assert "vision_document" in result
    assert "session_id" in result
    assert "agent_count" in result


def test_execute_plan_mode():
    orchestrator = _make_orchestrator()
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
    orchestrator = _make_orchestrator()
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
    orchestrator = _make_orchestrator()

    ship_result = orchestrator.execute_mode(
        ModeType.SHIP,
        {"prompt": "Test", "direct_prompt": True},
        validate_constitution=False,
    )

    validation = orchestrator.execute_mode(
        ModeType.VALIDATE,
        {"build_output": ship_result},
        validate_constitution=False,
    )

    assert "validation_passed" in validation
    assert "results" in validation


@patch.object(InceptionOrchestrator, "_validate_constitutional_compliance")
@patch.object(InceptionOrchestrator, "_validate_ship_gates")
def test_express_workflow(mock_gates, mock_constitution):
    mock_gates.return_value = None
    mock_constitution.return_value = None
    orchestrator = _make_orchestrator()
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
