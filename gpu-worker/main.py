"""ActionOS GPU worker.

A small HTTP service that owns every GPU-bound part of the pipeline. The API
service (backend/) no longer imports torch, whisperx or pyannote at all - it
calls this over HTTP instead.

Endpoints
---------
GET  /healthz     liveness + which device torch actually got
POST /warm        preload the language-independent models
POST /transcribe  {"audio_url": ...} -> transcript + speaker transcript

Auth is handled at the edge: deploy this with --no-allow-unauthenticated and
grant the API service's service account roles/run.invoker. Cloud Run then
rejects unauthenticated callers before a request reaches this process, so
there is no token checking here.

Note on temp files: on Cloud Run the writable filesystem is in-memory and is
charged against the instance memory limit, so downloaded audio is streamed to
a NamedTemporaryFile and deleted in a finally block rather than accumulating.
"""

import os
import tempfile
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field

from model_manager import get_whisperx_device, warm_audio_models
from whisperx_service import transcribe_with_speakers


MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(200 * 1024 * 1024)))
DOWNLOAD_TIMEOUT = float(os.getenv("DOWNLOAD_TIMEOUT_SECONDS", "120"))
WARM_ON_STARTUP = os.getenv("WARM_ON_STARTUP", "1") == "1"

# Ollama runs as a second process inside this container (see entrypoint.sh),
# because Cloud Run assigns the GPU to one container only.
OLLAMA_INTERNAL_URL = os.getenv("OLLAMA_INTERNAL_URL", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "600"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loading at startup rather than on the first request means Cloud Run's
    # startup probe absorbs the model load, instead of the first user waiting
    # for it. Weights are already in the image, so this is a local read.
    if WARM_ON_STARTUP:
        try:
            warm_audio_models()
        except Exception as exc:  # never block startup on a warm-up failure
            print(f"Warm-up failed, models will load lazily instead: {exc}")
    yield


app = FastAPI(title="ActionOS GPU worker", lifespan=lifespan)


class TranscribeRequest(BaseModel):
    audio_url: str = Field(..., description="URL the worker can GET the audio from.")
    min_speakers: int | None = Field(default=None, ge=1)
    max_speakers: int | None = Field(default=None, ge=1)


@app.get("/healthz")
def healthz():
    import torch

    return {
        "status": "ok",
        "device": get_whisperx_device(),
        "cuda_available": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


@app.post("/warm")
def warm():
    warm_audio_models()
    return {"status": "warm", "device": get_whisperx_device()}


def _download_to_tempfile(url: str) -> str:
    """Stream *url* to a temp file, refusing anything over MAX_AUDIO_BYTES."""
    suffix = os.path.splitext(url.split("?")[0])[1] or ".audio"
    handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    written = 0

    try:
        with httpx.stream("GET", url, timeout=DOWNLOAD_TIMEOUT, follow_redirects=True) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes():
                written += len(chunk)
                if written > MAX_AUDIO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Audio exceeds {MAX_AUDIO_BYTES} bytes.",
                    )
                handle.write(chunk)
    except httpx.HTTPError as exc:
        handle.close()
        os.unlink(handle.name)
        raise HTTPException(status_code=502, detail=f"Could not fetch audio: {exc}") from exc
    except Exception:
        handle.close()
        os.unlink(handle.name)
        raise

    handle.close()
    return handle.name


@app.post("/transcribe")
def transcribe(request: TranscribeRequest):
    path = _download_to_tempfile(request.audio_url)

    try:
        return transcribe_with_speakers(
            path,
            min_speakers=request.min_speakers,
            max_speakers=request.max_speakers,
        )
    except HTTPException:
        raise
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Ollama passthrough
# ---------------------------------------------------------------------------
# Only the ingress container is reachable from outside, so the API cannot talk
# to Ollama directly. These routes forward its OpenAI-compatible traffic to the
# in-container Ollama, which means the API just points OLLAMA_BASE_URL at
# <this service>/v1 and the OpenAI SDK works unchanged.

_HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length",
}


async def _proxy_to_ollama(prefix: str, path: str, request: Request) -> Response:
    url = f"{OLLAMA_INTERNAL_URL}/{prefix}/{path}"

    # Drop the caller's Authorization header: it carries the Google ID token
    # used to authenticate to Cloud Run, which Ollama has no use for.
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _HOP_BY_HOP and key.lower() != "authorization"
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            upstream = await client.request(
                request.method,
                url,
                content=await request.body(),
                headers=headers,
                params=dict(request.query_params),
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable: {exc}") from exc

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


@app.api_route("/v1/{path:path}", methods=["GET", "POST"])
async def ollama_openai_proxy(path: str, request: Request):
    """OpenAI-compatible endpoints (/v1/chat/completions, /v1/models, ...)."""
    return await _proxy_to_ollama("v1", path, request)


@app.api_route("/api/{path:path}", methods=["GET", "POST"])
async def ollama_native_proxy(path: str, request: Request):
    """Ollama's native API (/api/tags, /api/generate, ...)."""
    return await _proxy_to_ollama("api", path, request)
