"""
Google OAuth 2.0 flow.

Generates Google OAuth authorization URLs and exchanges
authorization codes for access tokens using Google's OAuth API.

See:
https://developers.google.com/identity/protocols/oauth2/web-server
"""

import os
import secrets
from urllib.parse import urlencode

import httpx


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_OAUTH_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
]

def get_oauth_config() -> dict:
    """
    Read OAuth credentials from environment variables.
    """

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError(
            "Google OAuth is not configured. "
            "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "
            "and GOOGLE_REDIRECT_URI."
        )

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def generate_oauth_url(state: str | None = None) -> str:
    """
    Generate the Google OAuth authorization URL.

    The caller should generate and store a unique state parameter
    (per user) to prevent CSRF attacks.
    """


    config = get_oauth_config()

    if state is None:
        state = secrets.token_urlsafe(32)

    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": " ".join(GOOGLE_OAUTH_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    print("=" * 80)
    print("GENERATED OAUTH URL")
    print(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")
    print("=" * 80)

    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> dict:
    """
    Exchange the authorization code for access and refresh tokens.

    Returns Google's OAuth token response containing:

        - access_token
        - refresh_token (first consent)
        - expires_in
        - token_type
        - scope
    """

    config = get_oauth_config()

    payload = {
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": config["redirect_uri"],
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data=payload,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Google OAuth token exchange failed: "
                f"{response.status_code} {response.text}"
            )

        return response.json()