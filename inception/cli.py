"""
Creative Liberation Engine v5 — CLI Entry Point

The single command-line interface for the engine.
All operations are accessible through: `inception <command>`

Usage:
    inception boot          # Start the engine server
    inception status        # Check engine status
    inception agents        # List registered agents
    inception ship "task"   # Submit a task in SHIP mode
    inception sync          # Run repo sync script
    inception new "slug"     # Scaffold a new project
"""

import argparse
import asyncio
import json
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("inception")


def cmd_boot(args):
    """Boot the Creative Liberation Engine server."""
    from inception.engine.server import run_server
    logger.info("⚡ Starting Creative Liberation Engine v5...")
    run_server()


def cmd_status(args):
    """Check engine status."""
    import httpx

    host = args.host or "localhost"
    port = args.port or 8080

    try:
        response = httpx.get(f"http://{host}:{port}/status", timeout=5.0)
        if response.status_code == 200:
            status = response.json()
            print(f"\n⚡ Creative Liberation Engine v{status['version']}")
            print(f"   Status:    {'🟢 Running' if status['running'] else '🔴 Stopped'}")
            print(f"   Mode:      {status['mode'].upper()}")
            print(f"   Agents:    {status['agents_loaded']} loaded")
            print(f"   Tier:      {status['tier']}")
            print(f"   Model:     {status['model']}")
            print(f"   Uptime:    {status['uptime_seconds']:.0f}s")
            print(f"   Boot:      {status['boot_time_ms']:.0f}ms")
            print(f"   Tasks:     {status['total_tasks']}")
            print(f"   Scans:     {status['constitutional_scans']}")
            print()
        else:
            print(f"❌ Engine returned {response.status_code}")
    except httpx.ConnectError:
        print(f"❌ Engine not running at {host}:{port}")
        print("   Run: inception boot")
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_agents(args):
    """List registered agents."""
    import httpx

    host = args.host or "localhost"
    port = args.port or 8080

    try:
        response = httpx.get(f"http://{host}:{port}/agents", timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            print(f"\n⚡ Creative Liberation Engine — {data['total']} Agents (Tier: {data['tier']})")
            print("─" * 60)
            for agent in data['agents']:
                status = "🟢" if agent['active'] else "🔴"
                tools = len(agent.get('tools', []))
                modes = ", ".join(agent.get('active_modes', []))
                print(f"  {status} {agent['name']:12} │ {agent['hive']:12} │ {tools} tools │ {modes}")
            print()
        else:
            print(f"❌ Engine returned {response.status_code}")
    except httpx.ConnectError:
        print(f"❌ Engine not running at {host}:{port}")
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_ship(args):
    """Submit a task in SHIP mode."""
    import httpx

    host = args.host or "localhost"
    port = args.port or 8080

    task_text = " ".join(args.task) if isinstance(args.task, list) else args.task

    try:
        response = httpx.post(
            f"http://{host}:{port}/task",
            json={"task": task_text, "mode": "ship", "agent": args.agent},
            timeout=120.0,
        )
        if response.status_code == 200:
            result = response.json()
            status = "✅" if result['success'] else "❌"
            print(f"\n{status} Task #{result['task_id']}")
            print(f"   Agent:     {result['agent']}")
            print(f"   Model:     {result['model_used']}")
            print(f"   Time:      {result['execution_time_ms']:.0f}ms")
            print(f"   Compliant: {'✅' if result['constitutional_compliant'] else '❌'}")
            if result.get('reasoning'):
                print(f"   Reasoning: {result['reasoning']}")
            print(f"   Result:    {json.dumps(result['result'], indent=2)}")
            print()
        else:
            error = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            print(f"❌ Task failed ({response.status_code}): {error}")
    except httpx.ConnectError:
        print(f"❌ Engine not running at {host}:{port}")
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_constitution(args):
    """Display the Agent Constitution."""
    from inception.constitution.articles import ARTICLES

    print("\n⚖️  THE AGENT CONSTITUTION")
    print("═" * 60)
    for article in ARTICLES:
        immutable = " 🔒" if article.immutable else ""
        print(f"\n  Article {article.numeral}: {article.name}{immutable}")
        print(f"    {article.summary}")
        print(f"    Enforcement: {article.enforcement}")
    print()




def cmd_new(args):
    """Scaffold a new project in the Creative Liberation Engine ecosystem."""
    import os
    from pathlib import Path

    slug = args.slug
    description = args.description or f"New Creative Liberation Engine project: {slug}"
    project_dir = Path.cwd() / slug

    if project_dir.exists():
        print(f"❌ Directory '{slug}' already exists")
        return

    # Create project structure
    dirs = [
        "CORE_FOUNDATION/context",
        "CORE_FOUNDATION/memory/projects",
        "CORE_FOUNDATION/governance",
        "src",
        "tests",
        "docs",
    ]

    for d in dirs:
        (project_dir / d).mkdir(parents=True, exist_ok=True)

    # Write PROJECT_OVERVIEW.md
    overview = f"""# Project: {slug}

## Metadata
- **Project ID**: `{slug}`
- **Status**: Active
- **Created**: Generated by `inception new`

## Executive Summary
{description}

## IDEATE
### Vision
_Define the project vision here._

### Core Problem
_What problem does this project solve?_

## PLAN
### Phase 1
- [ ] Define requirements
- [ ] Set up development environment
- [ ] Initial implementation

## Success Metrics
_Define measurable success criteria._
"""
    (project_dir / "CORE_FOUNDATION" / "context" / "PROJECT_OVERVIEW.md").write_text(overview)

    # Write .inception.json config
    config = {
        "project_id": slug,
        "description": description,
        "engine_version": "5.0.0",
        "tier": "studio",
        "active_modes": ["ideate", "plan", "ship", "validate"],
    }
    (project_dir / ".inception.json").write_text(
        json.dumps(config, indent=2)
    )

    print(f"✅ Created project: {slug}")
    print(f"   Location: {project_dir}")
    print(f"   Structure:")
    for d in dirs:
        print(f"     {slug}/{d}/")
    print(f"   Config: {slug}/.inception.json")
    print(f"   Overview: {slug}/CORE_FOUNDATION/context/PROJECT_OVERVIEW.md")
    print()
    print(f"   Next: cd {slug} && inception boot")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="inception",
        description="Creative Liberation Engine v5 — Artist Liberation Through Sovereign AI",
    )
    parser.add_argument("--host", default=None, help="Engine host (default: localhost)")
    parser.add_argument("--port", type=int, default=None, help="Engine port (default: 8080)")

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # boot
    boot_parser = subparsers.add_parser("boot", help="Start the Creative Liberation Engine server")
    boot_parser.set_defaults(func=cmd_boot)

    # status
    status_parser = subparsers.add_parser("status", help="Check engine status")
    status_parser.set_defaults(func=cmd_status)

    # agents
    agents_parser = subparsers.add_parser("agents", help="List registered agents")
    agents_parser.set_defaults(func=cmd_agents)

    # ship
    ship_parser = subparsers.add_parser("ship", help="Submit a task in SHIP mode")
    ship_parser.add_argument("task", nargs="+", help="Task description")
    ship_parser.add_argument("--agent", default=None, help="Force specific agent")
    ship_parser.set_defaults(func=cmd_ship)

    # constitution
    const_parser = subparsers.add_parser("constitution", help="Display the Agent Constitution")
    const_parser.set_defaults(func=cmd_constitution)

    # new
    new_parser = subparsers.add_parser("new", help="Scaffold a new project")
    new_parser.add_argument("slug", help="Project slug (directory name)")
    new_parser.add_argument("--description", default=None, help="Project description")
    new_parser.set_defaults(func=cmd_new)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
