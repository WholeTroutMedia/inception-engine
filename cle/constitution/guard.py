"""
Creative Liberation Engine v5 — Constitutional Guard

Enforces the cle Constitution on all agent actions.
Every agent output passes through this guard before execution.

Lineage: v4 constitution_guard.py → v5 (simplified, faster, cleaner)
"""

import logging
import re
from typing import Any

from cle.constitution.articles import ARTICLES
from cle.constitution.types import ConstitutionResult, Violation, ViolationSeverity

logger = logging.getLogger(__name__)


class ConstitutionalGuard:
    """
    Guards all agent actions against constitutional principles.

    Usage:
        guard = ConstitutionalGuard()
        result = guard.check(action="delete all files", context={})
        if not result.allowed:
            raise ConstitutionViolation(result.reason)
    """

    def __init__(self, strict: bool = True):
        self.strict = strict
        self._check_count = 0
        self._violation_count = 0

    def check(
        self,
        action: str,
        context: dict[str, Any],
        agent_name: str = "",
    ) -> ConstitutionResult:
        """
        Check an action against all constitutional articles.

        Args:
            action: The action description to check
            context: Execution context (mode, task, etc.)
            agent_name: Name of the agent requesting the action

        Returns:
            ConstitutionResult with allowed flag and any violations
        """
        self._check_count += 1
        violations = []

        action_lower = action.lower()

        for article in ARTICLES:
            violation = article.check(action_lower, context)
            if violation:
                violations.append(violation)
                if violation.severity == ViolationSeverity.CRITICAL:
                    # Stop immediately on critical violations
                    self._violation_count += 1
                    logger.warning(
                        f"CRITICAL violation by {agent_name}: {violation.message}"
                    )
                    return ConstitutionResult(
                        allowed=False,
                        violations=[violation],
                        reason=violation.message,
                        checked_by=agent_name,
                    )

        if violations:
            self._violation_count += 1
            logger.info(
                f"Constitution violations ({len(violations)}) by {agent_name}: "
                f"{[v.article for v in violations]}"
            )

            # In strict mode, any violation blocks
            if self.strict:
                return ConstitutionResult(
                    allowed=False,
                    violations=violations,
                    reason=f"Blocked by articles: {', '.join(v.article for v in violations)}",
                    checked_by=agent_name,
                )

        return ConstitutionResult(
            allowed=True,
            violations=violations,
            reason="",
            checked_by=agent_name,
        )

    def check_batch(
        self,
        actions: list[str],
        context: dict[str, Any],
        agent_name: str = "",
    ) -> list[ConstitutionResult]:
        """Check multiple actions at once."""
        return [self.check(action, context, agent_name) for action in actions]

    def get_stats(self) -> dict[str, int]:
        """Get guard statistics."""
        return {
            "total_checks": self._check_count,
            "total_violations": self._violation_count,
            "pass_rate": int(
                (1 - self._violation_count / max(self._check_count, 1)) * 100
            ),
        }
