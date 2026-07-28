from prompts.extraction_prompt import SYSTEM_PROMPT
from services.ai.factory import get_ai_provider


def extract_from_llm(transcript: str):

    provider = get_ai_provider()

    return provider.chat(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=transcript,
        temperature=0.0,
    )

