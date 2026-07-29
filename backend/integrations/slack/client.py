"""
Slack API client factory.

Provides per-user authenticated Slack clients using OAuth
tokens stored in the integrations table.
"""

from slack_sdk import WebClient


def get_client(user_id: str, db=None):
    """
    Create an authenticated Slack WebClient for the given user.

    Reads the user's Slack OAuth access token from the integrations table
    and returns an authenticated Slack client.

    Args:
        user_id: The Supabase user ID.
        db: An authenticated Supabase client (RLS-scoped). If None,
            uses the admin client.

    Returns:
        slack_sdk.WebClient

    Raises:
        ValueError:
            If no active Slack connection exists for this user.
    """

    if db is None:
        from supabase_admin import supabase_admin as admin

        response = (
            admin
            .table("integrations")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "slack")
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
            .eq("provider", "slack")
            .eq("status", "connected")
            .maybe_single()
            .execute()
        )

    if (
        not response.data
        or not response.data.get("access_token")
    ):
        raise ValueError(
            f"No active Slack connection found for user "
            f"{user_id}. The user must connect their Slack workspace first."
        )

    client = WebClient(
        token=response.data["access_token"]
    )

    return client