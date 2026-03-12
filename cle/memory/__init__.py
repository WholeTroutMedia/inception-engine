"""Creative Liberation Engine v5 — Memory Package."""

# Lazy imports to avoid hard dependency on chromadb at import time
__all__ = ["MemoryService"]


def __getattr__(name):
    if name == "MemoryService":
        from .service import MemoryService
        return MemoryService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
