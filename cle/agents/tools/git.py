"""
Creative Liberation Engine v5 — Git Tools

Tools for git operations. Used by builder and kstated agents
to manage source code and version control.
"""

import asyncio
import logging
import os
from typing import Any, Optional

from cle.agents.base import AgentTool

logger = logging.getLogger(__name__)


async def _run_git(
    args: list[str],
    cwd: Optional[str] = None,
    timeout: float = 60.0,
) -> dict[str, Any]:
    """Run a git command and return result."""
    cmd = ["git"] + args
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
        return {"error": f"git command timed out after {timeout}s", "ok": False}
    except FileNotFoundError:
        return {"error": "git not found. Is git installed?", "ok": False}
    except Exception as e:
        return {"error": str(e), "ok": False}


async def git_status(cwd: Optional[str] = None) -> dict[str, Any]:
    """Get git status."""
    result = await _run_git(["status", "--porcelain"], cwd=cwd)
    if result.get("ok"):
        lines = result["stdout"].strip().split("\n") if result["stdout"].strip() else []
        result["files"] = lines
        result["clean"] = len(lines) == 0
    return result


async def git_commit(
    message: str,
    add_all: bool = True,
    cwd: Optional[str] = None,
) -> dict[str, Any]:
    """Commit changes to git."""
    if add_all:
        add_result = await _run_git(["add", "-A"], cwd=cwd)
        if not add_result.get("ok"):
            return add_result

    return await _run_git(["commit", "-m", message], cwd=cwd)


async def git_push(
    remote: str = "origin",
    branch: Optional[str] = None,
    cwd: Optional[str] = None,
) -> dict[str, Any]:
    """Push commits to remote."""
    args = ["push", remote]
    if branch:
        args.append(branch)
    return await _run_git(args, cwd=cwd)


async def git_log(
    limit: int = 10,
    cwd: Optional[str] = None,
) -> dict[str, Any]:
    """Get recent git log entries."""
    result = await _run_git(
        ["log", f"--max-count={limit}", "--oneline"],
        cwd=cwd,
    )
    if result.get("ok"):
        lines = result["stdout"].strip().split("\n") if result["stdout"].strip() else []
        result["commits"] = lines
    return result


async def git_diff(
    staged: bool = False,
    cwd: Optional[str] = None,
) -> dict[str, Any]:
    """Get git diff."""
    args = ["diff"]
    if staged:
        args.append("--staged")
    return await _run_git(args, cwd=cwd)


async def git_branch(
    name: Optional[str] = None,
    checkout: bool = False,
    cwd: Optional[str] = None,
) -> dict[str, Any]:
    """List or create git branches."""
    if name and checkout:
        return await _run_git(["checkout", "-b", name], cwd=cwd)
    elif name:
        return await _run_git(["branch", name], cwd=cwd)
    else:
        result = await _run_git(["branch", "-a"], cwd=cwd)
        if result.get("ok"):
            lines = result["stdout"].strip().split("\n") if result["stdout"].strip() else []
            result["branches"] = [b.strip() for b in lines]
        return result


# Tool registry entries
GIT_TOOLS: list[AgentTool] = [
    AgentTool(
        name="git_status",
        description="Get the current git repository status",
        func=git_status,
        parameters={
            "cwd": {"type": "string", "description": "Repository path (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="git_commit",
        description="Commit changes to git with a message",
        func=git_commit,
        parameters={
            "message": {"type": "string", "description": "Commit message"},
            "add_all": {"type": "boolean", "description": "Stage all changes first (default: true)"},
            "cwd": {"type": "string", "description": "Repository path (optional)"},
        },
        required=["message"],
    ),
    AgentTool(
        name="git_push",
        description="Push commits to a remote repository",
        func=git_push,
        parameters={
            "remote": {"type": "string", "description": "Remote name (default: origin)"},
            "branch": {"type": "string", "description": "Branch name (optional)"},
            "cwd": {"type": "string", "description": "Repository path (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="git_log",
        description="Get recent git commit history",
        func=git_log,
        parameters={
            "limit": {"type": "integer", "description": "Max number of commits (default: 10)"},
            "cwd": {"type": "string", "description": "Repository path (optional)"},
        },
        required=[],
    ),
    AgentTool(
        name="git_diff",
        description="Get git diff of changes",
        func=git_diff,
        parameters={
            "staged": {"type": "boolean", "description": "Show staged changes only"},
            "cwd": {"type": "string", "description": "Repository path (optional)"},
        },
        required=[],
    ),
]
