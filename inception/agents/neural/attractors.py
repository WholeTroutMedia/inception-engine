"""
Creative Liberation Engine v5 — Attractor Network Dynamics

Neural attractor dynamics for stable multi-agent coordination.
Uses Hopfield-style energy functions and Hebbian learning for:
1. Pattern completion — fill in missing information
2. State stabilization — converge to coherent solutions
3. Noise tolerance — robust to incomplete inputs
4. Multi-stable states — multiple valid solution attractors

Lineage: v3 attractor-networks/coordination_dynamics.py (429 lines) → v5

Research Foundation:
- BioRxiv: Mechanistic theory of planning in prefrontal cortex (2025)

Performance Target: +7% on ambiguous problems, +12% solution diversity
"""

import logging
import numpy as np
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

VECTOR_DIM = 2048


@dataclass
class AttractorAgent:
    """Agent representation for attractor network."""
    name: str
    concept_vector: np.ndarray
    activation: float = 0.0
    bias: float = 0.0


@dataclass
class Problem:
    """Problem specification for the attractor network."""
    description: str
    problem_vector: np.ndarray
    constraints: dict = field(default_factory=dict)
    partial: bool = False


@dataclass
class Solution:
    """Solution from attractor network dynamics."""
    team: list[AttractorAgent]
    team_activation_pattern: np.ndarray
    confidence: float
    solution_vector: np.ndarray
    iterations_to_converge: int
    energy: float


