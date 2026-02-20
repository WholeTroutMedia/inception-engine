"""Pytest configuration and fixtures."""

import pytest
from typing import Dict, Any


@pytest.fixture
def sample_ideate_context() -> Dict[str, Any]:
    """Sample IDEATE mode context."""
    return {
        "mode": "ideate",
        "prompt": "Build a streaming platform",
        "active_agents": 30
    }


@pytest.fixture
def sample_plan_context() -> Dict[str, Any]:
    """Sample PLAN mode context."""
    return {
        "mode": "plan",
        "vision": "Streaming platform for artists",
        "active_agents": 12
    }


@pytest.fixture
def sample_ship_context() -> Dict[str, Any]:
    """Sample SHIP mode context."""
    return {
        "mode": "ship",
        "specification": "Complete technical spec",
        "active_agents": 8
    }


@pytest.fixture
def sample_validate_context() -> Dict[str, Any]:
    """Sample VALIDATE mode context."""
    return {
        "mode": "validate",
        "build_output": "Production deployment",
        "active_agents": 5
    }


@pytest.fixture
def sample_ship_gates_passing() -> Dict[str, Any]:
    """Sample context with all SHIP gates passing."""
    return {
        "code_written": True,
        "all_features_implemented": True,
        "no_todos": True,
        "tests_exist": True,
        "all_tests_passing": True,
        "coverage": 85,
        "deployed": True,
        "deployment_successful": True,
        "environment": "production",
        "url": "https://app.example.com",
        "health_check_passing": True,
        "publicly_accessible": True
    }


@pytest.fixture
def sample_constitutional_context() -> Dict[str, Any]:
    """Sample context for constitutional validation."""
    return {
        "description": "Original creative solution",
        "approach": "complete production-ready implementation",
        "ownership": "user",
        "export_capability": True,
        "open_formats": True,
        "lock_in": False,
        "quality": "production-ready",
        "deadline": None
    }
