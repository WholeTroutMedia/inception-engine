"""
Creative Liberation Engine v5 — Filesystem Tools

Tools for reading, writing, listing, and searching files.
Used by agents to interact with the local filesystem.
"""

import logging
import os
import pathlib
from typing import Any, Optional

from cle.agents.base import AgentTool

logger = logging.getLogger(__name__)


async def file_read(
    path: str,
    encoding: str = "utf-8",
    max_bytes: int = 1_000_000,
) -> dict[str, Any]:
    """Read a file from the filesystem."""
    try:
        p = pathlib.Path(path)
        if not p.exists():
            return {"error": f"File not found: {path}", "ok": False}
        if not p.is_file():
            return {"error": f"Not a file: {path}", "ok": False}

        size = p.stat().st_size
        if size > max_bytes:
            return {
                "error": f"File too large: {size} bytes (max {max_bytes})",
                "ok": False,
                "size": size,
            }

        content = p.read_text(encoding=encoding)
        return {
            "content": content,
            "size": size,
            "path": str(p.resolve()),
            "ok": True,
        }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def file_write(
    path: str,
    content: str,
    encoding: str = "utf-8",
    create_dirs: bool = True,
) -> dict[str, Any]:
    """Write content to a file."""
    try:
        p = pathlib.Path(path)
        if create_dirs:
            p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding=encoding)
        return {
            "path": str(p.resolve()),
            "size": p.stat().st_size,
            "ok": True,
        }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def file_list(
    path: str = ".",
    pattern: str = "*",
    recursive: bool = False,
) -> dict[str, Any]:
    """List files in a directory."""
    try:
        p = pathlib.Path(path)
        if not p.exists():
            return {"error": f"Path not found: {path}", "ok": False}
        if not p.is_dir():
            return {"error": f"Not a directory: {path}", "ok": False}

        if recursive:
            files = list(p.rglob(pattern))
        else:
            files = list(p.glob(pattern))

        entries = []
        for f in sorted(files):
            entry = {
                "name": f.name,
                "path": str(f),
                "is_dir": f.is_dir(),
                "is_file": f.is_file(),
            }
            if f.is_file():
                entry["size"] = f.stat().st_size
            entries.append(entry)

        return {"entries": entries, "count": len(entries), "ok": True}
    except Exception as e:
        return {"error": str(e), "ok": False}


async def file_search(
    path: str,
    pattern: str,
    content_search: Optional[str] = None,
) -> dict[str, Any]:
    """Search for files matching a pattern, optionally filtering by content."""
    try:
        p = pathlib.Path(path)
        matches = list(p.rglob(pattern))

        if content_search:
            filtered = []
            for f in matches:
                if f.is_file():
                    try:
                        text = f.read_text(errors="ignore")
                        if content_search in text:
                            filtered.append(f)
                    except Exception:
                        pass
            matches = filtered

        return {
            "matches": [str(f) for f in sorted(matches) if f.is_file()],
            "count": len(matches),
            "ok": True,
        }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def file_delete(path: str) -> dict[str, Any]:
    """Delete a file."""
    try:
        p = pathlib.Path(path)
        if not p.exists():
            return {"error": f"File not found: {path}", "ok": False}
        if not p.is_file():
            return {"error": f"Not a file (use rmdir for directories): {path}", "ok": False}
        p.unlink()
        return {"path": path, "deleted": True, "ok": True}
    except Exception as e:
        return {"error": str(e), "ok": False}


# Tool registry entries
FILESYSTEM_TOOLS: list[AgentTool] = [
    AgentTool(
        name="file_read",
        description="Read a file from the filesystem",
        func=file_read,
        parameters={
            "path": {"type": "string", "description": "File path to read"},
            "encoding": {"type": "string", "description": "File encoding (default: utf-8)"},
            "max_bytes": {"type": "integer", "description": "Max file size in bytes (default: 1MB)"},
        },
        required=["path"],
    ),
    AgentTool(
        name="file_write",
        description="Write content to a file",
        func=file_write,
        parameters={
            "path": {"type": "string", "description": "File path to write"},
            "content": {"type": "string", "description": "Content to write"},
            "create_dirs": {"type": "boolean", "description": "Create parent directories if needed"},
        },
        required=["path", "content"],
    ),
    AgentTool(
        name="file_list",
        description="List files in a directory",
        func=file_list,
        parameters={
            "path": {"type": "string", "description": "Directory path"},
            "pattern": {"type": "string", "description": "Glob pattern (default: *)"},
            "recursive": {"type": "boolean", "description": "Search recursively"},
        },
        required=[],
    ),
    AgentTool(
        name="file_search",
        description="Search for files matching a pattern",
        func=file_search,
        parameters={
            "path": {"type": "string", "description": "Root directory to search"},
            "pattern": {"type": "string", "description": "Filename glob pattern"},
            "content_search": {"type": "string", "description": "Optional: filter by file content"},
        },
        required=["path", "pattern"],
    ),
    AgentTool(
        name="file_delete",
        description="Delete a file from the filesystem",
        func=file_delete,
        parameters={
            "path": {"type": "string", "description": "File path to delete"},
        },
        required=["path"],
    ),
]
