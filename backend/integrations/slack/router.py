"""
Slack OAuth integration router.

Handles the OAuth authorization flow and connection lifecycle:
- GET  /oauth/slack/connect              -> redirects to Slack OAuth URL
- GET  /oauth/slack/callback             -> handles OAuth redirect
- GET  /integrations/slack/status        -> returns connection status
- POST /integrations/slack/disconnect    -> removes connection
"""

import logging
import traceback
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from config import FRONTEND_URL
from dependencies.auth import get_current_user
from dependencies.database import AuthContext, get_auth_context
from integrations.slack.client import get_client
from integrations.slack.oauth import generate_oauth_url, exchange_code_for_token
from integrations.slack.service import SlackService
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


@router.get("/oauth/slack/login")
async def slack_login(
    user: dict = Depends(get_current_user),
):
    """
    Generate a Slack OAuth authorization URL and return it.

    The frontend should open this URL in a new window/tab.
    After the user approves, Slack redirects to /oauth/slack/callback
    with the user's ID as the `state` parameter.
    """
    try:
        auth_url = generate_oauth_url(state=user["id"])
        return {"authorization_url": auth_url}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/slack/callback")
async def slack_callback(
    code: str = Query(...),
    state: str = Query(None),
):
    """
    Handle the OAuth callback from Slack.

    The `state` parameter contains the user's Supabase ID (set during
    connect). We use the admin client to store the token since this
    endpoint is called by Slack's redirect, not by the frontend, so
    there is no Bearer token available.

    Exchanges the authorization code for an access token and stores
    the connection details in the integrations table.
    """
    if not state:
        raise HTTPException(
            status_code=400,
            detail="Missing state parameter. OAuth flow cannot be verified.",
        )

    user_id = state
    logger.info("slack_callback: user_id=%s", user_id)

    # ----------------------------------------------------------------
    # 1. Exchange the authorization code for an access token
    # ----------------------------------------------------------------
    try:
        token_data = await exchange_code_for_token(code)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    print("=" * 80)
    print("SLACK TOKEN RESPONSE")
    print(token_data)
    print("=" * 80)

    access_token = token_data.get("access_token")
    print("ACCESS TOKEN:", access_token)

    if not access_token:
        raise HTTPException(
            status_code=502,
            detail="Slack did not return an access token.",
        )

    # ----------------------------------------------------------------
    # 2. Extract user and workspace information from the token response
    # ----------------------------------------------------------------
    team_info = token_data.get("team", {})
    authed_user = token_data.get("authed_user", {})

    workspace_id = team_info.get("id", "") if isinstance(team_info, dict) else ""
    workspace_name = team_info.get("name", "") if isinstance(team_info, dict) else ""
    slack_user_id = authed_user.get("id", "") if isinstance(authed_user, dict) else ""
    scope = token_data.get("scope", "")
    bot_user_id = token_data.get("bot_user_id", "")
    app_id = token_data.get("app_id", "")

    # ----------------------------------------------------------------
    # 3. Store the connection in the integrations table
    # ----------------------------------------------------------------
    from supabase_admin import supabase_admin as admin

    log_pref = f"slack_callback(user={user_id})"

    logger.info(
        "%s — querying integrations table: user_id=%s provider=slack",
        log_pref,
        user_id,
    )

    now = datetime.now(timezone.utc).isoformat()

    config = {
        "scope": scope,
        "bot_user_id": bot_user_id,
        "app_id": app_id,
        "authed_user_id": slack_user_id,
    }

    connection_data = {
        "user_id": user_id,
        "provider": "slack",
        "access_token": access_token,
        "workspace_id": workspace_id,
        "workspace_name": workspace_name,
        "external_user_id": slack_user_id,
        "status": "connected",
        "config": config,
        "updated_at": now,
    }

    # Check if a row already exists for this user + provider
    lookup = (
        admin
        .table("integrations")
        .select("id")
        .eq("user_id", user_id)
        .eq("provider", "slack")
        .maybe_single()
    )
    existing = _safe_execute(lookup, f"{log_pref}/lookup")

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
    return RedirectResponse(
        url=f"{FRONTEND_URL}/integrations?slack=connected",
        status_code=302,
    )


