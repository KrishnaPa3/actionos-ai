"""
Session endpoints.

Routes, request/response shapes, and status codes are unchanged from
main.py. See repositories/session_repository.py for the optimized
GET /sessions implementation.
"""

from fastapi import APIRouter, Depends

from dependencies.database import AuthContext, get_auth_context
from repositories import session_repository, action_repository, risk_repository, decision_repository
from schemas.requests import RenameMeetingRequest
from schemas.extraction import ActionPlan
from utils.errors import not_found_response, raise_404
from utils.timing import Stopwatch

router = APIRouter()


@router.get("/sessions")
async def get_sessions(ctx: AuthContext = Depends(get_auth_context)):
    stopwatch = Stopwatch("/sessions")

    sessions = session_repository.list_sessions_with_tasks(ctx.db, ctx.user_id, stopwatch)

    stopwatch.report()

    return {
        "success": True,
        "count": len(sessions),
        "sessions": sessions,
    }


@router.get("/session/{session_id}")
async def get_session(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    session = session_repository.get_session(ctx.db, ctx.user_id, session_id)

    if session is None:
        return not_found_response("Session not found")

    return session


@router.get("/session/{session_id}/actions")
async def get_session_actions(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    actions = action_repository.get_session_actions(ctx.db, ctx.user_id, session_id)
    return {"success": True, "actions": actions}


@router.get("/session/{session_id}/risks")
async def get_session_risks(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    risks = risk_repository.get_session_risks(ctx.db, ctx.user_id, session_id)
    return {"success": True, "risks": risks}


@router.get("/session/{session_id}/decisions")
async def get_session_decisions(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    decisions = decision_repository.get_session_decisions(ctx.db, ctx.user_id, session_id)
    return {"success": True, "decisions": decisions}


@router.patch("/session/{session_id}/rename")
async def rename_meeting(
    session_id: str,
    request: RenameMeetingRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    session = session_repository.rename_session(ctx.db, ctx.user_id, session_id, request.meeting_name)

    if session is None:
        return not_found_response("Session not found")

    return {
        "success": True,
        "message": "Meeting renamed successfully",
        "session": session,
    }


@router.delete("/sessions/{session_id}")
async def delete_session_hard(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    session_repository.hard_delete_session(ctx.db, ctx.user_id, session_id)
    return {"success": True, "message": "Meeting deleted successfully"}


@router.patch("/session/{session_id}/delete")
async def delete_session_soft(session_id: str, ctx: AuthContext = Depends(get_auth_context)):
    session = session_repository.soft_delete_session(ctx.db, ctx.user_id, session_id)

    if session is None:
        return not_found_response("Session not found")

    return {
        "success": True,
        "message": "Session deleted.",
        "session": session,
    }


@router.delete("/session/{session_id}/action-plan/{index}")
async def delete_action_plan(session_id: str, index: int, ctx: AuthContext = Depends(get_auth_context)):
    action_plans = session_repository.get_action_plan(ctx.db, ctx.user_id, session_id)

    if action_plans is None:
        raise_404("Session not found")

    if index < 0 or index >= len(action_plans):
        raise_404("Action plan not found")

    action_plans.pop(index)
    session_repository.set_action_plan(ctx.db, ctx.user_id, session_id, action_plans)

    return {"message": "Action plan deleted successfully"}


@router.put("/session/{session_id}/action-plan/{index}")
async def update_action_plan(
    session_id: str,
    index: int,
    updated_plan: ActionPlan,
    ctx: AuthContext = Depends(get_auth_context),
):
    action_plans = session_repository.get_action_plan(ctx.db, ctx.user_id, session_id)

    if action_plans is None:
        raise_404("Session not found")

    if index < 0 or index >= len(action_plans):
        raise_404("Action plan not found")

    action_plans[index] = updated_plan.model_dump()
    session_repository.set_action_plan(ctx.db, ctx.user_id, session_id, action_plans)

    return {"message": "Action plan updated successfully"}
