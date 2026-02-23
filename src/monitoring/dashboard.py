#!/usr/bin/env python3
"""Inception Engine Live Dashboard

Real-time terminal dashboard showing agent activity, system health, and recent events.
Updates every second with live telemetry data.

Usage:
    python inception_engine/dashboard.py
    python -m inception_engine.dashboard

Maintained by: SYSTEMS (BROADCAST hive)
Data sources: VERA (session logger), KEEPER (metrics)
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import argparse

try:
    import curses
    CURSES_AVAILABLE = True
except ImportError:
    CURSES_AVAILABLE = False


class InceptionDashboard:
    """Live dashboard for Inception Engine monitoring."""

    def __init__(self):
        """Initialize dashboard."""
        self.base_path = Path(__file__).parent.parent
        self.system_status_path = self.base_path / "CORE_FOUNDATION" / "system-status.json"
        self.registry_path = self.base_path / "CORE_FOUNDATION" / "agents" / ".agent-status.json"
        self.sessions_path = self.base_path / "KEEPER" / "logs" / "sessions"
        
        self.refresh_rate = 1.0  # seconds
        self.running = True

    def load_system_status(self) -> Optional[Dict]:
        """Load current system status."""
        try:
            with open(self.system_status_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def load_agent_registry(self) -> Optional[Dict]:
        """Load agent registry."""
        try:
            with open(self.registry_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def get_recent_activity(self, limit: int = 5) -> List[Dict]:
        """Get recent activity from session logs."""
        if not self.sessions_path.exists():
            return []
        
        # Find most recent session file
        session_files = sorted(self.sessions_path.glob("session_*.jsonl"), reverse=True)
        
        if not session_files:
            return []
        
        activities = []
        for session_file in session_files[:3]:  # Check last 3 sessions
            try:
                with open(session_file, 'r') as f:
                    for line in f:
                        try:
                            event = json.loads(line)
                            activities.append(event)
                            if len(activities) >= limit:
                                break
                        except json.JSONDecodeError:
                            continue
                if len(activities) >= limit:
                    break
            except Exception:
                continue
        
        return activities[:limit]

    def render_simple(self):
        """Render dashboard without curses (simple terminal mode)."""
        while self.running:
            try:
                # Clear screen (platform independent)
                os.system('cls' if os.name == 'nt' else 'clear')
                
                # Load data
                system_status = self.load_system_status() or {}
                registry = self.load_agent_registry() or {}
                recent_activity = self.get_recent_activity(5)
                
                current_time = datetime.now().strftime("%A, %b %d, %Y %I:%M:%S %p")
                
                # Header
                print("╔" + "═" * 68 + "╗")
                print("║" + " " * 15 + "INCEPTION ENGINE LIVE DASHBOARD" + " " * 21 + "║")
                print("║" + " " * 18 + current_time + " " * (50 - len(current_time)) + "║")
                print("╚" + "═" * 68 + "╝\n")
                
                # AVERI Status
                print("┌─── AVERI STATUS " + "─" * 54 + "┐")
                averi_status = system_status.get("agents", {}).get("averi_status", {})
                
                athena = averi_status.get("ATHENA", {})
                vera = averi_status.get("VERA", {})
                iris = averi_status.get("IRIS", {})
                
                status_icon = "✅" if athena.get("status") == "active" else "❌"
                print(f"│ ATHENA: {status_icon} {athena.get('status', 'unknown'):12s} │ Invocations: {athena.get('invocations_today', 0):3d}     │")
                
                status_icon = "✅" if vera.get("status") == "active" else "❌"
                print(f"│ VERA:   {status_icon} {vera.get('status', 'unknown'):12s} │ Memory Ops: {vera.get('memory_writes_today', 0):3d}     │")
                
                status_icon = "✅" if iris.get("status") == "active" else "❌"
                print(f"│ IRIS:   {status_icon} {iris.get('status', 'unknown'):12s} │ Actions: {iris.get('actions_today', 0):3d}        │")
                print("└" + "─" * 68 + "┘\n")
                
                # System Health
                print("┌─── SYSTEM HEALTH " + "─" * 53 + "┐")
                health = system_status.get("health", {})
                sys_info = system_status.get("system_info", {})
                
                health_status = health.get("status", "unknown")
                health_icon = "🟢" if health_status == "operational" else "🔴"
                print(f"│ Status: {health_icon} {health_status.upper():40s} │")
                
                uptime_sec = health.get("uptime_seconds", 0)
                uptime_days = uptime_sec // 86400
                uptime_hours = (uptime_sec % 86400) // 3600
                uptime_mins = (uptime_sec % 3600) // 60
                
                sessions = sys_info.get("total_sessions", 0)
                print(f"│ Uptime: {uptime_days}d {uptime_hours}h {uptime_mins}m" + " " * 15 + f"Active Sessions: {sessions:3d}           │")
                
                resp_time = health.get("response_time_avg_ms", 0)
                success_rate = health.get("success_rate_percent", 0)
                print(f"│ Response Time: {resp_time}ms avg" + " " * 10 + f"Success Rate: {success_rate}%          │")
                print("└" + "─" * 68 + "┘\n")
                
                # Recent Activity
                print("┌─── ACTIVITY STREAM " + "─" * 51 + "┐")
                if recent_activity:
                    for event in recent_activity:
                        timestamp = event.get("timestamp", "")
                        if timestamp:
                            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                            time_str = dt.strftime("%I:%M %p")
                        else:
                            time_str = "--:-- --"
                        
                        event_type = event.get("event", "unknown")
                        agent = event.get("agent", event.get("agents_invoked", [""])[0] if "agents_invoked" in event else "")
                        
                        # Format event description
                        if event_type == "boot":
                            desc = "System boot - AVERI activated"
                        elif event_type == "request":
                            query = event.get("user_query", "")[:30]
                            desc = f"Request: {query}..."
                        elif event_type == "agent_invocation":
                            op = event.get("operation", "operation")
                            desc = f"{agent}: {op}"
                        elif event_type == "mode_transition":
                            from_mode = event.get("from", "")
                            to_mode = event.get("to", "")
                            desc = f"Mode: {from_mode} → {to_mode}"
                        else:
                            desc = event_type.replace("_", " ").title()
                        
                        # Truncate description to fit
                        desc = desc[:48] if len(desc) > 48 else desc
                        desc = desc.ljust(48)
                        
                        print(f"│ {time_str} │ {desc} │")
                else:
                    print("│ No recent activity                                            │")
                
                print("└" + "─" * 68 + "┘\n")
                
                # Alerts
                alerts = system_status.get("alerts", [])
                if alerts:
                    print("┌─── ALERTS " + "─" * 60 + "┐")
                    for alert in alerts[:3]:  # Show max 3 alerts
                        level_icon = {"warning": "⚠️", "error": "❌", "critical": "🚨"}.get(alert.get("level"), "ℹ️")
                        msg = f"{alert.get('component')}: {alert.get('message')}"
                        msg = msg[:60] if len(msg) > 60 else msg
                        print(f"│ {level_icon}  {msg.ljust(60)} │")
                    print("└" + "─" * 68 + "┘\n")
                
                print("\nPress Ctrl+C to quit | Refreshing every second...")
                
                # Sleep before refresh
                time.sleep(self.refresh_rate)
                
            except KeyboardInterrupt:
                self.running = False
                print("\n\nDashboard stopped.")
                break
            except Exception as e:
                print(f"\nError rendering dashboard: {e}")
                time.sleep(self.refresh_rate)

    def render_curses(self, stdscr):
        """Render dashboard with curses (advanced terminal mode)."""
        # Hide cursor
        curses.curs_set(0)
        
        # Color pairs
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)
        curses.init_pair(2, curses.COLOR_YELLOW, curses.COLOR_BLACK)
        curses.init_pair(3, curses.COLOR_RED, curses.COLOR_BLACK)
        curses.init_pair(4, curses.COLOR_CYAN, curses.COLOR_BLACK)
        
        while self.running:
            try:
                stdscr.clear()
                
                # Load data
                system_status = self.load_system_status() or {}
                recent_activity = self.get_recent_activity(5)
                
                # Header
                header = "INCEPTION ENGINE LIVE DASHBOARD"
                time_str = datetime.now().strftime("%A, %b %d, %Y %I:%M:%S %p")
                
                stdscr.addstr(0, (80 - len(header)) // 2, header, curses.A_BOLD | curses.color_pair(4))
                stdscr.addstr(1, (80 - len(time_str)) // 2, time_str)
                
                # AVERI Status
                stdscr.addstr(3, 2, "AVERI STATUS", curses.A_BOLD)
                averi_status = system_status.get("agents", {}).get("averi_status", {})
                
                y = 4
                for agent_name in ["ATHENA", "VERA", "IRIS"]:
                    agent = averi_status.get(agent_name, {})
                    status = agent.get("status", "unknown")
                    color = curses.color_pair(1) if status == "active" else curses.color_pair(3)
                    
                    stdscr.addstr(y, 4, f"{agent_name}:", curses.A_BOLD)
                    stdscr.addstr(y, 15, status, color)
                    
                    # Show metrics
                    if agent_name == "ATHENA":
                        invocations = agent.get("invocations_today", 0)
                        stdscr.addstr(y, 30, f"Invocations: {invocations}")
                    elif agent_name == "VERA":
                        writes = agent.get("memory_writes_today", 0)
                        stdscr.addstr(y, 30, f"Memory Ops: {writes}")
                    elif agent_name == "IRIS":
                        actions = agent.get("actions_today", 0)
                        stdscr.addstr(y, 30, f"Actions: {actions}")
                    
                    y += 1
                
                # System Health
                y += 1
                stdscr.addstr(y, 2, "SYSTEM HEALTH", curses.A_BOLD)
                y += 1
                
                health = system_status.get("health", {})
                health_status = health.get("status", "unknown")
                health_color = curses.color_pair(1) if health_status == "operational" else curses.color_pair(3)
                
                stdscr.addstr(y, 4, "Status:", curses.A_BOLD)
                stdscr.addstr(y, 15, health_status.upper(), health_color)
                y += 1
                
                uptime_sec = health.get("uptime_seconds", 0)
                uptime_days = uptime_sec // 86400
                uptime_hours = (uptime_sec % 86400) // 3600
                uptime_mins = (uptime_sec % 3600) // 60
                
                stdscr.addstr(y, 4, f"Uptime: {uptime_days}d {uptime_hours}h {uptime_mins}m")
                y += 1
                
                stdscr.addstr(y, 4, f"Response Time: {health.get('response_time_avg_ms', 0)}ms avg")
                stdscr.addstr(y, 40, f"Success Rate: {health.get('success_rate_percent', 0)}%")
                y += 2
                
                # Activity Stream
                stdscr.addstr(y, 2, "ACTIVITY STREAM", curses.A_BOLD)
                y += 1
                
                for event in recent_activity:
                    timestamp = event.get("timestamp", "")
                    if timestamp:
                        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                        time_str = dt.strftime("%I:%M %p")
                    else:
                        time_str = "--:-- --"
                    
                    event_type = event.get("event", "unknown")
                    stdscr.addstr(y, 4, time_str)
                    stdscr.addstr(y, 15, event_type.replace("_", " ").title()[:30])
                    y += 1
                
                # Footer
                stdscr.addstr(stdscr.getmaxyx()[0] - 1, 2, "Press 'q' to quit | Refreshing...", curses.color_pair(2))
                
                stdscr.refresh()
                
                # Non-blocking input check
                stdscr.timeout(int(self.refresh_rate * 1000))
                key = stdscr.getch()
                
                if key == ord('q') or key == ord('Q'):
                    self.running = False
                    break
                    
            except KeyboardInterrupt:
                self.running = False
                break
            except Exception as e:
                stdscr.addstr(0, 0, f"Error: {str(e)}")
                stdscr.refresh()
                time.sleep(self.refresh_rate)

    def run(self, use_curses: bool = False):
        """Run the dashboard."""
        if use_curses and CURSES_AVAILABLE:
            try:
                curses.wrapper(self.render_curses)
            except Exception as e:
                print(f"Error running curses mode: {e}")
                print("Falling back to simple mode...")
                self.render_simple()
        else:
            self.render_simple()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Inception Engine Live Dashboard"
    )
    parser.add_argument(
        "--curses",
        action="store_true",
        help="Use curses mode (advanced terminal UI)"
    )
    
    args = parser.parse_args()
    
    dashboard = InceptionDashboard()
    
    try:
        dashboard.run(use_curses=args.curses)
    except KeyboardInterrupt:
        print("\n\nDashboard stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
