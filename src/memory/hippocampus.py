"""Hippocampus - Working Memory System

Redis-backed short-term memory for active session context.
7-day TTL with real-time logging, session tracking, and
context management for active agent operations.
"""
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

DEFAULT_TTL = timedelta(days=7)


@dataclass
class MemoryEntry:
    """Single memory entry in working memory."""
    key: str
    value: Any
    created_at: datetime = field(default_factory=datetime.utcnow)
    accessed_at: datetime = field(default_factory=datetime.utcnow)
    ttl: timedelta = field(default=DEFAULT_TTL)
    tags: List[str] = field(default_factory=list)
    session_id: Optional[str] = None


class Hippocampus:
    """Working memory system backed by Redis."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or "redis://localhost:6379/0"
        self._client = None
        self._local_cache: Dict[str, MemoryEntry] = {}
        self.logger = logging.getLogger("memory.hippocampus")

    async def connect(self):
        """Establish Redis connection."""
        try:
            import aioredis
            self._client = await aioredis.from_url(self.redis_url)
            self.logger.info("Hippocampus connected to Redis")
        except ImportError:
            self.logger.warning("aioredis not installed, using local cache")

    async def store(self, key: str, value: Any, session_id: Optional[str] = None,
                    tags: Optional[List[str]] = None, ttl: Optional[timedelta] = None) -> bool:
        """Store value in working memory."""
        entry = MemoryEntry(
            key=key, value=value, session_id=session_id,
            tags=tags or [], ttl=ttl or DEFAULT_TTL
        )
        self._local_cache[key] = entry

        if self._client:
            try:
                await self._client.setex(
                    f"hip:{key}", int(entry.ttl.total_seconds()),
                    json.dumps({"value": value, "session_id": session_id,
                               "tags": tags or [], "created_at": entry.created_at.isoformat()})
                )
            except Exception as e:
                self.logger.error(f"Redis store failed: {e}")
        return True

    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve value from working memory."""
        if key in self._local_cache:
            entry = self._local_cache[key]
            entry.accessed_at = datetime.utcnow()
            return entry.value

        if self._client:
            try:
                data = await self._client.get(f"hip:{key}")
                if data:
                    parsed = json.loads(data)
                    return parsed.get("value")
            except Exception as e:
                self.logger.error(f"Redis retrieve failed: {e}")
        return None

    async def search_by_tags(self, tags: List[str]) -> List[MemoryEntry]:
        """Search memories by tags."""
        results = []
        for entry in self._local_cache.values():
            if any(tag in entry.tags for tag in tags):
                results.append(entry)
        return results

    async def get_session_context(self, session_id: str) -> Dict[str, Any]:
        """Get all memories for a session."""
        context = {}
        for key, entry in self._local_cache.items():
            if entry.session_id == session_id:
                context[key] = entry.value
        return context

    async def clear_session(self, session_id: str):
        """Clear all memories for a session."""
        keys_to_remove = [
            k for k, v in self._local_cache.items()
            if v.session_id == session_id
        ]
        for key in keys_to_remove:
            del self._local_cache[key]

    async def get_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        return {
            "total_entries": len(self._local_cache),
            "sessions": len(set(e.session_id for e in self._local_cache.values() if e.session_id)),
            "oldest_entry": min((e.created_at for e in self._local_cache.values()), default=None)
        }
