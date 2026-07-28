# Migration Guide: AI Provider Abstraction

## Summary

The backend now routes all AI model interactions through a common
provider interface instead of calling Ollama directly.  This means:

- Switching providers requires **changing only environment variables**.
- Business logic no longer imports SDKs like `openai` directly.
- Adding a new provider means implementing one class, nothing else.

## What Changed

### New files

```
backend/services/ai/
├── __init__.py              # Public API (exports get_ai_provider)
├── base.py                  # Abstract AIProvider interface
├── factory.py               # Provider factory with singleton caching
└── providers/
    ├── __init__.py
    └── ollama_provider.py   # Ollama implementation (moved from extraction_service.py)
```

### Modified files

- **``backend/config.py``** — Added `AI_PROVIDER`, `OLLAMA_BASE_URL`,
  `OLLAMA_MODEL`, and placeholder variables for OpenAI, Gemini, Anthropic.
- **``backend/services/extraction_service.py``** — Replaced direct
  `OpenAI(...)` client with `get_ai_provider().chat(...)`.
  Prompts, parsing, normalisation, and validation are **unchanged**.
- **``backend/llm_service.py``** — Same replacement.  Logic is identical.

## How to Switch Providers

### 1. Set the environment variable

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### 2. (optional) Register a new provider in factory.py

If the provider is not yet registered, add it to the registry in
``backend/services/ai/factory.py``:

```python
_SUPPORTED_PROVIDERS["openai"] = "services.ai.providers.openai_provider.OpenAIProvider"
```

### 3. Implement the provider class

Create a file like ``backend/services/ai/providers/openai_provider.py``
that implements the ``AIProvider`` interface:

```python
from services.ai.base import AIProvider

class OpenAIProvider(AIProvider):
    def chat(self, system_prompt, user_prompt, temperature=0.0,
             response_format=None, max_tokens=None, **kwargs) -> str:
        ...
```

## Verification

After deploying, verify the application behaves identically:

```bash
AI_PROVIDER=ollama
# Start the backend and run a normal upload.
# All output should be exactly the same as before the refactor.
```

## Rollback

No rollback is needed — the ``ollama`` provider reproduces the exact
same Ollama API calls.  Simply keep ``AI_PROVIDER=ollama`` (or unset it,
since ``ollama`` is the default) and everything works as before.

## Future Extensibility

The ``AIProvider`` interface is designed to support:

- Streaming responses (via an async generator method)
- Structured JSON output (already supported via ``response_format``)
- Vision models (via ``**kwargs``)
- Function/tool calling
- Token usage tracking
- Cost tracking
- Retry logic with exponential backoff
- Timeouts

None of these require changes to business logic.

