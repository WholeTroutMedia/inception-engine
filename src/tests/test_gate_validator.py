"""Tests for GateValidator - SHIP mode production gates."""

import pytest
from inception_engine.core.gate_validator import GateValidator


class TestGateValidator:
    """Test suite for GateValidator."""
    
    def setup_method(self):
        """Setup for each test."""
        self.validator = GateValidator()
    
    def test_initialization(self):
        """Test gate validator initialization."""
        assert self.validator is not None
        assert len(self.validator.gates) == 4
    
    def test_code_complete_gate_pass(self):
        """Test code complete gate passing."""
        context = {
            "code_written": True,
            "all_features_implemented": True,
            "no_todos": True
        }
        
        result = self.validator.validate_gate("code_complete", context)
        
        assert result["passed"] is True
        assert result["gate"] == "code_complete"
    
    def test_code_complete_gate_fail(self):
        """Test code complete gate failing."""
        context = {
            "code_written": False,
            "all_features_implemented": False
        }
        
        result = self.validator.validate_gate("code_complete", context)
        
        assert result["passed"] is False
        assert len(result["issues"]) > 0
    
    def test_tests_passing_gate(self):
        """Test tests passing gate."""
        context = {
            "tests_exist": True,
            "all_tests_passing": True,
            "coverage": 85
        }
        
        result = self.validator.validate_gate("tests_passing", context)
        
        assert result["passed"] is True
    
    def test_deployed_gate(self):
        """Test deployment gate."""
        context = {
            "deployed": True,
            "environment": "production",
            "deployment_successful": True
        }
        
        result = self.validator.validate_gate("deployed", context)
        
        assert result["passed"] is True
    
    def test_live_accessible_gate(self):
        """Test live and accessible gate."""
        context = {
            "url": "https://app.example.com",
            "health_check_passing": True,
            "publicly_accessible": True
        }
        
        result = self.validator.validate_gate("live_accessible", context)
        
        assert result["passed"] is True
    
    def test_validate_all_gates_pass(self):
        """Test validating all gates passing."""
        context = {
            "code_written": True,
            "all_features_implemented": True,
            "tests_exist": True,
            "all_tests_passing": True,
            "coverage": 85,
            "deployed": True,
            "deployment_successful": True,
            "url": "https://app.example.com",
            "health_check_passing": True,
            "publicly_accessible": True
        }
        
        result = self.validator.validate_all_gates(context)
        
        assert result["all_passed"] is True
        assert len(result["passed_gates"]) == 4
        assert len(result["failed_gates"]) == 0
    
    def test_validate_all_gates_fail(self):
        """Test validating with some gates failing."""
        context = {
            "code_written": True,
            "tests_exist": False  # This will cause failure
        }
        
        result = self.validator.validate_all_gates(context)
        
        assert result["all_passed"] is False
        assert len(result["failed_gates"]) > 0
