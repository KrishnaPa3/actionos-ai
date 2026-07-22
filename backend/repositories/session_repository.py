"""
Session data access.

The headline fix lives here: `list_sessions_with_tasks()` replaces the
old "1 session query + N task queries" pattern with a "1 session query
+ 1 bulk task query" pattern, grouped in Python. See main.py's original
GET /sessions handler for the pattern this replaces.
"""

from datetime import datetime, timezone
from typing import Any

from utils.timing import Stopwatch


def generate_meeting_name(uploaded_at: datetime | None = None) -> str:
    """Build a human-readable, timestamped name for an audio upload.

    The database session UUID and ``user_id`` remain the authoritative
    identifiers. Milliseconds make names distinct for normal concurrent
    uploads without requiring a read-before-write numbering query.
    """
    timestamp = uploaded_at or datetime.now(timezone.utc)
    timestamp = timestamp.astimezone(timezone.utc)
    return f"Untitled Meeting {timestamp.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} UTC"


def create_session(db: Any, payload: dict) -> dict:
    response = db.table("sessions").insert(payload).execute()
    return response.data[0]


def update_session_extraction(db: Any, user_id: str, session_id: str, structured_data: dict) -> None:
    (
        db
        .table("sessions")
        .update({
            "summary": structured_data.get("summary", []),
            "action_plan": structured_data.get("action_plans", []),
            "decisions": structured_data.get("decisions", []),
        })
        .eq("user_id", user_id)
        .eq("id", session_id)
        .execute()
    )


def list_sessions_with_tasks(db: Any, user_id: str, stopwatch: Stopwatch) -> list[dict]:
    """
    Optimized replacement for the original N+1 GET /sessions query.

    BEFORE:
        1 query  -> fetch sessions
        N queries -> for each session, fetch its actions individually
        Total: 1 + N queries (measured at ~1.6s for the reported dataset,
        with task queries alone accounting for ~1.5s)

    AFTER:
        1 query -> fetch sessions
        1 query -> fetch ALL actions for ALL those session ids in one go
        Grouping by session_id happens in Python (a single pass, O(sessions + actions)).
        Total: 2 queries, regardless of how many sessions the user has.

    Response shape is unchanged: each session dict still gets a "tasks"
    key containing exactly the same list of action rows it would have
    gotten before (same filters: user_id, session_id, deleted=False).
    """

    with stopwatch.track("Session query"):
        session_response = (
            db
            .table("session_dashboard")
            .select("*")
            .eq("user_id", user_id)
            .eq("deleted", False)
            .order("created_at", desc=True)
            .execute()
        )

    sessions = session_response.data
    session_ids = [session["id"] for session in sessions]

    with stopwatch.track("Task queries"):
        if session_ids:
            tasks_response = (
                db
                .table("actions")
                .select("*")
                .eq("user_id", user_id)
                .in_("session_id", session_ids)
                .eq("deleted", False)
                .execute()
            )
            tasks_by_session: dict[str, list[dict]] = {}
            for task in tasks_response.data:
                tasks_by_session.setdefault(task["session_id"], []).append(task)
        else:
            tasks_by_session = {}

    for session in sessions:
        session["tasks"] = tasks_by_session.get(session["id"], [])

    return sessions


def get_session(db: Any, user_id: str, session_id: str) -> dict | None:
    response = (
        db
        .table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", session_id)
        .execute()
    )
    return response.data[0] if response.data else None


def rename_session(db: Any, user_id: str, session_id: str, meeting_name: str) -> dict | None:
    response = (
        db
        .table("sessions")
        .update({
            "meeting_name": meeting_name,
            "updated_at": datetime.utcnow().isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", session_id)
        .execute()
    )
    return response.data[0] if response.data else None


def soft_delete_session(db: Any, user_id: str, session_id: str) -> dict | None:
    response = (
        db
        .table("sessions")
        .update({
            "deleted": True,
            "updated_at": datetime.utcnow().isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", session_id)
        .execute()
    )
    return response.data[0] if response.data else None


def hard_delete_session(db: Any, user_id: str, session_id: str) -> None:
    # Delete actions first (FK dependency), then the session itself.
    db.table("actions").delete().eq("user_id", user_id).eq("session_id", session_id).execute()
    db.table("sessions").delete().eq("user_id", user_id).eq("id", session_id).execute()


def get_action_plan(db: Any, user_id: str, session_id: str) -> list | None:
    response = (
        db.table("sessions")
        .select("action_plan")
        .eq("user_id", user_id)
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not response.data:
        return None
    return response.data.get("action_plan") or []


def set_action_plan(db: Any, user_id: str, session_id: str, action_plans: list) -> None:
    db.table("sessions").update({"action_plan": action_plans}).eq("user_id", user_id).eq(
        "id", session_id
    ).execute()
