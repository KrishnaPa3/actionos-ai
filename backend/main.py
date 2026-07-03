from services.extraction_service import extract_structured_data
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
from faster_whisper import WhisperModel
from pydantic import BaseModel
from datetime import datetime
from services.date_service import resolve_due_date
from services.action_service import build_action_payload

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

            "tasks": [],

            "reminders": [],

            "action_plan": [],

            "decisions": [],

            "risks": [],

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

                "reminders": [],

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

                "tasks": structured_data.get(
                    "tasks",
                    []
                ),

                "reminders": structured_data.get(
                    "reminders",
                    []
                ),

                "action_plan": structured_data.get(
                    "action_plans",
                    []
                ),

                "decisions": structured_data.get(
                    "decisions",
                    []
                ),

                "risks": structured_data.get(
                    "risks",
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


# ----------------------------------------------------
# Extract Endpoint
# ----------------------------------------------------

@app.post("/extract")
async def extract_text(request: ExtractRequest):

    if not request.transcript.strip():

        return {

            "summary": [],

            "tasks": [],

            "reminders": [],

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
        .order("created_at")
        .execute()
    )

    return {
        "success": True,
        "actions": response.data
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
        .table("sessions")
        .select("*")
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )

    return {

        "success": True,

        "count": len(response.data),

        "sessions": response.data

    }


from fastapi import HTTPException

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        # Delete all actions belonging to this meeting
        (
            supabase
            .table("actions")
            .delete()
            .eq("session_id", session_id)
            .execute()
        )

        # Delete the meeting
        (
            supabase
            .table("sessions")
            .delete()
            .eq("id", session_id)
            .execute()
        )

        return {
            "success": True,
            "message": "Meeting and associated actions deleted successfully."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
# ----------------------------------------------------
# Archive Session
# ----------------------------------------------------

@app.patch("/session/{session_id}/archive")
async def archive_session(session_id: str):

    response = (
        supabase
        .table("sessions")
        .update({

            "archived": True,

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

        "message": "Session archived.",

        "session": response.data[0]

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