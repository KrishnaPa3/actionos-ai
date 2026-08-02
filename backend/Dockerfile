# =============================================================================
# ActionOS Backend - Production Dockerfile
# CUDA 12.6 + Python 3.12
# =============================================================================

FROM nvidia/cuda:12.6.3-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# -----------------------------------------------------------------------------
# Install Python 3.12 + system dependencies
# -----------------------------------------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-venv \
    python3-pip \
    ffmpeg \
    curl \
    git \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Create virtual environment
# -----------------------------------------------------------------------------

RUN python3.12 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

# -----------------------------------------------------------------------------
# Upgrade packaging tools
# -----------------------------------------------------------------------------

RUN python3.12 -m pip install --upgrade pip setuptools wheel

# -----------------------------------------------------------------------------
# Install CUDA-enabled PyTorch
# -----------------------------------------------------------------------------

RUN pip install --no-cache-dir \
    torch==2.13.0 \
    torchvision==0.28.0 \
    torchaudio==2.11.0 \
    --index-url https://download.pytorch.org/whl/cu126

# -----------------------------------------------------------------------------
# Install Python dependencies
# -----------------------------------------------------------------------------

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Copy application
# -----------------------------------------------------------------------------

COPY . .

# -----------------------------------------------------------------------------
# Create non-root user
# -----------------------------------------------------------------------------

RUN useradd -m actionos && \
    mkdir -p /app/uploads && \
    mkdir -p /home/actionos/.cache/huggingface && \
    mkdir -p /home/actionos/.cache/torch && \
    chown -R actionos:actionos /app /home/actionos

USER actionos

# -----------------------------------------------------------------------------
# Cache locations
# -----------------------------------------------------------------------------

ENV HOME=/home/actionos
ENV HF_HOME=/home/actionos/.cache/huggingface
ENV TRANSFORMERS_CACHE=/home/actionos/.cache/huggingface
ENV TORCH_HOME=/home/actionos/.cache/torch
ENV XDG_CACHE_HOME=/home/actionos/.cache

# -----------------------------------------------------------------------------
# Health Check
# -----------------------------------------------------------------------------

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# -----------------------------------------------------------------------------
# Expose API
# -----------------------------------------------------------------------------

EXPOSE 8000

# -----------------------------------------------------------------------------
# Start FastAPI
# -----------------------------------------------------------------------------

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]