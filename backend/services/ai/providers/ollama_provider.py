"""Ollama provider implementation.

Uses the OpenAI-compatible endpoint exposed by a local Ollama instance.
This is the default provider for local development.
"""

from typing import Any, Optional

from openai import OpenAI

from config import OLLAMA_BASE_URL, OLLAMA_MODEL
from services.ai.base import AIProvider


class OllamaProvider(AIProvider):
    """Provider that talks to a local Ollama instance via its OpenAI-compatible API."""

    def __init__(self) -> None:
        self._model = OLLAMA_MODEL
        self._client = OpenAI(
            base_url=OLLAMA_BASE_URL,
            api_key="ollama",  # Ollama ignores this but the SDK requires it
        )

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Send a chat completion to Ollama and return the response text.

        The implementation matches exactly what the original
        ``extraction_service.py`` and ``llm_service.py`` did, just
        moved behind the provider interface.
        """
        create_params: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }

        if response_format is not None:
            create_params["response_format"] = response_format

        if max_tokens is not None:
            create_params["max_tokens"] = max_tokens

        # Forward any extra provider-specific kwargs
        create_params.update(kwargs)

        response = self._client.chat.completions.create(**create_params)
        return response.choices[0].message.content

