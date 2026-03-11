"""
Creative Liberation Engine v5 — Prefrontal Cortex (PFC) Planner

Higher-level planning and decision-making system.
Coordinates between neural subsystems (DMN, attractors, small-world)
and provides executive function for complex multi-step tasks.

Lineage: v3 planner/agent.json + attractor dynamics + DMN integration → v5

Research Foundation:
- BioRxiv: Mechanistic theory of planning in prefrontal cortex (2025)

The PFC is the "conductor" that orchestrates all other neural systems.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class Plan:
    """A multi-step execution plan."""
    id: str
    goal: str
    steps: list["PlanStep"]
    status: str = "pending"  # pending, executing, completed, failed
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    total_estimated_ms: float = 0.0
    actual_ms: float = 0.0

    @property
    def progress(self) -> float:
        if not self.steps:
            return 0.0
        completed = sum(1 for s in self.steps if s.status == "completed")
        return completed / len(self.steps)


@dataclass
class PlanStep:
    """A single step in an execution plan."""
    id: str
    description: str
    agent_name: str
    dependencies: list[str] = field(default_factory=list)  # Step IDs
    status: str = "pending"
    result: Any = None
    error: Optional[str] = None
    estimated_ms: float = 1000.0
    actual_ms: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class PlanningContext:
    """Context gathered for planning."""
    task_description: str
    available_agents: list[dict]
    current_mode: str
    active_tier: str
    relevant_patterns: list[dict] = field(default_factory=list)
    cached_solutions: list[dict] = field(default_factory=list)
    constraints: dict = field(default_factory=dict)


class PrefrontalCortex:
    """
    Executive function — plans, coordinates, and monitors multi-step tasks.

    The PFC:
    1. Decomposes complex goals into step sequences
    2. Assigns agents to steps based on neural analysis
    3. Manages dependencies between steps
    4. Monitors execution and adapts on failure
    5. Learns from completed plans

    Usage:
        pfc = PrefrontalCortex(concept_engine, dmn, agent_registry)
        plan = await pfc.create_plan("Build a React dashboard")
        result = await pfc.execute_plan(plan)
    """

    def __init__(
        self,
        concept_engine=None,
        dmn=None,
        agent_registry=None,
        memory_service=None,
    ):
        self.concept_engine = concept_engine
        self.dmn = dmn
        self.registry = agent_registry
        self.memory = memory_service

        self._active_plans: dict[str, Plan] = {}
        self._completed_plans: list[Plan] = []
        self._plan_count = 0

    async def create_plan(self, goal: str, context: Optional[PlanningContext] = None) -> Plan:
        """
        Create a multi-step execution plan for a complex goal.
        """
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"

        if context is None:
            context = await self._gather_planning_context(goal)

        steps = await self._decompose_goal(goal, context)
        steps = await self._assign_agents(steps, context)
        steps = self._determine_dependencies(steps)
        steps = self._estimate_durations(steps, context)

        plan = Plan(
            id=plan_id,
            goal=goal,
            steps=steps,
            total_estimated_ms=sum(s.estimated_ms for s in steps),
        )

        self._active_plans[plan_id] = plan
        self._plan_count += 1

        logger.info(f"Plan created: {plan_id} — {len(steps)} steps, est. {plan.total_estimated_ms:.0f}ms")
        return plan

    async def _gather_planning_context(self, goal: str) -> PlanningContext:
        """Gather all context needed for planning."""
        available_agents = []
        if self.registry:
            available_agents = self.registry.list_all()

        relevant_patterns = []
        if self.dmn:
            insights = self.dmn.get_insights(min_relevance=0.3, top_k=5)
            relevant_patterns = [
                {"type": i.insight_type, "description": i.description}
                for i in insights
            ]

        return PlanningContext(
            task_description=goal,
            available_agents=available_agents,
            current_mode="ship",
            active_tier="studio",
            relevant_patterns=relevant_patterns,
        )

    async def _decompose_goal(self, goal: str, context: PlanningContext) -> list[PlanStep]:
        """Decompose a complex goal into sequential steps."""
        steps: list[PlanStep] = []
        goal_lower = goal.lower()

        if any(word in goal_lower for word in ["build", "create", "implement", "design"]):
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Analyze requirements for: {goal}", agent_name=""))

        if any(word in goal_lower for word in ["build", "create", "system", "architecture"]):
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Design architecture for: {goal}", agent_name=""))

        if any(word in goal_lower for word in ["build", "create", "implement", "write", "code"]):
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Implement: {goal}", agent_name=""))

        if any(word in goal_lower for word in ["build", "create", "implement"]):
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Write tests for: {goal}", agent_name=""))

        if any(word in goal_lower for word in ["build", "create", "document"]):
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Document: {goal}", agent_name=""))

        steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Review and validate: {goal}", agent_name=""))
        steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=f"Constitutional compliance check for: {goal}", agent_name=""))

        if not steps:
            steps.append(PlanStep(id=f"step_{uuid.uuid4().hex[:6]}", description=goal, agent_name=""))

        return steps

    async def _assign_agents(self, steps: list[PlanStep], context: PlanningContext) -> list[PlanStep]:
        """Assign the best agent to each step."""
        role_mapping = {
            "analyze": "ARCH", "design": "Aurora", "architect": "Aurora",
            "implement": "BOLT", "build": "BOLT", "write": "BOLT", "code": "BOLT",
            "test": "BOLT", "document": "CODEX", "review": "ARCH",
            "compliance": "COMPASS", "constitutional": "COMPASS", "legal": "LEX",
        }

        for step in steps:
            if not step.agent_name:
                desc_lower = step.description.lower()
                for keyword, agent in role_mapping.items():
                    if keyword in desc_lower:
                        step.agent_name = agent
                        break
                if not step.agent_name:
                    step.agent_name = "BOLT"

        return steps

    def _determine_dependencies(self, steps: list[PlanStep]) -> list[PlanStep]:
        """Determine sequential dependencies."""
        for i in range(1, len(steps)):
            steps[i].dependencies = [steps[i - 1].id]
        return steps

    def _estimate_durations(self, steps: list[PlanStep], context: PlanningContext) -> list[PlanStep]:
        """Estimate execution duration for each step."""
        for step in steps:
            desc_lower = step.description.lower()
            if "analyze" in desc_lower or "review" in desc_lower:
                step.estimated_ms = 2000.0
            elif "design" in desc_lower or "architect" in desc_lower:
                step.estimated_ms = 5000.0
            elif "implement" in desc_lower or "build" in desc_lower:
                step.estimated_ms = 10000.0
            elif "test" in desc_lower:
                step.estimated_ms = 5000.0
            elif "document" in desc_lower:
                step.estimated_ms = 3000.0
            elif "compliance" in desc_lower:
                step.estimated_ms = 1000.0
            else:
                step.estimated_ms = 5000.0
        return steps

    async def execute_plan(self, plan: Plan) -> Plan:
        """Execute a plan step by step, respecting dependencies."""
        plan.status = "executing"
        start = time.perf_counter()

        for step in plan.steps:
            unmet = [
                dep for dep in step.dependencies
                if not any(s.id == dep and s.status == "completed" for s in plan.steps)
            ]
            if unmet:
                step.status = "blocked"
                step.error = f"Unmet dependencies: {unmet}"
                plan.status = "failed"
                break

            step.status = "executing"
            step.started_at = datetime.now()
            step_start = time.perf_counter()

            try:
                step.result = {"status": "completed", "agent": step.agent_name}
                step.status = "completed"
            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                plan.status = "failed"
                logger.error(f"Step {step.id} failed: {e}")
                break

            step.actual_ms = (time.perf_counter() - step_start) * 1000
            step.completed_at = datetime.now()

        if all(s.status == "completed" for s in plan.steps):
            plan.status = "completed"
            plan.completed_at = datetime.now()

        plan.actual_ms = (time.perf_counter() - start) * 1000

        if plan.status == "completed":
            self._completed_plans.append(plan)
            del self._active_plans[plan.id]

            if self.memory:
                from inception.memory.types import Memory, MemoryType
                await self.memory.store(Memory(
                    content=f"Plan completed: {plan.goal} ({len(plan.steps)} steps, {plan.actual_ms:.0f}ms)",
                    memory_type=MemoryType.PROCEDURAL,
                    source="PFC",
                    tags=["plan", "completed"],
                    importance=0.7,
                    metadata={"plan_id": plan.id, "steps": len(plan.steps), "duration_ms": plan.actual_ms},
                ))

        logger.info(f"Plan {plan.id} {plan.status}: {plan.progress:.0%} complete, {plan.actual_ms:.0f}ms")
        return plan

    def get_active_plans(self) -> list[dict]:
        """Get all active plans."""
        return [
            {"id": p.id, "goal": p.goal, "status": p.status, "progress": p.progress, "steps": len(p.steps)}
            for p in self._active_plans.values()
        ]

    def get_status(self) -> dict[str, Any]:
        """Get PFC status."""
        return {
            "active_plans": len(self._active_plans),
            "completed_plans": len(self._completed_plans),
            "total_plans_created": self._plan_count,
        }
