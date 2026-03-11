"""
Creative Liberation Engine v5 — Model Configuration

Defines which LLM models are available and their capabilities.
Each agent selects a model appropriate for its role.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ModelProvider(str, Enum):
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    LOCAL = "local"


@dataclass
class ModelConfig:
    """Configuration for an LLM model."""
    id: str
    provider: ModelProvider
    display_name: str
    context_window: int
    max_output_tokens: int
    supports_tools: bool = True
    supports_vision: bool = False
    supports_structured_output: bool = True
    cost_per_1m_input: float = 0.0
    cost_per_1m_output: float = 0.0
    description: str = ""


MODELS: dict[str, ModelConfig] = {
    # Google Gemini
    "gemini-2.5-flash": ModelConfig(
        id="gemini-2.5-flash",
        provider=ModelProvider.GOOGLE,
        display_name="Gemini 2.0 Flash",
        context_window=1_000_000,
        max_output_tokens=8192,
        supports_vision=True,
        cost_per_1m_input=0.075,
        cost_per_1m_output=0.30,
        description="Fast, capable. Default for most agents.",
    ),
    "gemini-2.5-flash": ModelConfig(
        id="gemini-2.5-flash",
        provider=ModelProvider.GOOGLE,
        display_name="Gemini 2.5 Pro",
        context_window=1_000_000,
        max_output_tokens=65536,
        supports_vision=True,
        cost_per_1m_input=1.25,
        cost_per_1m_output=10.0,
        description="Highest capability. For LORE, HERALD, NEXUS.",
    ),
    # Anthropic Claude
    "claude-3-5-sonnet-20241022": ModelConfig(
        id="claude-3-5-sonnet-20241022",
        provider=ModelProvider.ANTHROPIC,
        display_name="Claude 3.5 Sonnet",
        context_window=200_000,
        max_output_tokens=8192,
        supports_vision=True,
        cost_per_1m_input=3.0,
        cost_per_1m_output=15.0,
        description="Strong reasoning. For VAULT, LENS.",
    ),
    "claude-3-haiku-20240307": ModelConfig(
        id="claude-3-haiku-20240307",
        provider=ModelProvider.ANTHROPIC,
        display_name="Claude 3 Haiku",
        context_window=200_000,
        max_output_tokens=4096,
        cost_per_1m_input=0.25,
        cost_per_1m_output=1.25,
        description="Fast, cheap. For high-volume tasks.",
    ),
}


DEFAULT_MODEL = "gemini-2.5-flash"


def get_model(model_id: str) -> Optional[ModelConfig]:
    """Get model config by ID."""
    return MODELS.get(model_id)


def list_models(provider: Optional[ModelProvider] = None) -> list[ModelConfig]:
    """List all available models, optionally filtered by provider."""
    models = list(MODELS.values())
    if provider:
        models = [m for m in models if m.provider == provider]
    return models

