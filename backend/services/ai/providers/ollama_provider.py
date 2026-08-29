"""Ollama provider implementation.

Talks to Ollama's OpenAI-compatible endpoint.

Ollama now runs inside the gpu-worker Cloud Run service (Cloud Run assigns a
GPU to a single container, so it shares the container with WhisperX rather
than sitting in a sidecar). The worker exposes it at <service-url>/v1.

That service is deployed private, so requests must carry a Google-signed ID
token. The OpenAI SDK sends whatever ``api_key`` it is given as
``Authorization: Bearer ...``, so the token goes in there. ID tokens expire
after an hour, so the client is rebuilt before that.

Pointing OLLAMA_BASE_URL at a local Ollama (development, or the old VM) still
works unchanged: token minting is skipped for non-Cloud Run hosts.
"""

import time
from threading import RLock
from typing import Any, Optional
from urllib.parse import urlparse

from openai import OpenAI

from config import OLLAMA_BASE_URL, OLLAMA_MODEL
from services.ai.base import AIProvider


# Refresh comfortably before the one-hour expiry.
_TOKEN_TTL_SECONDS = 45 * 60


def _needs_google_auth(base_url: str) -> bool:
    """True when base_url points at a private Cloud Run service."""
    host = urlparse(base_url).hostname or ""
    return host.endswith(".run.app")


def _audience(base_url: str) -> str:
    """The ID token audience: the service root, without the /v1 path."""
    parsed = urlparse(base_url)
    return f"{parsed.scheme}://{parsed.netloc}"


class OllamaProvider(AIProvider):
    """Provider that talks to Ollama via its OpenAI-compatible API."""

    def __init__(self) -> None:
        self._model = OLLAMA_MODEL
        self._base_url = OLLAMA_BASE_URL
        self._use_google_auth = _needs_google_auth(self._base_url)
        self._lock = RLock()
        self._client: Optional[OpenAI] = None
        self._client_created_at = 0.0

    # -- auth ---------------------------------------------------------------

    def _mint_id_token(self) -> str:
        from google.auth.transport.requests import Request
        from google.oauth2 import id_token

        return id_token.fetch_id_token(Request(), _audience(self._base_url))

    def _get_client(self) -> OpenAI:
        with self._lock:
            fresh_enough = (
                self._client is not None
                and (time.monotonic() - self._client_created_at) < _TOKEN_TTL_SECONDS
            )
            if fresh_enough:
                return self._client

            if self._use_google_auth:
                try:
                    api_key = self._mint_id_token()
                except Exception as exc:
                    raise RuntimeError(
                        "Could not mint a Google ID token for the Ollama service at "
                        f"{self._base_url}. On Cloud Run this uses the runtime service "
                        f"account; check it has roles/run.invoker on the worker. ({exc})"
                    ) from exc
            else:
                # Local or VM-hosted Ollama ignores the key, but the SDK requires one.
                api_key = "ollama"

            self._client = OpenAI(base_url=self._base_url, api_key=api_key)
            self._client_created_at = time.monotonic()
            return self._client

    # -- inference ----------------------------------------------------------

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Send a chat completion to Ollama and return the response text."""
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

        create_params.update(kwargs)

        response = self._get_client().chat.completions.create(**create_params)
        return response.choices[0].message.content
