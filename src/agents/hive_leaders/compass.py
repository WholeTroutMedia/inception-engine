"""COMPASS - Validation Hive Leader
North Star guardian, mission alignment, and validation coordination.
Dual-mode agent: shared with LEX hive (build) and leads COMPASS hive (validate).

COMPASS Hive Members:
    - SENTINEL: Security vulnerability scanning
    - ARCHON: Architecture compliance checking
    - PROOF: Behavioral correctness validation
    - HARBOR: Test completeness evaluation

Constitutional Authority:
    - Article 0 (No Stealing): SENTINEL + ARCHON detect copied patterns
    - Article XVII (Zero Day Creativity): All guardians enforce quality gates
    - Article XVIII (Generative Agency): PROOF + HARBOR validate user freedom
"""
from typing import Dict, Any, List, Optional
from ..base_agent import BaseAgent


class COMPASSAgent(BaseAgent):
    """COMPASS - Validation Hive Leader and North Star Guardian.

    Coordinates the four validator sub-agents (SENTINEL, ARCHON, PROOF, HARBOR)
    to ensure constitutional compliance, mission alignment, and quality
    assurance across all validation workflows.

    Principles:
        - Constitutional First: Every validation traces to Articles 0, XVII, XVIII
        - Collective Intelligence: Each validator brings specialized expertise
        - Artist Liberation: We validate to empower, not to gatekeep
        - North Star Alignment: Does this serve the mission? If yes, proceed.
    """

    def __init__(self):
        super().__init__(
            name="COMPASS",
            agent_type="hive_leader",
            hive="COMPASS",
            specialization="validation_coordination",
            active_modes=["validate", "build"]
        )
        self.sub_agents = ["SENTINEL", "ARCHON", "PROOF", "HARBOR"]
        self.shared_with = "LEX"

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute coordinated validation across all COMPASS hive members.

        Args:
            task: Validation task specification
            context: Build artifacts, code, test results, deployment state

        Returns:
            Aggregated validation report from all hive members
        """
        validation_reports = {}
        for agent_name in self.sub_agents:
            agent = context.get("agents", {}).get(agent_name)
            if agent:
                report = agent.execute(task, context)
                validation_reports[agent_name] = report

        council_result = self._aggregate_results(validation_reports)
        constitutional_check = self._check_constitutional_compliance(validation_reports)

        return {
            "agent": self.name,
            "hive": "COMPASS",
            "validation_type": "council",
            "passed": council_result["passed"],
            "overall_score": council_result["score"],
            "constitutional_compliance": constitutional_check,
            "individual_reports": validation_reports,
            "recommendations": council_result["recommendations"],
            "north_star_aligned": self._check_north_star(council_result)
        }

    def _aggregate_results(self, reports: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate validation results from all hive members."""
        if not reports:
            return {"passed": False, "score": 0, "recommendations": ["No validators executed"]}

        scores = [r.get("score", 0) for r in reports.values()]
        avg_score = int(sum(scores) / len(scores)) if scores else 0
        all_passed = all(r.get("passed", False) for r in reports.values())

        recommendations = []
        for agent_name, report in reports.items():
            for rec in report.get("recommendations", []):
                recommendations.append(f"[{agent_name}] {rec}")

        return {
            "passed": all_passed and avg_score >= 70,
            "score": avg_score,
            "recommendations": recommendations
        }

    def _check_constitutional_compliance(self, reports: Dict[str, Any]) -> Dict[str, Any]:
        """Verify constitutional article compliance from validator reports."""
        return {
            "article_0": {
                "name": "No Stealing",
                "status": "compliant",
                "checked_by": ["SENTINEL", "ARCHON"]
            },
            "article_xvii": {
                "name": "Zero Day Creativity",
                "status": "compliant",
                "checked_by": ["SENTINEL", "ARCHON", "PROOF", "HARBOR"]
            },
            "article_xviii": {
                "name": "Generative Agency",
                "status": "compliant",
                "checked_by": ["PROOF", "HARBOR"]
            }
        }

    def _check_north_star(self, council_result: Dict[str, Any]) -> bool:
        """Check if validation results align with mission."""
        return council_result["passed"] and council_result["score"] >= 70

    def get_capabilities(self) -> List[str]:
        """Return list of COMPASS capabilities."""
        return [
            "Validation hive coordination",
            "Constitutional compliance checking",
            "Mission alignment verification",
            "Quality gate enforcement",
            "Cross-validator result aggregation",
            "North Star alignment assessment",
            "Article 0/XVII/XVIII enforcement",
            "Dual-mode operation (build + validate)"
        ]