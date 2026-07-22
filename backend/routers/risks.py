"""
Risk endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from dependencies.database import AuthContext, get_auth_context
from repositories import risk_repository
from schemas.requests import UpdateRiskRequest
from utils.errors import raise_404

router = APIRouter()


@router.patch("/risks/{risk_id}")
async def update_risk(
    risk_id: str,
    request: UpdateRiskRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    risk = risk_repository.update_risk_fields(
        ctx.db,
        ctx.user_id,
        risk_id,
        {
            "title": request.title,
            "impact": request.impact,
            "mitigation": request.mitigation,
            "risk_score": request.risk_score,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    if risk is None:
        raise_404("Risk not found")

    return {"success": True, "message": "Risk updated", "risk": risk}


@router.patch("/risks/{risk_id}/resolve")
async def resolve_risk(risk_id: str, ctx: AuthContext = Depends(get_auth_context)):
    risk = risk_repository.get_risk(ctx.db, ctx.user_id, risk_id)

    if risk is None:
        raise_404("Risk not found")

    new_status = "Resolved" if risk["status"] == "Open" else "Open"
    updated = risk_repository.toggle_risk_status(ctx.db, ctx.user_id, risk_id, new_status)

    return {"success": True, "message": f"Risk marked as {new_status}", "risk": updated}


@router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str, ctx: AuthContext = Depends(get_auth_context)):
    risk = risk_repository.soft_delete_risk(ctx.db, ctx.user_id, risk_id)

    if risk is None:
        raise_404("Risk not found")

    return {"success": True, "message": "Risk deleted", "risk": risk}
