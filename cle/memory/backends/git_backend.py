"""
Creative Liberation Engine v5 — Git Memory Backend

Archival memory backend using GitHub repository for persistent, versioned storage.
Memories are stored as markdown files in a structured directory layout.

Lineage: v4 memory/github_mcp.py → v5 git backend
"""

import logging
import json
import uuid
from pathlib import Path
from typing import Any, Optional
from datetime import datetime

from cle.memory.types import Memory, MemoryQuery, MemoryResult, MemoryType, MemoryBackend
from cle.memory.service import MemoryBackendInterface

logger = logging.getLogger(__name__)


class GitBackend(MemoryBackendInterface):
    """
    Git-based memory backend for archival storage.

    Stores memories as files in a local git repository.
    Can be synced to GitHub via git push.

    Directory structure:
        memories/
        ├── episodic/
        │   └── 2026-03-02_session-summary.md
        ├── semantic/
        │   └── user-preferences.md
        ├── decisions/
        │   └── chose-pnpm-over-npm.md
        ├── patterns/
        │   └── agent-coordination-pattern.md
        └── index.json
    """

    def __init__(self, repo_path: str, memories_dir: str = "memories"):
        self.repo_path = Path(repo_path)
        self.memories_dir = self.repo_path / memories_dir
        self._index: dict[str, dict] = {}
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the git backend and load index."""
        # Create directories
        for mem_type in MemoryType:
            (self.memories_dir / mem_type.value).mkdir(parents=True, exist_ok=True)

        # Load or create index
        index_path = self.memories_dir / "index.json"
        if index_path.exists():
            self._index = json.loads(index_path.read_text(encoding="utf-8"))
        else:
            self._index = {}
            self._save_index()

        self._initialized = True
        logger.info(f"Git backend initialized: {self.repo_path} ({len(self._index)} memories)")

    @property
    def backend_type(self) -> MemoryBackend:
        return MemoryBackend.GIT

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            raise RuntimeError("Git backend not initialized. Call initialize() first.")

    def _save_index(self) -> None:
        """Save the memory index."""
        index_path = self.memories_dir / "index.json"
        index_path.write_text(
            json.dumps(self._index, indent=2, default=str),
            encoding="utf-8",
        )

    def _memory_to_markdown(self, memory: Memory) -> str:
        """Convert a memory to a markdown file."""
        lines = [
            f"# {memory.memory_type.value.title()} Memory",
            "",
            f"**ID:** `{memory.id}`",
            f"**Type:** {memory.memory_type.value}",
            f"**Source:** {memory.source}",
            f"**Project:** {memory.project}",
            f"**Importance:** {memory.importance}",
            f"**Created:** {memory.created_at.isoformat()}",
            f"**Tags:** {', '.join(memory.tags)}",
            "",
            "---",
            "",
            memory.content,
            "",
        ]
        if memory.metadata:
            lines.extend([
                "## Metadata",
                "",
                "```json",
                json.dumps(memory.metadata, indent=2, default=str),
                "```",
                "",
            ])
        return "\n".join(lines)

    def _slug(self, text: str) -> str:
        """Create a filesystem-safe slug from text."""
        import re
        slug = re.sub(r'[^\w\s-]', '', text.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug[:60]

    async def store(self, memory: Memory) -> str:
        """Store a memory as a markdown file."""
        self._ensure_initialized()

        memory_id = memory.id or str(uuid.uuid4())
        slug = self._slug(memory.content[:60])
        filename = f"{datetime.now().strftime('%Y-%m-%d')}_{slug}.md"

        # Write file
        file_path = self.memories_dir / memory.memory_type.value / filename
        file_path.write_text(self._memory_to_markdown(memory), encoding="utf-8")

        # Update index
        self._index[memory_id] = {
            "file": str(file_path.relative_to(self.repo_path)),
            "type": memory.memory_type.value,
            "source": memory.source,
            "project": memory.project,
            "importance": memory.importance,
            "tags": memory.tags,
            "created": memory.created_at.isoformat(),
        }
        self._save_index()

        return memory_id

    async def query(self, query: MemoryQuery) -> MemoryResult:
        """Query memories by searching the index and file contents."""
        self._ensure_initialized()

        matches = []
        query_lower = query.text.lower()

        for memory_id, info in self._index.items():
            # Type filter
            if query.memory_type and info["type"] != query.memory_type.value:
                continue

            # Project filter
            if query.project and info.get("project") != query.project:
                continue

            # Importance filter
            if info.get("importance", 0) < query.min_importance:
                continue

            # Text search in file
            file_path = self.repo_path / info["file"]
            if file_path.exists():
                content = file_path.read_text(encoding="utf-8")
                if query_lower in content.lower() or query.text == "*":
                    matches.append(Memory(
                        id=memory_id,
                        content=content,
                        memory_type=MemoryType(info["type"]),
                        source=info.get("source", ""),
                        project=info.get("project", ""),
                        tags=info.get("tags", []),
                        importance=info.get("importance", 0.5),
                    ))

            if len(matches) >= query.limit:
                break

        return MemoryResult(
            memories=matches,
            query=query.text,
            total_found=len(matches),
        )

    async def get(self, memory_id: str) -> Optional[Memory]:
        """Get a specific memory by ID."""
        self._ensure_initialized()

        info = self._index.get(memory_id)
        if not info:
            return None

        file_path = self.repo_path / info["file"]
        if not file_path.exists():
            return None

        content = file_path.read_text(encoding="utf-8")
        return Memory(
            id=memory_id,
            content=content,
            memory_type=MemoryType(info["type"]),
            source=info.get("source", ""),
            project=info.get("project", ""),
            tags=info.get("tags", []),
            importance=info.get("importance", 0.5),
        )

    async def delete(self, memory_id: str) -> bool:
        """Delete a memory file and index entry."""
        self._ensure_initialized()

        info = self._index.get(memory_id)
        if not info:
            return False

        file_path = self.repo_path / info["file"]
        if file_path.exists():
            file_path.unlink()

        del self._index[memory_id]
        self._save_index()
        return True

    async def count(self) -> int:
        """Count total memories."""
        self._ensure_initialized()
        return len(self._index)
