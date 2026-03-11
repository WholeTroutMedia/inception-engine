"""
Creative Liberation Engine v5 — Auth Types

Pydantic models for authentication and session management.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """An engine user."""
    id: str
    email: str = ""
    name: str = ""
    tier: str = "studio"  # studio | client | merch
    credits: int = -1  # -1 = unlimited
    created_at: datetime = Field(default_factory=datetime.now)

    @property
    def is_unlimited(self) -> bool:
        return self.credits == -1


class Session(BaseModel):
    """An active user session."""
    id: str
    user_id: str
    tier: str = "studio"
    credits_used: int = 0
    tasks_executed: int = 0
    started_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at


class CreditTransaction(BaseModel):
    """A credit usage transaction (Merch tier)."""
    id: str = ""
    user_id: str
    amount: int  # positive = earned, negative = spent
    reason: str
    agent_name: str = ""
    task_id: int = 0
    timestamp: datetime = Field(default_factory=datetime.now)

    @property
    def is_deduction(self) -> bool:
        return self.amount < 0
