"""
Slack integration service.

Provides high-level Slack operations (list channels, send task messages, etc.)
using per-user OAuth tokens instead of API keys.

Mirrors the architecture of GoogleCalendarService.
"""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class SlackService:
    """
    High-level Slack operations using an authenticated WebClient.

    Like GoogleCalendarService, this class does NOT create or own the client -
    it receives one from the caller (via get_client()).
    This keeps each request scoped to the authenticated user's token.
    """

    def __init__(self, client: Any):
        """
        Args:
            client: A slack_sdk.WebClient instance authenticated with the user's bot token.
        """
        self.client = client

    def list_channels(self) -> list[dict]:
        """
        List all non-archived public channels the bot has access to.

        Uses conversations_list() with the public_channel types filter.
        Excludes archived channels.

        Returns:
            list[dict]: List of { "id": "C...", "name": "..." } dicts.
        """
        try:
            response = self.client.conversations_list(
                types="public_channel,private_channel",
                exclude_archived=True,
                limit=200,
            )
        except Exception as exc:
            logger.error(
                "SlackService.list_channels — conversations_list failed: %s: %s",
                type(exc).__name__, exc,
            )
            raise

        channels = []
        for channel in response.get("channels", []):
            if not channel.get("is_archived", False):
                channels.append({
                    "id": channel["id"],
                    "name": channel["name"],
                })

        return channels

    def send_task_message(
        self,
        channel_id: str,
        title: str,
        description: Optional[str] = None,
        owner: Optional[str] = None,
        priority: Optional[str] = None,
        due_date: Optional[str] = None,
        meeting_name: Optional[str] = None,
        session_link: Optional[str] = None,
    ) -> dict:
        """
        Send a formatted task message to a Slack channel.

        The message uses Slack-compatible mrkdwn formatting for readability.

        Args:
            channel_id: The Slack channel ID to post to.
            title: Task title.
            description: Optional task description/notes.
            owner: Task owner name.
            priority: Task priority (high, medium, low).
            due_date: Optional ISO date string.
            meeting_name: Source meeting name.
            session_link: Optional URL to the ActionOS results page.

        Returns:
            dict: {"message_ts": "...", "channel_id": "...", "message": "..."}

        Raises:
            Exception: If the Slack API call fails.
        """
        # Build the message blocks
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📌 New Action Item",
                    "emoji": True,
                },
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Task:*\n{title}",
                    },
                ],
            },
        ]

        # Add owner if present
        if owner:
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Owner:*\n{owner}",
                    },
                ],
            })

        # Add priority if present
        if priority:
            priority_emoji = {
                "high": "🔴",
                "medium": "🟡",
                "low": "🟢",
            }.get(priority.lower(), "⚪")
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Priority:*\n{priority_emoji} {priority.capitalize()}",
                    },
                ],
            })

        # Add due date if present
        if due_date:
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Due:*\n{due_date}",
                    },
                ],
            })

        # Add description if present
        if description:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Notes:*\n{description}",
                },
            })

        # Add meeting name if present
        if meeting_name:
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Meeting:*\n{meeting_name}",
                    },
                ],
            })

        # Add session link if present
        if session_link:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*<{session_link}|Open in ActionOS>*",
                },
            })

        blocks.append({"type": "divider"})
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Synced from ActionOS",
                },
            ],
        })

        try:
            response = self.client.chat_postMessage(
                channel=channel_id,
                blocks=blocks,
                text=f"📌 New Action Item: {title}",  # Fallback text
                unfurl_links=False,
                unfurl_media=False,
            )
        except Exception as exc:
            logger.error(
                "SlackService.send_task_message — chat_postMessage failed: %s: %s",
                type(exc).__name__, exc,
            )
            raise

        ts = response.get("ts", "")
        logger.info(
            "SlackService.send_task_message — posted to channel=%s ts=%s",
            channel_id, ts,
        )

        return {
            "message_ts": ts,
            "channel_id": channel_id,
            "message": f"Task sent to Slack (channel: {channel_id})",
        }

