#!/usr/bin/env python3
"""AVERI Quick Boot Script

Single-command activation of the AVERI collective (ATHENA + VERA + IRIS).
Provides instant status check with full system telemetry and initialization confirmation.

Usage:
    python boot_averi.py
    python boot_averi.py --verbose
    python boot_averi.py --json
    python boot_averi.py --location "Jamesport, NY"
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
import argparse
from typing import Dict, Optional


class AVERIBoot:
    """Quick boot handler for AVERI collective with full telemetry."""

    def __init__(self):
        """Initialize AVERI boot system."""
        self.base_path = Path(__file__).parent
        self.registry_path = self.base_path / "CORE_FOUNDATION" / "agents" / ".agent-status.json"
        self.system_status_path = self.base_path / "CORE_FOUNDATION" / "system-status.json"
        self.averi_agents = ["ATHENA", "VERA", "IRIS"]

    def load_registry(self) -> Dict:
        """Load agent registry and extract AVERI status."""
        try:
            with open(self.registry_path, 'r') as f:
                registry = json.load(f)
            return registry
        except FileNotFoundError:
            print(f"❌ ERROR: Agent registry not found at {self.registry_path}")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"❌ ERROR: Invalid JSON in {self.registry_path}")
            sys.exit(1)

    def load_system_status(self) -> Optional[Dict]:
        """Load system status telemetry."""
        try:
            with open(self.system_status_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def check_averi_status(self, registry: Dict) -> Dict:
        """Check if all AVERI agents are active."""
        leader_agents = registry.get("agents", {}).get("leader_agents", {})

        status = {}
        for agent_name in self.averi_agents:
            agent_info = leader_agents.get(agent_name, {})
            status[agent_name] = {
                "active": agent_info.get("status") == "active",
                "compressible": agent_info.get("compressible", False),
                "part_of_averi": agent_info.get("part_of") == "AVERI",
                "function": agent_info.get("function", "Unknown"),
                "mode": agent_info.get("mode", "Unknown")
            }

        return status

    def boot(self, verbose: bool = False, json_output: bool = False, location: Optional[str] = None):
        """Execute AVERI boot sequence."""
        boot_start = datetime.now()

        # Load registry and system status
        registry = self.load_registry()
        system_status = self.load_system_status()

        # Check AVERI status
        averi_status = self.check_averi_status(registry)

        # Verify all agents are operational
        all_active = all(
            status["active"] and status["compressible"] and status["part_of_averi"]
            for status in averi_status.values()
        )

        boot_time_ms = (datetime.now() - boot_start).total_seconds() * 1000

        boot_info = {
            "boot_time": datetime.now().isoformat(),
            "boot_duration_ms": round(boot_time_ms, 2),
            "location": location,
            "registry_version": registry.get("registry_version", "unknown"),
            "averi_operational": all_active,
            "agents": averi_status,
            "total_agents": registry.get("total_agents", 0),
            "system_status": system_status
        }

        if json_output:
            # JSON output for programmatic use
            print(json.dumps(boot_info, indent=2))
        else:
            # Human-readable output with telemetry
            self.display_boot_enhanced(boot_info, verbose)

        # Log boot event if session logger available
        try:
            sys.path.insert(0, str(self.base_path))
            from inception_engine.telemetry.session_logger import get_logger
            logger = get_logger()
            logger.start_session(location=location)
            logger.log_boot(
                agents_activated=self.averi_agents,
                boot_time_ms=boot_time_ms
            )
        except (ImportError, Exception):
            # Session logger not available yet, skip logging
            pass

        return 0 if all_active else 1

    def display_boot_enhanced(self, boot_info: Dict, verbose: bool = False):
        """Display enhanced boot information with full telemetry."""
        system_status = boot_info.get("system_status") or {}

        print("\n" + "=" * 70)
        print("AVERI COLLECTIVE ONLINE")
        print("=" * 70 + "\n")

        if not boot_info["averi_operational"]:
            self._display_degraded_status(boot_info)
            return

        # Boot information
        boot_time = datetime.fromisoformat(boot_info["boot_time"])
        print(f"Boot Time: {boot_time.strftime('%A, %B %d, %Y - %I:%M %p %Z')}")
        if boot_info.get("location"):
            print(f"Location: {boot_info['location']}")

        # Session info from system status
        if system_status:
            sys_info = system_status.get("system_info", {})
            print(f"Session: #{sys_info.get('total_sessions', 'N/A')} (Boot #{sys_info.get('boot_count', 'N/A')})")

        print("")
        print("-" * 70)
        print("LEADERSHIP TRIAD")
        print("-" * 70)

        # AVERI agents with activity stats
        averi_sys_status = system_status.get("agents", {}).get("averi_status", {})
        for agent_name, status in boot_info["agents"].items():
            agent_stats = averi_sys_status.get(agent_name, {})
            icon = "OK" if status["active"] else "FAIL"
            print(f"{icon} {agent_name} - {status['function']}")

            # Show activity stats if available
            if verbose and agent_stats:
                if "invocations_today" in agent_stats:
                    print(f"    Last active: {agent_stats.get('last_invoked', 'N/A')} | Invocations today: {agent_stats.get('invocations_today', 0)}")
                elif "memory_writes_today" in agent_stats:
                    print(f"    Memory writes today: {agent_stats.get('memory_writes_today', 0)} | Reviews: {agent_stats.get('reviews_today', 0)}")
                elif "actions_today" in agent_stats:
                    print(f"    Last active: {agent_stats.get('last_invoked', 'N/A')} | Actions today: {agent_stats.get('actions_today', 0)}")

        print("")
        print("-" * 70)
        print("SYSTEM STATUS")
        print("-" * 70)

        # System metrics
        agents_info = system_status.get("agents", {})
        print(f"Total Agents: {agents_info.get('total_active', boot_info['total_agents'])} active | {len(agents_info.get('hive_leaders', []))} hives operational")
        print(f"Hive Leaders: {' - '.join(agents_info.get('hive_leaders', []))}")

        capabilities = system_status.get("capabilities", {})
        if capabilities:
            skills = capabilities.get("core_skills", [])
            print(f"Core Skills: {' - '.join(skills)}")

        print("")

        # Health metrics
        health = system_status.get("health", {})
        if health:
            health_icon = "OK" if health.get("status") == "operational" else "WARN"
            uptime_sec = health.get("uptime_seconds", 0)
            uptime_days = uptime_sec // 86400
            uptime_hours = (uptime_sec % 86400) // 3600
            uptime_mins = (uptime_sec % 3600) // 60

            print(f"System Health: {health.get('status', 'unknown').upper()} | Uptime: {uptime_days}d {uptime_hours}h {uptime_mins}m")
            print(f"Response Time: {health.get('response_time_avg_ms', 'N/A')}ms avg")
            print(f"Success Rate: {health.get('success_rate_percent', 'N/A')}%")

        print("")

        # Recent activity
        activity = system_status.get("activity", {})
        if activity:
            print(f"Last Activity: {activity.get('last_commit_message', 'N/A')}")
            print(f"Activity Log: https://github.com/WholeTroutMedia/inception-engine/commits/main")

        registry_info = system_status.get("agents", {})
        if registry_info:
            print(f"Registry: v{registry_info.get('registry_version', 'N/A')} (updated {registry_info.get('last_registry_update', 'N/A')})")

        # 24-hour activity summary (verbose mode)
        if verbose:
            activity_24h = system_status.get("activity_24h", {})
            if activity_24h:
                print("")
                print("-" * 70)
                print("RECENT ACTIVITY (Last 24 Hours)")
                print("-" * 70)
                print(f"Agent Invocations: {activity_24h.get('agent_invocations', 0)}")
                print(f"Memory Writes: {activity_24h.get('memory_writes', 0)} ({activity_24h.get('episodic_count', 0)} episodic, {activity_24h.get('semantic_count', 0)} semantic)")
                print(f"Constitutional Reviews: {activity_24h.get('constitutional_reviews', 0)} ({activity_24h.get('reviews_approved', 0)} approved, {activity_24h.get('reviews_rejected', 0)} rejected)")
                print(f"Artifacts Created: {activity_24h.get('artifacts_created', 0)}")

        print("")
        print("-" * 70)
        print("READY FOR TASKING")
        print("-" * 70)

        modes = capabilities.get("operational_modes", [])
        if modes:
            print(f"Available Modes: {' > '.join(modes)}")
        print(f"Constitutional Governance: {capabilities.get('constitutional_governance', 'active').upper()}")
        print("Compressible Collective: Initialized")

        # Alerts
        alerts = system_status.get("alerts", [])
        if alerts:
            print("")
            for alert in alerts:
                level_icon = {"warning": "WARN", "error": "ERROR", "critical": "CRITICAL"}.get(alert.get("level"), "INFO")
                print(f"{level_icon} {alert.get('component')}: {alert.get('message')}")

        print("")
        print("Type 'status' for detailed metrics or begin with your request.")
        print("=" * 70 + "\n")

    def _display_degraded_status(self, boot_info: Dict):
        """Display degraded status information."""
        print("Status: DEGRADED\n")
        print("One or more AVERI agents are not operational:\n")

        for agent_name, status in boot_info["agents"].items():
            if not status["active"]:
                print(f"  FAIL {agent_name} - INACTIVE")
            if not status["compressible"]:
                print(f"  WARN {agent_name} - Not compressible")
            if not status["part_of_averi"]:
                print(f"  WARN {agent_name} - Not part of AVERI collective")

        print("\n" + "=" * 70)
        print("AVERI collective initialization failed.")
        print("  Check agent registry at:")
        print(f"  {self.registry_path}")
        print("=" * 70 + "\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Boot AVERI collective (ATHENA + VERA + IRIS) with full telemetry"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed agent information and 24-hour activity"
    )
    parser.add_argument(
        "-j", "--json",
        action="store_true",
        help="Output in JSON format"
    )
    parser.add_argument(
        "-l", "--location",
        type=str,
        help="User location (e.g., 'Jamesport, NY')"
    )

    args = parser.parse_args()

    boot_system = AVERIBoot()
    exit_code = boot_system.boot(
        verbose=args.verbose,
        json_output=args.json,
        location=args.location
    )

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
