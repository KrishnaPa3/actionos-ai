"""Download every model the worker needs, at image build time.

Run inside the Docker builder stage. Everything lands in $HF_HOME, which the
runtime stage copies in as a read-only image layer.

Why this exists: on Cloud Run the container's writable filesystem is in-memory
and counts against the instance memory limit. A model downloaded on first
request is therefore charged twice - once as a cached file, once as loaded
tensors - on top of costing the user a cold-start download. Baking removes
both problems.

Runs on CPU: there is no GPU during a container build. Only the weights are
being fetched here, and they are device-independent on disk.
"""

import os
import sys

# Languages to pre-fetch alignment models for. Override at build time with
# --build-arg / ENV BAKE_LANGUAGES="en,hi,es". Any language NOT baked still
# works at runtime - it is fetched on demand, just more slowly.
LANGUAGES = [
    code.strip()
    for code in os.getenv("BAKE_LANGUAGES", "en").split(",")
    if code.strip()
]

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")


def main() -> int:
    import whisperx

    print(f"Baking WhisperX model: {WHISPER_MODEL_SIZE}")
    whisperx.load_model(WHISPER_MODEL_SIZE, "cpu", compute_type="int8")

    for language in LANGUAGES:
        print(f"Baking alignment model: {language}")
        whisperx.load_align_model(language_code=language, device="cpu")

    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print(
            "ERROR: HF_TOKEN was not provided to the build.\n"
            "The pyannote diarization model is gated and cannot be fetched "
            "without it. Pass it as a BuildKit secret:\n"
            "  docker build --secret id=hf_token,src=/path/to/token ...",
            file=sys.stderr,
        )
        return 1

    print("Baking diarization model: pyannote")
    from whisperx.diarize import DiarizationPipeline

    DiarizationPipeline(token=hf_token, device="cpu")

    print("All models baked into", os.getenv("HF_HOME"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
