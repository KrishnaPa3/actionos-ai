"""
Decision data access.
"""

from datetime import datetime, timezone
from typing import Any


def create_decision(db: Any, payload: dict) -> dict:
    response = db.table("decisions").insert(payload).execute()
    return response.data[0]


def list_decisions(db: Any, user_id: str) -> list[dict]:
    response = (
        db
        .table("decisions")
        .select("""
            *,
            sessions(
                meeting_name
            )
        """)
        .eq("user_id", user_id)
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def get_session_decisions(db: Any, user_id: str, session_id: str) -> list[dict]:
    response = (
        db
        .table("decisions")
        .select("*")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )
    return response.data


def update_decision_fields(db: Any, user_id: str, decision_id: str, fields: dict) -> dict | None:
    response = (
        db
        .table("decisions")
        .update(fields)
        .eq("user_id", user_id)
        .eq("id", decision_id)
        .execute()
    )
    return response.data[0] if response.data else None


def set_decision_status(db: Any, user_id: str, decision_id: str, status: str) -> dict | None:
    return update_decision_fields(
        db,
        user_id,
        decision_id,
        {"decision_status": status, "updated_at": datetime.now(timezone.utc).isoformat()},
    )


def soft_delete_decision(db: Any, user_id: str, decision_id: str) -> dict | None:
    """
    Original did SELECT (existence check) -> UPDATE (soft delete).
    Collapsed into a single UPDATE whose emptiness is the 404 signal,
    same as `soft_delete_action` / `soft_delete_risk`.
    """
    response = (
        db
        .table("decisions")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", decision_id)
        .execute()
    )
    return response.data[0] if response.data else None
