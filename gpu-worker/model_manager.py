"""Thread-safe, process-wide lazy access to the audio AI models.

Adapted from backend/services/model_manager.py for the standalone GPU worker.

Two deliberate differences from the original:

  * The faster-whisper singleton is gone. The old pipeline ran faster-whisper
    for a flat transcript AND whisperx for a speaker transcript, but
    ``transcribe_with_speakers`` already returns both. That second pass was
    pure duplicated work.
  * Model weights are baked into the container image at build time (see
    Dockerfile), so nothing is downloaded at request time. On Cloud Run the
    writable filesystem is in-memory, so a runtime download would be charged
    against the memory limit twice: once as a cached file, once as tensors.
"""

import os
from threading import RLock
from typing import Any


_model_lock = RLock()
_whisperx_model: Any | None = None
_diarizer: Any | None = None
_alignment_models: dict[str, tuple[Any, Any]] = {}

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")


def get_whisperx_device() -> str:
    """Return "cuda" when a GPU is visible, otherwise "cpu".

    Importing torch is deferred so that a bare ``--help`` or a health probe
    does not pay for it.
    """
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def get_whisperx() -> Any:
    """Return the shared WhisperX model, creating it on first use."""
    global _whisperx_model

    with _model_lock:
        if _whisperx_model is None:
            import whisperx

            device = get_whisperx_device()
            compute_type = "float16" if device == "cuda" else "int8"
            print(f"Loading WhisperX model ({WHISPER_MODEL_SIZE}) on {device}...")
            _whisperx_model = whisperx.load_model(
                WHISPER_MODEL_SIZE,
                device,
                compute_type=compute_type,
            )
            print("WhisperX model loaded.")
        else:
            print("Using cached WhisperX model.")

        return _whisperx_model


def get_align_model(language: str) -> tuple[Any, Any]:
    """Return the cached WhisperX alignment model and metadata for *language*."""
    with _model_lock:
        if language not in _alignment_models:
            import whisperx

            print(f"Loading alignment model for language: {language}...")
            _alignment_models[language] = whisperx.load_align_model(
                language_code=language,
                device=get_whisperx_device(),
            )
        else:
            print(f"Using cached alignment model for language: {language}.")

        return _alignment_models[language]


def get_diarizer() -> Any:
    """Return the shared Pyannote diarizer, creating it on first use."""
    global _diarizer

    with _model_lock:
        if _diarizer is None:
            from whisperx.diarize import DiarizationPipeline

            hf_token = os.getenv("HF_TOKEN")
            if not hf_token:
                raise RuntimeError(
                    "HF_TOKEN is not set. The diarization model cannot be loaded."
                )

            print("Loading diarization model...")
            _diarizer = DiarizationPipeline(
                token=hf_token,
                device=get_whisperx_device(),
            )
            print("Diarization model loaded.")
        else:
            print("Using cached diarization model.")

        return _diarizer


def warm_audio_models() -> None:
    """Load everything that does not depend on the recording's language.

    Alignment models stay lazy: whisperx picks one from the detected language.
    """
    get_whisperx()
    get_diarizer()
