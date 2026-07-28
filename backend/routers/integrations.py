"""
Integration endpoints aggregator.

Mounts provider-specific routers (Notion, future Google Calendar,
Slack, etc.) so that all integration endpoints are available under
a single aggregator module.

Currently mounted routers:
  - Notion: /oauth/notion/login, /oauth/notion/callback,
            /integrations/notion/status, /integrations/notion/disconnect
"""

from fastapi import APIRouter

from integrations.notion.router import router as notion_router
from integrations.google.router import router as google_router

router = APIRouter()
router.include_router(notion_router)
router.include_router(google_router)


@router.get("/integrations")
async def list_integrations():
    """
    List available integrations and their status.
    Notion and Google Calendar are supported via OAuth.
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
            },
            {
                "name": "google",
                "display_name": "Google Calendar",
                "description": "Sync tasks to your Google Calendar",
                "auth_type": "oauth",
                "status_endpoint": "/integrations/google/status",
                "login_endpoint": "/oauth/google/login",
            },
        ]
    }
