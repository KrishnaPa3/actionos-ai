"""
Google OAuth integration router.

Handles the OAuth authorization flow and connection lifecycle:
- GET  /oauth/google/login                   -> returns Google OAuth URL
- GET  /oauth/google/callback                -> handles OAuth redirect
- GET  /integrations/google/status           -> returns connection status
- POST /integrations/google/disconnect       -> removes connection
- POST /integrations/google/sync-task        -> manually sync a single task
"""

import logging
import os
import traceback
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from dependencies.auth import get_current_user
from dependencies.database import AuthContext, get_auth_context
from integrations.google.client import get_client
from integrations.google.oauth import generate_oauth_url, exchange_code_for_token
from integrations.google.service import GoogleCalendarService
from repositories import action_repository
from repositories.session_repository import get_session

logger = logging.getLogger(__name__)

router = APIRouter()


def _safe_execute(
    query_builder: Any,
    log_prefix: str,
) -> Optional[Any]:
    """
    Execute a Supabase query with null-safe error handling.

    The postgrest-py client can return None from execute() in certain
    configurations (network errors, auth failures, client version
    incompatibilities). This wrapper ensures callers never see a bare
    AttributeError on None.

    Returns the response object, or None on failure.
    """
    logger.info("%s — executing query", log_prefix)
    try:
        response = query_builder.execute()
        logger.info(
            "%s — response=%s data=%s",
            log_prefix,
            response,
            getattr(response, "data", None),
        )
        return response
    except Exception as exc:
        logger.error(
            "%s — execute() failed: %s: %s\n%s",
            log_prefix,
            type(exc).__name__,
            exc,
            traceback.format_exc(),
        )
        return None


@router.get("/oauth/google/login")
async def google_login(
    user: dict = Depends(get_current_user),
):
    """
    Generate a Google OAuth authorization URL and return it.

    The frontend should open this URL in a new window/tab.
    After the user approves, Google redirects to /oauth/google/callback
    with the user's ID as the `state` parameter.
    """
    try:
        auth_url = generate_oauth_url(state=user["id"])
        return {"authorization_url": auth_url}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(None),
):
    """
    Handle the OAuth callback from Google.

    The `state` parameter contains the user's Supabase ID (set during
    login). We use the admin client to store the token since this
    endpoint is called by Google's redirect, not by the frontend, so
    there is no Bearer token available.

    Exchanges the authorization code for an access token, fetches the user's
    Google profile information, and stores the connection details in the
    integrations table.
    """
    if not state:
        raise HTTPException(
            status_code=400,
            detail="Missing state parameter. OAuth flow cannot be verified.",
        )

    user_id = state
    logger.info("google_callback: user_id=%s", user_id)

    # ----------------------------------------------------------------
    # 1. Exchange the authorization code for an access token
    # ----------------------------------------------------------------
    try:
        token_data = await exchange_code_for_token(code)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    print("=" * 80)
    print("GOOGLE TOKEN RESPONSE")
    print(token_data)
    print("=" * 80)

    access_token = token_data.get("access_token")
    print("ACCESS TOKEN:", access_token)
    refresh_token = token_data.get("refresh_token")

    if not access_token:
        raise HTTPException(
            status_code=502,
            detail="Google did not return an access token.",
        )

    # ----------------------------------------------------------------
    # 2. Retrieve Google user information
    # ----------------------------------------------------------------
    async with httpx.AsyncClient() as client:
        print("Authorization header:", f"Bearer {access_token[:20]}...")
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        print("=" * 80)
        print("GOOGLE USERINFO RESPONSE")
        print("STATUS:", userinfo_resp.status_code)
        print("BODY:", userinfo_resp.text)
        print("=" * 80)
        if userinfo_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch Google user info: {userinfo_resp.status_code} {userinfo_resp.text}",
            )
        userinfo = userinfo_resp.json()

    google_id = userinfo.get("id", "")
    email = userinfo.get("email", "")

    # ----------------------------------------------------------------
    # 3. Store the connection in the integrations table
    # ----------------------------------------------------------------
    from supabase_admin import supabase_admin as admin

    log_pref = f"google_callback(user={user_id})"

    logger.info(
        "%s — querying integrations table: user_id=%s provider=google",
        log_pref,
        user_id,
    )

    # Check if a row already exists for this user + provider
    lookup = (
        admin
        .table("integrations")
        .select("id, refresh_token, config")
        .eq("user_id", user_id)
        .eq("provider", "google")
        .maybe_single()
    )
    existing = _safe_execute(lookup, f"{log_pref}/lookup")

    final_refresh_token = refresh_token
    existing_config = {}

    if existing is not None and getattr(existing, "data", None):
        if not final_refresh_token:
            final_refresh_token = existing.data.get("refresh_token")
        if isinstance(existing.data.get("config"), dict):
            existing_config = existing.data["config"]

    config = {
        **existing_config,
        "expires_in": token_data.get("expires_in"),
        "scope": token_data.get("scope"),
        "token_type": token_data.get("token_type"),
    }

    now = datetime.now(timezone.utc).isoformat()

    connection_data = {
        "user_id": user_id,
        "provider": "google",
        "access_token": access_token,
        "refresh_token": final_refresh_token,
        "workspace_name": email,
        "external_user_id": google_id,
        "status": "connected",
        "config": config,
        "updated_at": now,
    }

    if existing is not None and getattr(existing, "data", None):
        row_id = existing.data["id"]
        logger.info("%s — updating existing row id=%s", log_pref, row_id)
        upd = (
            admin
            .table("integrations")
            .update(connection_data)
            .eq("id", row_id)
        )
        _safe_execute(upd, f"{log_pref}/update")
    else:
        logger.info("%s — inserting new row", log_pref)
        connection_data["created_at"] = now
        ins = (
            admin
            .table("integrations")
            .insert(connection_data)
        )
        _safe_execute(ins, f"{log_pref}/insert")

    # ----------------------------------------------------------------
    # 4. Redirect the user back to the frontend
    # ----------------------------------------------------------------
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(
        url=f"{frontend_url}/integrations?google=connected",
        status_code=302,
    )


