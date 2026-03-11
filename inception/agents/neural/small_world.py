"""
Creative Liberation Engine v5 — Small-World Network Topology

Overlays small-world architecture on hierarchical hive structure:
1. Local clustering — high connectivity within hives
2. Long-range shortcuts — semantic similarity-based connections
3. Efficient routing — Dijkstra via concept vector weights
4. Resilience — redundant paths for failure tolerance

Lineage: v3 network-topology/small_world_routing.py (401 lines) → v5

Research Foundation:
- Nature: The network architecture of general intelligence (2026)
- Human brain connectome exhibits small-world properties

Performance Target: +10% routing efficiency, +25% failure resilience
"""

import logging
import random
import numpy as np
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class NetworkAgent:
    """Agent representation for network topology."""
    id: int
    name: str
    hive: str
    concept_vector: np.ndarray
    subordinates: list[int] = field(default_factory=list)
    status: str = "active"


@dataclass
class NetworkPath:
    """Path through agent network."""
    agents: list[NetworkAgent]
    total_distance: float
    hop_count: int
    uses_shortcuts: bool
    reliability: float


class SmallWorldNetwork:
    """
    Small-world topology overlay on the hive hierarchy.

    Usage:
        agents = [NetworkAgent(id=0, name="BOLT", hive="AURORA", concept_vector=vec)]
        network = SmallWorldNetwork(agents, shortcut_probability=0.1)
        path = network.find_shortest_path(0, 5)
    """

    def __init__(self, agents: list[NetworkAgent], shortcut_probability: float = 0.1):
        self.agents = {a.id: a for a in agents}
        self.shortcut_prob = shortcut_probability
        self.adjacency_matrix = self._build_adjacency_matrix()
        self.shortcuts = self._add_small_world_shortcuts()
        self.clustering_coefficient = self._calculate_clustering()
        self.characteristic_path_length = self._calculate_path_length()

    def _build_adjacency_matrix(self) -> np.ndarray:
        """Build connectivity from hive hierarchy + within-hive full connectivity."""
        n = max(self.agents.keys()) + 1 if self.agents else 0
        matrix = np.zeros((n, n))

        for agent in self.agents.values():
            for sub_id in agent.subordinates:
                if sub_id in self.agents:
                    matrix[agent.id][sub_id] = 1.0
                    matrix[sub_id][agent.id] = 1.0

        hives = self._group_by_hive()
        for hive_name, members in hives.items():
            for i, a1 in enumerate(members):
                for a2 in members[i + 1:]:
                    matrix[a1.id][a2.id] = 1.0
                    matrix[a2.id][a1.id] = 1.0

        return matrix

    def _group_by_hive(self) -> dict[str, list[NetworkAgent]]:
        hives: dict[str, list[NetworkAgent]] = defaultdict(list)
        for agent in self.agents.values():
            hives[agent.hive].append(agent)
        return dict(hives)

    def _add_small_world_shortcuts(self) -> dict[tuple[int, int], float]:
        shortcuts = {}
        for a1 in self.agents.values():
            similar = self._find_similar_remote_agents(a1, top_k=10)
            for a2, similarity in similar:
                if not self._are_connected(a1.id, a2.id):
                    if similarity > 0.8 and random.random() < self.shortcut_prob:
                        shortcuts[(a1.id, a2.id)] = similarity
                        shortcuts[(a2.id, a1.id)] = similarity
                        self.adjacency_matrix[a1.id][a2.id] = 1.0
                        self.adjacency_matrix[a2.id][a1.id] = 1.0
        logger.info(f"Added {len(shortcuts) // 2} small-world shortcuts")
        return shortcuts

    def _find_similar_remote_agents(self, agent: NetworkAgent, top_k: int = 10) -> list[tuple[NetworkAgent, float]]:
        similarities = []
        for other in self.agents.values():
            if other.id == agent.id or other.hive == agent.hive:
                continue
            sim = self._cosine_similarity(agent.concept_vector, other.concept_vector)
            similarities.append((other, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def _cosine_similarity(self, v1: np.ndarray, v2: np.ndarray) -> float:
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8))

    def _are_connected(self, id1: int, id2: int) -> bool:
        return self.adjacency_matrix[id1][id2] > 0

    def find_shortest_path(self, source_id: int, target_id: int) -> NetworkPath:
        """Use Dijkstra's algorithm with concept-vector-weighted edges."""
        if source_id not in self.agents or target_id not in self.agents:
            return NetworkPath([], float("inf"), 0, False, 0.0)

        distances: dict[int, float] = {aid: float("inf") for aid in self.agents}
        distances[source_id] = 0.0
        previous: dict[int, int] = {}
        unvisited = set(self.agents.keys())

        while unvisited:
            current = min(unvisited, key=lambda x: distances[x])
            if current == target_id:
                break
            if distances[current] == float("inf"):
                break
            unvisited.remove(current)

            for neighbor_id in self._get_neighbors(current):
                if neighbor_id in unvisited:
                    similarity = self._calculate_edge_weight(current, neighbor_id)
                    distance = distances[current] + (2.0 - similarity)
                    if distance < distances[neighbor_id]:
                        distances[neighbor_id] = distance
                        previous[neighbor_id] = current

        if distances[target_id] == float("inf"):
            return NetworkPath([], float("inf"), 0, False, 0.0)

        path_agents = []
        current = target_id
        while current in previous:
            path_agents.append(self.agents[current])
            current = previous[current]
        path_agents.append(self.agents[source_id])
        path_agents.reverse()

        uses_shortcuts = any(
            (path_agents[i].id, path_agents[i + 1].id) in self.shortcuts
            for i in range(len(path_agents) - 1)
        )
        reliability = self._calculate_path_reliability(path_agents)

        return NetworkPath(
            agents=path_agents,
            total_distance=distances[target_id],
            hop_count=len(path_agents) - 1,
            uses_shortcuts=uses_shortcuts,
            reliability=reliability,
        )

    def _get_neighbors(self, agent_id: int) -> list[int]:
        return [oid for oid in self.agents if self.adjacency_matrix[agent_id][oid] > 0]

    def _calculate_edge_weight(self, id1: int, id2: int) -> float:
        return self._cosine_similarity(self.agents[id1].concept_vector, self.agents[id2].concept_vector)

    def _calculate_path_reliability(self, path: list[NetworkAgent]) -> float:
        agent_reliability = 0.99
        active_count = sum(1 for a in path if a.status == "active")
        return agent_reliability ** active_count

    def find_redundant_paths(self, source_id: int, target_id: int, k: int = 3) -> list[NetworkPath]:
        """Find k node-disjoint paths for fault tolerance."""
        paths = []
        original_matrix = self.adjacency_matrix.copy()

        for _ in range(k):
            path = self.find_shortest_path(source_id, target_id)
            if not path.agents or path.total_distance == float("inf"):
                break
            paths.append(path)
            for agent in path.agents[1:-1]:
                self.adjacency_matrix[agent.id, :] = 0
                self.adjacency_matrix[:, agent.id] = 0

        self.adjacency_matrix = original_matrix
        return paths

    def calculate_network_resilience(self, n_simulations: int = 100, failure_rate: float = 0.2) -> float:
        connectivity_scores = []
        agent_ids = list(self.agents.keys())
        n_to_fail = max(1, int(len(agent_ids) * failure_rate))

        for _ in range(n_simulations):
            failed = random.sample(agent_ids, min(n_to_fail, len(agent_ids)))
            connectivity = self._calculate_connectivity(exclude=failed)
            connectivity_scores.append(connectivity)

        return float(np.mean(connectivity_scores))

    def _calculate_connectivity(self, exclude: Optional[list[int]] = None) -> float:
        if exclude is None:
            exclude = []
        active = [aid for aid in self.agents if aid not in exclude]
        if len(active) < 2:
            return 0.0

        reachable = 0
        total = 0
        for i, a1 in enumerate(active):
            for a2 in active[i + 1:]:
                total += 1
                if self._path_exists_avoiding(a1, a2, exclude):
                    reachable += 1

        return reachable / total if total > 0 else 0.0

    def _path_exists_avoiding(self, source: int, target: int, avoid: list[int]) -> bool:
        visited = set(avoid)
        queue = [source]
        visited.add(source)
        while queue:
            current = queue.pop(0)
            if current == target:
                return True
            for neighbor in self._get_neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return False

    def _calculate_clustering(self) -> float:
        coefficients = []
        for agent_id in self.agents:
            neighbors = self._get_neighbors(agent_id)
            if len(neighbors) < 2:
                continue
            edges = 0
            for i, n1 in enumerate(neighbors):
                for n2 in neighbors[i + 1:]:
                    if self._are_connected(n1, n2):
                        edges += 1
            max_edges = len(neighbors) * (len(neighbors) - 1) / 2
            coefficients.append(edges / max_edges if max_edges > 0 else 0)
        return float(np.mean(coefficients)) if coefficients else 0.0

    def _calculate_path_length(self) -> float:
        path_lengths = []
        agent_ids = list(self.agents.keys())
        for i, source in enumerate(agent_ids):
            for target in agent_ids[i + 1:]:
                path = self.find_shortest_path(source, target)
                if path.total_distance < float("inf"):
                    path_lengths.append(path.hop_count)
        return float(np.mean(path_lengths)) if path_lengths else 0.0

    def is_small_world(self) -> bool:
        n = len(self.agents)
        max_path_length = np.log(n) if n > 1 else 1
        return self.clustering_coefficient > 0.3 and self.characteristic_path_length < max_path_length

    def get_network_stats(self) -> dict:
        return {
            "num_agents": len(self.agents),
            "num_shortcuts": len(self.shortcuts) // 2,
            "clustering_coefficient": round(self.clustering_coefficient, 4),
            "characteristic_path_length": round(self.characteristic_path_length, 4),
            "is_small_world": self.is_small_world(),
        }
