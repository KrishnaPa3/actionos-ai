#!/bin/bash
# =============================================================================
# Pull the Ollama model for ActionOS
#
# This script pulls the specified model into the running Ollama container.
# Run this once after the first `docker compose up -d`.
#
# Usage:
#   ./scripts/pull-ollama-model.sh              # pulls default (qwen3:8b)
#   ./scripts/pull-ollama-model.sh llama3.2:1b   # pulls a different model
# =============================================================================

set -euo pipefail

MODEL="${1:-qwen3:8b}"
CONTAINER="actionos-ollama"

echo "Pulling model: ${MODEL} into container: ${CONTAINER}"

docker exec -it "${CONTAINER}" ollama pull "${MODEL}"

echo ""
echo "Model ${MODEL} pulled successfully!"
echo ""
echo "Update OLLAMA_MODEL in your .env file to: ${MODEL}"
