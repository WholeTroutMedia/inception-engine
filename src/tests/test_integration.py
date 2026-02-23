"""Integration tests for agent orchestration and workflow.

Tests the interaction between ModeManager, ConstitutionalGuard,
GateValidator, and agent system working together.
"""
import pytest
import sys
import os
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.mode_manager import ModeManager, ModeType, ModeStatus, ModeSession
from core.constitutional_guard import ConstitutionalGuard, ComplianceResult
from core.gate_validator import GateValidator, GateStatus


# ============================================================
# Integration: Mode Manager + Constitutional Guard
# ============================================================

class TestModeConstitutionalIntegration:
    """Test mode transitions with constitutional compliance."""

    def setup_method(self):
        self.mm = ModeManager(modes_dir="__nonexistent__")
        self.guard = ConstitutionalGuard()

    def test_ideate_mode_compliant_action(self):
        """IDEATE mode with a constitutionally clean action."""
        result = self.mm.start_mode(ModeType.IDEATE, {"prompt": "Artist portfolio"})
        assert result["success"] is True
        assert result["mode"] == "IDEATE"

        action = {
            "description": "Original creative solution with open format export",
            "logging_enabled": True,
            "human_can_override": True,
        }
        compliance = self.guard.verify_full_compliance(action)
        assert compliance.is_compliant is True
        assert compliance.overall_score >= 85

        complete = self.mm.complete_mode({"vision": "Artist-first platform"})
        assert complete["success"] is True

    def test_ship_mode_requires_gates(self):
        """SHIP mode must validate gates before completion."""
        result = self.mm.start_mode(ModeType.SHIP, {"spec": "Tech spec"})
        assert result["success"] is True

        gate_validator = GateValidator()
        context = {
            "code_path": None,
            "test_command": None,
            "production_url": "https://app.example.com",
        }
        all_passed, results = gate_validator.validate_all_gates(context)
        # Without valid code_path and test_command, gates should fail
        assert all_passed is False
        failed = gate_validator.get_failed_gates()
        assert len(failed) > 0

    def test_full_mode_lifecycle(self):
        """Test IDEATE -> PLAN -> SHIP -> VALIDATE lifecycle."""
        # IDEATE
        r1 = self.mm.start_mode(ModeType.IDEATE, {"prompt": "Test project"})
        assert r1["success"]
        self.mm.complete_mode({"vision": "Test vision"})

        # PLAN
        r2 = self.mm.start_mode(ModeType.PLAN, {"vision": "Test vision"})
        assert r2["success"]
        self.mm.complete_mode({"spec": "Test spec"})

        # SHIP
        r3 = self.mm.start_mode(ModeType.SHIP, {"spec": "Test spec"})
        assert r3["success"]
        self.mm.complete_mode({"deployed": True})

        # VALIDATE
        r4 = self.mm.start_mode(ModeType.VALIDATE, {"build": "Test build"})
        assert r4["success"]
        self.mm.complete_mode({"validation_passed": True})

        # Check history
        summary = self.mm.get_session_summary()
        assert summary["total_sessions"] == 4

    def test_constitutional_violation_detection(self):
        """Constitutional guard catches Article 0 violations."""
        bad_action = {
            "description": "steal competitor design",
            "agent_role": "BOLT",
        }
        result = self.guard.verify_full_compliance(bad_action)
        assert result.is_compliant is False

        # Article 0 check should have score 0
        art0 = next((c for c in result.checks if "Article 0" in c.article), None)
        assert art0 is not None
        assert art0.score == 0


# ============================================================
# Integration: Gate Validator
# ============================================================

