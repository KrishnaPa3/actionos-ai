"""
Notion dependency injection.

This module provides a FastAPI dependency for getting a per-user
Notion client. It replaces the old global NotionService singleton
with request-scoped, OAuth-based clients.

Usage:
    @router.get("/some-endpoint")
    async def handler(notion=Depends(get_notion_client), ...):
        ...
"""

from fastapi import Depends, HTTPException

from dependencies.database import AuthContext, get_auth_context
from integrations.notion.client import get_client


def get_notion_client(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    FastAPI dependency that returns a Notion SDK client authenticated
    with the current user's OAuth token.

    Raises HTTPException(503) if the user has no active Notion connection.
    """
    try:
        return get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e),
        )
