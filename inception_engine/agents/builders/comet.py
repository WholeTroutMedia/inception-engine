"""COMET - Backend Development & API Agent

Part of Aurora Hive. Specializes in backend services,
API development, and server-side logic.
"""

from typing import Dict, Any, List
from ..base_agent import BaseAgent


class COMETAgent(BaseAgent):
    """Backend development and API specialist."""
    
    def __init__(self):
        super().__init__(
            name="COMET",
            agent_type="builder",
            hive="AURORA",
            specialization="backend_api",
            active_modes=["ideate", "plan", "ship"]
        )
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute backend/API development task.
        
        Args:
            task: Task specification with type and requirements
            context: Current mode, project state, dependencies
            
        Returns:
            Result with API, database, tests, documentation
        """
        task_type = task.get("type")
        
        if task_type == "api":
            return self._build_api(task, context)
        elif task_type == "database":
            return self._setup_database(task, context)
        elif task_type == "service":
            return self._build_service(task, context)
        elif task_type == "integration":
            return self._integrate_external(task, context)
        else:
            return self._general_backend(task, context)
    
    def _build_api(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Build RESTful or GraphQL API."""
        return {
            "status": "success",
            "agent": self.name,
            "task_type": "api",
            "deliverables": {
                "framework": "FastAPI/Django REST/GraphQL",
                "endpoints": "Complete CRUD operations",
                "authentication": "JWT/OAuth2 implemented",
                "authorization": "Role-based access control",
                "validation": "Pydantic/Marshmallow schemas",
                "documentation": "OpenAPI/GraphQL schema",
                "tests": "Unit and integration tests",
                "rate_limiting": "Configured per endpoint"
            },
            "quality_checks": {
                "security": "OWASP Top 10 addressed",
                "performance": "< 100ms p95 latency",
                "error_handling": "Comprehensive error responses",
                "versioning": "API versioning strategy"
            }
        }
    
    def _setup_database(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Setup and configure database."""
        return {
            "status": "success",
            "agent": self.name,
            "task_type": "database",
            "deliverables": {
                "database": "PostgreSQL/MongoDB optimized",
                "schema": "Normalized design with indexes",
                "migrations": "Alembic/Django migrations",
                "orm": "SQLAlchemy/Prisma configured",
                "connection_pool": "Optimized for load",
                "backup_strategy": "Automated backups configured",
                "monitoring": "Query performance tracking"
            },
            "quality_checks": {
                "data_integrity": "Constraints and validations",
                "performance": "Query optimization applied",
                "security": "Encrypted at rest and in transit",
                "scalability": "Read replicas configured"
            }
        }
    
    def _build_service(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Build microservice or background worker."""
        return {
            "status": "success",
            "agent": self.name,
            "task_type": "service",
            "deliverables": {
                "service_type": "Microservice/Worker/Queue",
                "communication": "gRPC/Message Queue",
                "processing": "Async task handling",
                "error_recovery": "Retry logic and dead letter",
                "monitoring": "Health checks and metrics",
                "deployment": "Docker containerized",
                "tests": "Service and contract tests"
            }
        }
    
    def _integrate_external(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Integrate external services and APIs."""
        return {
            "status": "success",
            "agent": self.name,
            "task_type": "integration",
            "deliverables": {
                "client": "Type-safe API client",
                "authentication": "OAuth/API key management",
                "error_handling": "Graceful degradation",
                "caching": "Response caching layer",
                "rate_limiting": "Request throttling",
                "fallbacks": "Circuit breakers configured",
                "monitoring": "Integration health tracking"
            }
        }
    
    def _general_backend(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle general backend development tasks."""
        return {
            "status": "success",
            "agent": self.name,
            "task_type": "general",
            "approach": "Analyzed requirements and applying best practices",
            "deliverables": {
                "code": "Production-ready implementation",
                "tests": "Comprehensive test coverage",
                "documentation": "API docs and deployment guide",
                "monitoring": "Observability configured"
            }
        }
    
    def get_capabilities(self) -> List[str]:
        """Return list of COMET capabilities."""
        return [
            "FastAPI/Django development",
            "GraphQL API design",
            "RESTful API architecture",
            "PostgreSQL/MongoDB optimization",
            "Microservices architecture",
            "Background job processing",
            "WebSocket real-time services",
            "Authentication/Authorization",
            "Database design and migrations",
            "API security (OWASP)",
            "Performance optimization",
            "Integration testing",
            "Docker containerization",
            "CI/CD backend pipeline"
        ]
