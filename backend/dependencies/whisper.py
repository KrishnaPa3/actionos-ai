"""
FastAPI dependency for the lazy faster-whisper singleton.
"""

from services.model_manager import get_whisper


def get_whisper_model():
    return get_whisper()
