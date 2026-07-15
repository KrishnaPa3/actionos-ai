import os

import torch
import whisperx

from dotenv import load_dotenv
from whisperx.diarize import DiarizationPipeline


# --------------------------------------------------
# Load environment
# --------------------------------------------------

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not found in .env")


# --------------------------------------------------
# Configuration
# --------------------------------------------------

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

BATCH_SIZE = 16

COMPUTE_TYPE = (
    "float16"
    if DEVICE == "cuda"
    else "int8"
)

print(f"WhisperX using device: {DEVICE}")


# --------------------------------------------------
# Load models ONCE
# --------------------------------------------------

print("Loading WhisperX model...")

whisper_model = whisperx.load_model(
    "base",
    DEVICE,
    compute_type=COMPUTE_TYPE,
)

print("Loading Diarization model...")

diarization_model = DiarizationPipeline(
    token=HF_TOKEN,
    device=DEVICE,
)

print("WhisperX ready!")


# --------------------------------------------------
# Main Function
# --------------------------------------------------

def transcribe_with_speakers(audio_file):

    print("Transcribing audio...")

    result = whisper_model.transcribe(
        audio_file,
        batch_size=BATCH_SIZE,
    )

    print("Aligning transcript...")

    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device=DEVICE,
    )

    result = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio_file,
        DEVICE,
    )

    print("Running speaker diarization...")

    diarize_segments = diarization_model(
        audio_file
    )

    result = whisperx.assign_word_speakers(
        diarize_segments,
        result,
    )

    # ------------------------------------------
    # Plain transcript
    # ------------------------------------------

    transcript = " ".join(

        segment["text"]

        for segment in result["segments"]

    ).strip()

    # ------------------------------------------
    # Speaker transcript
    # ------------------------------------------

    speaker_lines = []

    for segment in result["segments"]:

        speaker = segment.get(
            "speaker",
            "Unknown"
        )

        text = segment["text"].strip()

        speaker_lines.append(
            f"{speaker}:\n{text}\n"
        )

    speaker_transcript = "\n".join(
        speaker_lines
    )

    return (
        transcript,
        speaker_transcript
    )