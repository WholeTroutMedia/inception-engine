"""API package for Inception Engine.

Provides REST and WebSocket interfaces for all modes.
"""

from .server import app

__all__ = ["app"]
