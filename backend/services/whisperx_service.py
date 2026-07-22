from services.model_manager import (
    get_align_model,
    get_diarizer,
    get_whisperx,
    get_whisperx_device,
)


BATCH_SIZE = 16


# --------------------------------------------------
# Main Function
# --------------------------------------------------

def transcribe_with_speakers(audio_file):
    import whisperx

    whisper_model = get_whisperx()

    print("Transcribing audio...")

    result = whisper_model.transcribe(
        audio_file,
        batch_size=BATCH_SIZE,
    )

    print("Aligning transcript...")

    model_a, metadata = get_align_model(result["language"])

    result = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio_file,
        get_whisperx_device(),
    )

    print("Running speaker diarization...")

    diarize_segments = get_diarizer()(
    audio_file,
    min_speakers=2,
    max_speakers=2,
)

    print("\n========== RAW DIARIZATION ==========")

    print(diarize_segments.to_string())

    print("====================================")

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

    print("\n========== SPEAKER TRANSCRIPT ==========")

    print(speaker_transcript)

    print("========================================")

    return (
        transcript,
        speaker_transcript
    )
