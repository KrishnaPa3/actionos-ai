"""Thread-safe, process-wide lazy access to audio AI models.

Nothing in this module creates or contacts a model at import time.  The first
upload that needs a model creates it; later uploads reuse the same instance
until the process exits.
"""

import os
from threading import RLock
from typing import Any

from config import HF_TOKEN, WHISPER_COMPUTE_TYPE, WHISPER_DEVICE, WHISPER_MODEL_SIZE
from utils.logging import logger


_model_lock = RLock()
_whisper_model: Any | None = None
_whisperx_model: Any | None = None
_diarizer: Any | None = None
_alignment_models: dict[str, tuple[Any, Any]] = {}


def get_model_manager_status() -> str:
    try:
        import faster_whisper  # noqa: F401
        import whisperx  # noqa: F401
    except Exception:
        return "unhealthy"

    if not HF_TOKEN:
        return "degraded"

    return "healthy"


def get_whisperx_device() -> str:
    # Importing torch is deferred too, so importing the web application stays
    # lightweight even on machines with CUDA available.
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def get_whisper() -> Any:
    """Return the shared faster-whisper model, creating it on first use."""
    global _whisper_model

    with _model_lock:
        if _whisper_model is None:
            from faster_whisper import WhisperModel

            logger.info("Loading Whisper model")
            _whisper_model = WhisperModel(
                WHISPER_MODEL_SIZE,
                device=WHISPER_DEVICE,
                compute_type=WHISPER_COMPUTE_TYPE,
            )
            logger.info("Whisper model loaded")
        else:
            logger.info("Using cached Whisper model")

        return _whisper_model


def get_whisperx() -> Any:
    """Return the shared WhisperX model, creating it on first use."""
    global _whisperx_model

    with _model_lock:
        if _whisperx_model is None:
            import whisperx

            device = get_whisperx_device()
            compute_type = "float16" if device == "cuda" else "int8"
            logger.info("WhisperX using device: %s", device)
            logger.info("Loading WhisperX model")
            _whisperx_model = whisperx.load_model("base", device, compute_type=compute_type)
            logger.info("WhisperX model loaded")
        else:
            logger.info("Using cached WhisperX model")

        return _whisperx_model


def get_align_model(language: str) -> tuple[Any, Any]:
    """Return the cached WhisperX alignment model and metadata for *language*."""
    with _model_lock:
        if language not in _alignment_models:
            import whisperx

            logger.info("Loading alignment model for language: %s", language)
            _alignment_models[language] = whisperx.load_align_model(
                language_code=language,
                device=get_whisperx_device(),
            )
        else:
            logger.info("Using cached alignment model for language: %s", language)

        return _alignment_models[language]


def get_diarizer() -> Any:
    """Return the shared Pyannote diarizer, creating it on first use."""
    global _diarizer

    with _model_lock:
        if _diarizer is None:
            from whisperx.diarize import DiarizationPipeline

            # HF_TOKEN is loaded from .env via config.py at startup.
            # No need to call load_dotenv() here.
            hf_token = os.getenv("HF_TOKEN")
            if not hf_token:
                raise RuntimeError("HF_TOKEN not found in .env")

            logger.info("Loading Diarization model")
            _diarizer = DiarizationPipeline(token=hf_token, device=get_whisperx_device())
            logger.info("Diarization model loaded")
        else:
            logger.info("Using cached Diarization model")

        return _diarizer


def warm_audio_models() -> None:
    """Initialize the language-independent audio models before an upload.

    Alignment models remain lazy because WhisperX selects one from the
    recording's detected language during transcription.
    """
    get_whisper()
    get_whisperx()
    get_diarizer()
