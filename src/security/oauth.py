"""
OAuth 2.0 Authentication Handler for Inception Engine.
Supports Google and GitHub OAuth providers with token management.
"""

import httpx
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import urlencode

from .jwt_handler import JWTHandler, TokenPair


class OAuthProvider(str, Enum):
    GOOGLE = "google"
    GITHUB = "github"


@dataclass
class OAuthConfig:
    """Configuration for an OAuth provider."""
    client_id: str
    client_secret: str
    redirect_uri: str
    scopes: list[str]
    authorize_url: str
    token_url: str
    userinfo_url: str


PROVIDER_CONFIGS: Dict[str, Dict[str, str]] = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "default_scopes": ["openid", "email", "profile"],
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "default_scopes": ["read:user", "user:email"],
    },
}


@dataclass
class OAuthUser:
    """Normalized user info from OAuth providers."""
    provider: OAuthProvider
    provider_user_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class OAuthHandler:
    """Handles OAuth 2.0 authentication flows."""

    def __init__(
        self,
        jwt_handler: JWTHandler,
        providers: Optional[Dict[str, OAuthConfig]] = None,
    ):
        self.jwt_handler = jwt_handler
        self.providers: Dict[str, OAuthConfig] = providers or {}
        self._http_client = httpx.AsyncClient(timeout=30.0)

    def register_provider(self, provider: OAuthProvider, config: OAuthConfig) -> None:
        """Register an OAuth provider configuration."""
        self.providers[provider.value] = config

    def get_authorization_url(
        self, provider: OAuthProvider, state: str, nonce: Optional[str] = None
    ) -> str:
        """Generate the OAuth authorization URL for redirect."""
        config = self._get_config(provider)
        params = {
            "client_id": config.client_id,
            "redirect_uri": config.redirect_uri,
            "response_type": "code",
            "scope": " ".join(config.scopes),
            "state": state,
        }
        if nonce:
            params["nonce"] = nonce
        return f"{config.authorize_url}?{urlencode(params)}"

    async def exchange_code(
        self, provider: OAuthProvider, code: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        config = self._get_config(provider)
        data = {
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": config.redirect_uri,
            "grant_type": "authorization_code",
        }
        headers = {"Accept": "application/json"}
        response = await self._http_client.post(
            config.token_url, data=data, headers=headers
        )
        response.raise_for_status()
        return response.json()

    async def get_user_info(
        self, provider: OAuthProvider, access_token: str
    ) -> OAuthUser:
        """Fetch and normalize user info from the OAuth provider."""
        config = self._get_config(provider)
        headers = {"Authorization": f"Bearer {access_token}"}
        if provider == OAuthProvider.GITHUB:
            headers["Accept"] = "application/vnd.github.v3+json"

        response = await self._http_client.get(
            config.userinfo_url, headers=headers
        )
        response.raise_for_status()
        raw = response.json()
        return self._normalize_user(provider, raw)

    async def authenticate(
        self, provider: OAuthProvider, code: str
    ) -> tuple[OAuthUser, TokenPair]:
        """Full OAuth flow: exchange code, get user info, issue JWT."""
        token_data = await self.exchange_code(provider, code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("No access token in OAuth response")

        user = await self.get_user_info(provider, access_token)
        jwt_tokens = self.jwt_handler.create_token_pair(
            user_id=user.provider_user_id,
            email=user.email,
            permissions=["read"],
            roles=["user"],
            provider=provider.value,
        )
        return user, jwt_tokens

    def _get_config(self, provider: OAuthProvider) -> OAuthConfig:
        """Retrieve provider config or raise."""
        config = self.providers.get(provider.value)
        if not config:
            raise ValueError(
                f"OAuth provider '{provider.value}' is not configured. "
                f"Available: {list(self.providers.keys())}"
            )
        return config

    @staticmethod
    def _normalize_user(
        provider: OAuthProvider, raw: Dict[str, Any]
    ) -> OAuthUser:
        """Normalize user data from different providers."""
        if provider == OAuthProvider.GOOGLE:
            return OAuthUser(
                provider=provider,
                provider_user_id=str(raw.get("id", "")),
                email=raw.get("email", ""),
                name=raw.get("name", ""),
                avatar_url=raw.get("picture"),
                raw_data=raw,
            )
        elif provider == OAuthProvider.GITHUB:
            return OAuthUser(
                provider=provider,
                provider_user_id=str(raw.get("id", "")),
                email=raw.get("email", ""),
                name=raw.get("name") or raw.get("login", ""),
                avatar_url=raw.get("avatar_url"),
                raw_data=raw,
            )
        raise ValueError(f"Unsupported provider: {provider}")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._http_client.aclose()
