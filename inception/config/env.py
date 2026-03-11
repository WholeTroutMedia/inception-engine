"""
Creative Liberation Engine v5 — Environment Configuration

Loads and validates environment variables. Single source of truth for config.
"""

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_config: Optional["EngineConfig"] = None


@dataclass(frozen=True)
class EngineConfig:
    """Immutable engine configuration loaded from environment."""

    # LLM
    google_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    default_model: str = "gemini-2.5-flash"

    # Memory
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    github_token: str = ""
    github_memory_repo: str = "Creative Liberation Engine Community/inception-memory"

    # Firebase (optional)
    firebase_project_id: str = ""
    firebase_service_account_path: str = ""

    # Access
    access_tier: str = "studio"

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = True

    # Paths
    root_dir: Path = field(default_factory=lambda: Path.cwd())

    @property
    def is_offline(self) -> bool:
        """Check if running in offline mode (no cloud keys)."""
        return not any([self.google_api_key, self.anthropic_api_key, self.openai_api_key])

    @property
    def has_firebase(self) -> bool:
        """Check if Firebase is configured."""
        return bool(self.firebase_project_id)


def load_config(env_file: Optional[str] = None) -> EngineConfig:
    """Load config from environment. Call once at boot."""
    global _config

    if env_file:
        load_dotenv(env_file)
    else:
        load_dotenv()

    _config = EngineConfig(
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        default_model=os.getenv("INCEPTION_DEFAULT_MODEL", "gemini-2.5-flash"),
        chroma_host=os.getenv("CHROMA_HOST", "localhost"),
        chroma_port=int(os.getenv("CHROMA_PORT", "8000")),
        github_token=os.getenv("GITHUB_TOKEN", ""),
        github_memory_repo=os.getenv("GITHUB_MEMORY_REPO", "Creative Liberation Engine Community/inception-memory"),
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID", ""),
        firebase_service_account_path=os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", ""),
        access_tier=os.getenv("INCEPTION_ACCESS_TIER", "studio"),
        host=os.getenv("INCEPTION_HOST", "0.0.0.0"),
        port=int(os.getenv("INCEPTION_PORT", "8080")),
        debug=os.getenv("INCEPTION_DEBUG", "true").lower() == "true",
        root_dir=Path.cwd(),
    )

    mode = "OFFLINE" if _config.is_offline else "CLOUD"
    logger.info(f"Config loaded — mode={mode}, tier={_config.access_tier}, model={_config.default_model}")
    return _config


def get_config() -> EngineConfig:
    """Get current config. Raises if not loaded."""
    if _config is None:
        raise RuntimeError("Config not loaded. Call load_config() first.")
    return _config

