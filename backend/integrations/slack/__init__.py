"""
Slack OAuth integration package.

Provides a complete OAuth 2.0 flow for Slack integration:
- oauth.py: OAuth URL generation and token exchange
- client.py: Per-user Slack SDK client factory
- service.py: High-level operations (future: post messages, etc.)
- router.py: FastAPI router with OAuth endpoints
"""

from integrations.slack.oauth import generate_oauth_url, exchange_code_for_token
from integrations.slack.client import get_client
from integrations.slack.router import router

__all__ = [
    "generate_oauth_url",
    "exchange_code_for_token",
    "get_client",
    "router",
]