class TestGateValidatorIntegration:
    """Test SHIP mode gate validation."""

    def setup_method(self):
        self.validator = GateValidator()

    def test_all_gates_with_valid_url(self):
        """Gates with valid production URL pass deployment gate."""
        context = {
            "code_path": "/tmp/test_project",
            "production_url": "https://app.example.com",
            "deployment_id": "deploy_001",
        }
        all_passed, results = self.validator.validate_all_gates(context)
        # Deployment gate should pass (valid URL format)
        deployment = next((r for r in results if r.gate_name == "deployment_live"), None)
        assert deployment is not None
        assert deployment.status == GateStatus.PASS

    def test_gate_summary(self):
        """Gate summary returns correct structure."""
        context = {
            "code_path": "/tmp/test",
            "production_url": "https://example.com",
        }
        self.validator.validate_all_gates(context)
        summary = self.validator.get_summary()
        assert "total_gates" in summary
        assert "passed" in summary
        assert "failed" in summary
        assert "success_rate" in summary
        assert summary["total_gates"] == 4

    def test_individual_gate_validation(self):
        """Test validating individual gates by name."""
        context = {"production_url": "https://app.test.com"}
        result = self.validator.validate_gate("deployed", context)
        assert result["passed"] is True
        assert result["gate"] == "deployed"

    def test_unknown_gate_returns_failure(self):
        """Unknown gate name returns failure."""
        result = self.validator.validate_gate("nonexistent_gate", {})
        assert result["passed"] is False


# ============================================================
# Integration: Constitutional Guard Article Checks
# ============================================================

class TestConstitutionalArticleIntegration:
    """Test constitutional article validation in context."""

    def setup_method(self):
        self.guard = ConstitutionalGuard()

    def test_validate_specific_article(self):
        """Validate a single article by index."""
        context = {"description": "Original creative work"}
        result = self.guard.validate_article(0, context)  # Article 0
        assert result["compliant"] is True
        assert result["score"] == 100

    def test_validate_all_articles(self):
        """Validate all articles and get summary."""
        context = {
            "description": "Original creative solution",
            "logging_enabled": True,
            "human_can_override": True,
        }
        result = self.guard.validate_all_articles(context)
        assert "fully_compliant" in result
        assert "articles_checked" in result
        assert result["articles_checked"] >= 18
        assert "passed" in result
        assert "failed" in result

    def test_invalid_article_index(self):
        """Invalid article index returns failure."""
        result = self.guard.validate_article(999, {})
        assert result["compliant"] is False

    def test_mvp_detection(self):
        """Article XV catches MVP language."""
        # Article XV is index 16 in the methods list
        mvp_action = {"description": "Ship the mvp quickly"}
        result = self.guard.validate_article(16, mvp_action)
        assert result["compliant"] is False

    def test_separation_of_powers(self):
        """Article II catches COMPASS executing."""
        action = {
            "agent_role": "COMPASS",
            "actions": ["execute deployment"],
        }
        result = self.guard.validate_article(2, action)
        assert result["compliant"] is False


# ============================================================
# Integration: Mode Transitions
# ============================================================

class TestModeTransitionIntegration:
    """Test mode transition logic."""

    def setup_method(self):
        self.mm = ModeManager(modes_dir="__nonexistent__")

    def test_standard_transitions(self):
        """Standard mode transitions follow the pipeline."""
        assert self.mm.transition_to_next_mode(ModeType.IDEATE) == ModeType.PLAN
        assert self.mm.transition_to_next_mode(ModeType.PLAN) == ModeType.SHIP
        assert self.mm.transition_to_next_mode(ModeType.SHIP) == ModeType.VALIDATE
        assert self.mm.transition_to_next_mode(ModeType.VALIDATE) is None

    def test_mode_history_tracking(self):
        """Mode history is tracked correctly."""
        self.mm.start_mode(ModeType.IDEATE, {"prompt": "test"})
        self.mm.complete_mode({"result": "done"})

        self.mm.start_mode(ModeType.PLAN, {"vision": "test"})
        self.mm.complete_mode({"spec": "done"})

        history = self.mm.get_mode_history()
        assert len(history) >= 2
        assert history[0]["mode"] == ModeType.IDEATE

    def test_session_summary_structure(self):
        """Session summary has correct structure."""
        self.mm.start_mode(ModeType.IDEATE, {"prompt": "test"})
        self.mm.complete_mode({"result": "done"})

        summary = self.mm.get_session_summary()
        assert "total_sessions" in summary
        assert "sessions_by_mode" in summary
        assert "recent_sessions" in summary

    def test_default_configs_available(self):
        """Default configs are available for all modes."""
        for mode in ModeType:
            config = self.mm.get_config(mode)
            assert config is not None
            assert config.mode == mode
            assert config.version is not None
