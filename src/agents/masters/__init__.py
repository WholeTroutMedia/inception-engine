"""Master agents and advisors package.

Core AVERI agents and advisory council.
"""

from .athena import ATHENAAgent
from .vera import VERAAgent
from .iris import IRISAgent
from .wise_men import WarrenBuffettAgent, BuddhaAgent, SunTzuAgent

__all__ = [
    "ATHENAAgent",
    "VERAAgent",
    "IRISAgent",
    "WarrenBuffettAgent",
    "BuddhaAgent",
    "SunTzuAgent",
]
