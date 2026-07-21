from services.extraction_service import extract_structured_data
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
from faster_whisper import WhisperModel
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from services.date_service import resolve_due_date
from services.action_service import build_action_payload, build_risk_payload
from services.whisperx_service import transcribe_with_speakers
from services.notion_service import NotionService
from dependencies.auth import get_current_user
from auth_supabase import get_authenticated_supabase

import shutil
import os
import uuid
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

print("Loading Whisper model...")

whisper_model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

print("Whisper model loaded!")
notion_service = NotionService()

# ----------------------------------------------------
# Helper Function
# ----------------------------------------------------

def generate_meeting_name(user_id: str):

    response = (
        supabase
        .table("sessions")
        .select("meeting_name")
        .eq("user_id", user_id)
        .execute()
    )

    names = []

    for row in response.data:

        name = row.get("meeting_name")

        if name:
            names.append(name)

    used_numbers = set()

    for name in names:

        if name == "Untitled Meeting":
            used_numbers.add(1)

        else:

            match = re.match(
                r"Untitled Meeting (\d+)$",
                name
            )

            if match:
                used_numbers.add(
                    int(match.group(1))
                )

    number = 1

    while number in used_numbers:
        number += 1

    if number == 1:
        return "Untitled Meeting"

    return f"Untitled Meeting {number}"


@app.get("/")
def root():
    return {
        "message": "ActionOS Backend Running"
    }


