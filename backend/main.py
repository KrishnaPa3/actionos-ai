"""
ActionOS backend entrypoint.

This file used to contain ~2000 lines: every route, every DB query,
whisper model loading, and the Notion client setup, all in one module.
It now only does what an entrypoint should:

  * create the FastAPI app
  * configure middleware
  * load lightweight application services via a lifespan handler
  * mount routers

All routes, request/response schemas, and status codes are unchanged -
see routers/ for the endpoints (grouped by resource, matching the
original URL structure) and repositories/ + services/ for the logic
that used to live inline in each handler.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ALLOW_ORIGINS
from services.notion_service import NotionService

from routers import actions, decisions, extraction, integrations, profile, reminders, risks, sessions, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AI models are intentionally not initialized here.  They are created on
    # the first /upload-audio request by services.model_manager.
    app.state.notion_service = NotionService()

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


app.include_router(sessions.router)
app.include_router(actions.router)
app.include_router(risks.router)
app.include_router(decisions.router)
app.include_router(reminders.router)
app.include_router(uploads.router)
app.include_router(extraction.router)
app.include_router(integrations.router)
app.include_router(profile.router)

