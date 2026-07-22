"""
Shared request-scoped auth + database context.

Previously, almost every endpoint in main.py repeated the exact same
two lines:

    user = Depends(get_current_user)
    db = get_authenticated_supabase(user["access_token"])

That's ~40 duplicated call sites. This module collapses that into a
single FastAPI dependency that both authenticates the request and
builds the RLS-aware Supabase client, so routers just declare:

    ctx: AuthContext = Depends(get_auth_context)

`AuthContext` is intentionally a tiny plain object (not a database
client subclass) - it does not change auth behaviour, RLS behaviour,
or the identity of the Supabase client that gets used. It's purely a
container to avoid re-typing the same two lines everywhere.
"""

from dataclasses import dataclass
from typing import Any

from fastapi import Depends

from dependencies.auth import get_current_user
from auth_supabase import get_authenticated_supabase


@dataclass
class AuthContext:
    """Bundles the authenticated user and their RLS-scoped DB client."""

    user: dict
    db: Any

    @property
    def user_id(self) -> str:
        return self.user["id"]

    @property
    def access_token(self) -> str:
        return self.user["access_token"]


async def get_auth_context(user: dict = Depends(get_current_user)) -> AuthContext:
    """
    Single place that turns an authenticated user into a request-scoped,
    RLS-aware Supabase client. This is exactly the same
    `get_authenticated_supabase(user["access_token"])` call every endpoint
    used to make individually - just made reusable via DI so the client
    isn't rebuilt with copy-pasted code at each call site.
    """

    db = get_authenticated_supabase(user["access_token"])
    return AuthContext(user=user, db=db)