@app.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):

    print("\n\nUPLOAD ENDPOINT HIT\n\n")

    from auth_supabase import get_authenticated_supabase

    # Authenticated database client (RLS-aware)
    db = get_authenticated_supabase(user["access_token"])

    print("\n==============================")
    print("NEW AUDIO UPLOAD")
    print("==============================")

    unique_name = f"{uuid.uuid4()}_{file.filename}"

    file_path = os.path.join(
        UPLOAD_DIR,
        unique_name
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_url = None

    try:

        print("Uploading audio to Supabase Storage...")

        with open(file_path, "rb") as audio_file:

            storage_response = (
                supabase
                .storage
                .from_("audio-files")
                .upload(
                    path=unique_name,
                    file=audio_file,
                    file_options={
                        "content-type": file.content_type
                    }
                )
            )

        print(storage_response)

        audio_url = (
            supabase
            .storage
            .from_("audio-files")
            .get_public_url(unique_name)
        )

        print("Audio uploaded successfully!")

    except Exception:

        import traceback
        traceback.print_exc()

    print("\nRunning Whisper...")

    segments, info = whisper_model.transcribe(file_path)

    transcript = " ".join(
        segment.text
        for segment in segments
    ).strip()

    _, speaker_transcript = transcribe_with_speakers(file_path)

    print("========== SPEAKER TRANSCRIPT ==========")
    print(speaker_transcript)
    print("========================================")
    print("Whisper complete!")

    meeting_name = generate_meeting_name(user["id"])

    print("\n========== CREATING SESSION ==========")

    session_id = None
    session_created_at = None

    try:

        # --------------------------------------------------
        # STEP 1 - Create session FIRST
        # --------------------------------------------------

        empty_payload = {

            "meeting_name": meeting_name,

            "audio_url": audio_url,

            "transcript": transcript,

            "speaker_transcript": speaker_transcript,

            "summary": [],

            "action_plan": [],

            "archived": False,

            "deleted": False,

            "user_id": user["id"],

        }

        print("\n========== SESSION PAYLOAD ==========")
        print(empty_payload)
        print("Authenticated user:", user)
        print("User ID:", user["id"])
        print("=====================================\n")

        # Use authenticated DB client
        response = (
            db
            .table("sessions")
            .insert(empty_payload)
            .execute()
        )

        session = response.data[0]

        session_id = session["id"]

        session_created_at = datetime.fromisoformat(
            session["created_at"].replace("Z", "+00:00")
        )

        print(f"Session UUID: {session_id}")
        print(f"Meeting Timestamp: {session_created_at}")

        # --------------------------------------------------
        # STEP 2 - Extract using meeting timestamp
        # --------------------------------------------------

        if not transcript:

            structured_data = {

                "summary": [],

                "tasks": [],

                "action_plans": [],

                "decisions": [],

                "risks": []

            }

        else:

            structured_data = extract_structured_data(
                transcript,
                session_created_at
            )

                # --------------------------------------------------
        # STEP 3 - Update session with extraction
        # --------------------------------------------------

        (
            db
            .table("sessions")
            .update({

                "summary": structured_data.get(
                    "summary",
                    []
                ),

                "action_plan": structured_data.get(
                    "action_plans",
                    []
                ),

                "decisions": structured_data.get(
                    "decisions",
                    []
                )

            })
            .eq("user_id", user["id"])
            .eq("id", session_id)
            .execute()
        )

        # --------------------------------------------------
        # STEP 4 - Save actions
        # --------------------------------------------------

        tasks = structured_data.get("tasks", [])

        for task in tasks:

            if not isinstance(task, dict):

                task = {
                    "task": str(task)
                }

            action_payload = build_action_payload(

                task,

                session_id,

                session_created_at,

            )

            action_payload["user_id"] = user["id"]

            action_response = (
                db
                .table("actions")
                .insert(action_payload)
                .execute()
            )

            new_action = action_response.data[0]

            print("\n========================")
            print("NEW ACTION")
            print("========================")
            print(new_action)

            # ------------------------------------------
            # Create default reminder (1 hour before)
            # ------------------------------------------

            if new_action.get("due_date"):

                print("CREATING DEFAULT REMINDER...")

                try:

                    due_time = datetime.fromisoformat(
                        new_action["due_date"].replace("Z", "+00:00")
                    )

                    reminder_time = due_time - timedelta(hours=1)

                    now = datetime.now(timezone.utc)

                    # If reminder would already be in the past,
                    # schedule it 1 minute from now.
                    if reminder_time <= now:

                        reminder_time = (
                            now + timedelta(minutes=1)
                        )

                    (
                        db
                        .table("reminders")
                        .insert({
                            "action_id": new_action["id"],
                            "reminder_time": reminder_time.isoformat(),
                            "label": "Due Soon",
                            "is_default": True,
                            "user_id": user["id"],
                        })
                        .execute()
                    )

                    print("Default reminder created.")

                except Exception as e:

                    print(
                        "Reminder creation failed:",
                        e
                    )

        # --------------------------------------------------
        # STEP 5 - Save risks
        # --------------------------------------------------

        risks = structured_data.get("risks", [])

        for risk in risks:

            if not isinstance(risk, dict):
                continue

            risk_payload = build_risk_payload(
                risk,
                session_id,
            )

            risk_payload["user_id"] = user["id"]

            (
                db
                .table("risks")
                .insert(risk_payload)
                .execute()
            )

        # --------------------------------------------------
        # STEP 6 - Save decisions
        # --------------------------------------------------

        decisions = structured_data.get("decisions", [])

        for decision in decisions:

            if not isinstance(decision, dict):
                continue

            decision_payload = {

                "session_id": session_id,

                "title": decision.get("title", ""),

                "reason": decision.get("reason", ""),

                "confidence": decision.get("confidence", 0.0),

                "decision_status": "pending",

                "user_id": user["id"],

            }

            (
                db
                .table("decisions")
                .insert(decision_payload)
                .execute()
            )

    except Exception as e:

        import traceback
        traceback.print_exc()

        return {
            "success": False,
            "message": "Failed to save meeting.",
            "error": str(e),
        }

    finally:

        try:
            os.remove(file_path)
        except Exception:
            pass

    return {

        "success": True,

        "id": session_id,

        "meeting_name": meeting_name,

        "filename": unique_name,

        "audio_url": audio_url,

        "transcript": transcript,

        "extraction": structured_data

    }        
# ----------------------------------------------------
# Request Models
# ----------------------------------------------------

class ExtractRequest(BaseModel):
    transcript: str
    meeting_datetime: datetime


class RenameMeetingRequest(BaseModel):
    meeting_name: str

class UpdateActionRequest(BaseModel):
    title: str
    owner: str
    due_date: str | None = None
    priority: str
    description: str | None = None
class UpdateRiskRequest(BaseModel):
    title: str
    impact: str | None = None
    mitigation: str | None = None
    risk_score: int
class UpdateDecisionRequest(BaseModel):
    title: str
    reason: str | None = None
    confidence: float
class ReminderCreate(BaseModel):
    label: str
    reminder_time: str
class ReminderUpdate(BaseModel):
    reminder_time: str
class SnoozeRequest(BaseModel):
    duration: str
    custom_time: str | None = None

# ----------------------------------------------------
# Extract Endpoint
# ----------------------------------------------------

@app.post("/extract")
async def extract_text(request: ExtractRequest, user=Depends(get_current_user),):

    if not request.transcript.strip():

        return {

            "summary": [],

            "tasks": [],

           

            "action_plans": [],

            "decisions": [],

            "risks": []

        }

    return extract_structured_data(
        transcript=request.transcript,
        meeting_datetime=request.meeting_datetime
    )


# ----------------------------------------------------
# Get Single Session
# ----------------------------------------------------

@app.get("/session/{session_id}")
async def get_session(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("sessions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .execute()
    )

    if len(response.data) == 0:

        return {

            "success": False,

            "error": "Session not found"

        }

    return response.data[0]


@app.get("/session/{session_id}/actions")
async def get_session_actions(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )

    return {
        "success": True,
        "actions": response.data
    }

from typing import Optional

@app.get("/actions")
async def get_all_actions(
    search: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    owner: str | None = None,
    session: str | None = None,
    date_mode: str | None = None,
    date: str | None = None,
    end: str | None = None,
    user=Depends(get_current_user),

):

    db = get_authenticated_supabase(user["access_token"])

    # Build base query
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
        .eq("user_id", user["id"])
        .eq("deleted", False)
    )

    # -----------------------------
    # Standard Filters
    # -----------------------------

    if priority:
        query = query.eq("priority", priority)

    if status:
        query = query.eq("status", status)

    if owner:
        query = query.eq("owner", owner)

    if session:
        query = query.eq("session_id", session)

    if search:
        query = query.ilike("title", f"%{search}%")

    # -----------------------------
    # Date Filter
    # -----------------------------

    if date_mode and date:

        selected_date = datetime.strptime(
            date,
            "%Y-%m-%d"
        ).replace(tzinfo=timezone.utc)

        start_of_day = selected_date.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        end_of_day = selected_date.replace(
            hour=23,
            minute=59,
            second=59,
            microsecond=999999
        )

        if date_mode == "on":

            query = (
                query
                .gte("due_date", start_of_day.isoformat())
                .lte("due_date", end_of_day.isoformat())
            )

        elif date_mode == "before":

            query = query.lt(
                "due_date",
                start_of_day.isoformat()
            )

        elif date_mode == "after":

            query = query.gt(
                "due_date",
                end_of_day.isoformat()
            )

        elif date_mode == "between" and end:

            end_date = datetime.strptime(
                end,
                "%Y-%m-%d"
            ).replace(tzinfo=timezone.utc)

            end_of_range = end_date.replace(
                hour=23,
                minute=59,
                second=59,
                microsecond=999999
            )

            query = (
                query
                .gte("due_date", start_of_day.isoformat())
                .lte("due_date", end_of_range.isoformat())
            )

    # -----------------------------
    # Execute Query
    # -----------------------------

    response = (
        query
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "success": True,
        "count": len(response.data),
        "actions": response.data
    }
@app.post("/reminders/{reminder_id}/snooze" )
async def snooze_reminder(
    reminder_id: str,
    request: SnoozeRequest,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    now = datetime.now(timezone.utc)

    if request.duration == "15m":
        new_time = now + timedelta(minutes=15)

    elif request.duration == "30m":
        new_time = now + timedelta(minutes=30)

    elif request.duration == "1h":
        new_time = now + timedelta(hours=1)

    elif request.duration == "tomorrow":

        tomorrow = now + timedelta(days=1)

        new_time = tomorrow.replace(
            hour=9,
            minute=0,
            second=0,
            microsecond=0,
        )

    elif request.duration == "custom":

        if not request.custom_time:

            raise HTTPException(
                status_code=400,
                detail="custom_time required"
            )

        new_time = datetime.fromisoformat(
            request.custom_time.replace("Z", "+00:00")
        )

    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid snooze option"
        )

    response = (
        db
        .table("reminders")
        .update({
            "reminder_time": new_time.isoformat(),
            "dismissed": False,
            "updated_at": now.isoformat(),
        })
        .eq("user_id", user["id"])
        .eq("id", reminder_id)
        .execute()
    )

    return response.data[0]
@app.post("/actions/{action_id}/reminders")
async def create_reminder(
    action_id: str,
    reminder: ReminderCreate,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("reminders")
        .insert({
    "action_id": action_id,
    "label": reminder.label,
    "reminder_time": reminder.reminder_time,
    "dismissed": False,
    "is_default": False,
    "user_id": user["id"],
})
        .execute()
    )

    return response.data[0]
@app.get("/actions/filters")
async def get_action_filters( user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    # Owners
    owner_response = (
        db
        .table("actions")
        .select("owner")
        .eq("user_id", user["id"])
        .eq("deleted", False)
        .execute()
    )

    owners = sorted({
        row["owner"]
        for row in owner_response.data
        if row.get("owner")
    })

    # Sessions
    session_response = (
        db
        .table("sessions")
        .select("id, meeting_name")
        .eq("user_id", user["id"])
        .order("meeting_name")
        .execute()
    )

    return {
        "owners": owners,
        "sessions": session_response.data
    }
@app.get("/reminders")
async def get_reminders( user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    now = datetime.now(timezone.utc)
    next_24h = now + timedelta(hours=24)

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
                due_date,
                session_id,
                sessions(
                    meeting_name
                )
            )
        """)
        .eq("user_id", user["id"])
        .eq("dismissed", False)
        .or_(
            f"and(is_default.eq.true,reminder_time.lte.{next_24h.isoformat()}),is_default.eq.false"
        )
        .execute()
    )

    reminders = []

    for reminder in response.data:

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
@app.patch("/actions/{action_id}/complete")
async def complete_action(action_id: str, user=Depends(get_current_user)):

    db = get_authenticated_supabase(user["access_token"])

    # Get current task
    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    action = response.data[0]

    # Toggle status
    new_status = (
        "completed"
        if action["status"] == "pending"
        else "pending"
    )

    update_data = {
        "status": new_status,
        "completed_at": (
            datetime.now(timezone.utc).isoformat()
            if new_status == "completed"
            else None
        )
    }

    update = (
        db
        .table("actions")
        .update(update_data)
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    # ------------------------------------
    # Update Notion (if synced)
    # ------------------------------------

    if action.get("notion_page_id"):

        try:

            notion_service.update_task_status(
                page_id=action["notion_page_id"],
                action_status=new_status
            )

        except Exception as e:

            print(f"Failed to update Notion status: {e}")

    # ------------------------------------
    # Reminder handling
    # ------------------------------------

    if new_status == "completed":

        (
            db
            .table("reminders")
            .delete()
            .eq("user_id", user["id"])
            .eq("action_id", action_id)
            .execute()
        )

    elif new_status == "pending":

        if action.get("due_date"):

            due_time = datetime.fromisoformat(
                action["due_date"].replace("Z", "+00:00")
            )

            reminder_time = due_time - timedelta(hours=24)

            now = datetime.now(timezone.utc)

            if reminder_time <= now:

                reminder_time = (
                    now + timedelta(minutes=1)
                )

            (
                db
                .table("reminders")
                .insert({
                    "action_id": action_id,
                    "label": "Due Soon",
                    "reminder_time": reminder_time.isoformat(),
                    "dismissed": False,
                    "is_default": True,
                    "user_id": user["id"],
                })
                .execute()
            )

    print(update.data)

    return {
        "success": True,
        "message": f"Task marked as {new_status}",
        "action": update.data[0]
    }


@app.patch("/actions/{action_id}/confirm")
async def confirm_action(action_id: str, user=Depends(get_current_user)):

    db = get_authenticated_supabase(user["access_token"])

    # ------------------------------------
    # Fetch task
    # ------------------------------------

    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    action = response.data[0]

    # ------------------------------------
    # Already confirmed?
    # ------------------------------------

    if action["confirmed"]:

        return {
            "success": True,
            "message": "Task already confirmed.",
            "action": action
        }

    # ------------------------------------
    # Create task in Notion
    # ------------------------------------

    try:

        notion_page = notion_service.create_task(

            title=action["title"],
            owner=action["owner"],
            due_date=action["due_date"],
            priority=action["priority"],
            summary=action.get("description") or "",
            session_link=None,
            status=action["status"]

        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync with Notion: {str(e)}"
        )

    # ------------------------------------
    # Mark confirmed
    # ------------------------------------

    update = (
        db
        .table("actions")
        .update({

            "confirmed": True,
            "notion_page_id": notion_page["page_id"],
            "notion_page_url": notion_page["page_url"]

        })
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    return {

        "success": True,
        "message": "Task confirmed and synced to Notion.",
        "action": update.data[0]

    }
@app.get("/decisions")
async def get_all_decisions( user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .select("""
            *,
            sessions(
                meeting_name
            )
        """)
        .eq("user_id", user["id"])
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "success": True,
        "count": len(response.data),
        "decisions": response.data
    }
@app.patch("/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    reminder: ReminderUpdate,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("reminders")
        .update({
            "reminder_time": reminder.reminder_time,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", user["id"])
        .eq("id", reminder_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found"
        )

    return response.data[0]
@app.get("/actions/{action_id}/reminders")
async def get_action_reminders(action_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("reminders")
        .select("*")
        .eq("user_id", user["id"])
        .eq("action_id", action_id)
        .order("reminder_time")
        .execute()
    )

    return {
        "reminders": response.data
    }
@app.patch("/actions/{action_id}")
async def update_action(
    action_id: str,
    request: UpdateActionRequest,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("actions")
        .update({
            "title": request.title,
            "owner": request.owner,
            "due_date": request.due_date,
            "priority": request.priority,
            "description": request.description
        })
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    action = response.data[0]

    # ------------------------------------
    # Update Notion if already synced
    # ------------------------------------

    if action.get("notion_page_id"):

        try:

            notion_service.update_task(

                page_id=action["notion_page_id"],

                title=action["title"],

                owner=action["owner"],

                due_date=action["due_date"],

                priority=action["priority"],

                summary=action.get("description") or "",

                session_link=None,

                status=action["status"]

            )

        except Exception as e:

            print(f"Failed to update Notion task: {e}")

    return {
        "success": True,
        "message": "Task updated",
        "action": action
    }

@app.delete("/actions/{action_id}")
async def delete_action(action_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    # Check if task exists
    response = (
        db
        .table("actions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    # Soft delete
    update = (
        db
        .table("actions")
        .update({
            "deleted": True
        })
        .eq("user_id", user["id"])
        .eq("id", action_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Task deleted",
        "action": update.data[0]
    }
@app.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    (
        db
        .table("reminders")
        .delete()
        .eq("user_id", user["id"])
        .eq("id", reminder_id)
        .execute()
    )

    return {
        "success": True
    }
@app.get("/session/{session_id}/risks")
async def get_session_risks(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("risks")
        .select("*")
        .eq("user_id", user["id"])
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )

    return {
        "success": True,
        "risks": response.data
    }
@app.patch("/risks/{risk_id}")
async def update_risk(
    risk_id: str,
    request: UpdateRiskRequest,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("risks")
        .update({

            "title": request.title,

            "impact": request.impact,

            "mitigation": request.mitigation,

            "risk_score": request.risk_score,

            "updated_at": datetime.now(timezone.utc).isoformat()

        })
        .eq("user_id", user["id"])
        .eq("id", risk_id)
        .execute()
    )

    if len(response.data) == 0:

        raise HTTPException(

            status_code=404,

            detail="Risk not found"

        )

    return {

        "success": True,

        "message": "Risk updated",

        "risk": response.data[0]

    }
@app.patch("/risks/{risk_id}/resolve")
async def resolve_risk(risk_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("risks")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", risk_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    risk = response.data[0]

    new_status = (
        "Resolved"
        if risk["status"] == "Open"
        else "Open"
    )

    update = (
        db
        .table("risks")
        .update({
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", risk_id)
        .execute()
    )

    return {
        "success": True,
        "message": f"Risk marked as {new_status}",
        "risk": update.data[0]
    }

@app.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    # Check if risk exists
    response = (
        db
        .table("risks")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", risk_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    # Soft delete
    update = (
        db
        .table("risks")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", risk_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Risk deleted",
        "risk": update.data[0]
    }
@app.get("/session/{session_id}/decisions")
async def get_session_decisions(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("session_id", session_id)
        .eq("deleted", False)
        .order("created_at")
        .execute()
    )

    return {
        "success": True,
        "decisions": response.data
    }
@app.patch("/decisions/{decision_id}")
async def update_decision(
    decision_id: str,
    request: UpdateDecisionRequest,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .update({
            "title": request.title,
            "reason": request.reason,
            "confidence": request.confidence,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", decision_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Decision not found"
        )

    return {
        "success": True,
        "message": "Decision updated",
        "decision": response.data[0]
    }
@app.patch("/decisions/{decision_id}/accept")
async def accept_decision(decision_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .update({
            "decision_status": "accepted",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", decision_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Decision not found"
        )

    return {
        "success": True,
        "decision": response.data[0]
    }
@app.patch("/decisions/{decision_id}/reject")
async def reject_decision(decision_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .update({
            "decision_status": "rejected",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", decision_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Decision not found"
        )

    return {
        "success": True,
        "decision": response.data[0]
    }
@app.delete("/decisions/{decision_id}")
async def delete_decision(decision_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("decisions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", decision_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Decision not found"
        )

    update = (
        db
        .table("decisions")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("user_id", user["id"])
        .eq("id", decision_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Decision deleted",
        "decision": update.data[0]
    }
# ----------------------------------------------------
# Rename Meeting
# ----------------------------------------------------

@app.patch("/session/{session_id}/rename")
async def rename_meeting(
    session_id: str,
    request: RenameMeetingRequest,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("sessions")
        .update({

            "meeting_name": request.meeting_name,

            "updated_at": datetime.utcnow().isoformat()

        })
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .execute()
    )

    if len(response.data) == 0:
        print(response.data[0])
        return {

            "success": False,

            "error": "Session not found"

        }

    return {

        "success": True,

        "message": "Meeting renamed successfully",

        "session": response.data[0]

    }


# ----------------------------------------------------
# Get All Sessions
# ----------------------------------------------------

from time import perf_counter
from fastapi import Depends

@app.get("/sessions")
async def get_sessions( user=Depends(get_current_user),
    
):

    db = get_authenticated_supabase(user["access_token"])

    endpoint_start = perf_counter()

    # -------------------------------
    # Query session dashboard
    # -------------------------------
    query_start = perf_counter()

    response = (
        db
        .table("session_dashboard")
        .select("*")
        .eq("user_id", user["id"])
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )

    query_time = perf_counter() - query_start

    sessions = response.data

    print(f"[TIMING] Session query: {query_time:.3f}s")

    # -------------------------------
    # Populate tasks
    # -------------------------------
    task_total = 0

    for session in sessions:

        task_start = perf_counter()

        tasks = (
            db
            .table("actions")
            .select("*")
            .eq("user_id", user["id"])
            .eq("session_id", session["id"])
            .eq("deleted", False)
            .execute()
        )

        elapsed = perf_counter() - task_start
        task_total += elapsed

        print(
            f"[TIMING] Tasks for '{session['meeting_name']}': "
            f"{elapsed:.3f}s ({len(tasks.data)} tasks)"
        )

        session["tasks"] = tasks.data

    total_time = perf_counter() - endpoint_start

    print()
    print("========== /sessions ==========")
    print(f"Session query : {query_time:.3f}s")
    print(f"Task queries  : {task_total:.3f}s")
    print(f"Endpoint total: {total_time:.3f}s")
    print("================================")
    print()

    return {
        "success": True,
        "count": len(sessions),
        "sessions": sessions
    }

@app.delete("/session/{session_id}/action-plan/{index}")
async def delete_action_plan(session_id: str, index: int, user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db.table("sessions")
        .select("action_plan")
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    action_plans = response.data.get("action_plan") or []

    if index < 0 or index >= len(action_plans):
        raise HTTPException(
            status_code=404,
            detail="Action plan not found"
        )

    action_plans.pop(index)

    db.table("sessions").update(
        {
            "action_plan": action_plans
        }
    ).eq("user_id", user["id"]).eq(
        "id",
        session_id
    ).execute()

    return {
        "message": "Action plan deleted successfully"
    }
from schemas.extraction import ActionPlan

@app.put("/session/{session_id}/action-plan/{index}")
async def update_action_plan(
    session_id: str,
    index: int,
    updated_plan: ActionPlan,
    user=Depends(get_current_user),
):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db.table("sessions")
        .select("action_plan")
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    action_plans = response.data.get("action_plan") or []

    if index < 0 or index >= len(action_plans):
        raise HTTPException(
            status_code=404,
            detail="Action plan not found"
        )

    action_plans[index] = updated_plan.model_dump()

    db.table("sessions").update(
        {
            "action_plan": action_plans
        }
    ).eq("user_id", user["id"]).eq(
        "id",
        session_id
    ).execute()

    return {
        "message": "Action plan updated successfully"
    }
# ----------------------------------------------------
# Archive Session
# ----------------------------------------------------

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    # Delete actions first
    (
        db
        .table("actions")
        .delete()
        .eq("user_id", user["id"])
        .eq("session_id", session_id)
        .execute()
    )

    # Delete the session
    response = (
        db
        .table("sessions")
        .delete()
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Meeting deleted successfully"
    }

# ----------------------------------------------------
# Delete Session
# ----------------------------------------------------

@app.patch("/session/{session_id}/delete")
async def delete_session(session_id: str,  user=Depends(get_current_user),):

    db = get_authenticated_supabase(user["access_token"])

    response = (
        db
        .table("sessions")
        .update({

            "deleted": True,
 
            "updated_at": datetime.utcnow().isoformat()

        })
        .eq("user_id", user["id"])
        .eq("id", session_id)
        .execute()
    )

    if len(response.data) == 0:

        return {

            "success": False,

            "error": "Session not found"

        }

    return {

        "success": True,

        "message": "Session deleted.",

        "session": response.data[0]

    }
# ----------------------------------------------------
# Notion Integration
# ----------------------------------------------------

@app.get("/notion/status")
async def notion_status():

    return notion_service.get_status()


@app.get("/notion/database")
async def notion_database():

    return notion_service.get_database()