@router.get("/integrations/google/status")
async def google_status(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Returns the Google connection status for the authenticated user.

    Safe against None responses from Supabase execute().
    Always returns HTTP 200 with connected=false if no connection exists
    or if the database query fails.
    """
    log_pref = f"google_status(user={ctx.user_id})"
    logger.info(
        "%s — querying table=integrations provider=google",
        log_pref,
    )

    q = (
        ctx.db
        .table("integrations")
        .select("workspace_name, status, config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "google")
        .eq("status", "connected")
        .maybe_single()
    )
    response = _safe_execute(q, log_pref)

    # Safely handle all failure modes:
    # - response is None (execute threw or returned None)
    # - response.data is None (no matching row or missing attribute)
    if response is None or getattr(response, "data", None) is None:
        logger.info(
            "%s — no active connection found (response=%s)",
            log_pref,
            response,
        )
        return {
            "connected": False,
            "workspace_name": None,
            "provider": "google",
        }

    logger.info(
        "%s — connected workspace=%s",
        log_pref,
        response.data.get("workspace_name"),
    )
    return {
        "connected": True,
        "workspace_name": response.data.get("workspace_name"),
        "provider": "google",
    }


@router.post("/integrations/google/disconnect")
async def google_disconnect(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Disconnect the Google integration for the authenticated user.

    Marks the connection as disconnected. Does NOT revoke the token.
    """
    log_pref = f"google_disconnect(user={ctx.user_id})"
    logger.info(
        "%s — updating table=integrations provider=google status=disconnected",
        log_pref,
    )

    now = datetime.now(timezone.utc).isoformat()

    q = (
        ctx.db
        .table("integrations")
        .update({
            "status": "disconnected",
            "updated_at": now,
        })
        .eq("user_id", ctx.user_id)
        .eq("provider", "google")
        .eq("status", "connected")
    )
    response = _safe_execute(q, log_pref)

    if response is None or getattr(response, "data", None) is None:
        logger.warning(
            "%s — no active connection to disconnect (response=%s)",
            log_pref,
            response,
        )
        raise HTTPException(
            status_code=404,
            detail="No active Google connection found to disconnect.",
        )

    logger.info("%s — disconnected successfully", log_pref)
    return {
        "success": True,
        "message": "Google integration disconnected.",
    }


# ------------------------------------------------------------------
# Manual Task Sync
# ------------------------------------------------------------------

class SyncTaskRequest(BaseModel):
    action_id: str


@router.post("/integrations/google/sync-task")
async def google_sync_task(
    body: SyncTaskRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Manually sync a single action (task) to Google Calendar.

    Flow:
      1. Authenticate the user.
      2. Verify Google integration exists.
      3. Load the action and verify ownership.
      4. Guard against duplicate sync.
      5. Load the meeting/session.
      6. Create the Google Calendar event via GoogleCalendarService.
      7. Update the action with sync metadata.
    """
    log_pref = f"google_sync_task(user={ctx.user_id}, action={body.action_id})"

    # ----------------------------------------------------------------
    # Query integration status
    # ----------------------------------------------------------------
    sync_lookup = (
        ctx.db
        .table("integrations")
        .select("config, provider, workspace_name, status")
        .eq("user_id", ctx.user_id)
        .eq("provider", "google")
        .eq("status", "connected")
        .maybe_single()
    )
    integ_resp = _safe_execute(sync_lookup, f"{log_pref}/sync-style-query")

    if integ_resp is None or getattr(integ_resp, "data", None) is None:
        raise HTTPException(
            status_code=400,
            detail="Google is not connected. Please connect your Google account first.",
        )

    # 2. Load the action and verify ownership
    action = action_repository.get_action(ctx.db, ctx.user_id, body.action_id)

    if action is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    already_synced = action.get("google_synced") is True and action.get("google_event_id")

    # 3. Duplicate protection
    if already_synced:
        logger.info(
            "%s — already synced (event_id=%s)",
            log_pref, action["google_event_id"],
        )
        return {
            "success": True,
            "already_synced": True,
            "event_id": action["google_event_id"],
            "event_url": action.get("google_event_url", ""),
            "message": "Task already synced.",
        }

    # 4. Load the session for meeting name context
    session_name = "Unknown Session"
    session = get_session(ctx.db, ctx.user_id, action["session_id"])
    if session:
        session_name = session.get("meeting_name") or "Untitled Meeting"

    # 5. Create the Google client and service, then create the event
    try:
        google_client = get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    svc = GoogleCalendarService(client=google_client)

    # Build a session link URL for the action's source meeting page
    session_link = None
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    if action.get("session_id"):
        session_link = f"{frontend_url}/results/{action['session_id']}"

    summary_parts = []
    if action.get("description"):
        summary_parts.append(f"Task:\n{action['description']}")
    summary_parts.append(f"Meeting:\n{session_name}")
    if action.get("owner"):
        summary_parts.append(f"Owner:\n{action['owner']}")
    if action.get("priority"):
        summary_parts.append(f"Priority:\n{action['priority'].capitalize()}")
    if session_link:
        summary_parts.append(f"Session Link:\n{session_link}")
    description = "\n\n".join(summary_parts)

    try:
        result = svc.create_event(
            summary=action.get("title", "Untitled Task"),
            description=description,
            due_date=action.get("due_date"),
        )
    except Exception as exc:
        logger.error(
            "%s — Google create_event failed: %s: %s\n%s",
            log_pref, type(exc).__name__, exc, traceback.format_exc(),
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create the event in Google Calendar. Please try again.",
        )

    event_id = result.get("event_id", "")
    event_url = result.get("event_url", "")

    logger.info(
        "%s — created Google event id=%s url=%s",
        log_pref, event_id, event_url,
    )

    # 6. Update the action with sync metadata
    now = datetime.now(timezone.utc).isoformat()
    updated = action_repository.update_action_fields(
        ctx.db,
        ctx.user_id,
        body.action_id,
        {
            "google_event_id": event_id,
            "google_event_url": event_url,
            "google_synced": True,
            "google_last_synced": now,
        },
    )

    if updated is None:
        logger.error(
            "%s — failed to update action after Google sync",
            log_pref,
        )
        return {
            "success": True,
            "already_synced": False,
            "event_id": event_id,
            "event_url": event_url,
            "message": "Event was created in Google Calendar, but the sync status could not be saved.",
        }

    logger.info(
        "%s — sync complete event_id=%s",
        log_pref, event_id,
    )

    return {
        "success": True,
        "already_synced": False,
        "event_id": event_id,
        "event_url": event_url,
        "message": "Task synced successfully.",
    }
