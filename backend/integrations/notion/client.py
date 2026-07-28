"""
Notion API client factory.

Provides per-user authenticated Notion clients using OAuth tokens
stored in the integrations table.
"""

import os

from notion_client import Client


def get_client(user_id: str, db=None) -> Client:
    """
    Create a Notion SDK client for the given user.

    Reads the user's Notion OAuth access token from the
    integrations table and returns a notion_client.Client
    authenticated with that token.

    Args:
        user_id: The Supabase user ID.
        db: An authenticated Supabase client (RLS-scoped) to query
            integrations. If None, uses the admin client.

    Returns:
        A notion_client.Client instance.

    Raises:
        ValueError: If no Notion connection exists for this user.
    """
    if db is None:
        from supabase_admin import supabase_admin as admin
        response = (
            admin
            .table("integrations")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "notion")
            .eq("status", "connected")
            .maybe_single()
            .execute()
        )
    else:
        response = (
            db
            .table("integrations")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "notion")
            .eq("status", "connected")
            .maybe_single()
            .execute()
        )

    if not response.data or not response.data.get("access_token"):
        raise ValueError(
            f"No active Notion connection found for user {user_id}. "
            "The user must connect their Notion workspace first."
        )

    access_token = response.data["access_token"]

    return Client(auth=access_token)
