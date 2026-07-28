"""
Notion OAuth 2.0 flow.

Generates Notion OAuth authorization URLs and exchanges
authorization codes for access tokens using the Notion API.

See https://developers.notion.com/docs/authorization
"""

import os
import secrets
from urllib.parse import urlencode


NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize"
NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_OAUTH_SCOPES = ["read:user", "read:database", "write:database"]


def get_oauth_config() -> dict:
    """Read OAuth credentials from environment variables."""
    client_id = os.getenv("NOTION_CLIENT_ID")
    client_secret = os.getenv("NOTION_CLIENT_SECRET")
    redirect_uri = os.getenv("NOTION_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError(
            "Notion OAuth is not configured. "
            "Set NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, and NOTION_REDIRECT_URI."
        )

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def generate_oauth_url(state: str | None = None) -> str:
    """
    Generate the Notion OAuth authorization URL.

    The caller should generate and store a unique `state` parameter
    (per user) to prevent CSRF. If no state is provided, a random one
    is generated.
    """
    config = get_oauth_config()

    if state is None:
        state = secrets.token_urlsafe(32)

    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "owner": "user",
        "state": state,
    }

    return f"{NOTION_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> dict:
    """
    Exchange the authorization code for an access token.

    Makes a POST request to the Notion OAuth token endpoint using
    HTTP Basic Auth (client_id:client_secret).

    Returns the token response dict containing:
        - access_token
        - workspace_id
        - workspace_name
        - bot_id (external_user_id)
        - duplicated_template_id (optional)
    """
    import httpx

    config = get_oauth_config()

    auth = (config["client_id"], config["client_secret"])

    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config["redirect_uri"],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            NOTION_TOKEN_URL,
            auth=auth,
            json=payload,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Notion OAuth token exchange failed: {response.status_code} "
                f"{response.text}"
            )

        return response.json()
