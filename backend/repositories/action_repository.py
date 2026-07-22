"""
Action (task) data access.
"""

from datetime import datetime, timezone
from typing import Any


def create_action(db: Any, payload: dict) -> dict:
    response = db.table("actions").insert(payload).execute()
    return response.data[0]


def get_session_actions(db: Any, user_id: str, session_id: str) -> list[dict]:
    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )
    return response.data


def list_actions(db: Any, user_id: str, filters: dict) -> list[dict]:
    """
    Builds the filtered /actions listing query. `filters` carries the
    same optional parameters the original endpoint accepted
    (search, priority, status, owner, session, date_mode, date, end),
    with identical filtering semantics.
    """

    query = (
        db
        .table("actions")
        .select("""
            *,
            sessions (
                id,
                meeting_name
            )
        """)
        .eq("user_id", user_id)
        .eq("deleted", False)
    )

    if filters.get("priority"):
        query = query.eq("priority", filters["priority"])

    if filters.get("status"):
        query = query.eq("status", filters["status"])

    if filters.get("owner"):
        query = query.eq("owner", filters["owner"])

    if filters.get("session"):
        query = query.eq("session_id", filters["session"])

    search = (filters.get("search") or "").strip()
    if search:
        # Search task content as well as the source meeting shown in the list.
        # Escape SQL LIKE metacharacters so a user's '%' or '_' is treated as
        # text rather than unexpectedly matching every task.
        escaped_search = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped_search}%"
        search_conditions = [
            f"title.ilike.{pattern}",
            f"description.ilike.{pattern}",
            f"owner.ilike.{pattern}",
        ]

        matching_sessions = (
            db
            .table("sessions")
            .select("id")
            .eq("user_id", user_id)
            .ilike("meeting_name", pattern)
            .execute()
        )
        matching_session_ids = [row["id"] for row in matching_sessions.data]
        if matching_session_ids:
            search_conditions.append(f"session_id.in.({','.join(matching_session_ids)})")

        query = query.or_(",".join(search_conditions))

    date_mode = filters.get("date_mode")
    date = filters.get("date")

    if date_mode and date:
        selected_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        start_of_day = selected_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = selected_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        if date_mode == "on":
            query = query.gte("due_date", start_of_day.isoformat()).lte(
                "due_date", end_of_day.isoformat()
            )
        elif date_mode == "before":
            query = query.lt("due_date", start_of_day.isoformat())
        elif date_mode == "after":
            query = query.gt("due_date", end_of_day.isoformat())
        elif date_mode == "between" and filters.get("end"):
            end_date = datetime.strptime(filters["end"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_of_range = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.gte("due_date", start_of_day.isoformat()).lte(
                "due_date", end_of_range.isoformat()
            )

    response = query.order("created_at", desc=True).execute()
    return response.data


def get_action(db: Any, user_id: str, action_id: str) -> dict | None:
    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", action_id)
        .execute()
    )
    return response.data[0] if response.data else None


def update_action_fields(db: Any, user_id: str, action_id: str, fields: dict) -> dict | None:
    response = (
        db
        .table("actions")
        .update(fields)
        .eq("user_id", user_id)
        .eq("id", action_id)
        .execute()
    )
    return response.data[0] if response.data else None


def soft_delete_action(db: Any, user_id: str, action_id: str) -> dict | None:
    """
    Soft-delete an action.

    Originally this did a SELECT to check existence, then an UPDATE.
    Since the UPDATE is already scoped by the same user_id/id filters,
    an empty `response.data` after the UPDATE means "didn't exist"
    just as reliably as the old pre-check did - so we drop the redundant
    SELECT (Phase 2: "if an UPDATE returns the updated row, use it
    instead of querying again").
    """
    response = (
        db
        .table("actions")
        .update({"deleted": True})
        .eq("user_id", user_id)
        .eq("id", action_id)
        .execute()
    )
    return response.data[0] if response.data else None


def list_owners_and_sessions(db: Any, user_id: str) -> tuple[list[str], list[dict]]:
    """Backing query pair for GET /actions/filters."""
    owner_response = (
        db
        .table("actions")
        .select("owner")
        .eq("user_id", user_id)
        .eq("deleted", False)
        .execute()
    )
    owners = sorted({row["owner"] for row in owner_response.data if row.get("owner")})

    session_response = (
        db
        .table("sessions")
        .select("id, meeting_name")
        .eq("user_id", user_id)
        .order("meeting_name")
        .execute()
    )

    return owners, session_response.data
