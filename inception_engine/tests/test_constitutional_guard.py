"""Tests for ConstitutionalGuard - Agent Constitution enforcement."""

import pytest
from inception_engine.core.constitutional_guard import ConstitutionalGuard


class TestConstitutionalGuard:
    """Test suite for ConstitutionalGuard."""
    
    def setup_method(self):
        """Setup for each test."""
        self.guard = ConstitutionalGuard()
    
    def test_initialization(self):
        """Test constitutional guard initialization."""
        assert self.guard is not None
        assert len(self.guard.articles) == 18
    
    def test_article_0_pass(self):
        """Test Article 0 (no stealing) passing."""
        context = {
            "description": "Study competitor approach and synthesize original solution",
            "approach": "learn and create"
        }
        
        result = self.guard.validate_article(0, context)
        
        assert result["compliant"] is True
        assert result["article"] == 0
    
    def test_article_0_fail(self):
        """Test Article 0 (no stealing) failing."""
        context = {
            "description": "Copy the design from competitor",
            "approach": "duplicate"
        }
        
        result = self.guard.validate_article(0, context)
        
        assert result["compliant"] is False
        assert "forbidden" in str(result["violations"]).lower()
    
    def test_article_17_pass(self):
        """Test Article XVII (zero day) passing."""
        context = {
            "approach": "complete solution",
            "quality": "production-ready",
            "deadline": None
        }
        
        result = self.guard.validate_article(17, context)
        
        assert result["compliant"] is True
    
    def test_article_17_fail(self):
        """Test Article XVII (zero day) failing."""
        context = {
            "approach": "MVP for quick launch",
            "quality": "good enough",
            "deadline": "tomorrow"
        }
        
        result = self.guard.validate_article(17, context)
        
        assert result["compliant"] is False
    
    def test_article_18_pass(self):
        """Test Article XVIII (generative agency) passing."""
        context = {
            "ownership": "user",
            "export_capability": True,
            "open_formats": True,
            "lock_in": False
        }
        
        result = self.guard.validate_article(18, context)
        
        assert result["compliant"] is True
    
    def test_article_18_fail(self):
        """Test Article XVIII (generative agency) failing."""
        context = {
            "ownership": "platform",
            "export_capability": False,
            "lock_in": True
        }
        
        result = self.guard.validate_article(18, context)
        
        assert result["compliant"] is False
    
    def test_validate_all_articles_pass(self):
        """Test validating all articles passing."""
        context = {
            "description": "Original creative work",
            "approach": "complete solution",
            "ownership": "user",
            "export_capability": True,
            "quality": "production-ready"
        }
        
        result = self.guard.validate_all_articles(context)
        
        assert result["fully_compliant"] is True
        assert result["compliance_score"] == 100
        assert len(result["violations"]) == 0
    
    def test_validate_all_articles_fail(self):
        """Test validating with violations."""
        context = {
            "description": "Copy competitor design",
            "approach": "MVP",
            "ownership": "platform"
        }
        
        result = self.guard.validate_all_articles(context)
        
        assert result["fully_compliant"] is False
        assert result["compliance_score"] < 100
        assert len(result["violations"]) > 0
