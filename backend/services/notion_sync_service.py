"""
Notion sync helpers.

Consolidates the repeated try/except-and-log pattern that wrapped every
Notion call in main.py (a Notion failure should never fail the parent
request - it just gets logged). The one exception is `confirm_action`
in the original code, which DOES raise an HTTPException if Notion task
creation fails (since confirming *is* the sync operation, not a
side-effect of something else) - that behaviour is preserved by keeping
`create_task_or_raise` separate from the "best effort" helpers below.
"""

from typing import Any


def update_status_best_effort(notion_service: Any, page_id: str, status: str) -> None:
    try:
        notion_service.update_task_status(page_id=page_id, action_status=status)
    except Exception as e:
        print(f"Failed to update Notion status: {e}")


def update_task_best_effort(notion_service: Any, action: dict) -> None:
    try:
        notion_service.update_task(
            page_id=action["notion_page_id"],
            title=action["title"],
            owner=action["owner"],
            due_date=action["due_date"],
            priority=action["priority"],
            summary=action.get("description") or "",
            session_link=None,
            status=action["status"],
        )
    except Exception as e:
        print(f"Failed to update Notion task: {e}")


def create_task_or_raise(notion_service: Any, action: dict) -> dict:
    """
    Used by /actions/{id}/confirm, where Notion creation is the point of
    the request - a failure here must surface as a 500, matching the
    original behaviour exactly.
    """
    from fastapi import HTTPException

    try:
        return notion_service.create_task(
            title=action["title"],
            owner=action["owner"],
            due_date=action["due_date"],
            priority=action["priority"],
            summary=action.get("description") or "",
            session_link=None,
            status=action["status"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync with Notion: {str(e)}")
