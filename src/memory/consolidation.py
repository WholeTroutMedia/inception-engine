"""Consolidation Engine - Memory Transfer System

Operates at session end (operated by VERA). Extracts patterns
from Hippocampus working memory, performs pattern recognition,
and stores consolidated knowledge in Neocortex long-term memory.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ConsolidationEngine:
    """Memory consolidation from working to long-term storage."""

    def __init__(self, hippocampus=None, neocortex=None):
        self.hippocampus = hippocampus
        self.neocortex = neocortex
        self.logger = logging.getLogger("memory.consolidation")
        self.consolidation_history: List[Dict[str, Any]] = []

    async def consolidate_session(self, session_id: str) -> Dict[str, Any]:
        """Consolidate a session's working memory into long-term storage."""
        self.logger.info(f"Starting consolidation for session {session_id}")

        # Step 1: Extract from Hippocampus
        session_data = await self._extract_session(session_id)

        # Step 2: Pattern recognition
        patterns = await self._recognize_patterns(session_data)

        # Step 3: Store in Neocortex
        stored = await self._store_knowledge(patterns, session_id)

        # Step 4: Update knowledge graphs
        links = await self._update_knowledge_graph(patterns)

        result = {
            "session_id": session_id,
            "entries_extracted": len(session_data),
            "patterns_found": len(patterns),
            "knowledge_stored": stored,
            "links_created": links,
            "consolidated_at": datetime.utcnow().isoformat()
        }

        self.consolidation_history.append(result)
        self.logger.info(f"Consolidation complete: {stored} entries stored")
        return result

    async def _extract_session(self, session_id: str) -> Dict[str, Any]:
        """Extract working memory entries for a session."""
        if self.hippocampus:
            return await self.hippocampus.get_session_context(session_id)
        return {}

    async def _recognize_patterns(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify patterns and important information."""
        patterns = []
        for key, value in data.items():
            pattern = {
                "key": key,
                "value": value,
                "category": self._categorize(key),
                "confidence": self._calculate_confidence(value),
                "is_pattern": True
            }
            patterns.append(pattern)
        return patterns

    async def _store_knowledge(self, patterns: List[Dict], session_id: str) -> int:
        """Store recognized patterns in long-term memory."""
        stored = 0
        if self.neocortex:
            for pattern in patterns:
                await self.neocortex.store(
                    key=pattern["key"],
                    value=pattern["value"],
                    category=pattern["category"],
                    confidence=pattern["confidence"],
                    session_id=session_id
                )
                stored += 1
        return stored

    async def _update_knowledge_graph(self, patterns: List[Dict]) -> int:
        """Create links between related knowledge entries."""
        links = 0
        if self.neocortex and len(patterns) > 1:
            for i, p1 in enumerate(patterns):
                for p2 in patterns[i+1:]:
                    if p1["category"] == p2["category"]:
                        await self.neocortex.link(p1["key"], p2["key"])
                        links += 1
        return links

    def _categorize(self, key: str) -> str:
        """Categorize a memory entry."""
        categories = {
            "agent": ["agent", "builder", "validator"],
            "workflow": ["workflow", "pipeline", "step"],
            "decision": ["decision", "choice", "selected"],
            "error": ["error", "failure", "exception"],
            "metric": ["metric", "performance", "latency"]
        }
        key_lower = key.lower()
        for cat, keywords in categories.items():
            if any(kw in key_lower for kw in keywords):
                return cat
        return "general"

    def _calculate_confidence(self, value: Any) -> float:
        """Calculate confidence score for a memory entry."""
        if isinstance(value, dict) and "confidence" in value:
            return float(value["confidence"])
        return 0.8

    async def get_history(self) -> List[Dict[str, Any]]:
        """Get consolidation history."""
        return self.consolidation_history
