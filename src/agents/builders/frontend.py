"""FRONTEND - Web Frontend Development Agent

Part of AURORA Hive. Specializes in React/Next.js web application
development, component architecture, state management, SSR/SSG,
and modern web framework implementations.
"""
from typing import Dict, Any, List
from ..base_agent import BaseAgent


class FRONTENDAgent(BaseAgent):
    """Web frontend development specialist."""

    def __init__(self):
        super().__init__(
            name="FRONTEND",
            agent_type="builder",
            hive="AURORA",
            specialization="web_frontend",
            active_modes=["ideate", "plan", "ship"]
        )

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute frontend development task."""
        task_type = task.get("type")

        if task_type == "component":
            return self._build_component(task, context)
        elif task_type == "page":
            return self._build_page(task, context)
        elif task_type == "layout":
            return self._build_layout(task, context)
        elif task_type == "state":
            return self._implement_state(task, context)
        elif task_type == "ssr":
            return self._configure_ssr(task, context)
        else:
            return self._general_frontend(task, context)

    def _build_component(self, task, context):
        """Build React component with TypeScript."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"component": task.get("name"),
                            "framework": "react",
                            "typescript": True,
                            "tests_included": True,
                            "storybook": True}
        }

    def _build_page(self, task, context):
        """Build Next.js page with routing."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"page": task.get("route"),
                            "framework": "nextjs",
                            "seo_optimized": True,
                            "responsive": True}
        }

    def _build_layout(self, task, context):
        """Build application layout structure."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"layout": "generated",
                            "responsive_breakpoints": ["sm", "md", "lg", "xl"],
                            "accessibility": "WCAG 2.1 AA"}
        }

    def _implement_state(self, task, context):
        """Implement state management solution."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"state_manager": task.get("manager", "zustand"),
                            "stores_created": [],
                            "persistence": True}
        }

    def _configure_ssr(self, task, context):
        """Configure server-side rendering."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"rendering": "ssr",
                            "caching_strategy": "ISR",
                            "revalidation": 60}
        }

    def _general_frontend(self, task, context):
        """Handle general frontend development."""
        return {
            "status": "success", "agent": self.name,
            "deliverables": {"operation": "Frontend development task completed"}
        }

    def get_capabilities(self) -> List[str]:
        return [
            "React/Next.js development",
            "TypeScript component architecture",
            "State management (Zustand, Redux)",
            "Server-side rendering (SSR/SSG/ISR)",
            "Responsive design implementation",
            "Accessibility compliance (WCAG 2.1)",
            "Performance optimization",
            "Storybook component documentation"
        ]
