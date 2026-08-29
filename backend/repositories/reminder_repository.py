"""
Reminder data access.
"""

from datetime import datetime, timedelta, timezone
from typing import Any


def create_reminder(db: Any, payload: dict) -> dict:
    response = db.table("reminders").insert(payload).execute()
    return response.data[0]


def create_default_reminder(
    db: Any,
    user_id: str,
    action_id: str,
    due_date: str | None,
    hours_before: int,
) -> None:
    """
    Schedule the automatic reminder for an action.

    Lead times differ by call site:
      - 1 hour before, when an action is created during upload
      - 24 hours before, when an action is reset back to "pending"

    ``due_date`` may be None. Tasks extracted from a recording that never
    mentions a deadline used to get no reminder at all, so they never appeared
    in the notification bell. They now get one dated now, and stay in the bell
    until the task is completed or deleted - there is no date for them to
    cross. Reminders are hidden from the bell once their due date passes; see
    routers/reminders.py.
    """

    now = datetime.now(timezone.utc)

    if due_date:
        due_time = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        reminder_time = due_time - timedelta(hours=hours_before)
        if reminder_time <= now:
            reminder_time = now + timedelta(minutes=1)
    else:
        # No deadline was stated: surface it immediately rather than not at all.
        reminder_time = now

    create_reminder(db, {
        "action_id": action_id,
        "reminder_time": reminder_time.isoformat(),
        "label": "Due Soon" if due_date else "No due date",
        "is_default": True,
        "dismissed": False,
        "user_id": user_id,
    })


def delete_reminders_for_action(db: Any, user_id: str, action_id: str) -> None:
    db.table("reminders").delete().eq("user_id", user_id).eq("action_id", action_id).execute()


def list_upcoming_reminders(db: Any, user_id: str) -> list[dict]:
    response = (
        db
        .table("reminders")
        .select("""
            *,
            actions(
                id,
                title,
                owner,
                priority,
                status,
                confirmed,
                deleted,
                due_date,
                session_id,
                sessions(
                    meeting_name
                )
            )
        """)
        .eq("user_id", user_id)
        .eq("dismissed", False)
        # The notification bell must show newly-created automatic reminders
        # even when their task is due more than 24 hours from now.
        .order("reminder_time")
        .execute()
    )
    return response.data


def get_action_reminders(db: Any, user_id: str, action_id: str) -> list[dict]:
    response = (
        db
        .table("reminders")
        .select("*")
        .eq("user_id", user_id)
        .eq("action_id", action_id)
        .order("reminder_time")
        .execute()
    )
    return response.data


def update_reminder_time(db: Any, user_id: str, reminder_id: str, reminder_time: str) -> dict | None:
    response = (
        db
        .table("reminders")
        .update({
            "reminder_time": reminder_time,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", reminder_id)
        .execute()
    )
    return response.data[0] if response.data else None


def snooze_reminder(db: Any, user_id: str, reminder_id: str, new_time: datetime) -> dict | None:
    now = datetime.now(timezone.utc)
    response = (
        db
        .table("reminders")
        .update({
            "reminder_time": new_time.isoformat(),
            "dismissed": False,
            "updated_at": now.isoformat(),
        })
        .eq("user_id", user_id)
        .eq("id", reminder_id)
        .execute()
    )
    return response.data[0] if response.data else None


def delete_reminder(db: Any, user_id: str, reminder_id: str) -> None:
    db.table("reminders").delete().eq("user_id", user_id).eq("id", reminder_id).execute()
