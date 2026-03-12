"""
Creative Liberation Engine v5 — Concept Vector Engine

2048-dimension semantic relationship mapping for agents.
Each agent gets a concept vector encoding their expertise, capabilities,
collaboration patterns, and ethical boundaries.

Lineage: v3 concept-vectors/vector_engine.py (313 lines) → v5 (adapted)

Research Foundation:
- CATS Net Framework (Nature Computational Science, Feb 2026)
- 2048-dim decomposition: 8 feature ranges × 256 dims each
"""

import hashlib
import json
import logging
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


VECTOR_DIM = 2048

FEATURE_RANGES: dict[str, tuple[int, int]] = {
    "domain_expertise": (0, 256),
    "collaboration_patterns": (256, 512),
    "problem_types": (512, 768),
    "output_formats": (768, 1024),
    "temporal_context": (1024, 1280),
    "complexity_handling": (1280, 1536),
    "resource_requirements": (1536, 1792),
    "ethical_boundaries": (1792, 2048),
}

DOMAIN_MAP: dict[str, int] = {
    "architecture": 0, "design": 32, "engineering": 64,
    "legal": 96, "compliance": 128, "knowledge": 160,
    "operations": 192, "broadcast": 224,
}

PROBLEM_MAP: dict[str, int] = {
    "analytical": 0, "creative": 32, "technical": 64,
    "strategic": 96, "operational": 128, "research": 160,
    "communication": 192, "coordination": 224,
}

OUTPUT_MAP: dict[str, int] = {
    "code": 0, "documentation": 32, "analysis": 64,
    "visualization": 96, "report": 128, "protocol": 160,
    "schema": 192, "narrative": 224,
}


