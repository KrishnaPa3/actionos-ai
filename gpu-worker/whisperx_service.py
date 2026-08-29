"""WhisperX transcription + speaker diarization.

Adapted from backend/services/whisperx_service.py. One behavioural fix:
``min_speakers``/``max_speakers`` used to be hardcoded to 2, which forced every
recording into a two-speaker model and produced this warning on solo audio:

    The detected number of speakers (1) for waveform is outside
    the given bounds [2, 2].

They are now optional. Passing nothing lets pyannote decide, which is correct
for meetings whose participant count is not known in advance.
"""

from typing import Any

from model_manager import (
    get_align_model,
    get_diarizer,
    get_whisperx,
    get_whisperx_device,
)


BATCH_SIZE = 16


def transcribe_with_speakers(
    audio_file: str,
    min_speakers: int | None = None,
    max_speakers: int | None = None,
) -> dict[str, Any]:
    """Transcribe *audio_file* and attribute each segment to a speaker.

    Returns a dict with the flat transcript, the speaker-attributed transcript,
    the detected language and the per-segment breakdown.
    """
    import whisperx

    model = get_whisperx()

    print("Transcribing audio...")
    result = model.transcribe(audio_file, batch_size=BATCH_SIZE)
    language = result["language"]

    print("Aligning transcript...")
    align_model, metadata = get_align_model(language)
    result = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio_file,
        get_whisperx_device(),
    )

    print("Running speaker diarization...")
    diarize_kwargs: dict[str, int] = {}
    if min_speakers is not None:
        diarize_kwargs["min_speakers"] = min_speakers
    if max_speakers is not None:
        diarize_kwargs["max_speakers"] = max_speakers

    diarize_segments = get_diarizer()(audio_file, **diarize_kwargs)
    result = whisperx.assign_word_speakers(diarize_segments, result)

    segments = result["segments"]

    transcript = " ".join(segment["text"] for segment in segments).strip()

    speaker_lines = [
        f"{segment.get('speaker', 'Unknown')}:\n{segment['text'].strip()}\n"
        for segment in segments
    ]
    speaker_transcript = "\n".join(speaker_lines)

    return {
        "transcript": transcript,
        "speaker_transcript": speaker_transcript,
        "language": language,
        "segments": [
            {
                "start": segment.get("start"),
                "end": segment.get("end"),
                "speaker": segment.get("speaker", "Unknown"),
                "text": segment["text"].strip(),
            }
            for segment in segments
        ],
    }
