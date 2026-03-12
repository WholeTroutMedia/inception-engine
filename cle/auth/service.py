"""
Creative Liberation Engine v5 — Unified Memory Service

One API, multiple backends. The single surface for all memory operations.
Consolidates v4's 6 fragmented memory surfaces into one clean interface.

Lineage:
  v4 memory/hippocampus.py + neocortex.py + apollo_encoder.py +
  consolidation_pipeline.py + github_mcp.py + pattern_accumulator.py
  → v5 MemoryService (unified)

Backends:
  - Vector (ChromaDB) — semantic search, local-first
  - Git (GitHub) — archival, versioned persistence
  - Firestore — cloud sync (optional)
"""

import logging
import time
import uuid
from typing import Any, Optional

from cle.memory.types import Memory, MemoryQuery, MemoryResult, MemoryType, MemoryBackend

logger = logging.getLogger(__name__)


class MemoryBackendInterface:
    """Interface that all memory backends must implement."""

    async def store(self, memory: Memory) -> str:
        """Store a memory. Returns the memory ID."""
        raise NotImplementedError

    async def query(self, query: MemoryQuery) -> MemoryResult:
        """Query memories."""
        raise NotImplementedError

    async def get(self, memory_id: str) -> Optional[Memory]:
        """Get a specific memory by ID."""
        raise NotImplementedError

    async def delete(self, memory_id: str) -> bool:
        """Delete a memory. Returns True if deleted."""
        raise NotImplementedError

    async def count(self) -> int:
        """Count total memories in this backend."""
        raise NotImplementedError

    @property
    def backend_type(self) -> MemoryBackend:
        raise NotImplementedError


class MemoryService:
    """
    Unified Memory Service — one API for all memory operations.

    Usage:
        service = MemoryService()
        service.register_backend(vector_backend)  # Primary
        service.register_backend(git_backend)      # Archival

        # Store
        memory_id = await service.store(Memory(
            content="User prefers dark mode",
            memory_type=MemoryType.SEMANTIC,
            source="kstated",
            importance=0.7,
        ))

        # Query
        result = await service.query(MemoryQuery(
            text="user preferences",
            memory_type=MemoryType.SEMANTIC,
            limit=5,
        ))

        # Consolidate (move important episodic → semantic)
        await service.consolidate()
    """

    def __init__(self):
        self._backends: dict[MemoryBackend, MemoryBackendInterface] = {}
        self._primary: Optional[MemoryBackend] = None
        self._store_count = 0
        self._query_count = 0

    def register_backend(self, backend: MemoryBackendInterface, primary: bool = False) -> None:
        """Register a memory backend."""
        self._backends[backend.backend_type] = backend
        if primary or self._primary is None:
            self._primary = backend.backend_type
        logger.info(f"Memory backend registered: {backend.backend_type.value} (primary={primary})")

    @property
    def primary_backend(self) -> MemoryBackendInterface:
        """Get the primary backend."""
        if self._primary is None:
            raise RuntimeError("No memory backend registered")
        return self._backends[self._primary]

    async def store(
        self,
        memory: Memory,
        backends: Optional[list[MemoryBackend]] = None,
    ) -> str:
        """
        Store a memory to one or more backends.

        Args:
            memory: The memory to store
            backends: Specific backends to store to (None = primary only)

        Returns:
            Memory ID
        """
        if not memory.id:
            memory.id = str(uuid.uuid4())

        target_backends = backends or ([self._primary] if self._primary else [])

        for backend_type in target_backends:
            if backend_type in self._backends:
                try:
                    await self._backends[backend_type].store(memory)
                    logger.debug(f"Stored memory {memory.id} to {backend_type.value}")
                except Exception as e:
                    logger.error(f"Failed to store to {backend_type.value}: {e}")

        self._store_count += 1
        return memory.id

    async def store_all(self, memory: Memory) -> str:
        """Store a memory to ALL registered backends."""
        return await self.store(memory, backends=list(self._backends.keys()))

    async def query(
        self,
        query: MemoryQuery,
        backend: Optional[MemoryBackend] = None,
    ) -> MemoryResult:
        """
        Query the memory system.

        Args:
            query: Search query
            backend: Specific backend to query (None = primary)

        Returns:
            MemoryResult with matching memories
        """
        start = time.perf_counter()
        target = backend or self._primary
        if target is None:
            return MemoryResult(query=query.text, total_found=0, search_time_ms=0)

        try:
            result = await self._backends[target].query(query)
            duration = (time.perf_counter() - start) * 1000
            result.search_time_ms = round(duration, 2)
            result.backend = target.value
            self._query_count += 1
            return result
        except Exception as e:
            logger.error(f"Memory query failed on {target.value}: {e}")
            return MemoryResult(
                query=query.text,
                total_found=0,
                search_time_ms=(time.perf_counter() - start) * 1000,
                backend=target.value,
            )

    async def get(self, memory_id: str) -> Optional[Memory]:
        """Get a specific memory by ID from the primary backend."""
        return await self.primary_backend.get(memory_id)

    async def delete(self, memory_id: str) -> bool:
        """Delete a memory from all backends."""
        deleted = False
        for backend in self._backends.values():
            try:
                if await backend.delete(memory_id):
                    deleted = True
            except Exception as e:
                logger.error(f"Failed to delete from {backend.backend_type.value}: {e}")
        return deleted

    async def consolidate(self, importance_threshold: float = 0.7) -> int:
        """
        Consolidate episodic memories into semantic knowledge.

        Lineage: v4 consolidation_pipeline.py
        - Finds episodic memories above importance threshold
        - Extracts semantic knowledge
        - Stores as semantic memories
        - Archives originals

        Returns:
            Number of memories consolidated
        """
        result = await self.query(MemoryQuery(
            text="*",
            memory_type=MemoryType.EPISODIC,
            min_importance=importance_threshold,
            limit=100,
        ))

        consolidated = 0
        for memory in result.memories:
            semantic = Memory(
                content=f"Consolidated from episodic: {memory.content}",
                memory_type=MemoryType.SEMANTIC,
                source="consolidation",
                project=memory.project,
                tags=memory.tags + ["consolidated"],
                importance=memory.importance,
                metadata={
                    "source_episodic_id": memory.id,
                    "consolidated_at": time.time(),
                },
            )
            await self.store(semantic)
            consolidated += 1

        if consolidated > 0:
            logger.info(f"Consolidated {consolidated} episodic memories to semantic")

        return consolidated

    def get_status(self) -> dict[str, Any]:
        """Get memory service status."""
        return {
            "backends": list(b.value for b in self._backends.keys()),
            "primary": self._primary.value if self._primary else None,
            "total_stores": self._store_count,
            "total_queries": self._query_count,
        }
