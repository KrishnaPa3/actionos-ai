import json
from datetime import datetime

from openai import OpenAI

from prompts.extraction_prompt import SYSTEM_PROMPT
from schemas.extraction import ExtractionResult

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)


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
        Dict matching ExtractionResult schema.
    """

    user_prompt = f"""
Meeting Timestamp:
{meeting_datetime.isoformat()}

Transcript:
{transcript}
"""

    response = client.chat.completions.create(
        model="qwen3:8b",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    try:
        data = json.loads(content)

    except json.JSONDecodeError as e:
        raise ValueError(
            f"Model returned invalid JSON:\n\n{content}"
        ) from e

    validated = ExtractionResult.model_validate(data)

    return validated.model_dump()