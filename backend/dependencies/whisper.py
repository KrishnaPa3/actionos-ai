"""REMOVED - kept only so a stale import fails loudly instead of silently.

The faster-whisper singleton used to live here and be injected into
/upload-audio. Audio models no longer run in the API process at all; see
services/transcription.py, which calls the gpu-worker service over HTTP.

This module intentionally imports nothing. The API image does not contain
torch, so importing the old model_manager here would break startup.
"""


def get_whisper_model():
    raise RuntimeError(
        "get_whisper_model() no longer exists. Audio models run in the "
        "gpu-worker service. Use services.transcription.transcribe(audio_url)."
    )
