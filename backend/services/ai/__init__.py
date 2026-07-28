"""AI provider abstraction layer.

All AI interactions go through a common provider interface.
Switching providers requires only changing the ``AI_PROVIDER``
environment variable.
"""

from services.ai.factory import get_ai_provider

__all__ = ["get_ai_provider"]