class AttractorNetwork:
    """
    Neural attractor dynamics for stable agent team formation.

    Uses continuous Hopfield network:
    - State update: s_{t+1} = tanh(W @ s_t + input)
    - Energy: E = -0.5 * s^T * W * s
    - Learning: ΔW = η * s * s^T (Hebbian)

    Usage:
        agents = [AttractorAgent(name="BOLT", concept_vector=bolt_vec)]
        network = AttractorNetwork(agents)
        solution = network.pattern_completion(problem)
    """

    def __init__(self, agents: list[AttractorAgent]):
        self.agents = {a.name: a for a in agents}
        self.vector_dim = VECTOR_DIM
        self.state_vector = self._initialize_state()
        self.weight_matrix = self._build_connection_weights()
        self.attractors: list[dict] = []

    def _initialize_state(self) -> np.ndarray:
        n = len(self.agents)
        return np.random.randn(n * self.vector_dim) * 0.01

    def _build_connection_weights(self) -> np.ndarray:
        n = len(self.agents)
        total_dim = n * self.vector_dim
        W = np.zeros((total_dim, total_dim))
        agent_list = list(self.agents.values())

        for i, agent1 in enumerate(agent_list):
            for j, agent2 in enumerate(agent_list):
                if i == j:
                    continue
                similarity = self._cosine_similarity(agent1.concept_vector, agent2.concept_vector)
                v1, v2 = agent1.concept_vector, agent2.concept_vector
                i_start, i_end = i * self.vector_dim, (i + 1) * self.vector_dim
                j_start, j_end = j * self.vector_dim, (j + 1) * self.vector_dim
                W[i_start:i_end, j_start:j_end] = similarity * np.outer(v1, v2)

        norm = np.linalg.norm(W)
        if norm > 0:
            W = W / norm
        return W

    def _cosine_similarity(self, v1: np.ndarray, v2: np.ndarray) -> float:
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8))

    def pattern_completion(self, problem: Problem, max_iterations: int = 100, convergence_threshold: float = 1e-4) -> Solution:
        """Complete partial problem specification via attractor dynamics."""
        initial_state = self._encode_partial_problem(problem)
        state = initial_state.copy()
        problem_input = self._problem_to_input(problem)

        for iteration in range(max_iterations):
            state_new = np.tanh(self.weight_matrix @ state + 0.5 * problem_input)
            delta = np.linalg.norm(state_new - state)
            if delta < convergence_threshold:
                state = state_new
                break
            state = state_new

        return self._state_to_solution(state, iteration + 1)

    def _encode_partial_problem(self, problem: Problem) -> np.ndarray:
        state = np.zeros(len(self.agents) * self.vector_dim)
        if problem.problem_vector is not None:
            for i, agent in enumerate(self.agents.values()):
                similarity = self._cosine_similarity(problem.problem_vector, agent.concept_vector)
                i_start, i_end = i * self.vector_dim, (i + 1) * self.vector_dim
                state[i_start:i_end] = similarity * agent.concept_vector
        return state

    def _problem_to_input(self, problem: Problem) -> np.ndarray:
        input_vec = np.zeros(len(self.agents) * self.vector_dim)
        if problem.problem_vector is not None:
            for i in range(len(self.agents)):
                i_start, i_end = i * self.vector_dim, (i + 1) * self.vector_dim
                input_vec[i_start:i_end] = problem.problem_vector
        return input_vec

    def _decode_state_to_agents(self, state: np.ndarray) -> list[tuple[AttractorAgent, float]]:
        activations = []
        for i, agent in enumerate(self.agents.values()):
            i_start, i_end = i * self.vector_dim, (i + 1) * self.vector_dim
            agent_state = state[i_start:i_end]
            activation = max(0.0, self._cosine_similarity(agent_state, agent.concept_vector))
            activations.append((agent, activation))
        return activations

    def _compute_solution_vector(self, team: list[AttractorAgent]) -> np.ndarray:
        if not team:
            return np.zeros(self.vector_dim)
        vectors = [agent.concept_vector for agent in team]
        solution = np.mean(vectors, axis=0)
        norm = np.linalg.norm(solution)
        return solution / norm if norm > 0 else solution

    def _calculate_solution_confidence(self, activations: list[tuple[AttractorAgent, float]], state: np.ndarray) -> float:
        max_activation = max(a for _, a in activations) if activations else 0
        high_count = sum(1 for _, a in activations if a > 0.7)
        concentration = 1.0 / (1.0 + high_count * 0.1)
        gradient = np.linalg.norm(self.weight_matrix @ state)
        stability = 1.0 / (1.0 + gradient)
        confidence = (max_activation + concentration + stability) / 3.0
        return min(confidence, 1.0)

    def _calculate_energy(self, state: np.ndarray) -> float:
        return float(-0.5 * state @ self.weight_matrix @ state)

    def _state_to_solution(self, state: np.ndarray, iterations: int) -> Solution:
        agent_activations = self._decode_state_to_agents(state)
        team = [agent for agent, activation in agent_activations if activation > 0.7]
        solution_vector = self._compute_solution_vector(team)
        confidence = self._calculate_solution_confidence(agent_activations, state)
        energy = self._calculate_energy(state)
        return Solution(
            team=team,
            team_activation_pattern=np.array([a for _, a in agent_activations]),
            confidence=confidence,
            solution_vector=solution_vector,
            iterations_to_converge=iterations,
            energy=energy,
        )

    def multi_stable_search(self, problem: Problem, num_trials: int = 10) -> list[Solution]:
        solutions = []
        for _ in range(num_trials):
            initial_state = np.random.randn(len(self.agents) * self.vector_dim) * 0.1
            problem_input = self._problem_to_input(problem)
            state = initial_state
            for iteration in range(100):
                state_new = np.tanh(self.weight_matrix @ state + 0.5 * problem_input)
                if np.linalg.norm(state_new - state) < 1e-4:
                    state = state_new
                    break
                state = state_new
            solution = self._state_to_solution(state, iteration + 1)
            if not self._is_duplicate(solution, solutions):
                solutions.append(solution)
        solutions.sort(key=lambda s: s.confidence, reverse=True)
        return solutions

    def _is_duplicate(self, solution: Solution, existing: list[Solution], threshold: float = 0.9) -> bool:
        for other in existing:
            team1 = {a.name for a in solution.team}
            team2 = {a.name for a in other.team}
            intersection = len(team1 & team2)
            union = len(team1 | team2)
            if union > 0 and intersection / union >= threshold:
                return True
        return False

    def store_attractor(self, solution: Solution) -> None:
        self.attractors.append({
            "team_names": [a.name for a in solution.team],
            "solution_vector": solution.solution_vector,
            "activation_pattern": solution.team_activation_pattern,
            "energy": solution.energy,
        })
        self._strengthen_attractor(solution)

    def _strengthen_attractor(self, solution: Solution) -> None:
        learning_rate = 0.01
        state = self._solution_to_state(solution)
        delta_W = learning_rate * np.outer(state, state)
        self.weight_matrix += delta_W
        norm = np.linalg.norm(self.weight_matrix)
        if norm > 0:
            self.weight_matrix = self.weight_matrix / norm

    def _solution_to_state(self, solution: Solution) -> np.ndarray:
        state = np.zeros(len(self.agents) * self.vector_dim)
        agent_list = list(self.agents.values())
        for i, agent in enumerate(agent_list):
            if agent in solution.team:
                i_start, i_end = i * self.vector_dim, (i + 1) * self.vector_dim
                state[i_start:i_end] = agent.concept_vector
        return state

    def retrieve_similar_attractors(self, problem: Problem, top_k: int = 5) -> list[dict]:
        similarities = []
        for attractor in self.attractors:
            sim = self._cosine_similarity(problem.problem_vector, attractor["solution_vector"])
            similarities.append((sim, attractor))
        similarities.sort(reverse=True, key=lambda x: x[0])
        return [att for _, att in similarities[:top_k]]

    def get_status(self) -> dict:
        return {
            "agents": len(self.agents),
            "vector_dim": self.vector_dim,
            "stored_attractors": len(self.attractors),
            "weight_matrix_norm": float(np.linalg.norm(self.weight_matrix)),
        }
