"""Abstract base class for all AI providers.

All providers must implement the ``chat`` method.
The interface is designed to be future-proof for streaming,
structured output, vision, tool calling, and usage tracking.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class AIProvider(ABC):
    """Common interface for AI model interactions.

    Business logic should never import provider-specific SDKs.
    All model calls go through this interface.
    """

    @abstractmethod
    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Send a chat completion request and return the response text.

        Args:
            system_prompt: System-level instruction for the model.
            user_prompt: User message content.
            temperature: Sampling temperature (0.0 = deterministic).
            response_format: Optional format constraint, e.g.
                ``{"type": "json_object"}``.
            max_tokens: Maximum tokens in the response.
            **kwargs: Additional provider-specific parameters.

        Returns:
            The model's response as a plain string.

        Raises:
            AIProviderError: On API or network failure.
        """
        ...

    async def chat_async(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Async variant of :meth:`chat`.

        Default implementation simply wraps the synchronous call.
        Providers that support true async I/O should override this.
        """
        return self.chat(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            response_format=response_format,
            max_tokens=max_tokens,
            **kwargs,
        )

