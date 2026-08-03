"""Provider factory.

Reads the ``AI_PROVIDER`` environment variable and returns the
appropriate provider implementation.

The provider instance is cached as a process-wide singleton so that
clients (and their connection pools) are reused across requests.
"""

from threading import RLock
from typing import Optional

from config import AI_PROVIDER
from services.ai.base import AIProvider
from utils.logging import logger

# ---------------------------------------------------------------------------
# Cached singleton
# ---------------------------------------------------------------------------

_provider: Optional[AIProvider] = None
_provider_lock = RLock()

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

_SUPPORTED_PROVIDERS: dict[str, str] = {
    "ollama": "services.ai.providers.ollama_provider.OllamaProvider",
}


def get_ai_provider() -> AIProvider:
    """Return the configured AI provider (cached singleton).

    The provider is selected by the ``AI_PROVIDER`` environment variable.

    Returns:
        An instance of :class:`AIProvider`.

    Raises:
        ValueError: If ``AI_PROVIDER`` is not set or is not a supported value.
        NotImplementedError: If the provider is recognised but not yet
            implemented (e.g. ``openai``, ``gemini``, ``anthropic``).
    """
    global _provider

    if _provider is not None:
        return _provider

    with _provider_lock:
        # Double-check after acquiring lock
        if _provider is not None:
            return _provider

        provider_name = (AI_PROVIDER or "").strip().lower()

        if not provider_name:
            raise ValueError(
                "AI_PROVIDER environment variable is not set. "
                "Set it to one of: " + ", ".join(_SUPPORTED_PROVIDERS)
            )

        if provider_name not in _SUPPORTED_PROVIDERS:
            raise NotImplementedError(
                f"AI provider '{provider_name}' is not implemented yet. "
                f"Supported values: {', '.join(_SUPPORTED_PROVIDERS)}. "
                f"If you want to add support, implement the AIProvider "
                f"interface and register it in factory.py."
            )

        module_path, class_name = _SUPPORTED_PROVIDERS[provider_name].rsplit(".", 1)

        import importlib

        module = importlib.import_module(module_path)
        provider_cls = getattr(module, class_name)
        _provider = provider_cls()

        logger.info("AI provider initialized", extra={"provider": provider_name})

        return _provider

