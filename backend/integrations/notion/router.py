"""
Notion OAuth integration router.

Handles the OAuth authorization flow and connection lifecycle:
- GET  /oauth/notion/login                   -> returns Notion OAuth URL
- GET  /oauth/notion/callback                -> handles OAuth redirect
- GET  /integrations/notion/status           -> returns connection status
- GET  /integrations/notion/databases        -> list accessible databases
- POST /integrations/notion/database         -> select a database
- POST /integrations/notion/disconnect       -> removes connection
- POST /integrations/notion/sync-task        -> manually sync a single task
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
from dependencies.notion import get_notion_client
from integrations.notion.client import get_client
from integrations.notion.oauth import generate_oauth_url, exchange_code_for_token
from integrations.notion.service import NotionOAuthService
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
        traceback.print_exc()
        logger.error(
            "%s — execute() failed: %s: %s\n%s",
            log_prefix,
            type(exc).__name__,
            exc,
            traceback.format_exc(),
        )
        return None


@router.get("/oauth/notion/login")
async def notion_login(
    user: dict = Depends(get_current_user),
):
    """
    Generate a Notion OAuth authorization URL and return it.

    The frontend should open this URL in a new window/tab.
    After the user approves, Notion redirects to /oauth/notion/callback
    with the user's ID as the `state` parameter.
    """
    try:
        auth_url = generate_oauth_url(state=user["id"])
        return {"authorization_url": auth_url}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/notion/callback")
async def notion_callback(
    code: str = Query(...),
    state: str = Query(None),
):
    """
    Handle the OAuth callback from Notion.

    The `state` parameter contains the user's Supabase ID (set during
    login). We use the admin client to store the token since this
    endpoint is called by Notion's redirect, not by the frontend, so
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
    logger.info("notion_callback: user_id=%s", user_id)

    # ----------------------------------------------------------------
    # 1. Exchange the authorization code for an access token
    # ----------------------------------------------------------------
    try:
        token_data = await exchange_code_for_token(code)
        print("=" * 80)
        print("GOOGLE TOKEN RESPONSE")
        print(token_data)
        print("=" * 80)

        access_token = token_data.get("access_token")

        print("ACCESS TOKEN:", access_token)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    access_token = token_data.get("access_token")
    workspace_id = token_data.get("workspace_id", "")
    workspace_name = token_data.get("workspace_name", "")
    bot_id = token_data.get("bot_id", "")

    if not access_token:
        raise HTTPException(
            status_code=502,
            detail="Notion did not return an access token.",
        )

    # ----------------------------------------------------------------
    # 2. Store the connection in the integrations table
    # ----------------------------------------------------------------
    now = datetime.now(timezone.utc).isoformat()

    connection_data = {
        "user_id": user_id,
        "provider": "notion",
        "access_token": access_token,
        "workspace_id": workspace_id,
        "workspace_name": workspace_name,
        "external_user_id": bot_id,
        "status": "connected",
        "config": {},
        "updated_at": now,
    }

    from supabase_admin import supabase_admin as admin

    log_pref = f"notion_callback(user={user_id})"

    logger.info(
        "%s — querying integrations table: user_id=%s provider=notion",
        log_pref,
        user_id,
    )

    # Check if a row already exists for this user + provider
    lookup = (
        admin
        .table("integrations")
        .select("id")
        .eq("user_id", user_id)
        .eq("provider", "notion")
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
    # 3. Redirect the user back to the frontend
    # ----------------------------------------------------------------
    return RedirectResponse(
        url=f"{FRONTEND_URL}/integrations?notion=connected",
        status_code=302,
    )


@router.get("/integrations/notion/status")
async def notion_status(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Returns the Notion connection status for the authenticated user.

    Safe against None responses from Supabase execute().
    Always returns HTTP 200 with connected=false if no connection exists
    or if the database query fails.
    """
    log_pref = (
        f"notion_status(user={ctx.user_id})"
    )
    logger.info(
        "%s — querying table=integrations provider=notion",
        log_pref,
    )

    q = (
        ctx.db
        .table("integrations")
        .select("workspace_name, status, config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "notion")
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
            "provider": "notion",
            "selected_database": None,
        }

    # Extract the selected database from config if present
    selected_database = None
    config = response.data.get("config")
    if isinstance(config, dict):
        db_id = config.get("database_id")
        db_name = config.get("database_name")
        if db_id:
            selected_database = {
                "id": db_id,
                "name": db_name or "Untitled Database",
            }

    logger.info(
        "%s — connected workspace=%s",
        log_pref,
        response.data.get("workspace_name"),
    )
    return {
        "connected": True,
        "workspace_name": response.data.get("workspace_name"),
        "provider": "notion",
        "selected_database": selected_database,
    }


@router.post("/integrations/notion/disconnect")
async def notion_disconnect(
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Disconnect the Notion integration for the authenticated user.

    Marks the connection as disconnected. Does NOT revoke the token.
    """
    log_pref = (
        f"notion_disconnect(user={ctx.user_id})"
    )
    logger.info(
        "%s — updating table=integrations provider=notion status=disconnected",
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
        .eq("provider", "notion")
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
            detail="No active Notion connection found to disconnect.",
        )

    logger.info("%s — disconnected successfully", log_pref)
    return {
        "success": True,
        "message": "Notion integration disconnected.",
    }


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _extract_db_title(database: dict) -> str:
    """
    Extract the plain-text title from a Notion database object.

    Notion's title property is an array of rich-text objects, each with
    a plain_text field. Concatenates them into a single string.
    Returns "Untitled Database" if the title is empty or absent.
    """
    title_parts = database.get("title", [])
    if not title_parts:
        return "Untitled Database"
    return "".join(part.get("plain_text", "") for part in title_parts)


# ------------------------------------------------------------------
# Database Discovery
# ------------------------------------------------------------------

@router.get("/integrations/notion/databases")
async def notion_databases(
    notion: Any = Depends(get_notion_client),
):
    """
    List all databases accessible by the authenticated Notion integration.

    Calls the Notion Search API with a database-only filter so only
    database objects (not pages) are returned.  The OAuth scopes
    already guarantee write access (read:user, read:database,
    write:database), so every returned database is writable.

Returns a list of:
        { "id": "...", "title": "...", "url": "..." }
    """
    try:
        results = notion.search(
            filter={
                "property": "object",
                "value": "data_source",
                "in_trash": False,
            },
            sort={"direction": "ascending", "timestamp": "last_edited_time"},
        )
    except Exception as exc:
        logger.error(
            "notion_databases — Notion Search API failed: %s: %s",
            type(exc).__name__, exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to query Notion databases. The integration may be "
                   "disconnected or the access token may be invalid.",
        )

    databases = []
    for item in results.get("results", []):
        # The Search API returns objects of type "data_source".
        # item["id"] is the data_source ID.
        # item["parent"]["database_id"] is the actual database UUID
        # that pages.create() expects in parent.database_id.
        parent = item.get("parent", {})
        actual_database_id = parent.get("database_id") if isinstance(parent, dict) else None
        databases.append({
            "id": item["id"],
            "title": _extract_db_title(item),
            "url": item.get("url", ""),
            "database_id": actual_database_id,
        })

    logger.info(
        "notion_databases — found %d database(s)",
        len(databases),
    )

    # ================================================================
    # DEBUG: Log the exact response structure from the Search API
    # ================================================================


    return databases


# ------------------------------------------------------------------
# Database Selection
# ------------------------------------------------------------------

class SelectDatabaseRequest(BaseModel):
    database_id: str


@router.post("/integrations/notion/database")
async def notion_select_database(
    body: SelectDatabaseRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Select a Notion database to use for task synchronization.

    The Search API returns objects of type ``data_source`` (not ``database``),
    so we validate using the Data Sources API instead of ``databases.retrieve()``.

    Flow:
      1. Create a Notion client for the authenticated user.
      2. Verify the data_source exists and is accessible by calling
         ``client.data_sources.retrieve()``.
      3. Extract the title from the returned data_source object.
      4. Store the selection in integrations.config (merged with any
         existing config so unrelated keys are preserved).
    """
    log_pref = f"notion_select_database(user={ctx.user_id})"

    # 1. Create the Notion client
    try:
        notion = get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    # 2. Verify the data_source exists and is accessible
    #    NOTE: The Search API returns data_source objects, not database
    #    objects, so we must use the Data Sources retrieve endpoint.
    try:
        data_source = notion.data_sources.retrieve(data_source_id=body.database_id)
    except Exception as exc:
        logger.error(
            "%s — data_sources.retrieve(%s) failed: %s: %s",
            log_pref, body.database_id, type(exc).__name__, exc,
        )
        raise HTTPException(
            status_code=400,
            detail="The specified database does not exist or is not accessible "
                   "by this integration.",
        )

    # 3. Extract the title and the actual database UUID
    # NOTE: data_source objects have the same "title" rich-text structure
    # as database objects, so the _extract_db_title helper works for both.
    database_name = _extract_db_title(data_source)

    # The data_source object has a "parent" field containing the actual
    # database UUID. pages.create() expects this real database UUID in
    # parent.database_id, NOT the data_source ID.
    ds_parent = data_source.get("parent", {})
    actual_database_id = ds_parent.get("database_id") if isinstance(ds_parent, dict) else None
    if not actual_database_id:
        logger.error(
            "%s — data_source response has no parent.database_id (parent=%s)",
            log_pref, ds_parent,
        )
        raise HTTPException(
            status_code=400,
            detail="The selected Notion database could not be identified. "
                   "Please try selecting the database again.",
        )

    logger.info(
        "%s — verified data_source id=%s -> database id=%s name=%s",
        log_pref, body.database_id, actual_database_id, database_name,
    )

    # 4. Store in integrations.config (merge with existing config)
    now = datetime.now(timezone.utc).isoformat()

    # Read existing config first
    lookup = (
        ctx.db
        .table("integrations")
        .select("config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "notion")
        .eq("status", "connected")
        .maybe_single()
    )
    existing = _safe_execute(lookup, f"{log_pref}/read-config")

    current_config: dict = {}
    if existing is not None and getattr(existing, "data", None) is not None:
        stored = existing.data.get("config")
        if isinstance(stored, dict):
            current_config = stored

    # Merge the new database selection into the existing config.
    # Store the actual database UUID (from parent.database_id) — NOT the
    # data_source ID — because pages.create() and databases.retrieve()
    # expect a real database UUID.
    current_config["database_id"] = actual_database_id
    current_config["database_name"] = database_name

    upd = (
        ctx.db
        .table("integrations")
        .update({
            "config": current_config,
            "updated_at": now,
        })
        .eq("user_id", ctx.user_id)
        .eq("provider", "notion")
        .eq("status", "connected")
    )
    update_resp = _safe_execute(upd, f"{log_pref}/update-config")

    if update_resp is None or getattr(update_resp, "data", None) is None:
        logger.error(
            "%s — failed to store config (response=%s)",
            log_pref, update_resp,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to save the database selection.",
        )

    logger.info(
        "%s — saved config=%s", log_pref, current_config,
    )

    return {
        "success": True,
        "database_name": database_name,
    }


# ------------------------------------------------------------------
# Manual Task Sync
# ------------------------------------------------------------------

class SyncTaskRequest(BaseModel):
    action_id: str


@router.post("/integrations/notion/sync-task")
async def notion_sync_task(
    body: SyncTaskRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Manually sync a single action (task) to Notion.

    Flow:
      1. Authenticate the user.
      2. Load the action and verify ownership.
      3. Check Notion connection + selected database.
      4. Guard against duplicate sync.
      5. Create the Notion page via NotionOAuthService.
      6. Update the action with sync metadata.
    """
    log_pref = f"notion_sync_task(user={ctx.user_id}, action={body.action_id})"

    # ----------------------------------------------------------------
    # Query integration status and selected database
    # ----------------------------------------------------------------
    status_lookup = (
        ctx.db
        .table("integrations")
        .select("workspace_name, status, config")
        .eq("user_id", ctx.user_id)
        .eq("provider", "notion")
        .eq("status", "connected")
        .maybe_single()
    )
    status_resp = _safe_execute(status_lookup, f"{log_pref}/status-style-query")
    sync_lookup = (
        ctx.db
        .table("integrations")
        .select("config, provider, workspace_name, status")
        .eq("user_id", ctx.user_id)
        .eq("provider", "notion")
        .eq("status", "connected")
        .maybe_single()
    )
    sync_resp = _safe_execute(sync_lookup, f"{log_pref}/sync-style-query")

    integ_resp = sync_resp
    if integ_resp is None or getattr(integ_resp, "data", None) is None:
        raise HTTPException(
            status_code=400,
            detail="Notion is not connected. Please connect your Notion workspace first.",
        )

    config = integ_resp.data.get("config") or {}
    database_id = config.get("database_id") if isinstance(config, dict) else None

    if not database_id:
        print("RETURN 400:")
        print("Reason: No selected database")
        raise HTTPException(
            status_code=400,
            detail="No database selected. Please select a Notion database first.",
        )

    # 2. Load the action and verify ownership
    action = action_repository.get_action(ctx.db, ctx.user_id, body.action_id)

    if action is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    already_synced = action.get("notion_synced") is True and action.get("notion_page_id")

    # 3. Duplicate protection
    if already_synced:
        logger.info(
            "%s — already synced (page_id=%s)",
            log_pref, action["notion_page_id"],
        )
        return {
            "success": True,
            "already_synced": True,
            "page_id": action["notion_page_id"],
            "page_url": action.get("notion_page_url", ""),
            "message": "Task already synced.",
        }

    # 4. Load the session for meeting name context
    session_name = "Unknown Session"
    session = get_session(ctx.db, ctx.user_id, action["session_id"])
    if session:
        session_name = session.get("meeting_name") or "Untitled Meeting"

    # 5. Create the Notion client and service, then create the page
    try:
        notion = get_client(user_id=ctx.user_id, db=ctx.db)
    except ValueError as exc:
        print("RETURN 400:")
        print(f"Reason: Failed to create Notion client: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))

    svc = NotionOAuthService(client=notion, database_id=database_id)

    # Build a session link URL for the action's source meeting page
    session_link = None
    if action.get("session_id"):
        session_link = f"{FRONTEND_URL}/results/{action['session_id']}"

    summary_parts = []
    if action.get("description"):
        summary_parts.append(action["description"])
    summary_parts.append(f"Synced from: {session_name}")
    summary = "\n\n".join(summary_parts)

    try:
        result = svc.create_task(
            title=action.get("title", "Untitled Task"),
            owner=action.get("owner", ""),
            due_date=action.get("due_date"),
            priority=action.get("priority", "medium"),
            summary=summary,
            session_link=session_link,
            status=action.get("status", "pending"),
        )
    except Exception as exc:
        logger.error(
            "%s — Notion create_task failed: %s: %s\n%s",
            log_pref, type(exc).__name__, exc, traceback.format_exc(),
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create the task in Notion. Please try again.",
        )

    page_id = result.get("page_id", "")
    page_url = result.get("page_url", "")

    logger.info(
        "%s — created Notion page id=%s url=%s",
        log_pref, page_id, page_url,
    )

    # 6. Update the action with sync metadata
    now = datetime.now(timezone.utc).isoformat()
    updated = action_repository.update_action_fields(
        ctx.db,
        ctx.user_id,
        body.action_id,
        {
            "notion_page_id": page_id,
            "notion_page_url": page_url,
            "notion_synced": True,
            "notion_last_synced": now,
        },
    )

    if updated is None:
        logger.error(
            "%s — failed to update action after Notion sync",
            log_pref,
        )
        # The page was created but we couldn't save the reference.
        # Return partial success so the user knows the page exists.
        return {
            "success": True,
            "already_synced": False,
            "page_id": page_id,
            "page_url": page_url,
            "message": "Task was created in Notion, but the sync status could not be saved.",
        }

    logger.info(
        "%s — sync complete page_id=%s",
        log_pref, page_id,
    )

    return {
        "success": True,
        "already_synced": False,
        "page_id": page_id,
        "page_url": page_url,
        "message": "Task synced successfully.",
    }
