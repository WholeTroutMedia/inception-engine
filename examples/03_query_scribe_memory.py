#!/usr/bin/env python3
"""Example 03: How to Query SCRIBE Memory

Demonstrates the SCRIBE memory system with three memory types:
- Procedural: How-to knowledge and patterns
- Semantic: Facts, definitions, and relationships
- Episodic: Session history and decision records

Runnable: Yes - standalone memory implementation.
"""
import json
from datetime import datetime
from typing import Dict, Any, List, Optional


# --- SCRIBE Memory Implementation ---

class ScribeMemory:
    """SCRIBE memory system - three-layer knowledge store.

    Constitutional Basis: Article X (Compound Learning)
    All learning shall be ethical and transparent.
    """

    def __init__(self):
        self.procedural: List[Dict[str, Any]] = []
        self.semantic: List[Dict[str, Any]] = []
        self.episodic: List[Dict[str, Any]] = []

    def store_procedural(self, pattern: str, description: str,
                         steps: List[str], tags: Optional[List[str]] = None):
        """Store how-to knowledge and recurring patterns."""
        entry = {
            "id": f"proc_{len(self.procedural) + 1}",
            "pattern": pattern,
            "description": description,
            "steps": steps,
            "tags": tags or [],
            "created_at": datetime.now().isoformat(),
            "usage_count": 0
        }
        self.procedural.append(entry)
        return entry

    def store_semantic(self, key: str, value: Any,
                       category: str = "general",
                       source: str = "system"):
        """Store facts, definitions, and relationships."""
        entry = {
            "id": f"sem_{len(self.semantic) + 1}",
            "key": key,
            "value": value,
            "category": category,
            "source": source,
            "created_at": datetime.now().isoformat()
        }
        self.semantic.append(entry)
        return entry

    def store_episodic(self, session_id: str, event: str,
                       context: Dict[str, Any],
                       decision: Optional[str] = None):
        """Store session events and decision records."""
        entry = {
            "id": f"ep_{len(self.episodic) + 1}",
            "session_id": session_id,
            "event": event,
            "context": context,
            "decision": decision,
            "timestamp": datetime.now().isoformat()
        }
        self.episodic.append(entry)
        return entry

    def query_procedural(self, tag: Optional[str] = None,
                         pattern: Optional[str] = None) -> List[Dict]:
        """Query procedural memory by tag or pattern name."""
        results = self.procedural
        if tag:
            results = [e for e in results if tag in e.get("tags", [])]
        if pattern:
            results = [e for e in results
                       if pattern.lower() in e["pattern"].lower()]
        return results

    def query_semantic(self, key: Optional[str] = None,
                       category: Optional[str] = None) -> List[Dict]:
        """Query semantic memory by key or category."""
        results = self.semantic
        if key:
            results = [e for e in results
                       if key.lower() in e["key"].lower()]
        if category:
            results = [e for e in results
                       if e["category"] == category]
        return results

    def query_episodic(self, session_id: Optional[str] = None,
                       event_type: Optional[str] = None) -> List[Dict]:
        """Query episodic memory by session or event type."""
        results = self.episodic
        if session_id:
            results = [e for e in results
                       if e["session_id"] == session_id]
        if event_type:
            results = [e for e in results
                       if event_type.lower() in e["event"].lower()]
        return results

    def get_stats(self) -> Dict[str, int]:
        """Get memory statistics."""
        return {
            "procedural_count": len(self.procedural),
            "semantic_count": len(self.semantic),
            "episodic_count": len(self.episodic),
            "total_entries": (len(self.procedural) +
                             len(self.semantic) +
                             len(self.episodic))
        }


def main():
    print("="*60)
    print("INCEPTION ENGINE - SCRIBE Memory Query Example")
    print("="*60)

    scribe = ScribeMemory()

    # --- Store Procedural Memory ---
    print("\n[1] Storing procedural memory (how-to patterns)...")

    scribe.store_procedural(
        pattern="agent_deployment",
        description="Standard agent deployment to production",
        steps=["Validate config", "Run tests", "Build container",
               "Deploy to staging", "Health check", "Promote to prod"],
        tags=["deployment", "production", "ship"]
    )
    scribe.store_procedural(
        pattern="constitutional_review",
        description="Full constitutional compliance check",
        steps=["Load constitution", "Check all 19 articles",
               "Score each article", "Generate report"],
        tags=["compliance", "validate", "constitution"]
    )
    print("    Stored 2 procedural entries")

    # --- Store Semantic Memory ---
    print("\n[2] Storing semantic memory (facts & definitions)...")

    scribe.store_semantic("north_star", "Artist liberation",
                          category="mission", source="constitution")
    scribe.store_semantic("mode_count", 4,
                          category="architecture", source="system")
    scribe.store_semantic("agent_count", 35,
                          category="architecture", source="registry")
    scribe.store_semantic("hive_names",
                          ["AURORA", "LEX", "KEEPER",
                           "BROADCAST", "SWITCHBOARD", "COMPASS"],
                          category="architecture", source="registry")
    print("    Stored 4 semantic entries")

    # --- Store Episodic Memory ---
    print("\n[3] Storing episodic memory (session events)...")

    scribe.store_episodic(
        session_id="ideate_20260223",
        event="mode_started",
        context={"mode": "IDEATE", "prompt": "Portfolio platform"},
        decision="Proceed with artist-first approach"
    )
    scribe.store_episodic(
        session_id="ideate_20260223",
        event="mode_completed",
        context={"mode": "IDEATE", "agents_consulted": 30},
        decision="Vision approved by human council"
    )
    scribe.store_episodic(
        session_id="ship_20260223",
        event="gate_validation",
        context={"gate": "code_complete", "passed": True}
    )
    print("    Stored 3 episodic entries")

    # --- Query Procedural ---
    print(f"\n{'='*40}")
    print("QUERYING PROCEDURAL MEMORY")
    print(f"{'='*40}")

    results = scribe.query_procedural(tag="deployment")
    print(f"\n    Query: tag='deployment' -> {len(results)} results")
    for r in results:
        print(f"    Pattern: {r['pattern']}")
        print(f"    Steps: {' -> '.join(r['steps'])}")

    # --- Query Semantic ---
    print(f"\n{'='*40}")
    print("QUERYING SEMANTIC MEMORY")
    print(f"{'='*40}")

    results = scribe.query_semantic(category="architecture")
    print(f"\n    Query: category='architecture' -> {len(results)} results")
    for r in results:
        print(f"    {r['key']}: {r['value']}")

    results = scribe.query_semantic(key="north_star")
    print(f"\n    Query: key='north_star' -> {len(results)} results")
    for r in results:
        print(f"    {r['key']}: {r['value']} (source: {r['source']})")

    # --- Query Episodic ---
    print(f"\n{'='*40}")
    print("QUERYING EPISODIC MEMORY")
    print(f"{'='*40}")

    results = scribe.query_episodic(session_id="ideate_20260223")
    print(f"\n    Query: session='ideate_20260223' -> {len(results)} results")
    for r in results:
        print(f"    Event: {r['event']}")
        if r.get('decision'):
            print(f"    Decision: {r['decision']}")

    # --- Stats ---
    print(f"\n{'='*60}")
    print("MEMORY STATISTICS")
    print(f"{'='*60}")
    stats = scribe.get_stats()
    for key, value in stats.items():
        print(f"    {key}: {value}")

    print("\n" + "="*60)
    print("SCRIBE memory system demonstrated successfully.")
    print("="*60)


if __name__ == "__main__":
    main()
