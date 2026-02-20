"""Tests for agent implementations."""

import pytest
from inception_engine.agents.builders.bolt import BOLTAgent
from inception_engine.agents.builders.comet import COMETAgent
from inception_engine.agents.builders.systems import SYSTEMSAgent
from inception_engine.agents.validators.sentinel import SENTINELAgent
from inception_engine.agents.validators.patterns import PATTERNSAgent
from inception_engine.agents.validators.logic import LOGICAgent
from inception_engine.agents.validators.coverage import COVERAGEAgent


class TestBuilderAgents:
    """Test suite for builder agents."""
    
    def test_bolt_initialization(self):
        """Test BOLT agent initialization."""
        agent = BOLTAgent()
        
        assert agent.name == "BOLT"
        assert agent.agent_type == "builder"
        assert agent.hive == "AURORA"
        assert "ideate" in agent.active_modes
    
    def test_bolt_capabilities(self):
        """Test BOLT agent capabilities."""
        agent = BOLTAgent()
        capabilities = agent.get_capabilities()
        
        assert len(capabilities) > 0
        assert any("React" in cap for cap in capabilities)
    
    def test_bolt_execute_frontend(self):
        """Test BOLT frontend execution."""
        agent = BOLTAgent()
        result = agent.execute(
            {"type": "frontend", "framework": "React"},
            {"mode": "ship"}
        )
        
        assert result["status"] == "success"
        assert "deliverables" in result
    
    def test_comet_initialization(self):
        """Test COMET agent initialization."""
        agent = COMETAgent()
        
        assert agent.name == "COMET"
        assert agent.specialization == "backend_api"
    
    def test_comet_execute_api(self):
        """Test COMET API execution."""
        agent = COMETAgent()
        result = agent.execute(
            {"type": "api", "style": "REST"},
            {"mode": "ship"}
        )
        
        assert result["status"] == "success"
        assert "deliverables" in result
    
    def test_systems_initialization(self):
        """Test SYSTEMS agent initialization."""
        agent = SYSTEMSAgent()
        
        assert agent.name == "SYSTEMS"
        assert agent.specialization == "devops_infrastructure"
    
    def test_systems_execute_deploy(self):
        """Test SYSTEMS deployment execution."""
        agent = SYSTEMSAgent()
        result = agent.execute(
            {"type": "deploy", "platform": "GCP"},
            {"mode": "ship"}
        )
        
        assert result["status"] == "success"
        assert "urls" in result


class TestValidatorAgents:
    """Test suite for validator agents."""
    
    def test_sentinel_initialization(self):
        """Test SENTINEL agent initialization."""
        agent = SENTINELAgent()
        
        assert agent.name == "SENTINEL"
        assert agent.agent_type == "validator"
        assert "validate" in agent.active_modes
    
    def test_sentinel_execute(self):
        """Test SENTINEL security validation."""
        agent = SENTINELAgent()
        result = agent.execute(
            {"type": "security_scan"},
            {"mode": "validate", "code": "test"}
        )
        
        assert "passed" in result
        assert "score" in result
        assert result["validation_type"] == "security"
    
    def test_patterns_initialization(self):
        """Test PATTERNS agent initialization."""
        agent = PATTERNSAgent()
        
        assert agent.name == "PATTERNS"
        assert agent.specialization == "architecture"
    
    def test_patterns_execute(self):
        """Test PATTERNS architecture validation."""
        agent = PATTERNSAgent()
        result = agent.execute(
            {"type": "architecture_review"},
            {"mode": "validate", "code": "test"}
        )
        
        assert "passed" in result
        assert result["validation_type"] == "architecture"
    
    def test_logic_initialization(self):
        """Test LOGIC agent initialization."""
        agent = LOGICAgent()
        
        assert agent.name == "LOGIC"
        assert agent.specialization == "logic"
    
    def test_logic_execute(self):
        """Test LOGIC behavioral validation."""
        agent = LOGICAgent()
        result = agent.execute(
            {"type": "logic_validation"},
            {"mode": "validate", "code": "test"}
        )
        
        assert "passed" in result
        assert result["validation_type"] == "logic"
    
    def test_coverage_initialization(self):
        """Test COVERAGE agent initialization."""
        agent = COVERAGEAgent()
        
        assert agent.name == "COVERAGE"
        assert agent.specialization == "testing"
    
    def test_coverage_execute(self):
        """Test COVERAGE test evaluation."""
        agent = COVERAGEAgent()
        result = agent.execute(
            {"type": "coverage_analysis"},
            {"mode": "validate", "tests": "present"}
        )
        
        assert "passed" in result
        assert result["validation_type"] == "coverage"
