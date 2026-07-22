"""
Decision endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from dependencies.database import AuthContext, get_auth_context
from repositories import decision_repository
from schemas.requests import UpdateDecisionRequest
from utils.errors import raise_404

router = APIRouter()


@router.get("/decisions")
async def get_all_decisions(ctx: AuthContext = Depends(get_auth_context)):
    decisions = decision_repository.list_decisions(ctx.db, ctx.user_id)
    return {"success": True, "count": len(decisions), "decisions": decisions}


@router.patch("/decisions/{decision_id}")
async def update_decision(
    decision_id: str,
    request: UpdateDecisionRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    decision = decision_repository.update_decision_fields(
        ctx.db,
        ctx.user_id,
        decision_id,
        {
            "title": request.title,
            "reason": request.reason,
            "confidence": request.confidence,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    if decision is None:
        raise_404("Decision not found")

    return {"success": True, "message": "Decision updated", "decision": decision}


@router.patch("/decisions/{decision_id}/accept")
async def accept_decision(decision_id: str, ctx: AuthContext = Depends(get_auth_context)):
    decision = decision_repository.set_decision_status(ctx.db, ctx.user_id, decision_id, "accepted")

    if decision is None:
        raise_404("Decision not found")

    return {"success": True, "decision": decision}


@router.patch("/decisions/{decision_id}/reject")
async def reject_decision(decision_id: str, ctx: AuthContext = Depends(get_auth_context)):
    decision = decision_repository.set_decision_status(ctx.db, ctx.user_id, decision_id, "rejected")

    if decision is None:
        raise_404("Decision not found")

    return {"success": True, "decision": decision}


@router.delete("/decisions/{decision_id}")
async def delete_decision(decision_id: str, ctx: AuthContext = Depends(get_auth_context)):
    decision = decision_repository.soft_delete_decision(ctx.db, ctx.user_id, decision_id)

    if decision is None:
        raise_404("Decision not found")

    return {"success": True, "message": "Decision deleted", "decision": decision}
