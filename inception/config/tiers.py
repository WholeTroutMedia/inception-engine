"""
Creative Liberation Engine v5 — Access Tier System

Three tiers of access with differentiated capabilities, tracking, and logging.

  🏠 Studio  — Full engine access (internal projects)
  🤝 Client  — Scoped access (products for others)
  🎟️ Merch   — Credit-based access (demo arena)

Lineage: Evolved from v2's dna-manifest propagation rules.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class AccessTier(str, Enum):
    STUDIO = "studio"
    CLIENT = "client"
    MERCH = "merch"


@dataclass
class TierConfig:
    """Configuration for an access tier."""
    name: str
    description: str
    allowed_hives: list[str] = field(default_factory=list)
    max_agents: int = -1  # -1 = unlimited
    max_parallel: int = 4
    credits_required: bool = False
    rate_limit_rpm: int = 60


TIER_CONFIGS: dict[AccessTier, TierConfig] = {
    AccessTier.STUDIO: TierConfig(
        name="Studio",
        description="Full engine access for internal projects",
        allowed_hives=["AURORA", "AVERI", "ALCHEMY", "HERALD", "LEXICON", "NEXUS"],
        max_agents=-1,
        max_parallel=8,
        credits_required=False,
        rate_limit_rpm=120,
    ),
    AccessTier.CLIENT: TierConfig(
        name="Client",
        description="Scoped access for client projects",
        allowed_hives=["AURORA", "HERALD", "LEXICON"],
        max_agents=20,
        max_parallel=4,
        credits_required=False,
        rate_limit_rpm=60,
    ),
    AccessTier.MERCH: TierConfig(
        name="Merch",
        description="Credit-based access for demo arena",
        allowed_hives=["AURORA"],
        max_agents=5,
        max_parallel=2,
        credits_required=True,
        rate_limit_rpm=20,
    ),
}


def check_agent_access(tier: AccessTier, hive: str) -> bool:
    """Check if a tier can access a given hive."""
    config = TIER_CONFIGS.get(tier)
    if not config:
        return False
    return hive in config.allowed_hives


def get_tier_config(tier: AccessTier) -> Optional[TierConfig]:
    """Get configuration for a tier."""
    return TIER_CONFIGS.get(tier)
