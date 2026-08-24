"""
Centralized application configuration.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ----------------------------------------------------
# Application URLs
# ----------------------------------------------------

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# ----------------------------------------------------
# Paths
# ----------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# CORS
# ----------------------------------------------------

_raw_origins = os.getenv(
    "CORS_ORIGINS",
    f"{FRONTEND_URL},https://actionos-frontend-eta.vercel.app",
)
CORS_ALLOW_ORIGINS = [
    origin.strip()
    for origin in _raw_origins.split(",")
    if origin.strip()
]

# ----------------------------------------------------
# Debug
# ----------------------------------------------------

DEBUG_TIMING = os.getenv("DEBUG_TIMING", "1") == "1"

# ----------------------------------------------------
# Supabase
# ----------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# ----------------------------------------------------
# AI (Ollama)
# ----------------------------------------------------

AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434/v1",
)
OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen3:8b",
)

# ----------------------------------------------------
# HuggingFace
# ----------------------------------------------------

HF_TOKEN = os.getenv("HF_TOKEN", "")

# ----------------------------------------------------
# Notion
# ----------------------------------------------------

NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "")
NOTION_CLIENT_ID = os.getenv("NOTION_CLIENT_ID", "")
NOTION_CLIENT_SECRET = os.getenv("NOTION_CLIENT_SECRET", "")

NOTION_REDIRECT_URI = os.getenv(
    "NOTION_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/notion/callback",
)

# ----------------------------------------------------
# Google Calendar
# ----------------------------------------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/google/callback",
)

# ----------------------------------------------------
# Slack
# ----------------------------------------------------

SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")

SLACK_REDIRECT_URI = os.getenv(
    "SLACK_REDIRECT_URI",
    f"{BACKEND_URL}/oauth/slack/callback",
)

# ----------------------------------------------------
# Whisper
# ----------------------------------------------------

WHISPER_MODEL_SIZE = "base"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"