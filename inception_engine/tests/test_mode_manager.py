"""Tests for ModeManager - Mode lifecycle and transitions."""

import pytest
from inception_engine.core.mode_manager import ModeManager, ModeType


class TestModeManager:
    """Test suite for ModeManager."""
    
    def setup_method(self):
        """Setup for each test."""
        self.manager = ModeManager()
    
    def test_initialization(self):
        """Test mode manager initialization."""
        assert self.manager.current_mode is None
        assert len(self.manager.mode_history) == 0
    
    def test_start_ideate_mode(self):
        """Test starting IDEATE mode."""
        result = self.manager.start_mode(ModeType.IDEATE, {"prompt": "test"})
        
        assert result["success"] is True
        assert self.manager.current_mode == ModeType.IDEATE
        assert len(self.manager.mode_history) == 1
    
    def test_start_plan_mode(self):
        """Test starting PLAN mode."""
        result = self.manager.start_mode(ModeType.PLAN, {"vision": "test"})
        
        assert result["success"] is True
        assert self.manager.current_mode == ModeType.PLAN
    
    def test_start_ship_mode(self):
        """Test starting SHIP mode."""
        result = self.manager.start_mode(ModeType.SHIP, {"spec": "test"})
        
        assert result["success"] is True
        assert self.manager.current_mode == ModeType.SHIP
    
    def test_start_validate_mode(self):
        """Test starting VALIDATE mode."""
        result = self.manager.start_mode(ModeType.VALIDATE, {"build": "test"})
        
        assert result["success"] is True
        assert self.manager.current_mode == ModeType.VALIDATE
    
    def test_mode_transition(self):
        """Test transitioning between modes."""
        self.manager.start_mode(ModeType.IDEATE, {"prompt": "test"})
        self.manager.complete_mode({"vision": "created"})
        
        result = self.manager.start_mode(ModeType.PLAN, {"vision": "test"})
        
        assert result["success"] is True
        assert self.manager.current_mode == ModeType.PLAN
        assert len(self.manager.mode_history) == 2
    
    def test_complete_mode(self):
        """Test completing a mode."""
        self.manager.start_mode(ModeType.IDEATE, {"prompt": "test"})
        result = self.manager.complete_mode({"vision": "created"})
        
        assert result["success"] is True
        assert self.manager.current_mode is None
    
    def test_get_mode_history(self):
        """Test retrieving mode history."""
        self.manager.start_mode(ModeType.IDEATE, {"prompt": "test"})
        self.manager.complete_mode({"vision": "created"})
        
        history = self.manager.get_mode_history()
        
        assert len(history) == 1
        assert history[0]["mode"] == ModeType.IDEATE
        assert "started_at" in history[0]
        assert "completed_at" in history[0]
