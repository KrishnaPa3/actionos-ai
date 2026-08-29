"""
Meeting extraction pipeline.

This is STEP 2-6 of the original /upload-audio handler, pulled out so
the router only orchestrates the high-level flow (save file -> upload
to storage -> transcribe -> create session -> run this pipeline)
instead of containing ~250 lines of inline logic. No business rules
changed: same extraction call, same session update, same per-task
action + default-reminder creation, same risk/decision inserts.
"""

from datetime import datetime
from typing import Any

from services.extraction_service import extract_structured_data
from services.action_service import build_action_payload, build_risk_payload

from repositories import action_repository, decision_repository, reminder_repository, risk_repository
from repositories.session_repository import update_session_extraction


def extract_from_transcript(transcript: str, session_created_at: datetime) -> dict:
    """STEP 2: run extraction, or return the same empty shape the
    original code returned for a blank transcript."""
    if not transcript:
        return {
            "summary": [],
            "tasks": [],
            "action_plans": [],
            "decisions": [],
            "risks": [],
        }

    return extract_structured_data(transcript, session_created_at)


def save_extraction_results(
    db: Any,
    user: dict,
    session_id: str,
    session_created_at: datetime,
    structured_data: dict,
) -> None:
    """STEPS 3-6: persist summary/action_plan/decisions onto the session,
    then create actions (+ default reminders), risks, and decisions."""

    user_id = user["id"]

    # STEP 3 - update session with extraction
    update_session_extraction(db, user_id, session_id, structured_data)

    # STEP 4 - save actions (+ a default reminder for every task)
    for task in structured_data.get("tasks", []):
        if not isinstance(task, dict):
            task = {"task": str(task)}

        action_payload = build_action_payload(task, session_id, session_created_at)
        action_payload["user_id"] = user_id

        new_action = action_repository.create_action(db, action_payload)

        # Every task gets a reminder, including ones with no stated deadline.
        # Previously this was gated on a due date, so a recording that named
        # tasks without deadlines produced an empty notification bell.
        try:
            reminder_repository.create_default_reminder(
                db, user_id, new_action["id"], new_action.get("due_date"), hours_before=1
            )
        except Exception as e:
            print("Reminder creation failed:", e)

    # STEP 5 - save risks
    for risk in structured_data.get("risks", []):
        if not isinstance(risk, dict):
            continue

        risk_payload = build_risk_payload(risk, session_id)
        risk_payload["user_id"] = user_id
        risk_repository.create_risk(db, risk_payload)

    # STEP 6 - save decisions
    for decision in structured_data.get("decisions", []):
        if not isinstance(decision, dict):
            continue

        decision_payload = {
            "session_id": session_id,
            "title": decision.get("title", ""),
            "reason": decision.get("reason", ""),
            "confidence": decision.get("confidence", 0.0),
            "decision_status": "pending",
            "user_id": user_id,
        }
        decision_repository.create_decision(db, decision_payload)
