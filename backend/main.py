"""
ActionOS backend entrypoint.

This file used to contain ~2000 lines: every route, every DB query,
whisper model loading, and the Notion client setup, all in one module.
It now only does what an entrypoint should:

  * create the FastAPI app
  * configure middleware
  * validate required environment variables at startup
  * load lightweight application services via a lifespan handler
  * mount routers

All routes, request/response schemas, and status codes are unchanged -
see routers/ for the endpoints (grouped by resource, matching the
original URL structure) and repositories/ + services/ for the logic
that used to live inline in each handler.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ALLOW_ORIGINS

from routers import actions, decisions, extraction, integrations, profile, reminders, risks, sessions, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ------------------------------------------------------------------
    # Startup validation: fail fast if required env vars are missing.
    # Only vars with NO default value in config.py are required.
    # AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL have defaults so
    # they are optional overrides, not validated here.
    # This runs inside the lifespan so imports stay side-effect free
    # and tests can run without env vars set.
    # ------------------------------------------------------------------
    _REQUIRED_ENV_VARS = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]

    _missing = [var for var in _REQUIRED_ENV_VARS if not os.getenv(var)]
    if _missing:
        raise RuntimeError(
            "Cannot start ActionOS backend. The following required environment "
            "variables are not set:\n"
            "  " + ", ".join(_missing) + "\n"
            "Please set them in your .env file or environment before starting."
        )

    # ------------------------------------------------------------------
    # AI models are intentionally not initialized here. They are created on
    # the first /upload-audio request by services.model_manager.
    # ------------------------------------------------------------------
    # Per-user integrations (Notion OAuth, etc.) are stored in the
    # oauth_connections table and accessed at request time via the
    # integrations/* routers. No global state is needed here.
    # ------------------------------------------------------------------

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "ActionOS Backend Running"}


@app.get("/health")
async def health():
    """Health check endpoint for container orchestrators and load balancers."""
    return {
        "status": "healthy",
        "service": "ActionOS Backend",
        "version": "1.0.0",
    }


app.include_router(sessions.router)
app.include_router(actions.router)
app.include_router(risks.router)
app.include_router(decisions.router)
app.include_router(reminders.router)
app.include_router(uploads.router)
app.include_router(extraction.router)
app.include_router(integrations.router)
app.include_router(profile.router)
