"""
Centralized application configuration.

Collects everything that was previously scattered as module-level
globals in main.py (paths, CORS origins, debug flags) into one place.

Environment variables are loaded here (once) from a .env file.
All other modules should import from this module rather than calling
load_dotenv() themselves.

--------------------------------------------------------------------
Environment-driven configuration
--------------------------------------------------------------------
Every URL, credential, and toggle in this file reads from an
environment variable with a **local-development default** so the
project runs out-of-the-box with ``npm run dev`` + ``uvicorn``.

For Docker Compose or production, simply set the environment
variables (or let docker-compose.yml inject them) — no code edits
required.
"""

import os
from dotenv import load_dotenv

# Load environment variables once at configuration import time.
# This runs before any other module accesses os.getenv(), so env vars
# are available application-wide without each module calling load_dotenv().
load_dotenv()

# ----------------------------------------------------
# Application URLs (environment-driven)
# ----------------------------------------------------
# FRONTEND_URL – browser-accessible frontend URL (used for CORS,
#                OAuth callback redirects, session links).
# BACKEND_URL  – browser-accessible backend URL (used for OAuth
#                redirect URIs, health checks).
#
# Local dev defaults point to localhost.  Docker Compose and
# production override these via environment variables.

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# ----------------------------------------------------
# Paths
# ----------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# CORS (configurable, supports multiple origins)
# ----------------------------------------------------
# Read from CORS_ORIGINS env var (comma-separated).
# Defaults to FRONTEND_URL so local dev works without extra config.
# For multiple origins: CORS_ORIGINS=http://localhost:5173,https://app.example.com
_raw_origins = os.getenv("CORS_ORIGINS", FRONTEND_URL)
CORS_ALLOW_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

# ----------------------------------------------------
# Debug / timing instrumentation
# ----------------------------------------------------
# Same behaviour as before (timings were always printed) but now gated
# behind an env var so production logs aren't spammed by default.
# Set DEBUG_TIMING=1 to restore the old "always print" behaviour.

DEBUG_TIMING = os.getenv("DEBUG_TIMING", "1") == "1"

# ----------------------------------------------------
# Supabase
# ----------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

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
# HuggingFace (required for WhisperX diarization)
# ----------------------------------------------------

HF_TOKEN = os.getenv("HF_TOKEN", "")

# ----------------------------------------------------
# Notion Integration
# ----------------------------------------------------

NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "")
NOTION_CLIENT_ID = os.getenv("NOTION_CLIENT_ID", "")
NOTION_CLIENT_SECRET = os.getenv("NOTION_CLIENT_SECRET", "")
# Default redirect URI derives from BACKEND_URL so it follows the
# environment automatically.  Override explicitly only if your OAuth
# provider requires a different URI.
NOTION_REDIRECT_URI = os.getenv(
    "NOTION_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/notion/callback",
)

# ----------------------------------------------------
# Google Calendar Integration
# ----------------------------------------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/google/callback",
)

# ----------------------------------------------------
# Slack Integration
# ----------------------------------------------------

SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.getenv(
    "SLACK_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/slack/callback",
)

# ----------------------------------------------------
# Whisper model configuration
# ----------------------------------------------------

WHISPER_MODEL_SIZE = "base"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"
