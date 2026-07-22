"""
Risk data access.
"""

from datetime import datetime, timezone
from typing import Any


def create_risk(db: Any, payload: dict) -> dict:
    response = db.table("risks").insert(payload).execute()
    return response.data[0]


def get_session_risks(db: Any, user_id: str, session_id: str) -> list[dict]:
    response = (
        db
        .table("risks")
        .select("*")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )
    return response.data


def update_risk_fields(db: Any, user_id: str, risk_id: str, fields: dict) -> dict | None:
    response = (
        db
        .table("risks")
        .update(fields)
        .eq("user_id", user_id)
        .eq("id", risk_id)
        .execute()
    )
    return response.data[0] if response.data else None


def get_risk(db: Any, user_id: str, risk_id: str) -> dict | None:
    response = (
        db
        .table("risks")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", risk_id)
        .execute()
    )
    return response.data[0] if response.data else None


def toggle_risk_status(db: Any, user_id: str, risk_id: str, new_status: str) -> dict | None:
    response = (
        db
        .table("risks")
        .update({
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", risk_id)
        .execute()
    )
    return response.data[0] if response.data else None


def soft_delete_risk(db: Any, user_id: str, risk_id: str) -> dict | None:
    """
    Same redundant-SELECT elimination as `soft_delete_action`: the
    original fetched the row first purely to 404-check, then issued the
    UPDATE. The UPDATE's own (empty-or-not) result is a sufficient
    existence check on its own.
    """
    response = (
        db
        .table("risks")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", risk_id)
        .execute()
    )
    return response.data[0] if response.data else None
