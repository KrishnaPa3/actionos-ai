#!/usr/bin/env bash
# Start Ollama and the transcription API in one container.
#
# Cloud Run assigns a GPU to a single container, so a sidecar cannot share the
# L4 with WhisperX. Running both processes here lets them use the same GPU and
# the same scale-to-zero instance.
set -euo pipefail

export OLLAMA_HOST="127.0.0.1:11434"
export OLLAMA_MODELS="${OLLAMA_MODELS:-/opt/ollama-models}"
# Keep the model resident: reloading 5GB into VRAM per request would dominate
# the response time on a service that already scales to zero.
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:--1}"
# Ollama defaults to a 4096-token context. The extraction prompt plus a
# meeting transcript was measured at 3713 tokens - close enough to the ceiling
# that a slightly longer meeting gets silently truncated, and a truncated
# transcript produces incomplete JSON (missing tasks, missing due dates).
# qwen3:8b supports 40960; 32768 leaves headroom without a large KV cache.
export OLLAMA_CONTEXT_LENGTH="${OLLAMA_CONTEXT_LENGTH:-32768}"

echo "Starting ollama serve..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to accept connections before uvicorn starts taking traffic.
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    echo "Ollama is ready after ${i}s."
    break
  fi
  if ! kill -0 "$OLLAMA_PID" 2>/dev/null; then
    echo "ollama serve exited during startup." >&2
    exit 1
  fi
  sleep 1
done

# If either process dies, let the container die so Cloud Run replaces it.
terminate() { kill -TERM "$OLLAMA_PID" 2>/dev/null || true; }
trap terminate EXIT

echo "Starting API on port ${PORT:-8080}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8080}" --workers 1
