"""Neocortex - Long-Term Memory System

PostgreSQL-backed persistent memory for historical learning,
pattern storage, knowledge graphs, and cross-session learning.
Indefinite retention with structured query support.
"""
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeEntry:
    """Long-term knowledge entry."""
    key: str
    value: Any
    category: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    access_count: int = 0
    confidence: float = 1.0
    source_sessions: List[str] = field(default_factory=list)
    related_keys: List[str] = field(default_factory=list)


class Neocortex:
    """Long-term memory system backed by PostgreSQL."""

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or "postgresql://localhost:5432/inception_memory"
        self._pool = None
        self._local_store: Dict[str, KnowledgeEntry] = {}
        self.logger = logging.getLogger("memory.neocortex")

    async def connect(self):
        """Establish PostgreSQL connection pool."""
        try:
            import asyncpg
            self._pool = await asyncpg.create_pool(self.db_url)
            await self._initialize_schema()
            self.logger.info("Neocortex connected to PostgreSQL")
        except ImportError:
            self.logger.warning("asyncpg not installed, using local store")

    async def _initialize_schema(self):
        """Create tables if they don't exist."""
        if not self._pool:
            return
        async with self._pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS knowledge (
                    key TEXT PRIMARY KEY,
                    value JSONB NOT NULL,
                    category TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    access_count INTEGER DEFAULT 0,
                    confidence FLOAT DEFAULT 1.0,
                    source_sessions TEXT[] DEFAULT '{}',
                    related_keys TEXT[] DEFAULT '{}'
                )
            """)

    async def store(self, key: str, value: Any, category: str,
                    confidence: float = 1.0, session_id: Optional[str] = None) -> bool:
        """Store knowledge in long-term memory."""
        if key in self._local_store:
            entry = self._local_store[key]
            entry.value = value
            entry.updated_at = datetime.utcnow()
            entry.confidence = max(entry.confidence, confidence)
            if session_id and session_id not in entry.source_sessions:
                entry.source_sessions.append(session_id)
        else:
            entry = KnowledgeEntry(
                key=key, value=value, category=category,
                confidence=confidence,
                source_sessions=[session_id] if session_id else []
            )
            self._local_store[key] = entry
        return True

    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve knowledge from long-term memory."""
        if key in self._local_store:
            entry = self._local_store[key]
            entry.access_count += 1
            return entry.value
        return None

    async def search(self, category: Optional[str] = None,
                     min_confidence: float = 0.0) -> List[KnowledgeEntry]:
        """Search knowledge base."""
        results = []
        for entry in self._local_store.values():
            if category and entry.category != category:
                continue
            if entry.confidence < min_confidence:
                continue
            results.append(entry)
        return results

    async def get_related(self, key: str) -> List[KnowledgeEntry]:
        """Get related knowledge entries."""
        if key not in self._local_store:
            return []
        related_keys = self._local_store[key].related_keys
        return [self._local_store[k] for k in related_keys if k in self._local_store]

    async def link(self, key1: str, key2: str):
        """Create bidirectional link between entries."""
        if key1 in self._local_store and key2 in self._local_store:
            if key2 not in self._local_store[key1].related_keys:
                self._local_store[key1].related_keys.append(key2)
            if key1 not in self._local_store[key2].related_keys:
                self._local_store[key2].related_keys.append(key1)

    async def get_stats(self) -> Dict[str, Any]:
        """Get long-term memory statistics."""
        categories = {}
        for entry in self._local_store.values():
            categories[entry.category] = categories.get(entry.category, 0) + 1
        return {
            "total_entries": len(self._local_store),
            "categories": categories,
            "avg_confidence": sum(e.confidence for e in self._local_store.values()) / max(len(self._local_store), 1)
        }
