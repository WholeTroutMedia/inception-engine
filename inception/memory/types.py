"""
Creative Liberation Engine v5 — Memory Types

Pydantic models for the unified memory system.
"""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


class MemoryType(str, Enum):
    """Types of memory entries."""
    EPISODIC = "episodic"       # Specific events/sessions
    SEMANTIC = "semantic"       # Facts and knowledge
    PROCEDURAL = "procedural"   # How to do things
    DECISION = "decision"       # Decisions and rationale
    PATTERN = "pattern"         # Detected patterns


class MemoryBackend(str, Enum):
    """Available memory storage backends."""
    VECTOR = "vector"       # ChromaDB
    GIT = "git"             # GitHub repository
    FIRESTORE = "firestore" # Cloud Firestore


class Memory(BaseModel):
    """A single memory entry."""
    id: str = ""
    content: str
    memory_type: MemoryType = MemoryType.SEMANTIC
    source: str = ""  # Agent or process that created this
    project: str = ""  # Project context
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[list[float]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    importance: float = 0.5  # 0.0 to 1.0

    @property
    def summary(self) -> str:
        return f"[{self.memory_type.value}] {self.content[:100]}..."


class MemoryQuery(BaseModel):
    """Query for searching memories."""
    text: str
    memory_type: Optional[MemoryType] = None
    project: Optional[str] = None
    tags: Optional[list[str]] = None
    min_importance: float = 0.0
    limit: int = 10
    include_embeddings: bool = False


class MemoryResult(BaseModel):
    """Result from a memory query."""
    memories: list[Memory] = Field(default_factory=list)
    query: str = ""
    total_found: int = 0
    search_time_ms: float = 0.0
    backend: str = ""
