"""
Creative Liberation Engine v5 — Tier Enforcement

Middleware and enforcement for the three-tier access system.
Checks every request against the user's tier before allowing agent execution.

Tiers:
  🏠 Studio  — Full engine access (internal projects)
  🤝 Client  — Scoped access (products for others)
  🎟️ Merch   — Credit-based access (demo arena)

Lineage: v2 dna-manifest.json propagation rules → v5 tier enforcement
"""

import logging
import uuid
from typing import Any, Optional

from cle.config.tiers import AccessTier, TierConfig, TIER_CONFIGS, check_agent_access
from cle.auth.types import User, Session, CreditTransaction

logger = logging.getLogger(__name__)


class TierEnforcer:
    """
    Enforces access tier restrictions on all engine operations.

    Usage:
        enforcer = TierEnforcer()
        session = enforcer.create_session(user)

        # Before agent execution:
        allowed, reason = enforcer.check_access(session, agent_hive="kuid")

        # After agent execution (Merch tier):
        enforcer.deduct_credits(session, amount=1, reason="task execution")
    """

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._transactions: list[CreditTransaction] = []

    def create_session(self, user: User) -> Session:
        """Create a new session for a user."""
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            tier=user.tier,
        )
        self._sessions[session.id] = session
        logger.info(f"Session created: {session.id} (tier={user.tier})")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    def check_access(
        self,
        session: Session,
        agent_hive: str,
        agent_name: str = "",
    ) -> tuple[bool, str]:
        """
        Check if a session has access to an agent.

        Returns:
            (allowed: bool, reason: str)
        """
        # Session expired?
        if session.is_expired:
            return False, "Session expired"

        tier = AccessTier(session.tier)
        tier_config = TIER_CONFIGS[tier]

        # Hive access
        if not check_agent_access(tier, agent_hive):
            return False, f"Tier '{tier.value}' cannot access hive '{agent_hive}'"

        # Agent count limit
        if tier_config.max_agents != -1 and session.tasks_executed >= tier_config.max_agents:
            return False, f"Tier '{tier.value}' agent limit reached ({tier_config.max_agents})"

        # Credit check (Merch tier)
        if tier == AccessTier.MERCH:
            user_credits = self._get_credit_balance(session.user_id)
            if user_credits <= 0:
                return False, "No credits remaining. Purchase more to continue."

        return True, "Access granted"

    def deduct_credits(
        self,
        session: Session,
        amount: int = 1,
        reason: str = "",
        agent_name: str = "",
        task_id: int = 0,
    ) -> CreditTransaction:
        """Deduct credits from a Merch tier session."""
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=session.user_id,
            amount=-amount,
            reason=reason,
            agent_name=agent_name,
            task_id=task_id,
        )
        self._transactions.append(transaction)
        session.credits_used += amount
        session.tasks_executed += 1

        balance = self._get_credit_balance(session.user_id)
        logger.info(
            f"Credit deduction: user={session.user_id} amount={amount} "
            f"balance={balance} reason={reason}"
        )
        return transaction

    def add_credits(
        self,
        user_id: str,
        amount: int,
        reason: str = "purchase",
    ) -> CreditTransaction:
        """Add credits to a user account."""
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            reason=reason,
        )
        self._transactions.append(transaction)

        balance = self._get_credit_balance(user_id)
        logger.info(f"Credits added: user={user_id} amount={amount} balance={balance}")
        return transaction

    def _get_credit_balance(self, user_id: str) -> int:
        """Calculate current credit balance for a user."""
        return sum(
            t.amount for t in self._transactions
            if t.user_id == user_id
        )

    def get_credit_history(self, user_id: str) -> list[dict[str, Any]]:
        """Get credit transaction history for a user."""
        return [
            {
                "id": t.id,
                "amount": t.amount,
                "reason": t.reason,
                "agent": t.agent_name,
                "task_id": t.task_id,
                "timestamp": t.timestamp.isoformat(),
            }
            for t in self._transactions
            if t.user_id == user_id
        ]

    def get_status(self) -> dict[str, Any]:
        """Get tier enforcement status."""
        return {
            "active_sessions": len(self._sessions),
            "total_transactions": len(self._transactions),
        }
