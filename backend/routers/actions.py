"""
Action (task) endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from dependencies.database import AuthContext, get_auth_context
from repositories import action_repository, reminder_repository
from schemas.requests import ReminderCreate, UpdateActionRequest
from utils.errors import raise_404

router = APIRouter()


@router.get("/actions")
async def get_all_actions(
    search: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    owner: str | None = None,
    session: str | None = None,
    date_mode: str | None = None,
    date: str | None = None,
    end: str | None = None,
    ctx: AuthContext = Depends(get_auth_context),
):
    filters = {
        "search": search,
        "priority": priority,
        "status": status,
        "owner": owner,
        "session": session,
        "date_mode": date_mode,
        "date": date,
        "end": end,
    }
    actions = action_repository.list_actions(ctx.db, ctx.user_id, filters)

    return {
        "success": True,
        "count": len(actions),
        "actions": actions,
    }


@router.get("/actions/filters")
async def get_action_filters(ctx: AuthContext = Depends(get_auth_context)):
    owners, sessions = action_repository.list_owners_and_sessions(ctx.db, ctx.user_id)
    return {"owners": owners, "sessions": sessions}


@router.patch("/actions/{action_id}")
async def update_action(
    action_id: str,
    request: UpdateActionRequest,
    ctx: AuthContext = Depends(get_auth_context),
):
    action = action_repository.update_action_fields(
        ctx.db,
        ctx.user_id,
        action_id,
        {
            "title": request.title,
            "owner": request.owner,
            "due_date": request.due_date,
            "priority": request.priority,
            "description": request.description,
        },
    )

    if action is None:
        raise_404("Task not found")

    return {"success": True, "message": "Task updated", "action": action}


@router.delete("/actions/{action_id}")
async def delete_action(action_id: str, ctx: AuthContext = Depends(get_auth_context)):
    action = action_repository.soft_delete_action(ctx.db, ctx.user_id, action_id)

    if action is None:
        raise_404("Task not found")

    reminder_repository.delete_reminders_for_action(ctx.db, ctx.user_id, action_id)

    return {"success": True, "message": "Task deleted", "action": action}


@router.patch("/actions/{action_id}/complete")
async def complete_action(
    action_id: str,
    ctx: AuthContext = Depends(get_auth_context),
):
    action = action_repository.get_action(ctx.db, ctx.user_id, action_id)

    if action is None:
        raise_404("Task not found")

    new_status = "completed" if action["status"] == "pending" else "pending"

    update_data = {
        "status": new_status,
        "completed_at": (
            datetime.now(timezone.utc).isoformat() if new_status == "completed" else None
        ),
    }

    updated_action = action_repository.update_action_fields(ctx.db, ctx.user_id, action_id, update_data)

    if new_status == "completed":
        reminder_repository.delete_reminders_for_action(ctx.db, ctx.user_id, action_id)
    elif new_status == "pending" and action.get("due_date"):
        try:
            reminder_repository.create_default_reminder(
                ctx.db, ctx.user_id, action_id, action["due_date"], hours_before=24
            )
        except Exception as e:
            print("Reminder creation failed:", e)

    return {
        "success": True,
        "message": f"Task marked as {new_status}",
        "action": updated_action,
    }


@router.patch("/actions/{action_id}/confirm")
async def confirm_action(
    action_id: str,
    ctx: AuthContext = Depends(get_auth_context),
):
    action = action_repository.get_action(ctx.db, ctx.user_id, action_id)

    if action is None:
        raise_404("Task not found")

    if action["confirmed"]:
        return {
            "success": True,
            "message": "Task already confirmed.",
            "action": action,
        }

    updated_action = action_repository.update_action_fields(
        ctx.db,
        ctx.user_id,
        action_id,
        {
            "confirmed": True,
        },
    )

    reminder_repository.delete_reminders_for_action(ctx.db, ctx.user_id, action_id)

    return {
        "success": True,
        "message": "Task confirmed.",
        "action": updated_action,
    }


@router.get("/actions/{action_id}/reminders")
async def get_action_reminders(action_id: str, ctx: AuthContext = Depends(get_auth_context)):
    action = action_repository.get_action(ctx.db, ctx.user_id, action_id)
    if not action or action.get("deleted") is True or action.get("status") == "completed" or action.get("confirmed") is True:
        return {"reminders": []}
    reminders = reminder_repository.get_action_reminders(ctx.db, ctx.user_id, action_id)
    return {"reminders": reminders}


@router.post("/actions/{action_id}/reminders")
async def create_reminder(
    action_id: str,
    reminder: ReminderCreate,
    ctx: AuthContext = Depends(get_auth_context),
):
    created = reminder_repository.create_reminder(ctx.db, {
        "action_id": action_id,
        "label": reminder.label,
        "reminder_time": reminder.reminder_time,
        "dismissed": False,
        "is_default": False,
        "user_id": ctx.user_id,
    })
    return created
