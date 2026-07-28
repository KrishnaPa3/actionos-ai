"""
Centralized application configuration.

Collects everything that was previously scattered as module-level
globals in main.py (paths, CORS origins, debug flags) into one place.

Environment variables are loaded here (once) from a .env file.
All other modules should import from this module rather than calling
load_dotenv() themselves.
"""

import os
from dotenv import load_dotenv

# Load environment variables once at configuration import time.
# This runs before any other module accesses os.getenv(), so env vars
# are available application-wide without each module calling load_dotenv().
load_dotenv()

# ----------------------------------------------------
# Paths
# ----------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# CORS
# ----------------------------------------------------
# Read from CORS_ORIGINS env var (comma-separated).
# Default to localhost:5173 for local development.
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ALLOW_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

# ----------------------------------------------------
# Debug / timing instrumentation
# ----------------------------------------------------
# Same behaviour as before (timings were always printed) but now gated
# behind an env var so production logs aren't spammed by default.
# Set DEBUG_TIMING=1 to restore the old "always print" behaviour.

DEBUG_TIMING = os.getenv("DEBUG_TIMING", "1") == "1"

# ----------------------------------------------------
# AI Provider Configuration
# ----------------------------------------------------
# All AI interactions go through a common provider interface selected
# by the AI_PROVIDER environment variable.  Changing this variable is
# the only thing needed to switch between providers.
# Supported values: ollama (default), openai, gemini, anthropic

AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ----------------------------------------------------
# Whisper model configuration
# ----------------------------------------------------

WHISPER_MODEL_SIZE = "base"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"
