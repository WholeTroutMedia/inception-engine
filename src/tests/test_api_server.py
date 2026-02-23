"""Tests for API Server - FastAPI endpoints for all four modes.

Tests use FastAPI TestClient to validate endpoint behavior without
running a live server. The orchestrator is mocked to isolate API
routing logic from mode execution.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from api.server import app


client = TestClient(app)


# --- Health Check ---

class TestHealthCheck:
    """Tests for health endpoint."""

    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_has_required_fields(self):
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data
        assert "modes" in data

    def test_health_lists_all_modes(self):
        response = client.get("/health")
        modes = response.json()["modes"]
        assert "IDEATE" in modes
        assert "PLAN" in modes
        assert "SHIP" in modes
        assert "VALIDATE" in modes


# --- Mode Endpoints ---

class TestModeEndpoints:
    """Tests for mode execution endpoints."""

    @patch("api.server.orchestrator")
    def test_ideate_endpoint(self, mock_orch):
        mock_orch.execute_mode.return_value = {
            "vision_document": {"prompt": "test"},
            "agent_count": 30,
            "session_id": "ideate_001",
        }
        response = client.post(
            "/api/v1/modes/ideate",
            json={"prompt": "Build a streaming platform"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["mode"] == "IDEATE"
        assert "result" in data

    @patch("api.server.orchestrator")
    def test_plan_endpoint(self, mock_orch):
        mock_orch.execute_mode.return_value = {
            "technical_specification": {},
            "session_id": "plan_001",
        }
        response = client.post(
            "/api/v1/modes/plan",
            json={"vision_document": "Test vision"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["mode"] == "PLAN"

    @patch("api.server.orchestrator")
    def test_ship_endpoint(self, mock_orch):
        mock_orch.execute_mode.return_value = {
            "production_url": "https://test.deployed.com",
            "code_complete": True,
            "session_id": "ship_001",
        }
        response = client.post(
            "/api/v1/modes/ship",
            json={"technical_specification": "Test spec"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["mode"] == "SHIP"

    @patch("api.server.orchestrator")
    def test_validate_endpoint(self, mock_orch):
        mock_orch.execute_mode.return_value = {
            "validation_passed": True,
            "results": {},
            "session_id": "validate_001",
        }
        response = client.post(
            "/api/v1/modes/validate",
            json={"build_output": {"url": "https://test.com"}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["mode"] == "VALIDATE"

    @patch("api.server.orchestrator")
    def test_mode_error_returns_500(self, mock_orch):
        mock_orch.execute_mode.side_effect = Exception("Mode failed")
        response = client.post(
            "/api/v1/modes/ideate",
            json={"prompt": "fail test"},
        )
        assert response.status_code == 500


# --- Workflow Endpoints ---

class TestWorkflowEndpoints:
    """Tests for workflow shortcut endpoints."""

    @patch("api.server.orchestrator")
    def test_express_workflow(self, mock_orch):
        mock_orch.execute_express_workflow.return_value = {
            "workflow": "express",
            "shipping": {"production_url": "https://test.com"},
            "validation": {"validation_passed": True},
        }
        response = client.post(
            "/api/v1/workflows/express",
            json={"prompt": "Quick app"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["workflow"] == "express"

    @patch("api.server.orchestrator")
    def test_rapid_workflow(self, mock_orch):
        mock_orch.execute_rapid_workflow.return_value = {
            "workflow": "rapid",
            "ideation": {},
            "shipping": {},
            "validation": {},
        }
        response = client.post(
            "/api/v1/workflows/rapid",
            json={"prompt": "Fast app"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["workflow"] == "rapid"

    @patch("api.server.orchestrator")
    def test_full_lifecycle_workflow(self, mock_orch):
        mock_orch.execute_full_lifecycle.return_value = {
            "workflow": "full_lifecycle",
            "ideation": {},
            "planning": {},
            "shipping": {},
            "validation": {},
        }
        response = client.post(
            "/api/v1/workflows/full",
            json={"prompt": "Complete app"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["workflow"] == "full_lifecycle"


# --- Validation Endpoints ---

class TestValidationEndpoints:
    """Tests for validation and compliance."""

    def test_missing_required_field(self):
        response = client.post(
            "/api/v1/modes/ideate",
            json={},
        )
        assert response.status_code == 422  # Validation error

    def test_invalid_json(self):
        response = client.post(
            "/api/v1/modes/ideate",
            content="not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# --- Request Format Checks ---

class TestRequestFormats:
    """Tests for Pydantic model validation."""

    def test_ideate_requires_prompt(self):
        response = client.post(
            "/api/v1/modes/ideate",
            json={"context": {}},
        )
        assert response.status_code == 422

    def test_plan_requires_vision_document(self):
        response = client.post(
            "/api/v1/modes/plan",
            json={"context": {}},
        )
        assert response.status_code == 422

    def test_ship_requires_technical_specification(self):
        response = client.post(
            "/api/v1/modes/ship",
            json={"context": {}},
        )
        assert response.status_code == 422

    def test_validate_requires_build_output(self):
        response = client.post(
            "/api/v1/modes/validate",
            json={"context": {}},
        )
        assert response.status_code == 422
