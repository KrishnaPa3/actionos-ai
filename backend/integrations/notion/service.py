"""
Notion integration service.

Provides high-level operations (create task, update status, etc.)
using per-user OAuth tokens instead of a shared API key.

Replaces the old NotionService that used NOTION_API_KEY.
"""

from notion_client import Client

STATUS_MAP = {
    "pending": "Not started",
    "completed": "Done",
}


class NotionOAuthService:
    """
    High-level Notion operations using an authenticated client.

    Unlike the old NotionService, this class does NOT create or own
    the client - it receives one from the caller (via get_client()).
    This keeps each request scoped to the authenticated user's token.
    """

    def __init__(self, client: Client, database_id: str | None = None):
        """
        Args:
            client: A notion_client.Client authenticated with a user's OAuth token.
            database_id: Optional database ID. If not provided, will be read
                         from the user's oauth_connections config.
        """
        self.client = client
        self._database_id = database_id

    @property
    def database_id(self) -> str:
        """The database ID to use for operations."""
        return self._database_id or ""

    def set_database_id(self, database_id: str) -> None:
        self._database_id = database_id

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    def get_status(self) -> dict:
        """Check if the connection is active and return basic info."""
        return {
            "connected": True,
        }

    # -----------------------------------------------------
    # DATABASE INFO
    # -----------------------------------------------------

    def get_database(self) -> dict:
        """Retrieve database metadata from Notion."""
        if not self.database_id:
            return {"id": None, "title": None}

        database = self.client.databases.retrieve(database_id=self.database_id)
        title = ""
        if database.get("title"):
            title = "".join(text["plain_text"] for text in database["title"])
        return {"id": database["id"], "title": title}

    # -----------------------------------------------------
    # CREATE
    # -----------------------------------------------------

    def create_task(
        self,
        title: str,
        owner: str = "",
        due_date: str | None = None,
        priority: str = "medium",
        summary: str = "",
        session_link: str | None = None,
        status: str = "pending",
    ) -> dict:
        """Create a task page in the Notion database."""
        payload = {
            "parent": {"database_id": self.database_id},
            "properties": {
                "Name": {"title": [{"text": {"content": title}}]},
                "Owner": {"rich_text": [{"text": {"content": owner or ""}}]},
                "Due Date": {"date": {"start": due_date} if due_date else None},
                "Priority": {
                    "select": {
                        "name": priority.capitalize() if priority else "Medium"
                    }
                },
                "Status": {
                    "status": {"name": STATUS_MAP.get(status, "Not started")}
                },
                "Source Summary": {
                    "rich_text": [{"text": {"content": summary or ""}}]
                },
                "Session Link": {"url": session_link if session_link else None},
            },
        }

        page = self.client.pages.create(**payload)
        return {"page_id": page["id"], "page_url": page["url"]}

    # -----------------------------------------------------
    # READ
    # -----------------------------------------------------

    def get_task(self, page_id: str) -> dict:
        """Retrieve a task page from Notion."""
        page = self.client.pages.retrieve(page_id=page_id)
        properties = page["properties"]

        task = {
            "title": "",
            "owner": "",
            "priority": None,
            "due_date": None,
            "summary": "",
            "session_link": None,
        }

        title = properties["Name"]["title"]
        if title:
            task["title"] = title[0]["plain_text"]

        owner = properties["Owner"]["rich_text"]
        if owner:
            task["owner"] = owner[0]["plain_text"]

        priority = properties["Priority"]["select"]
        if priority:
            task["priority"] = priority["name"].lower()

        due = properties["Due Date"]["date"]
        if due:
            task["due_date"] = due["start"]

        summary = properties["Source Summary"]["rich_text"]
        if summary:
            task["summary"] = summary[0]["plain_text"]

        task["session_link"] = properties["Session Link"]["url"]

        return task

    # -----------------------------------------------------
    # UPDATE STATUS
    # -----------------------------------------------------

    def update_task_status(self, page_id: str, action_status: str) -> None:
        """Update the Status property of a Notion page."""
        notion_status = STATUS_MAP.get(action_status, "Not started")
        self.client.pages.update(
            page_id=page_id,
            properties={"Status": {"status": {"name": notion_status}}},
        )

    # -----------------------------------------------------
    # UPDATE TASK
    # -----------------------------------------------------

    def update_task(
        self,
        page_id: str,
        title: str,
        owner: str = "",
        due_date: str | None = None,
        priority: str = "medium",
        summary: str = "",
        session_link: str | None = None,
        status: str = "pending",
    ) -> None:
        """Update all properties of a Notion task page."""
        self.client.pages.update(
            page_id=page_id,
            properties={
                "Name": {"title": [{"text": {"content": title}}]},
                "Owner": {"rich_text": [{"text": {"content": owner or ""}}]},
                "Due Date": {"date": {"start": due_date} if due_date else None},
                "Priority": {
                    "select": {
                        "name": priority.capitalize() if priority else "Medium"
                    }
                },
                "Status": {
                    "status": {"name": STATUS_MAP.get(status, "Not started")}
                },
                "Source Summary": {
                    "rich_text": [{"text": {"content": summary or ""}}]
                },
                "Session Link": {"url": session_link},
            },
        )
