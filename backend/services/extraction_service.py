import json
from datetime import datetime

from prompts.extraction_prompt import SYSTEM_PROMPT
from schemas.extraction import ExtractionResult
from services.ai.factory import get_ai_provider
from services.normalize_service import normalize_extraction


def extract_structured_data(
    transcript: str,
    meeting_datetime: datetime
):
    """
    Extract structured meeting intelligence from a transcript.

    Args:
        transcript: Raw transcript text.
        meeting_datetime: Datetime of the meeting/recording.
                          Used by the LLM to resolve relative dates.

    Returns:
        Dictionary matching the ExtractionResult schema.
    """

    user_prompt = f"""
Meeting Timestamp:
{meeting_datetime.isoformat()}

Transcript:
{transcript}
"""

    provider = get_ai_provider()
    content = provider.chat(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.0,
        response_format={"type": "json_object"},
    ).strip()

    # Remove markdown code fences if the model adds them
    if content.startswith("```"):

        lines = content.splitlines()

        if lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]

        content = "\n".join(lines).strip()

    # --------------------------------------------------
    # DEBUG
    # --------------------------------------------------

    print("\n========== RAW MODEL OUTPUT ==========\n")
    print(content)
    print("\n======================================\n")

    # --------------------------------------------------
    # Parse JSON
    # --------------------------------------------------

    try:

        data = json.loads(content)

    except json.JSONDecodeError as e:

        raise ValueError(
            f"Model returned invalid JSON:\n\n{content}"
        ) from e

    # --------------------------------------------------
    # Normalize model output
    # --------------------------------------------------

    data = normalize_extraction(data)

    # --------------------------------------------------
    # Validate
    # --------------------------------------------------

    validated = ExtractionResult.model_validate(data)

    return validated.model_dump()