"""
Google Calendar integration service.

Provides high-level operations (create event, etc.)
using per-user OAuth tokens instead of API keys.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional


class GoogleCalendarService:
    """
    High-level Google Calendar operations using an authenticated client.

    Unlike old services, this class does NOT create or own the client -
    it receives one from the caller (via get_client()).
    This keeps each request scoped to the authenticated user's token.
    """

    def __init__(self, client: Any):
        """
        Args:
            client: A googleapiclient.discovery.Resource instance for Google Calendar API.
        """
        self.client = client

    def create_event(
        self,
        summary: str,
        description: str = "",
        due_date: str | None = None,
    ) -> dict:
        """
        Create an event in the primary Google Calendar.

        Args:
            summary: Event title / summary (task title).
            description: Event description containing task description, meeting name, owner, priority, session link.
            due_date: Optional ISO date or datetime string.

        Returns:
            dict: {"event_id": "...", "event_url": "..."}
        """
        event_body = {
            "summary": summary,
            "description": description,
        }

        if due_date:
            # Timed event
            try:
                dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                start_iso = dt.isoformat()
                end_iso = (dt + timedelta(hours=1)).isoformat()
                event_body["start"] = {"dateTime": start_iso, "timeZone": "UTC"}
                event_body["end"] = {"dateTime": end_iso, "timeZone": "UTC"}
            except Exception:
                if len(due_date) == 10 and "-" in due_date:
                    start_iso = f"{due_date}T09:00:00Z"
                    end_iso = f"{due_date}T10:00:00Z"
                    event_body["start"] = {"dateTime": start_iso, "timeZone": "UTC"}
                    event_body["end"] = {"dateTime": end_iso, "timeZone": "UTC"}
                else:
                    event_body["start"] = {"dateTime": due_date, "timeZone": "UTC"}
                    event_body["end"] = {"dateTime": due_date, "timeZone": "UTC"}
        else:
            # All-day event (end date is exclusive in Google Calendar)
            today_dt = datetime.now(timezone.utc)
            tomorrow_dt = today_dt + timedelta(days=1)
            today_str = today_dt.strftime("%Y-%m-%d")
            tomorrow_str = tomorrow_dt.strftime("%Y-%m-%d")
            event_body["start"] = {"date": today_str}
            event_body["end"] = {"date": tomorrow_str}

        event = (
            self.client.events()
            .insert(calendarId="primary", body=event_body)
            .execute()
        )

        return {
            "event_id": event.get("id", ""),
            "event_url": event.get("htmlLink", ""),
        }
