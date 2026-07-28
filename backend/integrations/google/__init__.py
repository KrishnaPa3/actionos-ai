"""
Google OAuth integration package.

Provides a complete OAuth 2.0 flow for Google Calendar integration:
- oauth.py: OAuth URL generation and token exchange
- client.py: Per-user Google Calendar API client factory
- service.py: High-level operations (create event, etc.)
- router.py: FastAPI router with OAuth endpoints
"""

from integrations.google.oauth import generate_oauth_url, exchange_code_for_token
from integrations.google.client import get_client
from integrations.google.router import router
from integrations.google.service import GoogleCalendarService

__all__ = [
    "generate_oauth_url",
    "exchange_code_for_token",
    "get_client",
    "router",
    "GoogleCalendarService",
]
