"""
/upload-audio - the meeting recording ingestion pipeline.

Flow (unchanged from main.py):
  1. Save uploaded file to disk, upload it to Supabase Storage.
  2. Transcribe with faster-whisper (flat transcript) and WhisperX
     (speaker-attributed transcript).
  3. Create the session row.
  4. Run extraction (services.meeting_pipeline_service) and persist
     tasks/risks/decisions (+ default reminders).
  5. Clean up the temp file.

This router only orchestrates; the heavy lifting for step 4 lives in
services/meeting_pipeline_service.py so this file stays readable.
"""

import mimetypes
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from config import MAX_UPLOAD_SIZE, UPLOAD_DIR
from dependencies.database import AuthContext, get_auth_context
from dependencies.whisper import get_whisper_model
from services import meeting_pipeline_service, transcription
from services.model_manager import warm_audio_models
from repositories.session_repository import create_session, generate_meeting_name
from supabase_client import supabase
from utils.logging import logger

router = APIRouter()

_ALLOWED_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/x-m4a",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "audio/x-flac",
    "audio/aac",
}
_ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".mp4",
    ".ogg",
    ".webm",
    ".flac",
    ".aac",
}


def validate_upload_file(filename: str | None, content_type: str | None, size: int) -> None:
    if size <= 0:
        raise ValueError("Upload is empty.")

    if size > MAX_UPLOAD_SIZE:
        raise ValueError(
            f"Upload exceeds the maximum allowed size of {MAX_UPLOAD_SIZE} bytes."
        )

    extension = (Path(filename or "").suffix or "").lower()
    guessed_mime, _ = mimetypes.guess_type(filename or "")

    if extension not in _ALLOWED_EXTENSIONS and (content_type not in _ALLOWED_MIME_TYPES and guessed_mime not in _ALLOWED_MIME_TYPES):
        raise ValueError("Unsupported file type.")

    if content_type and content_type not in _ALLOWED_MIME_TYPES and guessed_mime not in _ALLOWED_MIME_TYPES:
        raise ValueError("Unsupported MIME type.")


@router.post("/warm-audio-models")
def warm_audio_models_for_recording(
    _ctx: AuthContext = Depends(get_auth_context),
):
    """Start loading reusable audio models when a user starts a recording.

    This endpoint does not create a session, store audio, or contact Ollama.
    It only prepares the cached audio models used by ``/upload-audio``.
    """
    warm_audio_models()
    return {"success": True, "message": "Audio models are ready."}


def _upload_to_storage(file_path: str, unique_name: str, content_type: str) -> str | None:
    """STEP 1b: push the raw audio file to Supabase Storage and return its public URL."""
    try:
        logger.info("Uploading audio to Supabase Storage", extra={"event": "upload_storage"})

        with open(file_path, "rb") as audio_file:
            supabase.storage.from_("audio-files").upload(
                path=unique_name,
                file=audio_file,
                file_options={"content-type": content_type},
            )

        logger.info("Audio uploaded successfully", extra={"event": "upload_storage"})
        return supabase.storage.from_("audio-files").get_public_url(unique_name)

    except Exception as exc:
        logger.exception("Audio upload to storage failed", extra={"event": "upload_storage"})
        return None


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(get_auth_context),
    whisper_model=Depends(get_whisper_model),
):
    user = ctx.user
    db = ctx.db
    upload_started_at = datetime.now(timezone.utc)

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Missing filename.")

    try:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
    except Exception:
        size = 0

    try:
        validate_upload_file(file.filename, file.content_type, size)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_url = _upload_to_storage(file_path, unique_name, file.content_type)

    transcript = transcription.transcribe_audio(whisper_model, file_path)
    speaker_transcript = transcription.transcribe_with_diarization(file_path)

    meeting_name = generate_meeting_name(upload_started_at)

    session_id = None
    structured_data = None

    try:
        # STEP 1 - create session first
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

        session = create_session(db, empty_payload)
        session_id = session["id"]
        session_created_at = datetime.fromisoformat(session["created_at"].replace("Z", "+00:00"))

        # STEP 2 - extract using the meeting timestamp
        structured_data = meeting_pipeline_service.extract_from_transcript(transcript, session_created_at)

        # STEPS 3-6 - persist extraction, tasks (+reminders), risks, decisions
        meeting_pipeline_service.save_extraction_results(
            db, user, session_id, session_created_at, structured_data
        )

    except Exception as e:
        logger.exception("Failed to save meeting", extra={"event": "upload_pipeline"})

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
        "extraction": structured_data,
    }
