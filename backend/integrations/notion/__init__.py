"""
Notion OAuth integration package.

Provides a complete OAuth 2.0 flow for Notion integration:
- oauth.py: OAuth URL generation and token exchange
- client.py: Per-user Notion SDK client factory
- service.py: High-level operations (create task, update status, etc.)
- router.py: FastAPI router with OAuth endpoints

Replaces the old API-key-based NotionService (backend/services/notion_service.py).
"""

from integrations.notion.oauth import generate_oauth_url, exchange_code_for_token
from integrations.notion.client import get_client
from integrations.notion.router import router

__all__ = [
    "generate_oauth_url",
    "exchange_code_for_token",
    "get_client",
    "router",
]
