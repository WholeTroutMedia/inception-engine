"""
Creative Liberation Engine v5 — Execution Gates

Gates control the flow of execution between agents and modes.
Each gate is a checkpoint that can allow, block, or transform requests.

Lineage: v4 orchestrator/gates.py → v5 (simplified, async-first)
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class GateResult:
    """Result from a gate check."""
    passed: bool
    gate_name: str
    reason: str = ""
    modified_context: Optional[dict[str, Any]] = None
    duration_ms: float = 0.0

    @property
    def blocked(self) -> bool:
        return not self.passed


@dataclass
class Gate:
    """
    A single execution gate.

    Gates can:
    1. Allow/block execution
    2. Modify context before passing to the next gate
    3. Log/audit the request
    """
    name: str
    description: str
    check_fn: Callable[[dict[str, Any]], tuple[bool, str]]
    transform_fn: Optional[Callable[[dict[str, Any]], dict[str, Any]]] = None
    enabled: bool = True
    skip_in_modes: list[str] = field(default_factory=list)

    def check(self, context: dict[str, Any]) -> GateResult:
        """Run the gate check."""
        start = time.perf_counter()

        if not self.enabled:
            return GateResult(passed=True, gate_name=self.name, reason="Gate disabled")

        mode = context.get("mode", "")
        if mode in self.skip_in_modes:
            return GateResult(passed=True, gate_name=self.name, reason=f"Skipped in {mode} mode")

        try:
            passed, reason = self.check_fn(context)
            modified = None

            if passed and self.transform_fn:
                modified = self.transform_fn(context)

            duration = (time.perf_counter() - start) * 1000

            return GateResult(
                passed=passed,
                gate_name=self.name,
                reason=reason,
                modified_context=modified,
                duration_ms=round(duration, 2),
            )
        except Exception as e:
            logger.error(f"Gate {self.name} check failed: {e}")
            return GateResult(
                passed=False,
                gate_name=self.name,
                reason=f"Gate error: {e}",
            )


class GatePipeline:
    """
    A pipeline of gates that must all pass for execution to proceed.

    Usage:
        pipeline = GatePipeline()
        pipeline.add(constitution_gate)
        pipeline.add(tier_gate)
        pipeline.add(mode_gate)

        results = pipeline.run(context)
        if pipeline.blocked(results):
            raise GateBlockedError(pipeline.block_reason(results))
    """

    def __init__(self):
        self._gates: list[Gate] = []
        self._run_count = 0
        self._block_count = 0

    def add(self, gate: Gate) -> None:
        """Add a gate to the pipeline."""
        self._gates.append(gate)
        logger.debug(f"Gate added: {gate.name}")

    def remove(self, gate_name: str) -> None:
        """Remove a gate by name."""
        self._gates = [g for g in self._gates if g.name != gate_name]

    def run(self, context: dict[str, Any]) -> list[GateResult]:
        """
        Run all gates in sequence.

        Short-circuits on first failure.

        Args:
            context: Execution context to check

        Returns:
            List of GateResults (may be partial on failure)
        """
        self._run_count += 1
        results = []

        for gate in self._gates:
            result = gate.check(context)
            results.append(result)

            # Apply any context modifications
            if result.passed and result.modified_context:
                context = result.modified_context

            # Short-circuit on failure
            if not result.passed:
                self._block_count += 1
                logger.info(
                    f"Pipeline blocked at gate '{gate.name}': {result.reason}"
                )
                break

        return results

    def blocked(self, results: list[GateResult]) -> bool:
        """Check if any gate blocked."""
        return any(not r.passed for r in results)

    def block_reason(self, results: list[GateResult]) -> str:
        """Get the reason for blocking."""
        for result in results:
            if not result.passed:
                return f"{result.gate_name}: {result.reason}"
        return ""

    def get_stats(self) -> dict[str, Any]:
        """Get pipeline statistics."""
        return {
            "gates": len(self._gates),
            "total_runs": self._run_count,
            "total_blocks": self._block_count,
            "pass_rate": int(
                (1 - self._block_count / max(self._run_count, 1)) * 100
            ),
        }


# Pre-built gate check functions

def require_mode(allowed_modes: list[str]) -> Callable[[dict], tuple[bool, str]]:
    """Gate factory: require execution to be in one of the allowed modes."""
    def check(context: dict) -> tuple[bool, str]:
        mode = context.get("mode", "")
        if mode in allowed_modes:
            return True, f"Mode '{mode}' is allowed"
        return False, f"Mode '{mode}' not in allowed modes: {allowed_modes}"
    return check


def require_tier(allowed_tiers: list[str]) -> Callable[[dict], tuple[bool, str]]:
    """Gate factory: require user to be in one of the allowed tiers."""
    def check(context: dict) -> tuple[bool, str]:
        tier = context.get("tier", "")
        if tier in allowed_tiers:
            return True, f"Tier '{tier}' is allowed"
        return False, f"Tier '{tier}' not in allowed tiers: {allowed_tiers}"
    return check


def require_field(field_name: str) -> Callable[[dict], tuple[bool, str]]:
    """Gate factory: require a specific field to be present in context."""
    def check(context: dict) -> tuple[bool, str]:
        if field_name in context and context[field_name]:
            return True, f"Field '{field_name}' present"
        return False, f"Required field '{field_name}' missing from context"
    return check
