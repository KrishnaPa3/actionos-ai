"""
/upload-audio - the meeting recording ingestion pipeline.

Flow:
  1. Stage the uploaded file, push it to Supabase Storage.
  2. Ask the gpu-worker service to transcribe it (flat + speaker-attributed).
  3. Create the session row.
  4. Run extraction (services.meeting_pipeline_service) and persist
     tasks/risks/decisions (+ default reminders).
  5. Clean up the staged file.

What changed: step 2 used to run faster-whisper AND whisperx inside this
process, on Cloud Run, without a GPU. It now happens in gpu-worker over HTTP.
Two consequences worth knowing:

  * The redundant second ASR pass is gone. transcribe_with_speakers already
    returned the flat transcript; running faster-whisper separately for the
    same string doubled the work.
  * Supabase Storage upload is now REQUIRED, not best-effort, because the
    worker fetches the audio by URL. A storage failure fails the request
    instead of silently continuing with audio_url=None.
"""

import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from config import SUPABASE_URL, UPLOAD_DIR
from dependencies.database import AuthContext, get_auth_context
from services import meeting_pipeline_service, transcription
from services.transcription import TranscriptionUnavailable
from repositories.session_repository import create_session, generate_meeting_name
from supabase_client import supabase

router = APIRouter()


@router.post("/warm-audio-models")
def warm_audio_models_for_recording(
    _ctx: AuthContext = Depends(get_auth_context),
):
    """Start waking the GPU worker when a user begins recording.

    On Cloud Run this is what hides the worker's cold start: by the time the
    user stops talking, the instance is usually up with its models loaded.
    Never fails the caller - the upload still works, just more slowly.
    """
    ready = transcription.warm()
    return {
        "success": True,
        "ready": ready,
        "message": "Transcription service is warming up."
        if ready
        else "Transcription service did not respond to warm-up; it will load on demand.",
    }


@router.get("/transcription-health")
def transcription_health(_ctx: AuthContext = Depends(get_auth_context)):
    """Report whether the GPU worker is configured and reachable."""
    return transcription.health()


def _upload_to_storage(file_path: str, unique_name: str, content_type: str) -> str:
    """Push the raw audio to Supabase Storage and return its public URL.

    Raises on failure: the worker needs this URL to fetch the audio, so a
    failed upload cannot be swallowed.
    """
    print("Uploading audio to Supabase Storage...")

    with open(file_path, "rb") as audio_file:
        supabase.storage.from_("audio-files").upload(
            path=unique_name,
            file=audio_file,
            file_options={"content-type": content_type},
        )

    print("Audio uploaded successfully.")
    return supabase.storage.from_("audio-files").get_public_url(unique_name)


def _signed_audio_url(unique_name: str, expires_in: int = 3600) -> str:
    """Return a short-lived signed URL the GPU worker can fetch the audio from.

    The bucket is private, so the public URL built by get_public_url() is not
    actually downloadable - it is only a well-formed string. The worker needs a
    real, time-limited link. One hour is far longer than a transcription takes,
    and the link expires on its own afterwards.
    """
    response = supabase.storage.from_("audio-files").create_signed_url(
        unique_name, expires_in
    )

    url = None
    if isinstance(response, dict):
        for key in ("signedURL", "signedUrl", "signed_url"):
            if response.get(key):
                url = response[key]
                break

    if not url:
        raise RuntimeError(f"Supabase returned no signed URL: {response!r}")

    # Some client versions return a path relative to /storage/v1.
    if url.startswith("/"):
        url = f"{SUPABASE_URL.rstrip('/')}/storage/v1{url}"

    return url


def process_upload(user: dict, db, file_path: str, unique_name: str, content_type: str) -> dict:
    """Run the full pipeline for one staged recording.

    Kept as a standalone function (rather than inline in the route) so it can
    be handed to a background task without restructuring.
    """
    upload_started_at = datetime.now(timezone.utc)

    try:
        audio_url = _upload_to_storage(file_path, unique_name, content_type)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Could not store the audio file: {exc}",
        ) from exc

    # --- Transcription (gpu-worker) -------------------------------------
    # audio_url (public form) is what gets stored on the session row; the
    # worker is handed a separate signed URL it can actually download.
    try:
        fetch_url = _signed_audio_url(unique_name)
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Could not create a signed audio URL: {exc}",
        ) from exc

    try:
        result = transcription.transcribe(fetch_url)
    except TranscriptionUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    transcript = result.get("transcript", "")
    speaker_transcript = result.get("speaker_transcript", "")

    meeting_name = generate_meeting_name(upload_started_at)

    # --- Persist --------------------------------------------------------
    session = create_session(
        db,
        {
            "meeting_name": meeting_name,
            "audio_url": audio_url,
            "transcript": transcript,
            "speaker_transcript": speaker_transcript,
            "summary": [],
            "action_plan": [],
            "archived": False,
            "deleted": False,
            "user_id": user["id"],
        },
    )
    session_id = session["id"]
    session_created_at = datetime.fromisoformat(
        session["created_at"].replace("Z", "+00:00")
    )

    structured_data = meeting_pipeline_service.extract_from_transcript(
        transcript, session_created_at
    )
    meeting_pipeline_service.save_extraction_results(
        db, user, session_id, session_created_at, structured_data
    )

    return {
        "success": True,
        "id": session_id,
        "meeting_name": meeting_name,
        "filename": unique_name,
        "audio_url": audio_url,
        "transcript": transcript,
        "speaker_transcript": speaker_transcript,
        "language": result.get("language"),
        "extraction": structured_data,
    }


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(get_auth_context),
):
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        return process_upload(
            ctx.user,
            ctx.db,
            file_path,
            unique_name,
            file.content_type,
        )
    finally:
        # On Cloud Run this filesystem is in-memory, so a leaked file is
        # leaked RAM for the life of the instance.
        try:
            os.remove(file_path)
        except OSError:
            pass
