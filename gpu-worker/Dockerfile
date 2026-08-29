# =============================================================================
# ActionOS GPU worker - WhisperX + pyannote diarization on an NVIDIA GPU.
#
# Two-stage build. The builder carries compilers and pip caches; the runtime
# stage gets only the finished venv and the model weights, so build-essential
# and git (~900MB) never ship to production.
#
# Model weights are BAKED IN at build time. This matters on Cloud Run, where
# the writable filesystem is in-memory: a model downloaded at runtime is
# charged against the memory limit as a cached file AND again as loaded
# tensors. Image layers are read-only and are not charged that way.
#
# Build (BuildKit required, for the HF token secret):
#   export DOCKER_BUILDKIT=1
#   echo -n "$HF_TOKEN" > /tmp/hf_token
#   docker build --secret id=hf_token,src=/tmp/hf_token -t actionos-gpu-worker .
# =============================================================================

ARG CUDA_IMAGE=nvidia/cuda:12.6.3-runtime-ubuntu24.04

# -----------------------------------------------------------------------------
# Stage 1: builder
# -----------------------------------------------------------------------------
FROM ${CUDA_IMAGE} AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.12 \
        python3.12-venv \
        python3-pip \
        build-essential \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python3.12 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# CUDA-enabled torch, installed BEFORE the rest so pip cannot substitute a CPU
# wheel while resolving whisperx. torchvision is deliberately omitted - nothing
# in an audio pipeline imports it, and it costs roughly a gigabyte.
RUN pip install --no-cache-dir \
        torch==2.8.0 \
        torchaudio==2.8.0 \
        --index-url https://download.pytorch.org/whl/cu126

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Bake the model weights -------------------------------------------------
ENV HF_HOME=/opt/models \
    TORCH_HOME=/opt/models/torch \
    XDG_CACHE_HOME=/opt/models

COPY bake_models.py .
RUN --mount=type=secret,id=hf_token \
    HF_TOKEN="$(cat /run/secrets/hf_token)" python bake_models.py

# --- Ollama + the LLM ------------------------------------------------------
# Cloud Run gives the GPU to one container only, so Ollama runs in this same
# image rather than as a sidecar. The model is pulled at build time for the
# same reason the audio models are: a runtime download would be charged
# against the instance memory limit and would slow every cold start.
ARG OLLAMA_MODEL=qwen3:8b
ENV OLLAMA_MODELS=/opt/ollama-models

# zstd is required by Ollama's installer to extract its release archive; it
# is not in the CUDA base image, and without it the install aborts with
# "This version requires zstd for extraction".
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        zstd \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && ollama --version

RUN mkdir -p /opt/ollama-models \
    && (OLLAMA_HOST=127.0.0.1:11434 ollama serve &) \
    && for i in $(seq 1 60); do \
         curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break; \
         sleep 1; \
       done \
    && OLLAMA_HOST=127.0.0.1:11434 ollama pull "${OLLAMA_MODEL}" \
    && echo "Baked LLM: ${OLLAMA_MODEL}"

# -----------------------------------------------------------------------------
# Stage 2: runtime
# -----------------------------------------------------------------------------
FROM ${CUDA_IMAGE} AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ffmpeg is a genuine runtime dependency: whisperx shells out to it to decode
# audio. No compilers here.
# libpython3.12 is required by torchcodec's FFmpeg bindings. Without it,
# pyannote logs "libpython3.12.so.1.0: cannot open shared object file" and
# falls back to a slower decoding path.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.12 \
        libpython3.12 \
        ffmpeg \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /opt/models /opt/models

# Ollama binary, its runtime libraries, and the baked model blobs.
COPY --from=builder /usr/local/bin/ollama /usr/local/bin/ollama
COPY --from=builder /usr/local/lib/ollama /usr/local/lib/ollama
COPY --from=builder /opt/ollama-models /opt/ollama-models

ENV PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/models \
    TORCH_HOME=/opt/models/torch \
    XDG_CACHE_HOME=/opt/models \
    OLLAMA_MODELS=/opt/ollama-models \
    OLLAMA_HOST=127.0.0.1:11434

WORKDIR /app
COPY model_manager.py whisperx_service.py main.py entrypoint.sh ./
RUN chmod +x entrypoint.sh

RUN useradd -m worker \
    && chown -R worker:worker /app /opt/models /opt/ollama-models
USER worker

EXPOSE 8080

# Cloud Run supplies $PORT. Single worker: the GPU is the bottleneck, and a
# second uvicorn worker would just duplicate the models in VRAM.
CMD ["./entrypoint.sh"]
