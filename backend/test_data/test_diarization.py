import os

import torch
import whisperx
from dotenv import load_dotenv

# -------------------------
# Load environment variables
# -------------------------

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not found in .env")

# -------------------------
# Configuration
# -------------------------

AUDIO_FILE = r"D:\ActionOS-AI\backend\uploads\Recording.m4a"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE = 16
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"

print(f"Using device: {DEVICE}")

# -------------------------
# Load WhisperX model
# -------------------------

print("Loading WhisperX model...")

model = whisperx.load_model(
    "base",
    DEVICE,
    compute_type=COMPUTE_TYPE,
)

print("Transcribing...")

result = model.transcribe(
    AUDIO_FILE,
    batch_size=BATCH_SIZE,
)

print("Loading alignment model...")

model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device=DEVICE,
)

result = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    AUDIO_FILE,
    DEVICE,
)

# -------------------------
# Speaker Diarization
# -------------------------

print("Loading diarization model...")

from whisperx.diarize import DiarizationPipeline

diarize_model = DiarizationPipeline(
    token=HF_TOKEN,
    device=DEVICE,
)

print("Running diarization...")

diarize_segments = diarize_model(AUDIO_FILE)


print("Assigning speakers...")

result = whisperx.assign_word_speakers(
    diarize_segments,
    result,
)

# -------------------------
# Output
# -------------------------

print("\n==============================")
print("Speaker Transcript")
print("==============================\n")

for segment in result["segments"]:
    speaker = segment.get("speaker", "Unknown")

    print(f"{speaker}:")
    print(segment["text"])
    print()

print("Done!")