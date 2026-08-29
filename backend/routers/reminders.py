"""
Reminder endpoints.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from dependencies.database import AuthContext, get_auth_context
from repositories import reminder_repository
from schemas.requests import ReminderUpdate, SnoozeRequest
from utils.errors import raise_404

router = APIRouter()


def _due_date_has_passed(due_date: str | None) -> bool:
    """True when the task's deadline is in the past.

    A reminder stays in the bell from the moment it is created until its
    task's due date is crossed. A task with no due date has nothing to cross,
    so it stays until the task is completed or deleted.

    Unparseable dates count as not passed: hiding a reminder because of a
    formatting quirk is worse than showing one a little too long.
    """
    if not due_date:
        return False

    try:
        due = datetime.fromisoformat(str(due_date).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return False

    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)

    return due < datetime.now(timezone.utc)


@router.get("/reminders")
async def get_reminders(ctx: AuthContext = Depends(get_auth_context)):
    raw_reminders = reminder_repository.list_upcoming_reminders(ctx.db, ctx.user_id)

    reminders = []
    stale_ids = []

    for reminder in raw_reminders:
        action = reminder.get("actions") or {}
        session = action.get("sessions") or {}

        # Reminders whose task is gone or finished are stale: drop them and
        # clean them up.
        if (
            not action
            or not action.get("id")
            or action.get("deleted") is True
            or action.get("status") == "completed"
            or action.get("confirmed") is True
        ):
            if reminder.get("id"):
                stale_ids.append(reminder["id"])
            continue

        # Past its deadline: hide it from the bell, but do NOT delete it. The
        # task still exists and the user may reopen or reschedule it, and a GET
        # should not destroy data.
        if _due_date_has_passed(action.get("due_date")):
            continue

        reminders.append({
            "id": reminder["id"],
            "action_id": action.get("id"),
            "session_id": action.get("session_id"),
            "title": action.get("title"),
            "owner": action.get("owner"),
            "priority": action.get("priority"),
            "status": action.get("status"),
            "due_date": action.get("due_date"),
            "reminder_time": reminder["reminder_time"],
            "label": reminder.get("label"),
            "meeting_name": session.get("meeting_name"),
            "is_default": reminder.get("is_default", False),
        })

    if stale_ids:
        try:
            ctx.db.table("reminders").delete().in_("id", stale_ids).execute()
        except Exception as e:
            print(f"[REMINDERS] Failed to clean up stale reminders: {e}")

    return reminders


@router.patch("/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    reminder: ReminderUpdate,
    ctx: AuthContext = Depends(get_auth_context),
):
    updated = reminder_repository.update_reminder_time(
        ctx.db, ctx.user_id, reminder_id, reminder.reminder_time
    )

    if updated is None:
        raise_404("Reminder not found")

    return updated


@router.post("/reminders/{reminder_id}/snooze")
async def snooze_reminder(
    reminder_id: str,
    request: SnoozeRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    now = datetime.now(timezone.utc)

    if request.duration == "15m":
        new_time = now + timedelta(minutes=15)
    elif request.duration == "30m":
        new_time = now + timedelta(minutes=30)
    elif request.duration == "1h":
        new_time = now + timedelta(hours=1)
    elif request.duration == "tomorrow":
        tomorrow = now + timedelta(days=1)
        new_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
    elif request.duration == "custom":
        if not request.custom_time:
            raise HTTPException(status_code=400, detail="custom_time required")
        new_time = datetime.fromisoformat(request.custom_time.replace("Z", "+00:00"))
    else:
        raise HTTPException(status_code=400, detail="Invalid snooze option")

    updated = reminder_repository.snooze_reminder(ctx.db, ctx.user_id, reminder_id, new_time)
    return updated


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, ctx: AuthContext = Depends(get_auth_context)):
    reminder_repository.delete_reminder(ctx.db, ctx.user_id, reminder_id)
    return {"success": True}
