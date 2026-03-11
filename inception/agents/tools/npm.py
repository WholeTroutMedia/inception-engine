"""
Creative Liberation Engine v5 — NPM/Node Tools

Tools for npm operations. Used by builder agents to manage
JavaScript/TypeScript projects.
"""

import asyncio
import logging
import os
from typing import Any, Optional

from inception.agents.base import AgentTool

logger = logging.getLogger(__name__)


async def _run_npm(
    args: list[str],
    cwd: Optional[str] = None,
    timeout: float = 120.0,
) -> dict[str, Any]:
    """Run an npm command and return result."""
    cmd = ["npm"] + args
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd or os.getcwd(),
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        return {
            "returncode": process.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "ok": process.returncode == 0,
        }
    except asyncio.TimeoutError:
        return {"error": f"npm command timed out after {timeout}s", "ok": False}
    except FileNotFoundError:
        return {"error": "npm not found. Is Node.js installed?", "ok": False}
    except Exception as e:
        return {"error": str(e), "ok": False}


async def npm_install(cwd: Optional[str] = None) -> dict[str, Any]:
    """Run npm install in a directory."""
    return await _run_npm(["install"], cwd=cwd)


async def npm_run(script: str, cwd: Optional[str] = None) -> dict[str, Any]:
    """Run an npm script."""
    return await _run_npm(["run", script], cwd=cwd)


async def npm_test(cwd: Optional[str] = None) -> dict[str, Any]:
    """Run npm test."""
    return await _run_npm(["test"], cwd=cwd)


async def npm_build(cwd: Optional[str] = None) -> dict[str, Any]:
    """Run npm build."""
    return await _run_npm(["run", "build"], cwd=cwd)


async def npm_list_scripts(cwd: Optional[str] = None) -> dict[str, Any]:
    """List available npm scripts from package.json."""
    import json
    import pathlib

    pkg_path = pathlib.Path(cwd or os.getcwd()) / "package.json"
    if not pkg_path.exists():
        return {"error": "package.json not found", "ok": False}

    try:
        data = json.loads(pkg_path.read_text())
        scripts = data.get("scripts", {})
        return {"scripts": scripts, "ok": True}
    except Exception as e:
        return {"error": str(e), "ok": False}


# Tool registry entries
NPM_TOOLS: list[AgentTool] = [
    AgentTool(
        name="npm_install",
        description="Run npm install in a directory",
        func=npm_install,
        parameters={
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="npm_run",
        description="Run an npm script",
        func=npm_run,
        parameters={
            "script": {"type": "string", "description": "Script name to run"},
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        required=["script"],
    ),
    AgentTool(
        name="npm_test",
        description="Run npm test",
        func=npm_test,
        parameters={
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="npm_build",
        description="Run npm build",
        func=npm_build,
        parameters={
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="npm_list_scripts",
        description="List available npm scripts from package.json",
        func=npm_list_scripts,
        parameters={
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        required=[],
    ),
]
