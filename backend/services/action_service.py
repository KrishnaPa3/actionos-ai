from datetime import datetime

from services.date_service import resolve_due_date


def build_action_payload(
    task: dict,
    session_id: str,
    meeting_datetime
):
    """
    Converts an extracted AI task into an ActionOS action.

    Priority:
    1. Use AI-resolved due_date_iso if available.
    2. Otherwise fall back to date_service.
    """

    title = (
        task.get("title")
        or task.get("task")
        or "Untitled Task"
    )

    # ---------------------------------------
    # Original natural language
    # ---------------------------------------

    due_text = task.get("due_text")

    # Backwards compatibility with older prompts
    if due_text is None:
        due_text = task.get("due_date")

    # ---------------------------------------
    # Prefer AI-resolved datetime
    # ---------------------------------------

    due_date = None

    due_date_iso = task.get("due_date_iso")

    if due_date_iso:

        try:

            due_date = datetime.fromisoformat(
                due_date_iso
            )

        except Exception:

            due_date = None

    # ---------------------------------------
    # Fall back to Python resolver
    # ---------------------------------------

    if due_date is None and due_text:

        due_date = resolve_due_date(
            due_text,
            meeting_datetime
        )

    return {

        "session_id": session_id,

        "title": title,

        "description": task.get("description"),

        "owner": task.get(
            "owner",
            "Unknown"
        ),

        "priority": task.get(
            "priority",
            "medium"
        ),

        "status": "pending",

        # Original user wording
        "due_text": due_text,

        # Normalized datetime
        "due_date": (
            due_date.isoformat()
            if due_date
            else None
        ),

        "confidence": task.get(
            "confidence",
            1.0
        ),

        "speaker_id": task.get("speaker_id"),

        "speaker_name": task.get("speaker_name")

    }
def build_risk_payload(risk, session_id):
    return {
        "session_id": session_id,
        "title": risk.get("title", ""),
        "impact": risk.get("impact"),
        "mitigation": risk.get("mitigation"),
        "risk_score": risk.get("risk_score", 0),
        "confidence": risk.get("confidence", 0.0),
        "status": "Open"
    }