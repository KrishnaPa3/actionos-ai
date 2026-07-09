from services.extraction_service import extract_structured_data
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
from faster_whisper import WhisperModel
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from services.date_service import resolve_due_date
from services.action_service import build_action_payload, build_risk_payload

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

# ----------------------------------------------------
# Helper Function
# ----------------------------------------------------

def generate_meeting_name():

    response = (
        supabase
        .table("sessions")
        .select("meeting_name")
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
async def upload_audio(file: UploadFile = File(...)):

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

    print("Whisper complete!")

    meeting_name = generate_meeting_name()

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

            "summary": [],

            "action_plan": [],

            "archived": False,

            "deleted": False

        }

        response = (
            supabase
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
            supabase
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

                session_created_at

            )

            (
                supabase
                .table("actions")
                .insert(action_payload)
                .execute()
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
                session_id
            )

            (
                supabase
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

                "decision_status": "pending"

            }

            (
                supabase
                .table("decisions")
                .insert(decision_payload)
                .execute()
            )

        # --------------------------------------------------
        # STEP 7 - Verify save
        # --------------------------------------------------

        verify = (
            supabase
            .table("sessions")
            .select("*")
            .eq("id", session_id)
            .execute()
        )

        print("\nSaved Session:")
        print(verify.data)
    except Exception:

        print("\n========== DATABASE ERROR ==========")

        import traceback
        traceback.print_exc()

        return {

            "success": False,

            "message": "Failed to save meeting."

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


# ----------------------------------------------------
# Extract Endpoint
# ----------------------------------------------------

@app.post("/extract")
async def extract_text(request: ExtractRequest):

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
async def get_session(session_id: str):

    response = (
        supabase
        .table("sessions")
        .select("*")
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
async def get_session_actions(session_id: str):

    response = (
        supabase
        .table("actions")
        .select("*")
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
):

    # Build base query
    query = (
        supabase
        .table("actions")
        .select("""
            *,
            sessions (
                id,
                meeting_name
            )
        """)
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
@app.get("/actions/filters")
async def get_action_filters():

    # Owners
    owner_response = (
        supabase
        .table("actions")
        .select("owner")
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
        supabase
        .table("sessions")
        .select("id, meeting_name")
        .order("meeting_name")
        .execute()
    )

    return {
        "owners": owners,
        "sessions": session_response.data
    }
@app.patch("/actions/{action_id}/complete")
async def complete_action(action_id: str):

    # Get current task
    response = (
        supabase
        .table("actions")
        .select("*")
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
        supabase
        .table("actions")
        .update(update_data)
        .eq("id", action_id)
        .execute()
    )
    print(update.data)

    return {
        "success": True,
        "message": f"Task marked as {new_status}",
        "action": update.data[0]
    }

@app.patch("/actions/{action_id}")
async def update_action(
    action_id: str,
    request: UpdateActionRequest
):

    response = (
        supabase
        .table("actions")
        .update({
            "title": request.title,
            "owner": request.owner,
            "due_date": request.due_date,
            "priority": request.priority,
            "description": request.description
        })
        .eq("id", action_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "success": True,
        "message": "Task updated",
        "action": response.data[0]
    }

@app.delete("/actions/{action_id}")
async def delete_action(action_id: str):

    # Check if task exists
    response = (
        supabase
        .table("actions")
        .select("*")
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
        supabase
        .table("actions")
        .update({
            "deleted": True
        })
        .eq("id", action_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Task deleted",
        "action": update.data[0]
    }
@app.get("/session/{session_id}/risks")
async def get_session_risks(session_id: str):

    response = (
        supabase
        .table("risks")
        .select("*")
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
    request: UpdateRiskRequest
):

    response = (
        supabase
        .table("risks")
        .update({

            "title": request.title,

            "impact": request.impact,

            "mitigation": request.mitigation,

            "risk_score": request.risk_score,

            "updated_at": datetime.now(timezone.utc).isoformat()

        })
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
async def resolve_risk(risk_id: str):

    response = (
        supabase
        .table("risks")
        .select("*")
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
        supabase
        .table("risks")
        .update({
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("id", risk_id)
        .execute()
    )

    return {
        "success": True,
        "message": f"Risk marked as {new_status}",
        "risk": update.data[0]
    }

@app.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str):

    # Check if risk exists
    response = (
        supabase
        .table("risks")
        .select("*")
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
        supabase
        .table("risks")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("id", risk_id)
        .execute()
    )

    return {
        "success": True,
        "message": "Risk deleted",
        "risk": update.data[0]
    }
@app.get("/session/{session_id}/decisions")
async def get_session_decisions(session_id: str):

    response = (
        supabase
        .table("decisions")
        .select("*")
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
    request: UpdateDecisionRequest
):

    response = (
        supabase
        .table("decisions")
        .update({
            "title": request.title,
            "reason": request.reason,
            "confidence": request.confidence,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
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
async def accept_decision(decision_id: str):

    response = (
        supabase
        .table("decisions")
        .update({
            "decision_status": "accepted",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
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
async def reject_decision(decision_id: str):

    response = (
        supabase
        .table("decisions")
        .update({
            "decision_status": "rejected",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
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
async def delete_decision(decision_id: str):

    response = (
        supabase
        .table("decisions")
        .select("*")
        .eq("id", decision_id)
        .execute()
    )

    if len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail="Decision not found"
        )

    update = (
        supabase
        .table("decisions")
        .update({
            "deleted": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
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
    request: RenameMeetingRequest
):

    response = (
        supabase
        .table("sessions")
        .update({

            "meeting_name": request.meeting_name,

            "updated_at": datetime.utcnow().isoformat()

        })
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

@app.get("/sessions")
async def get_sessions():

    response = (
        supabase
        .table("session_dashboard")
        .select("*")
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )

    sessions = response.data

    # Populate live task list for each meeting
    for session in sessions:

        tasks = (
            supabase
            .table("actions")
            .select("*")
            .eq("session_id", session["id"])
            .eq("deleted", False)
            .execute()
        )

        session["tasks"] = tasks.data
        
   
    return {

        "success": True,

        "count": len(sessions),

        "sessions": sessions

    }


@app.delete("/session/{session_id}/action-plan/{index}")
async def delete_action_plan(session_id: str, index: int):

    response = (
        supabase.table("sessions")
        .select("action_plan")
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

    supabase.table("sessions").update(
        {
            "action_plan": action_plans
        }
    ).eq(
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
    updated_plan: ActionPlan
):

    response = (
        supabase.table("sessions")
        .select("action_plan")
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

    supabase.table("sessions").update(
        {
            "action_plan": action_plans
        }
    ).eq(
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
async def delete_session(session_id: str):

    # Delete actions first
    (
        supabase
        .table("actions")
        .delete()
        .eq("session_id", session_id)
        .execute()
    )

    # Delete the session
    response = (
        supabase
        .table("sessions")
        .delete()
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
async def delete_session(session_id: str):

    response = (
        supabase
        .table("sessions")
        .update({

            "deleted": True,
 
            "updated_at": datetime.utcnow().isoformat()

        })
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