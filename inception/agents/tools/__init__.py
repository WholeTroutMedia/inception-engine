"""
Creative Liberation Engine v5 — Vector Memory Backend (ChromaDB)

Primary memory backend using ChromaDB for semantic search.
Local-first: runs on NAS or local machine. No cloud dependency.

Lineage: v4 memory/hippocampus.py → v5 vector backend
"""

import logging
import uuid
from typing import Any, Optional

from inception.memory.types import Memory, MemoryQuery, MemoryResult, MemoryType, MemoryBackend
from inception.memory.service import MemoryBackendInterface

logger = logging.getLogger(__name__)


class VectorBackend(MemoryBackendInterface):
    """
    ChromaDB-based vector memory backend.

    Usage:
        backend = VectorBackend(host="localhost", port=8000)
        await backend.initialize()
        service.register_backend(backend, primary=True)
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8000,
        collection_name: str = "inception_memory",
    ):
        self.host = host
        self.port = port
        self.collection_name = collection_name
        self._client = None
        self._collection = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize ChromaDB connection."""
        try:
            import chromadb

            self._client = chromadb.HttpClient(host=self.host, port=self.port)
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            self._initialized = True
            count = self._collection.count()
            logger.info(f"Vector backend connected: {self.host}:{self.port} ({count} memories)")
        except ImportError:
            logger.error("chromadb not installed. Run: pip install chromadb")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            raise

    async def store(self, memory: Memory) -> str:
        """Store a memory in ChromaDB."""
        if not self._initialized:
            raise RuntimeError("Backend not initialized")

        memory_id = memory.id or str(uuid.uuid4())

        # Build metadata (ChromaDB only supports str/int/float/bool)
        metadata = {
            "agent_id": memory.agent_id,
            "memory_type": memory.memory_type.value,
            "timestamp": memory.timestamp.isoformat() if memory.timestamp else "",
            "tags": ",".join(memory.tags) if memory.tags else "",
        }

        # Add optional fields if present
        if memory.session_id:
            metadata["session_id"] = memory.session_id
        if memory.importance is not None:
            metadata["importance"] = memory.importance

        self._collection.upsert(
            ids=[memory_id],
            documents=[memory.content],
            metadatas=[metadata],
        )

        logger.debug(f"Stored memory {memory_id} for agent {memory.agent_id}")
        return memory_id

    async def query(self, query: MemoryQuery) -> list[MemoryResult]:
        """Query memories using semantic search."""
        if not self._initialized:
            raise RuntimeError("Backend not initialized")

        # Build where clause for filtering
        where = {}
        if query.agent_id:
            where["agent_id"] = query.agent_id
        if query.memory_type:
            where["memory_type"] = query.memory_type.value
        if query.session_id:
            where["session_id"] = query.session_id

        kwargs = {
            "query_texts": [query.text],
            "n_results": query.limit or 10,
        }
        if where:
            kwargs["where"] = where

        results = self._collection.query(**kwargs)

        memories = []
        if results and results["ids"] and results["ids"][0]:
            for i, mem_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results.get("distances") else 1.0
                score = 1.0 - distance  # Convert distance to similarity

                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                document = results["documents"][0][i] if results.get("documents") else ""

                memories.append(
                    MemoryResult(
                        memory_id=mem_id,
                        content=document,
                        score=score,
                        metadata=metadata,
                    )
                )

        return memories

    async def delete(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        if not self._initialized:
            raise RuntimeError("Backend not initialized")

        try:
            self._collection.delete(ids=[memory_id])
            return True
        except Exception as e:
            logger.error(f"Failed to delete memory {memory_id}: {e}")
            return False

    async def health_check(self) -> dict[str, Any]:
        """Check backend health."""
        if not self._initialized:
            return {"status": "not_initialized"}

        try:
            count = self._collection.count()
            return {
                "status": "healthy",
                "backend": "chromadb",
                "host": self.host,
                "port": self.port,
                "memory_count": count,
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
