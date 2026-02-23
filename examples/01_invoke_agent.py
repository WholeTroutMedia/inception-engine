#!/usr/bin/env python3
"""Example 01: How to Invoke an Agent

Demonstrates creating and invoking individual agents
from the Inception Engine agent system.

Runnable: Yes - no external dependencies required.
"""
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agents.base_agent import BaseAgent, AgentCapabilities
from typing import Dict, Any, List


# --- Create a concrete agent implementation ---

class ExampleBuilderAgent(BaseAgent):
    """A minimal working agent that demonstrates the BaseAgent interface."""

    def __init__(self):
        super().__init__(
            name="EXAMPLE_BUILDER",
            agent_type="builder",
            hive="AURORA",
            specializations=["demonstration", "examples"],
            active_modes=["ideate", "plan", "ship"]
        )

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's primary function."""
        task_type = context.get("type", "general")
        prompt = context.get("prompt", "")

        return {
            "status": "success",
            "agent": self.name,
            "task_type": task_type,
            "result": f"Processed: {prompt}",
            "execution_count": self.execution_count + 1
        }

    def get_capabilities(self) -> AgentCapabilities:
        """Return agent capabilities and metadata."""
        return AgentCapabilities(
            name=self.name,
            type=self.type,
            hive=self.hive,
            specialties=["demonstration", "examples"],
            modes=self.active_modes
        )


def main():
    print("="*60)
    print("INCEPTION ENGINE - Agent Invocation Example")
    print("="*60)

    # 1. Create an agent
    agent = ExampleBuilderAgent()
    print(f"\n[1] Created agent: {agent.name}")
    print(f"    Type: {agent.type}")
    print(f"    Hive: {agent.hive}")
    print(f"    Active: {agent.active}")

    # 2. Activate the agent
    agent.activate()
    print(f"\n[2] Agent activated: {agent.active}")

    # 3. Run pre-execution check
    context = {"type": "frontend", "prompt": "Build a landing page"}
    can_execute = agent.pre_execution_check(context)
    print(f"\n[3] Pre-execution check passed: {can_execute}")

    # 4. Execute a task
    result = agent.execute(context)
    print(f"\n[4] Execution result:")
    for key, value in result.items():
        print(f"    {key}: {value}")

    # 5. Get capabilities
    caps = agent.get_capabilities()
    print(f"\n[5] Agent capabilities:")
    print(f"    Name: {caps.name}")
    print(f"    Type: {caps.type}")
    print(f"    Hive: {caps.hive}")
    print(f"    Specialties: {caps.specialties}")
    print(f"    Modes: {caps.modes}")

    # 6. Deactivate
    agent.deactivate()
    print(f"\n[6] Agent deactivated: {agent.active}")

    print("\n" + "="*60)
    print("Example complete. Agent lifecycle demonstrated.")
    print("="*60)


if __name__ == "__main__":
    main()
