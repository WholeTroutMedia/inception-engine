"""
Single Sign-On (SSO) Handler for Inception Engine.
Manages SSO session lifecycle, provider integration, and session mapping.
"""

import secrets
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

from .oauth import OAuthHandler, OAuthProvider, OAuthUser
from .jwt_handler import JWTHandler, TokenPair


class SSOSessionState(str, Enum):
    PENDING = "pending"
    AUTHENTICATED = "authenticated"
    EXPIRED = "expired"
    REVOKED = "revoked"


@dataclass
class SSOSession:
    """Represents an SSO session."""
    session_id: str
    user_id: str
    provider: OAuthProvider
    state: SSOSessionState
    email: str
    name: str
    created_at: float
    expires_at: float
    last_activity: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    token_pair: Optional[TokenPair] = None


class SSOManager:
    """Manages Single Sign-On sessions and provider authentication."""

    def __init__(
        self,
        oauth_handler: OAuthHandler,
        jwt_handler: JWTHandler,
        session_ttl: int = 86400,
        max_sessions_per_user: int = 5,
    ):
        self.oauth_handler = oauth_handler
        self.jwt_handler = jwt_handler
        self.session_ttl = session_ttl
        self.max_sessions_per_user = max_sessions_per_user
        self._sessions: Dict[str, SSOSession] = {}
        self._user_sessions: Dict[str, list[str]] = {}
        self._state_cache: Dict[str, Dict[str, Any]] = {}

    def initiate_sso(
        self, provider: OAuthProvider, redirect_after: Optional[str] = None
    ) -> Dict[str, str]:
        """Start an SSO flow by generating authorization URL and state."""
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(16)
        self._state_cache[state] = {
            "provider": provider.value,
            "nonce": nonce,
            "redirect_after": redirect_after,
            "created_at": time.time(),
        }
        auth_url = self.oauth_handler.get_authorization_url(
            provider=provider, state=state, nonce=nonce
        )
        return {"authorization_url": auth_url, "state": state}

    async def complete_sso(
        self, code: str, state: str
    ) -> tuple[SSOSession, TokenPair]:
        """Complete SSO flow after OAuth callback."""
        state_data = self._state_cache.pop(state, None)
        if not state_data:
            raise ValueError("Invalid or expired SSO state")

        if time.time() - state_data["created_at"] > 600:
            raise ValueError("SSO state has expired (10 min limit)")

        provider = OAuthProvider(state_data["provider"])
        user, tokens = await self.oauth_handler.authenticate(provider, code)
        session = self._create_session(user, tokens)
        return session, tokens

    def get_session(self, session_id: str) -> Optional[SSOSession]:
        """Retrieve an active SSO session."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        if time.time() > session.expires_at:
            session.state = SSOSessionState.EXPIRED
            return None
        session.last_activity = time.time()
        return session

    def revoke_session(self, session_id: str) -> bool:
        """Revoke an SSO session (logout)."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.state = SSOSessionState.REVOKED
        if session.token_pair:
            self.jwt_handler.revoke_token(session.token_pair.access_token)
        user_sessions = self._user_sessions.get(session.user_id, [])
        if session_id in user_sessions:
            user_sessions.remove(session_id)
        return True

    def revoke_all_user_sessions(self, user_id: str) -> int:
        """Revoke all sessions for a user (force logout everywhere)."""
        session_ids = self._user_sessions.get(user_id, [])
        count = 0
        for sid in list(session_ids):
            if self.revoke_session(sid):
                count += 1
        return count

    def list_user_sessions(self, user_id: str) -> list[SSOSession]:
        """List all active sessions for a user."""
        session_ids = self._user_sessions.get(user_id, [])
        active = []
        for sid in session_ids:
            session = self.get_session(sid)
            if session and session.state == SSOSessionState.AUTHENTICATED:
                active.append(session)
        return active

    async def refresh_session(self, session_id: str) -> Optional[TokenPair]:
        """Refresh tokens for an active session."""
        session = self.get_session(session_id)
        if not session or not session.token_pair:
            return None
        try:
            new_tokens = self.jwt_handler.refresh_token(
                session.token_pair.refresh_token
            )
            session.token_pair = new_tokens
            session.expires_at = time.time() + self.session_ttl
            return new_tokens
        except Exception:
            session.state = SSOSessionState.EXPIRED
            return None

    def cleanup_expired(self) -> int:
        """Remove expired and revoked sessions."""
        to_remove = []
        now = time.time()
        for sid, session in self._sessions.items():
            if session.state in (SSOSessionState.EXPIRED, SSOSessionState.REVOKED):
                to_remove.append(sid)
            elif now > session.expires_at:
                to_remove.append(sid)
        for sid in to_remove:
            session = self._sessions.pop(sid, None)
            if session:
                user_sessions = self._user_sessions.get(session.user_id, [])
                if sid in user_sessions:
                    user_sessions.remove(sid)
        return len(to_remove)

    def _create_session(
        self, user: OAuthUser, tokens: TokenPair
    ) -> SSOSession:
        """Create a new SSO session for an authenticated user."""
        now = time.time()
        session = SSOSession(
            session_id=secrets.token_urlsafe(32),
            user_id=user.provider_user_id,
            provider=user.provider,
            state=SSOSessionState.AUTHENTICATED,
            email=user.email,
            name=user.name,
            created_at=now,
            expires_at=now + self.session_ttl,
            last_activity=now,
            token_pair=tokens,
            metadata={"avatar_url": user.avatar_url},
        )
        self._enforce_session_limit(user.provider_user_id)
        self._sessions[session.session_id] = session
        if user.provider_user_id not in self._user_sessions:
            self._user_sessions[user.provider_user_id] = []
        self._user_sessions[user.provider_user_id].append(session.session_id)
        return session

    def _enforce_session_limit(self, user_id: str) -> None:
        """Enforce max sessions per user by revoking oldest."""
        sessions = self._user_sessions.get(user_id, [])
        while len(sessions) >= self.max_sessions_per_user:
            oldest_id = sessions.pop(0)
            oldest = self._sessions.get(oldest_id)
            if oldest:
                oldest.state = SSOSessionState.REVOKED
