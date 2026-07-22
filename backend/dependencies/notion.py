"""
Notion service singleton.

`NotionService()` was instantiated once at module import time in the
original main.py and reused for every request. That single-instance
behavior is preserved, but the instance now lives on `app.state`
(set once during the app's lifespan startup in main.py) instead of a
bare module-level global - this avoids the "global mutable state"
anti-pattern flagged in Phase 5 while keeping the exact same
one-instance-per-process lifecycle.
"""

from fastapi import Request

from services.notion_service import NotionService


def get_notion_service(request: Request) -> NotionService:
    return request.app.state.notion_service
