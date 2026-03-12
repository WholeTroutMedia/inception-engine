"""
Creative Liberation Engine v5 — Constitutional Articles

The actual rules. Each article defines what's prohibited and how to detect it.

Lineage: v4 constitution.md + constitution_guard.py → v5 (code-first)
"""

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from cle.constitution.types import Violation, ViolationSeverity


@dataclass
class Article:
    """
    A constitutional article with detection logic.

    Each article has:
    - id: Short identifier (e.g., "A1", "A2")
    - title: Human-readable name
    - description: What it prohibits
    - patterns: Regex patterns that trigger it
    - check_fn: Optional custom check function
    - severity: How serious violations are
    """
    id: str
    title: str
    description: str
    patterns: list[str] = field(default_factory=list)
    check_fn: Optional[Callable[[str, dict], bool]] = None
    severity: ViolationSeverity = ViolationSeverity.HIGH

    def check(self, action: str, context: dict[str, Any]) -> Optional[Violation]:
        """Check if this article is violated."""
        # Pattern matching
        for pattern in self.patterns:
            if re.search(pattern, action, re.IGNORECASE):
                return Violation(
                    article=self.id,
                    message=f"Article {self.id} ({self.title}): {self.description}",
                    severity=self.severity,
                    matched_pattern=pattern,
                )

        # Custom check
        if self.check_fn and self.check_fn(action, context):
            return Violation(
                article=self.id,
                message=f"Article {self.id} ({self.title}): {self.description}",
                severity=self.severity,
            )

        return None


ARTICLES: list[Article] = [
    Article(
        id="A1",
        title="No Destructive Operations",
        description="Never delete, destroy, or irreversibly modify without explicit confirmation",
        patterns=[
            r"rm -rf",
            r"delete.*all",
            r"drop.*table",
            r"truncate.*table",
            r"format.*disk",
            r"wipe.*data",
        ],
        severity=ViolationSeverity.CRITICAL,
    ),
    Article(
        id="A2",
        title="No Secret Exfiltration",
        description="Never expose API keys, tokens, passwords, or secrets",
        patterns=[
            r"api.?key",
            r"secret.?key",
            r"password",
            r"private.?key",
            r"access.?token",
        ],
        check_fn=lambda action, ctx: "env" in action and "print" in action,
        severity=ViolationSeverity.CRITICAL,
    ),
    Article(
        id="A3",
        title="No Unauthorized Access",
        description="Never access systems, files, or APIs without proper authorization",
        patterns=[
            r"bypass.*auth",
            r"skip.*permission",
            r"sudo.*without",
        ],
        severity=ViolationSeverity.HIGH,
    ),
    Article(
        id="A4",
        title="No Misrepresentation",
        description="Never impersonate, deceive, or misrepresent capabilities",
        patterns=[
            r"pretend.*human",
            r"deny.*ai",
            r"fake.*identity",
        ],
        severity=ViolationSeverity.HIGH,
    ),
    Article(
        id="A5",
        title="Maintain Audit Trail",
        description="All significant actions must be logged and traceable",
        patterns=[],  # Checked by enforcement logic, not patterns
        severity=ViolationSeverity.MEDIUM,
    ),
]
