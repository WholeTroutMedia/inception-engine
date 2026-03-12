"""
Creative Liberation Engine v5 — Constitution Types

Pydantic models for constitutional checking.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class ViolationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Violation(BaseModel):
    """A single constitutional violation."""
    article: str
    message: str
    severity: ViolationSeverity = ViolationSeverity.HIGH
    matched_pattern: str = ""


class ConstitutionResult(BaseModel):
    """Result of a constitutional check."""
    allowed: bool
    violations: list[Violation] = []
    reason: str = ""
    checked_by: str = ""

    @property
    def is_clean(self) -> bool:
        return len(self.violations) == 0

    @property
    def critical_violations(self) -> list[Violation]:
        return [v for v in self.violations if v.severity == ViolationSeverity.CRITICAL]
