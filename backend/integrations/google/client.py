"""
Google Calendar API client factory.

Provides per-user authenticated Google Calendar clients using OAuth
tokens stored in the integrations table.
"""

import os

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def get_client(user_id: str, db=None):
    """
    Create an authenticated Google Calendar API client for the given user.

    Reads the user's Google OAuth access token from the integrations table
    and returns a Google Calendar API client authenticated with that token.

    Args:
        user_id: The Supabase user ID.
        db: An authenticated Supabase client (RLS-scoped) to query
            integrations. If None, uses the admin client.

    Returns:
        A googleapiclient.discovery.Resource instance for the
        Google Calendar API.

    Raises:
        ValueError:
            If no active Google connection exists for this user.
    """

    if db is None:
        from supabase_admin import supabase_admin as admin

        response = (
            admin
            .table("integrations")
            .select("access_token, refresh_token")
            .eq("user_id", user_id)
            .eq("provider", "google")
            .eq("status", "connected")
            .maybe_single()
            .execute()
        )
    else:
        response = (
            db
            .table("integrations")
            .select("access_token, refresh_token")
            .eq("user_id", user_id)
            .eq("provider", "google")
            .eq("status", "connected")
            .maybe_single()
            .execute()
        )

    if (
        not response.data
        or not response.data.get("access_token")
    ):
        raise ValueError(
            f"No active Google Calendar connection found for user "
            f"{user_id}. The user must connect their Google account first."
        )

    credentials = Credentials(
        token=response.data["access_token"],
        refresh_token=response.data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )

    service = build(
        "calendar",
        "v3",
        credentials=credentials,
        cache_discovery=False,
    )

    return service