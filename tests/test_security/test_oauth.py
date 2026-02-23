"""Tests for OAuth 2.0 and SSO authentication."""
import pytest
from src.security.oauth import OAuthProvider, OAuthConfig
from src.security.sso import SSOManager
from src.security.jwt_handler import JWTHandler, TokenPair


class TestJWTHandler:
    def test_create_token_pair(self):
        handler = JWTHandler(secret_key="test-secret-key-32chars-minimum!")
        pair = handler.create_token_pair(user_id="user_1", email="test@example.com")
        assert pair.access_token
        assert pair.refresh_token
        assert pair.token_type == "bearer"

    def test_verify_access_token(self):
        handler = JWTHandler(secret_key="test-secret-key-32chars-minimum!")
        pair = handler.create_token_pair(user_id="user_1", email="test@example.com")
        payload = handler.verify_token(pair.access_token)
        assert payload is not None
        assert payload.get("sub") == "user_1"

    def test_invalid_token_rejected(self):
        handler = JWTHandler(secret_key="test-secret-key-32chars-minimum!")
        result = handler.verify_token("invalid.token.here")
        assert result is None

    def test_refresh_token_rotation(self):
        handler = JWTHandler(secret_key="test-secret-key-32chars-minimum!")
        pair = handler.create_token_pair(user_id="user_1", email="test@example.com")
        new_pair = handler.refresh_access_token(pair.refresh_token)
        assert new_pair is not None
        assert new_pair.access_token != pair.access_token


class TestOAuthProvider:
    def test_provider_config(self):
        config = OAuthConfig(
            client_id="test_id",
            client_secret="test_secret",
            redirect_uri="http://localhost:8000/callback",
        )
        assert config.client_id == "test_id"
        assert config.redirect_uri == "http://localhost:8000/callback"

    def test_google_provider_creation(self):
        provider = OAuthProvider(
            name="google",
            config=OAuthConfig(
                client_id="google_id",
                client_secret="google_secret",
                redirect_uri="http://localhost:8000/callback",
            ),
        )
        assert provider.name == "google"
        assert provider.config.client_id == "google_id"


class TestSSOManager:
    def test_sso_manager_creation(self):
        manager = SSOManager()
        assert manager is not None

    def test_register_provider(self):
        manager = SSOManager()
        config = OAuthConfig(
            client_id="test_id",
            client_secret="test_secret",
            redirect_uri="http://localhost:8000/callback",
        )
        manager.register_provider("google", config)
        assert "google" in manager.providers
