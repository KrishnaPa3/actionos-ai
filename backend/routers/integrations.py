"""
Integration endpoints aggregator.

Mounts provider-specific routers (Notion, Google Calendar, Slack) so that
all integration endpoints are available under a single aggregator module.

Currently mounted routers:
  - Notion: /oauth/notion/login, /oauth/notion/callback,
            /integrations/notion/status, /integrations/notion/disconnect
  - Google: /oauth/google/*, /integrations/google/*
  - Slack:  /oauth/slack/*,  /integrations/slack/*
"""

from fastapi import APIRouter

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    NOTION_CLIENT_ID,
    NOTION_CLIENT_SECRET,
    NOTION_REDIRECT_URI,
    SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET,
    SLACK_REDIRECT_URI,
)
from integrations.notion.router import router as notion_router
from integrations.google.router import router as google_router
from integrations.slack.router import router as slack_router

router = APIRouter()
router.include_router(notion_router)
router.include_router(google_router)
router.include_router(slack_router)


@router.get("/integrations")
async def list_integrations():
    """
    List available integrations, their endpoints, and whether OAuth
    credentials are actually present in this environment.

    `configured` is the single most useful production diagnostic: if it is
    false, /oauth/<provider>/login will return 500 and the frontend
    "Connect" button will do nothing. `redirect_uri` is echoed back so a
    redirect_uri_mismatch from the provider can be diagnosed without
    reading server logs. Neither field exposes a secret.
    """
    return {
        "integrations": [
            {
                "name": "notion",
                "display_name": "Notion",
                "description": "Sync tasks to your Notion database",
                "auth_type": "oauth",
                "status_endpoint": "/integrations/notion/status",
                "login_endpoint": "/oauth/notion/login",
                "configured": bool(
                    NOTION_CLIENT_ID and NOTION_CLIENT_SECRET and NOTION_REDIRECT_URI
                ),
                "redirect_uri": NOTION_REDIRECT_URI,
            },
            {
                "name": "google",
                "display_name": "Google Calendar",
                "description": "Sync tasks to your Google Calendar",
                "auth_type": "oauth",
                "status_endpoint": "/integrations/google/status",
                "login_endpoint": "/oauth/google/login",
                "configured": bool(
                    GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI
                ),
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
            {
                "name": "slack",
                "display_name": "Slack",
                "description": "Send meeting summaries, tasks, and reminders to your Slack workspace",
                "auth_type": "oauth",
                "status_endpoint": "/integrations/slack/status",
                "login_endpoint": "/oauth/slack/login",
                "configured": bool(
                    SLACK_CLIENT_ID and SLACK_CLIENT_SECRET and SLACK_REDIRECT_URI
                ),
                "redirect_uri": SLACK_REDIRECT_URI,
            },
        ]
    }
