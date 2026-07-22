"""
Transcription helpers.

Thin wrappers around the existing faster-whisper model and the existing
`services.whisperx_service.transcribe_with_speakers`. No transcription
logic changed - this just gives the upload router a single call
instead of inlining whisper iteration/joining directly in the route
handler.
"""

from typing import Any

from services.whisperx_service import transcribe_with_speakers


def transcribe_audio(whisper_model: Any, file_path: str) -> str:
    """Run faster-whisper and join segment text into a flat transcript string."""
    segments, _info = whisper_model.transcribe(file_path)
    return " ".join(segment.text for segment in segments).strip()


def transcribe_with_diarization(file_path: str) -> str:
    """Run WhisperX speaker diarization, returning just the speaker transcript."""
    _, speaker_transcript = transcribe_with_speakers(file_path)
    return speaker_transcript
