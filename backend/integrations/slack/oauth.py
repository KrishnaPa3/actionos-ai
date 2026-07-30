"""
Slack OAuth 2.0 flow.

Generates Slack OAuth authorization URLs and exchanges
authorization codes for access tokens using Slack's OAuth API.

See:
https://api.slack.com/authentication/oauth-v2
"""

import secrets
from urllib.parse import urlencode

import httpx

from config import SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI


SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"

SLACK_OAUTH_SCOPES = [
    "chat:write",
    "channels:read",
    "groups:read",
    "users:read",
]


def get_oauth_config() -> dict:
    """
    Read OAuth credentials from centralized configuration.
    """

    if not SLACK_CLIENT_ID or not SLACK_CLIENT_SECRET or not SLACK_REDIRECT_URI:
        raise RuntimeError(
            "Slack OAuth is not configured. "
            "Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, "
            "and SLACK_REDIRECT_URI."
        )

    return {
        "client_id": SLACK_CLIENT_ID,
        "client_secret": SLACK_CLIENT_SECRET,
        "redirect_uri": SLACK_REDIRECT_URI,
    }


def generate_oauth_url(state: str | None = None) -> str:
    """
    Generate the Slack OAuth authorization URL.

    The caller should generate and store a unique state parameter
    (per user) to prevent CSRF attacks.
    """

    config = get_oauth_config()

    if state is None:
        state = secrets.token_urlsafe(32)

    params = {
        "client_id": config["client_id"],
        "scope": ",".join(SLACK_OAUTH_SCOPES),
        "redirect_uri": config["redirect_uri"],
        "state": state,
    }

    print("=" * 80)
    print("GENERATED SLACK OAUTH URL")
    print(f"{SLACK_AUTH_URL}?{urlencode(params)}")
    print("=" * 80)

    return f"{SLACK_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> dict:
    """
    Exchange the authorization code for Slack access tokens.

    Returns Slack's OAuth response containing:

        - ok
        - access_token
        - token_type
        - scope
        - bot_user_id
        - team
        - authed_user
    """

    config = get_oauth_config()

    payload = {
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": config["redirect_uri"],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            SLACK_TOKEN_URL,
            data=payload,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Slack OAuth token exchange failed: "
                f"{response.status_code} {response.text}"
            )

        data = response.json()

        if not data.get("ok"):
            raise RuntimeError(
                f"Slack OAuth token exchange failed: {data}"
            )

        return data