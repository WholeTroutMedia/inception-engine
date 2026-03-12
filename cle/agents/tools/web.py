"""
Creative Liberation Engine v5 — Web/HTTP Tools

Tools for HTTP requests and web interactions.
Used by agents to fetch data, call APIs, and interact with web services.
"""

import json
import logging
from typing import Any, Optional

import httpx

from cle.agents.base import AgentTool

logger = logging.getLogger(__name__)


async def http_get(
    url: str,
    headers: Optional[dict[str, str]] = None,
    params: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Make an HTTP GET request."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers or {},
                params=params or {},
                timeout=timeout,
            )
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
                "ok": response.is_success,
            }
    except httpx.TimeoutException:
        return {"error": f"Request timed out after {timeout}s", "ok": False}
    except Exception as e:
        return {"error": str(e), "ok": False}


async def http_post(
    url: str,
    body: Optional[dict | str] = None,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Make an HTTP POST request."""
    try:
        async with httpx.AsyncClient() as client:
            kwargs: dict[str, Any] = {
                "headers": headers or {},
                "timeout": timeout,
            }
            if isinstance(body, dict):
                kwargs["json"] = body
            elif isinstance(body, str):
                kwargs["content"] = body

            response = await client.post(url, **kwargs)
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
                "ok": response.is_success,
            }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def http_put(
    url: str,
    body: Optional[dict | str] = None,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Make an HTTP PUT request."""
    try:
        async with httpx.AsyncClient() as client:
            kwargs: dict[str, Any] = {
                "headers": headers or {},
                "timeout": timeout,
            }
            if isinstance(body, dict):
                kwargs["json"] = body
            elif isinstance(body, str):
                kwargs["content"] = body

            response = await client.put(url, **kwargs)
            return {
                "status_code": response.status_code,
                "body": response.text,
                "ok": response.is_success,
            }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def http_delete(
    url: str,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Make an HTTP DELETE request."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=headers or {}, timeout=timeout)
            return {
                "status_code": response.status_code,
                "body": response.text,
                "ok": response.is_success,
            }
    except Exception as e:
        return {"error": str(e), "ok": False}


async def fetch_json(
    url: str,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Fetch JSON from a URL and parse it."""
    result = await http_get(url, headers=headers, timeout=timeout)
    if not result.get("ok"):
        return result

    try:
        parsed = json.loads(result["body"])
        return {"data": parsed, "ok": True, "status_code": result["status_code"]}
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse JSON: {e}", "ok": False, "body": result["body"]}


# Tool registry entries
WEB_TOOLS: list[AgentTool] = [
    AgentTool(
        name="http_get",
        description="Make an HTTP GET request to a URL",
        func=http_get,
        parameters={
            "url": {"type": "string", "description": "The URL to request"},
            "headers": {"type": "object", "description": "Optional request headers"},
            "params": {"type": "object", "description": "Optional query parameters"},
        },
        required=["url"],
    ),
    AgentTool(
        name="http_post",
        description="Make an HTTP POST request",
        func=http_post,
        parameters={
            "url": {"type": "string", "description": "The URL to post to"},
            "body": {"type": "object", "description": "Request body (dict or string)"},
            "headers": {"type": "object", "description": "Optional request headers"},
        },
        required=["url"],
    ),
    AgentTool(
        name="fetch_json",
        description="Fetch and parse JSON from a URL",
        func=fetch_json,
        parameters={
            "url": {"type": "string", "description": "The URL to fetch JSON from"},
            "headers": {"type": "object", "description": "Optional request headers"},
        },
        required=["url"],
    ),
]
