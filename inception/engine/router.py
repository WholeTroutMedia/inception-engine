"""
Creative Liberation Engine v5 — Task Router

Routes incoming tasks to the appropriate agent(s) based on task analysis.
Uses keyword matching, hive affinity, and mode awareness.

Lineage: v4 orchestrator/router.py → v5 (tier-aware, production-complete)
"""

import logging
import re
from typing import Any, Optional

from inception.agents.base import InceptionAgent
from inception.agents.registry import AgentRegistry

logger = logging.getLogger(__name__)


# ============================================================
# Routing Rules — keyword → agent mapping
# ============================================================

ROUTE_PATTERNS: dict[str, list[str]] = {
    # Aurora Hive
    "BOLT": [
        r"\b(code|implement|build|create|write|fix|debug|refactor)\b",
        r"\b(function|class|module|component|api|endpoint)\b",
        r"\b(python|typescript|javascript|react|fastapi)\b",
    ],
    "COMET": [
        r"\b(browser|navigate|scrape|automat|selenium|playwright)\b",
        r"\b(click|scroll|screenshot|web\s*page)\b",
    ],
    "Aurora": [
        r"\b(design|architect|ui|ux|layout|visual|aesthetic)\b",
        r"\b(color|font|style|theme|component\s*library)\b",
    ],
    # Keeper Hive
    "KEEPER": [
        r"\b(organize|structure|catalog|index|knowledge)\b",
        r"\b(documentation|wiki|reference|archive)\b",
    ],
    "ARCH": [
        r"\b(pattern|architecture|system\s*design|infrastructure)\b",
        r"\b(scale|performance|optimization|bottleneck)\b",
    ],
    "CODEX": [
        r"\b(document|readme|guide|tutorial|api\s*docs)\b",
        r"\b(changelog|specification|blueprint)\b",
    ],
    # Lex Hive
    "LEX": [
        r"\b(legal|compliance|license|privacy|gdpr|terms)\b",
        r"\b(contract|agreement|policy)\b",
    ],
    "COMPASS": [
        r"\b(constitution|article|violation|complian)\b",
        r"\b(ethic|sovereign|principle)\b",
    ],
    # Switchboard Hive
    "RELAY": [
        r"\b(route|connect|delegate|assign|dispatch)\b",
        r"\b(who\s*should|which\s*agent)\b",
    ],
    # Broadcast Hive
    "SIGNAL": [
        r"\b(api|integration|webhook|external|third.party)\b",
        r"\b(send|notify|broadcast|publish)\b",
    ],
}

# Compiled patterns for performance
_COMPILED_PATTERNS: dict[str, list[re.Pattern]] = {}


def _compile_patterns() -> None:
    """Compile regex patterns once."""
    global _COMPILED_PATTERNS
    if not _COMPILED_PATTERNS:
        for agent_name, patterns in ROUTE_PATTERNS.items():
            _COMPILED_PATTERNS[agent_name] = [
                re.compile(p, re.IGNORECASE) for p in patterns
            ]


class TaskRouter:
    """
    Routes tasks to the appropriate agent(s).

    Uses a scoring system: each pattern match adds to an agent's score.
    The highest-scoring agent(s) are selected. Ties are broken by hive priority.

    Usage:
        router = TaskRouter(registry)
        matches = router.route("Build a FastAPI endpoint for user auth")
        # Returns: [("BOLT", 3), ("SIGNAL", 1)]
    """

    # Hive priority for tie-breaking (lower = higher priority)
    HIVE_PRIORITY: dict[str, int] = {
        "AURORA": 1,
        "KEEPER": 2,
        "LEX": 3,
        "SWITCHBOARD": 4,
        "BROADCAST": 5,
        "AVERI": 6,
    }

    def __init__(self, registry: AgentRegistry):
        self.registry = registry
        _compile_patterns()

    def route(
        self,
        task: str,
        mode: str = "ship",
        tier: str = "studio",
        max_agents: int = 3,
    ) -> list[tuple[str, float]]:
        """
        Route a task to the best agent(s).

        Args:
            task: The task description text
            mode: Current mode (filters agents by active_modes)
            tier: Access tier (filters agents by tier access)
            max_agents: Maximum number of agents to return

        Returns:
            List of (agent_name, score) tuples, sorted by score descending
        """
        scores: dict[str, float] = {}

        # Score each agent based on pattern matches
        for agent_name, patterns in _COMPILED_PATTERNS.items():
            agent = self.registry.get(agent_name)
            if agent is None:
                continue

            # Filter by mode
            if not agent.can_execute_in_mode(mode):
                continue

            # Score based on pattern matches
            score = 0.0
            for pattern in patterns:
                matches = pattern.findall(task)
                score += len(matches)

            if score > 0:
                # Apply hive priority bonus (small tiebreaker)
                priority = self.HIVE_PRIORITY.get(agent.hive, 10)
                score += (10 - priority) * 0.01  # Small bonus for high-priority hives
                scores[agent_name] = score

        # Sort by score, take top N
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        result = sorted_scores[:max_agents]

        if result:
            names = ", ".join(f"{name}({score:.1f})" for name, score in result)
            logger.info(f"Routed task to: {names}")
        else:
            logger.warning(f"No agent matched for task: {task[:80]}...")
            # Default to BOLT for unmatched tasks in SHIP mode
            if mode == "ship" and self.registry.get("BOLT"):
                result = [("BOLT", 0.1)]
                logger.info("Defaulting to BOLT for unmatched SHIP task")

        return result

    def explain_routing(self, task: str) -> dict[str, Any]:
        """
        Explain why a task was routed to specific agents.
        Useful for debugging and transparency (Article IV).
        """
        explanations: dict[str, list[str]] = {}

        for agent_name, patterns in _COMPILED_PATTERNS.items():
            matched_patterns: list[str] = []
            for pattern in patterns:
                matches = pattern.findall(task)
                if matches:
                    matched_patterns.extend(matches)

            if matched_patterns:
                explanations[agent_name] = matched_patterns

        return {
            "task": task,
            "matches": explanations,
            "recommended": self.route(task),
        }