class ConceptVectorEngine:
    """
    2048-dimension concept vector system for multi-agent intelligence.

    Usage:
        engine = ConceptVectorEngine()
        bolt_vector = engine.generate_agent_vector("kbuildd", {
            "expertise": ["engineering", "architecture"],
            "capabilities": ["technical", "analytical", "creative"],
            "output_types": ["code", "documentation"],
        })
        similar = engine.find_similar_agents("kbuildd", top_k=3)
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path) if storage_path else None
        if self.storage_path:
            self.storage_path.mkdir(parents=True, exist_ok=True)
        self.agents: dict[str, np.ndarray] = {}
        self.metadata: dict[str, dict] = {}

    def generate_agent_vector(self, agent_name: str, metadata: dict) -> np.ndarray:
        """Generate 2048-dimension concept vector for an agent."""
        vector = np.zeros(VECTOR_DIM, dtype=np.float32)
        vector[0:256] = self._encode_domain_expertise(metadata.get("expertise", []))
        vector[256:512] = self._encode_collaboration_history(metadata.get("collaboration_history", []))
        vector[512:768] = self._encode_problem_types(metadata.get("capabilities", []))
        vector[768:1024] = self._encode_output_formats(metadata.get("output_types", []))
        vector[1024:1280] = self._encode_temporal_context(metadata.get("temporal", {}))
        vector[1280:1536] = self._encode_complexity_profile(metadata.get("complexity", {}))
        vector[1536:1792] = self._encode_resource_needs(metadata.get("resources", {}))
        vector[1792:2048] = self._encode_ethical_constraints(metadata.get("ethics", {}))

        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm

        self.agents[agent_name] = vector
        self.metadata[agent_name] = metadata
        logger.info(f"Generated concept vector for {agent_name} (dim={VECTOR_DIM})")
        return vector

    def _encode_domain_expertise(self, expertise: list[str]) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        for exp in expertise:
            if exp in DOMAIN_MAP:
                idx = DOMAIN_MAP[exp]
                rng = np.random.RandomState(hash(exp) % 2**31)
                vector[idx:idx + 32] = rng.randn(32) * 0.1 + 1.0
        return vector

    def _encode_collaboration_history(self, history: list[dict]) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        for i, collab in enumerate(history[:32]):
            success_rate = collab.get("success_rate", 0.5)
            frequency = collab.get("frequency", 0)
            vector[i * 8:(i + 1) * 8] = [success_rate] * 4 + [frequency] * 4
        return vector

    def _encode_problem_types(self, capabilities: list[str]) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        for cap in capabilities:
            if cap in PROBLEM_MAP:
                idx = PROBLEM_MAP[cap]
                vector[idx:idx + 32] = 1.0
        return vector

    def _encode_output_formats(self, outputs: list[str]) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        for output in outputs:
            if output in OUTPUT_MAP:
                idx = OUTPUT_MAP[output]
                vector[idx:idx + 32] = 1.0
        return vector

    def _encode_temporal_context(self, temporal: dict) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        vector[0:64] = temporal.get("response_urgency", 0.5)
        vector[64:128] = temporal.get("timezone_score", 0.5)
        vector[128:192] = temporal.get("context_depth", 0.5)
        vector[192:256] = temporal.get("freshness_need", 0.5)
        return vector

    def _encode_complexity_profile(self, complexity: dict) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        vector[0:64] = complexity.get("max_complexity", 0.7)
        vector[64:128] = complexity.get("preferred_complexity", 0.5)
        vector[128:192] = complexity.get("multi_step_ability", 0.6)
        vector[192:256] = complexity.get("abstraction_level", 0.5)
        return vector

    def _encode_resource_needs(self, resources: dict) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        vector[0:64] = resources.get("compute_need", 0.5)
        vector[64:128] = resources.get("memory_need", 0.5)
        vector[128:192] = resources.get("external_api", 0.3)
        vector[192:256] = resources.get("collaboration_need", 0.6)
        return vector

    def _encode_ethical_constraints(self, ethics: dict) -> np.ndarray:
        vector = np.zeros(256, dtype=np.float32)
        vector[0:64] = ethics.get("constitutional_compliance", 1.0)
        vector[64:128] = ethics.get("privacy_sensitivity", 0.9)
        vector[128:192] = ethics.get("transparency_level", 0.8)
        vector[192:256] = ethics.get("human_oversight", 0.9)
        return vector

    def calculate_similarity(self, agent1: str, agent2: str, relationship_type: str = "all") -> float:
        if agent1 not in self.agents or agent2 not in self.agents:
            return 0.0
        v1, v2 = self.agents[agent1], self.agents[agent2]
        if relationship_type == "all":
            return float(np.dot(v1, v2))
        if relationship_type in FEATURE_RANGES:
            start, end = FEATURE_RANGES[relationship_type]
            v1_slice, v2_slice = v1[start:end], v2[start:end]
            norm1, norm2 = np.linalg.norm(v1_slice), np.linalg.norm(v2_slice)
            if norm1 > 0 and norm2 > 0:
                return float(np.dot(v1_slice, v2_slice) / (norm1 * norm2))
        return 0.0

    def find_similar_agents(self, agent_name: str, top_k: int = 5, relationship_type: str = "all") -> list[tuple[str, float]]:
        if agent_name not in self.agents:
            return []
        similarities = [
            (other, self.calculate_similarity(agent_name, other, relationship_type))
            for other in self.agents if other != agent_name
        ]
        return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_k]

    def find_agents_for_problem_vector(self, problem_vector: np.ndarray, top_k: int = 3) -> list[dict]:
        results = []
        for name, agent_vec in self.agents.items():
            sim = float(np.dot(agent_vec, problem_vector) / (
                np.linalg.norm(agent_vec) * np.linalg.norm(problem_vector) + 1e-8
            ))
            results.append({"agent": name, "similarity": sim})
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def save_vector(self, agent_name: str) -> str:
        if agent_name not in self.agents:
            raise ValueError(f"Agent {agent_name} not found")
        if self.storage_path is None:
            raise ValueError("No storage path configured")
        vector = self.agents[agent_name]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{agent_name}_v{timestamp}.npy"
        filepath = self.storage_path / filename
        np.save(filepath, vector)
        sha256 = hashlib.sha256(vector.tobytes()).hexdigest()
        meta_file = filepath.with_suffix(".json")
        with open(meta_file, "w") as f:
            json.dump({"agent_name": agent_name, "timestamp": timestamp, "sha256": sha256,
                       "vector_dim": VECTOR_DIM, "metadata": self.metadata.get(agent_name, {})}, f, indent=2)
        logger.info(f"Saved vector for {agent_name}: {sha256[:12]}...")
        return sha256

    def load_vector(self, agent_name: str, version: Optional[str] = None) -> np.ndarray:
        if self.storage_path is None:
            raise ValueError("No storage path configured")
        if version:
            filename = f"{agent_name}_v{version}.npy"
        else:
            pattern = f"{agent_name}_v*.npy"
            files = sorted(self.storage_path.glob(pattern))
            if not files:
                raise FileNotFoundError(f"No vectors found for {agent_name}")
            filename = files[-1].name
        filepath = self.storage_path / filename
        vector = np.load(filepath)
        self.agents[agent_name] = vector
        meta_file = filepath.with_suffix(".json")
        if meta_file.exists():
            with open(meta_file) as f:
                meta_data = json.load(f)
                self.metadata[agent_name] = meta_data.get("metadata", {})
        return vector

    def get_status(self) -> dict:
        return {
            "agents_loaded": len(self.agents),
            "vector_dim": VECTOR_DIM,
            "feature_ranges": list(FEATURE_RANGES.keys()),
            "storage_path": str(self.storage_path) if self.storage_path else None,
        }
