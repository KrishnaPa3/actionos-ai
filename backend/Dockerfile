# =============================================================================
# ActionOS Backend - Multi-stage Docker Image
#
# Stage 1: Build dependencies
# Stage 2: Runtime image (CUDA-enabled for GPU inference)
# =============================================================================

# =============================================================================
# STAGE 1: Python dependency builder
# =============================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt


# =============================================================================
# STAGE 2: Runtime image
# =============================================================================
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# --------------------------------------------------------------------------
# Install system dependencies
# --------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-venv \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a symlink so python3 points to python3.12
RUN ln -sf /usr/bin/python3.12 /usr/bin/python3 && \
    ln -sf /usr/bin/python3 /usr/bin/python

# --------------------------------------------------------------------------
# Copy Python packages from builder stage
# --------------------------------------------------------------------------
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# --------------------------------------------------------------------------
# Create application user (non-root)
# --------------------------------------------------------------------------
RUN groupadd -r actionos && useradd -r -g actionos -d /app -s /bin/false actionos

# --------------------------------------------------------------------------
# Set up application directory
# --------------------------------------------------------------------------
WORKDIR /app

# Copy application code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p /app/uploads && chown -R actionos:actionos /app/uploads

# Create cache directories for models
RUN mkdir -p /root/.cache/huggingface /root/.cache/whisper /root/.cache/torch && \
    mkdir -p /root/.ollama

# --------------------------------------------------------------------------
# Health check
# --------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# --------------------------------------------------------------------------
# Expose port
# --------------------------------------------------------------------------
EXPOSE 8000

# --------------------------------------------------------------------------
# Run as non-root user
# --------------------------------------------------------------------------
USER actionos

# --------------------------------------------------------------------------
# Start the application
# --------------------------------------------------------------------------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
