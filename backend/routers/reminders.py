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


@router.get("/reminders")
async def get_reminders(ctx: AuthContext = Depends(get_auth_context)):
    raw_reminders = reminder_repository.list_upcoming_reminders(ctx.db, ctx.user_id)

    reminders = []
    for reminder in raw_reminders:
        action = reminder.get("actions") or {}
        session = action.get("sessions") or {}

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