@router.get("/integrations/slack/status")
async def slack_status(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Returns the Slack connection status for the authenticated user.

    Safe against None responses from Supabase execute().
    Always returns HTTP 200 with connected=false if no connection exists
    or if the database query fails.
    """
    log_pref = f"slack_status(user={ctx.user_id})"
    logger.info(
        "%s — querying table=integrations provider=slack",
        log_pref,
    )

    q = (
        ctx.db
        .table("integrations")
        .select("workspace_name, status, config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "slack")
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
            "provider": "slack",
        }

    logger.info(
        "%s — connected workspace=%s",
        log_pref,
        response.data.get("workspace_name"),
    )
    return {
        "connected": True,
        "workspace_name": response.data.get("workspace_name"),
        "provider": "slack",
    }


class SlackDefaultChannelRequest(BaseModel):
    channel_id: str
    channel_name: str


class SyncTaskRequest(BaseModel):
    action_id: str


@router.get("/integrations/slack/channels")
async def slack_channels(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    List Slack channels visible to the app.
    """
    log_pref = f"slack_channels(user={ctx.user_id})"
    logger.info(
        "%s — verifying Slack integration exists",
        log_pref,
    )

    lookup = (
        ctx.db
        .table("integrations")
        .select("id")
        .eq("user_id", ctx.user_id)
        .eq("provider", "slack")
        .eq("status", "connected")
        .maybe_single()
    )
    response = _safe_execute(lookup, f"{log_pref}/lookup")
    if response is None or getattr(response, "data", None) is None:
        raise HTTPException(
            status_code=400,
            detail="Slack is not connected. Please connect your Slack workspace first.",
        )

    try:
        slack_client = get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    svc = SlackService(client=slack_client)
    try:
        channels = svc.list_channels()
    except Exception as exc:
        logger.error(
            "%s — list_channels failed: %s: %s",
            log_pref, type(exc).__name__, exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to list Slack channels. Please try again.",
        )

    return channels


@router.post("/integrations/slack/default-channel")
async def slack_default_channel(
    body: SlackDefaultChannelRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Save a user's preferred Slack channel into integrations.config.
    """
    log_pref = f"slack_default_channel(user={ctx.user_id})"
    logger.info(
        "%s — saving default channel %s (%s)",
        log_pref, body.channel_name, body.channel_id,
    )

    lookup = (
        ctx.db
        .table("integrations")
        .select("config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "slack")
        .eq("status", "connected")
        .maybe_single()
    )
    response = _safe_execute(lookup, f"{log_pref}/lookup")
    if response is None or getattr(response, "data", None) is None:
        raise HTTPException(
            status_code=400,
            detail="Slack is not connected. Please connect your Slack workspace first.",
        )

    current_config = {}
    if isinstance(response.data.get("config"), dict):
        current_config = response.data.get("config")

    current_config["default_channel"] = body.channel_id
    current_config["default_channel_name"] = body.channel_name

    now = datetime.now(timezone.utc).isoformat()
    upd = (
        ctx.db
        .table("integrations")
        .update({
            "config": current_config,
            "updated_at": now,
        })
        .eq("user_id", ctx.user_id)
        .eq("provider", "slack")
        .eq("status", "connected")
    )
    update_resp = _safe_execute(upd, f"{log_pref}/update")
    if update_resp is None or getattr(update_resp, "data", None) is None:
        raise HTTPException(
            status_code=502,
            detail="Failed to save the default Slack channel. Please try again.",
        )

    return {
        "success": True,
        "message": "Default Slack channel saved.",
        "default_channel": body.channel_id,
        "default_channel_name": body.channel_name,
    }


@router.post("/integrations/slack/sync-task")
async def slack_sync_task(
    body: SyncTaskRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Manually sync a single task to Slack.
    """
    log_pref = f"slack_sync_task(user={ctx.user_id}, action={body.action_id})"

    lookup = (
        ctx.db
        .table("integrations")
        .select("config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "slack")
        .eq("status", "connected")
        .maybe_single()
    )
    integ_resp = _safe_execute(lookup, f"{log_pref}/lookup")
    if integ_resp is None or getattr(integ_resp, "data", None) is None:
        raise HTTPException(
            status_code=400,
            detail="Slack is not connected. Please connect your Slack workspace first.",
        )

    action = action_repository.get_action(ctx.db, ctx.user_id, body.action_id)
    if action is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    already_synced = action.get("slack_synced") is True and action.get("slack_message_ts")
    if already_synced:
        logger.info(
            "%s — already synced (message_ts=%s)",
            log_pref, action.get("slack_message_ts"),
        )
        return {
            "success": True,
            "already_synced": True,
            "message_ts": action.get("slack_message_ts"),
            "channel_id": action.get("slack_channel_id"),
            "message": "Task already sent to Slack.",
        }

    session_name = "Unknown Session"
    session = get_session(ctx.db, ctx.user_id, action.get("session_id"))
    if session:
        session_name = session.get("meeting_name") or "Untitled Meeting"

    try:
        slack_client = get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    config = integ_resp.data.get("config") or {}
    default_channel = config.get("default_channel")
    if not default_channel:
        raise HTTPException(
            status_code=400,
            detail="No default Slack channel is configured. Please select one in Integrations.",
        )

    svc = SlackService(client=slack_client)

    session_link = None
    if action.get("session_id"):
        session_link = f"{FRONTEND_URL}/results/{action['session_id']}"

    try:
        result = svc.send_task_message(
            channel_id=default_channel,
            title=action.get("title", "Untitled Task"),
            description=action.get("description"),
            owner=action.get("owner"),
            priority=action.get("priority"),
            due_date=action.get("due_date"),
            meeting_name=session_name,
            session_link=session_link,
        )
    except Exception as exc:
        logger.error(
            "%s — Slack send_task_message failed: %s: %s\n%s",
            log_pref, type(exc).__name__, exc, traceback.format_exc(),
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to send the task to Slack. Please try again.",
        )

    message_ts = result.get("message_ts", "")
    channel_id = result.get("channel_id", default_channel)

    now = datetime.now(timezone.utc).isoformat()
    updated = action_repository.update_action_fields(
        ctx.db,
        ctx.user_id,
        body.action_id,
        {
            "slack_synced": True,
            "slack_message_ts": message_ts,
            "slack_channel_id": channel_id,
            "slack_last_synced": now,
        },
    )

    if updated is None:
        logger.error(
            "%s — failed to update action after Slack sync",
            log_pref,
        )
        return {
            "success": True,
            "already_synced": False,
            "message_ts": message_ts,
            "channel_id": channel_id,
            "message": "Task sent to Slack, but sync metadata could not be saved.",
        }

    logger.info(
        "%s — Slack sync complete channel=%s ts=%s",
        log_pref, channel_id, message_ts,
    )

    return {
        "success": True,
        "already_synced": False,
        "message_ts": message_ts,
        "channel_id": channel_id,
        "message": "Task sent to Slack successfully.",
    }


@router.post("/integrations/slack/disconnect")
async def slack_disconnect(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Disconnect the Slack integration for the authenticated user.

    Marks the connection as disconnected. Does NOT revoke the token.
    """
    log_pref = f"slack_disconnect(user={ctx.user_id})"
    logger.info(
        "%s — updating table=integrations provider=slack status=disconnected",
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
        .eq("provider", "slack")
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
            detail="No active Slack connection found to disconnect.",
        )

    logger.info("%s — disconnected successfully", log_pref)
    return {
        "success": True,
        "message": "Slack integration disconnected.",
    }

