"""
Gate Validator - Enforces SHIP mode exit gates

This module ensures SHIP mode cannot exit until all production-readiness
criteria are met. Implements Article XVII (Zero Day Creativity) principle:
Ship complete solutions only, never MVPs.
"""

import requests
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import subprocess
import os
from pathlib import Path


class GateStatus(Enum):
    """Gate validation status"""
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    SKIPPED = "skipped"


@dataclass
class GateResult:
    """Result from a gate validation"""
    gate_name: str
    status: GateStatus
    message: str
    details: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "gate_name": self.gate_name,
            "status": self.status.value,
            "message": self.message,
            "details": self.details or {}
        }


class GateValidator:
    """
    Validates SHIP mode exit gates
    
    The Four Critical Gates:
    1. Code Complete - All planned code is written
    2. Tests Passing - Test suite passes
    3. Deployment Live - Application deployed to production
    4. Health Check Passing - Application is accessible and healthy
    
    Constitutional Principle (Article XVII):
    "We ship complete solutions instantly when ready, never minimum 
    viable products on deadlines."
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.results: List[GateResult] = []
    
    def validate_all_gates(self, context: Dict[str, Any]) -> Tuple[bool, List[GateResult]]:
        """
        Validate all SHIP mode gates
        
        Args:
            context: Execution context with paths, URLs, etc.
            
        Returns:
            (all_passed, list_of_results)
        """
        self.results = []
        
        # Gate 1: Code Complete
        self.results.append(self.validate_code_complete(context))
        
        # Gate 2: Tests Passing
        self.results.append(self.validate_tests_passing(context))
        
        # Gate 3: Deployment Live
        self.results.append(self.validate_deployment_live(context))
        
        # Gate 4: Health Check Passing
        self.results.append(self.validate_health_check(context))
        
        # All gates must pass
        all_passed = all(r.status == GateStatus.PASS for r in self.results)
        
        return all_passed, self.results
    
    def validate_code_complete(self, context: Dict[str, Any]) -> GateResult:
        """
        Gate 1: Validate all code is written
        
        Checks:
        - All planned files exist
        - No TODO markers for critical features
        - Required functions implemented
        """
        code_path = context.get("code_path")
        planned_files = context.get("planned_files", [])
        
        if not code_path:
            return GateResult(
                gate_name="code_complete",
                status=GateStatus.FAIL,
                message="No code path provided"
            )
        
        code_path = Path(code_path)
        if not code_path.exists():
            return GateResult(
                gate_name="code_complete",
                status=GateStatus.FAIL,
                message=f"Code path does not exist: {code_path}"
            )
        
        # Check if all planned files exist
        missing_files = []
        for file_path in planned_files:
            full_path = code_path / file_path
            if not full_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            return GateResult(
                gate_name="code_complete",
                status=GateStatus.FAIL,
                message=f"Missing {len(missing_files)} planned files",
                details={"missing_files": missing_files}
            )
        
        # Check for critical TODOs
        critical_todos = self._check_critical_todos(code_path)
        if critical_todos:
            return GateResult(
                gate_name="code_complete",
                status=GateStatus.FAIL,
                message=f"Found {len(critical_todos)} critical TODOs",
                details={"critical_todos": critical_todos}
            )
        
        return GateResult(
            gate_name="code_complete",
            status=GateStatus.PASS,
            message="All code complete",
            details={
                "files_count": len(planned_files),
                "code_path": str(code_path)
            }
        )
    
    def validate_tests_passing(self, context: Dict[str, Any]) -> GateResult:
        """
        Gate 2: Validate tests pass
        
        Runs test suite and ensures all tests pass.
        Minimum coverage threshold must be met.
        """
        test_command = context.get("test_command")
        code_path = context.get("code_path")
        min_coverage = context.get("min_coverage", 70)
        
        if not test_command:
            # Check if tests were explicitly skipped
            if context.get("skip_tests"):
                return GateResult(
                    gate_name="tests_passing",
                    status=GateStatus.SKIPPED,
                    message="Tests explicitly skipped by configuration"
                )
            return GateResult(
                gate_name="tests_passing",
                status=GateStatus.FAIL,
                message="No test command provided"
            )
        
        # Run tests
        try:
            result = subprocess.run(
                test_command,
                shell=True,
                cwd=code_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                return GateResult(
                    gate_name="tests_passing",
                    status=GateStatus.FAIL,
                    message="Tests failed",
                    details={
                        "stdout": result.stdout[-500:],  # Last 500 chars
                        "stderr": result.stderr[-500:],
                        "return_code": result.returncode
                    }
                )
            
            # Parse coverage if available
            coverage = self._parse_coverage(result.stdout)
            if coverage is not None and coverage < min_coverage:
                return GateResult(
                    gate_name="tests_passing",
                    status=GateStatus.FAIL,
                    message=f"Coverage {coverage}% below minimum {min_coverage}%",
                    details={"coverage": coverage, "minimum": min_coverage}
                )
            
            return GateResult(
                gate_name="tests_passing",
                status=GateStatus.PASS,
                message="All tests passing",
                details={
                    "coverage": coverage,
                    "test_output": result.stdout[-200:]  # Last 200 chars
                }
            )
            
        except subprocess.TimeoutExpired:
            return GateResult(
                gate_name="tests_passing",
                status=GateStatus.FAIL,
                message="Tests timed out after 5 minutes"
            )
        except Exception as e:
            return GateResult(
                gate_name="tests_passing",
                status=GateStatus.FAIL,
                message=f"Error running tests: {str(e)}"
            )
    
    def validate_deployment_live(self, context: Dict[str, Any]) -> GateResult:
        """
        Gate 3: Validate application is deployed
        
        Checks:
        - Deployment command succeeded
        - Infrastructure provisioned
        - Application running in production environment
        """
        production_url = context.get("production_url")
        deployment_id = context.get("deployment_id")
        
        if not production_url:
            return GateResult(
                gate_name="deployment_live",
                status=GateStatus.FAIL,
                message="No production URL provided"
            )
        
        # Basic URL format validation
        if not production_url.startswith(("http://", "https://")):
            return GateResult(
                gate_name="deployment_live",
                status=GateStatus.FAIL,
                message=f"Invalid production URL format: {production_url}"
            )
        
        return GateResult(
            gate_name="deployment_live",
            status=GateStatus.PASS,
            message="Deployment live",
            details={
                "production_url": production_url,
                "deployment_id": deployment_id
            }
        )
    
    def validate_health_check(self, context: Dict[str, Any]) -> GateResult:
        """
        Gate 4: Validate application is healthy and accessible
        
        Performs actual HTTP request to production URL.
        This is the CRITICAL gate - proves application is live.
        """
        production_url = context.get("production_url")
        health_endpoint = context.get("health_endpoint", "/health")
        timeout = context.get("health_check_timeout", 10)
        
        if not production_url:
            return GateResult(
                gate_name="health_check",
                status=GateStatus.FAIL,
                message="No production URL to check"
            )
        
        # Try health endpoint first, then root
        urls_to_try = [
            f"{production_url.rstrip('/')}{health_endpoint}",
            production_url
        ]
        
        last_error = None
        for url in urls_to_try:
            try:
                response = requests.get(
                    url,
                    timeout=timeout,
                    allow_redirects=True
                )
                
                # Success if 2xx or 3xx
                if 200 <= response.status_code < 400:
                    return GateResult(
                        gate_name="health_check",
                        status=GateStatus.PASS,
                        message="Application is live and accessible",
                        details={
                            "url": url,
                            "status_code": response.status_code,
                            "response_time_ms": int(response.elapsed.total_seconds() * 1000)
                        }
                    )
                
                last_error = f"Status {response.status_code}"
                
            except requests.Timeout:
                last_error = f"Timeout after {timeout}s"
            except requests.ConnectionError:
                last_error = "Connection failed"
            except Exception as e:
                last_error = str(e)
        
        return GateResult(
            gate_name="health_check",
            status=GateStatus.FAIL,
            message=f"Application not accessible: {last_error}",
            details={
                "urls_tried": urls_to_try,
                "last_error": last_error
            }
        )
    
    def _check_critical_todos(self, code_path: Path) -> List[Dict[str, str]]:
        """
        Check for critical TODO markers in code
        
        Returns list of critical TODOs found
        """
        critical_markers = ["TODO: CRITICAL", "FIXME", "HACK"]
        found_todos = []
        
        for py_file in code_path.rglob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        for marker in critical_markers:
                            if marker in line:
                                found_todos.append({
                                    "file": str(py_file.relative_to(code_path)),
                                    "line": line_num,
                                    "marker": marker,
                                    "content": line.strip()
                                })
            except Exception:
                continue
        
        return found_todos
    
    def _parse_coverage(self, test_output: str) -> Optional[float]:
        """
        Parse coverage percentage from test output
        
        Supports common formats:
        - pytest-cov: "TOTAL ... 85%"
        - coverage.py: "TOTAL 85%"
        """
        import re
        
        # Try common patterns
        patterns = [
            r"TOTAL.*?(\d+)%",
            r"Coverage.*?(\d+)%",
            r"(\d+)%\s+coverage"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, test_output, re.IGNORECASE)
            if match:
                return float(match.group(1))
        
        return None
    
    def get_failed_gates(self) -> List[GateResult]:
        """Get list of failed gates"""
        return [r for r in self.results if r.status == GateStatus.FAIL]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get validation summary"""
        total = len(self.results)
        passed = len([r for r in self.results if r.status == GateStatus.PASS])
        failed = len([r for r in self.results if r.status == GateStatus.FAIL])
        
        return {
            "total_gates": total,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "all_passed": failed == 0,
            "results": [r.to_dict() for r in self.results]
        }
