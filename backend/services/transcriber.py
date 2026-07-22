from services.model_manager import get_whisper


def transcribe_audio(audio_path: str) -> str:
    """
    Transcribes an audio file and returns the transcript.
    """
    model = get_whisper()
    segments, _info = model.transcribe(audio_path)
    return " ".join(segment.text for segment in segments).strip()
