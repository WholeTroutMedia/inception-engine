"""Memory System - Inception Engine

Two-tier memory architecture:
- Hippocampus: Working memory (Redis, 7-day TTL)
- Neocortex: Long-term memory (PostgreSQL, persistent)
- Consolidation: Memory transfer and pattern extraction
"""
from .hippocampus import Hippocampus
from .neocortex import Neocortex
from .consolidation import ConsolidationEngine

__all__ = ["Hippocampus", "Neocortex", "ConsolidationEngine"]
