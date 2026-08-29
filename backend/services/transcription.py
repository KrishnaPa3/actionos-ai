"""Transcription client.

This module used to load faster-whisper and whisperx into the API process.
It no longer does: the audio pipeline runs in the separate gpu-worker service
and is reached over HTTP. Nothing here imports torch.

Authentication: the worker is deployed with --no-allow-unauthenticated, so
calls carry a Google-signed ID token minted from the runtime service account.
That works automatically on Cloud Run via the metadata server. Off Cloud Run
(local development) token minting fails, and the request is sent unauthenticated
- which is what you want when pointing at a worker running on localhost.
"""

from typing import Any

import httpx

from config import (
    DIARIZATION_MAX_SPEAKERS,
    DIARIZATION_MIN_SPEAKERS,
    GPU_WORKER_TIMEOUT,
    GPU_WORKER_URL,
)


class TranscriptionUnavailable(RuntimeError):
    """The GPU worker could not be reached or refused the request."""


def _require_worker_url() -> str:
    if not GPU_WORKER_URL:
        raise TranscriptionUnavailable(
            "GPU_WORKER_URL is not set. The transcription service has no address "
            "to call. Set it to the gpu-worker service URL."
        )
    return GPU_WORKER_URL


def _auth_headers(audience: str) -> dict[str, str]:
    """Mint an ID token for *audience*, or return {} when not on Google infra."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import id_token

        token = id_token.fetch_id_token(Request(), audience)
        return {"Authorization": f"Bearer {token}"}
    except Exception:
        # No metadata server (local dev), or the worker allows unauthenticated
        # access. Either way, proceed without a token.
        return {}


def _speaker_bounds() -> dict[str, int]:
    bounds: dict[str, int] = {}
    if DIARIZATION_MIN_SPEAKERS:
        bounds["min_speakers"] = int(DIARIZATION_MIN_SPEAKERS)
    if DIARIZATION_MAX_SPEAKERS:
        bounds["max_speakers"] = int(DIARIZATION_MAX_SPEAKERS)
    return bounds


def transcribe(audio_url: str) -> dict[str, Any]:
    """Transcribe the audio at *audio_url*, with speaker attribution.

    Returns the worker's payload: transcript, speaker_transcript, language
    and segments.
    """
    base = _require_worker_url()
    endpoint = f"{base}/transcribe"

    payload: dict[str, Any] = {"audio_url": audio_url, **_speaker_bounds()}

    try:
        response = httpx.post(
            endpoint,
            json=payload,
            timeout=GPU_WORKER_TIMEOUT,
            headers=_auth_headers(base),
        )
    except httpx.HTTPError as exc:
        raise TranscriptionUnavailable(
            f"Could not reach the transcription service: {exc}"
        ) from exc

    if response.status_code >= 400:
        # Surface the worker's own message rather than a bare status code.
        detail = response.text[:500]
        try:
            detail = response.json().get("detail", detail)
        except Exception:
            pass
        raise TranscriptionUnavailable(
            f"Transcription failed ({response.status_code}): {detail}"
        )

    return response.json()


def warm() -> bool:
    """Ask the worker to preload its models. Never raises."""
    if not GPU_WORKER_URL:
        return False
    try:
        response = httpx.post(
            f"{GPU_WORKER_URL}/warm",
            timeout=60.0,
            headers=_auth_headers(GPU_WORKER_URL),
        )
        return response.status_code < 400
    except httpx.HTTPError:
        return False


def health() -> dict[str, Any]:
    """Report whether the worker is reachable. Never raises."""
    if not GPU_WORKER_URL:
        return {"configured": False, "reachable": False}
    try:
        response = httpx.get(
            f"{GPU_WORKER_URL}/healthz",
            timeout=10.0,
            headers=_auth_headers(GPU_WORKER_URL),
        )
        return {
            "configured": True,
            "reachable": response.status_code < 400,
            "worker": response.json() if response.status_code < 400 else None,
        }
    except httpx.HTTPError as exc:
        return {"configured": True, "reachable": False, "error": str(exc)}
