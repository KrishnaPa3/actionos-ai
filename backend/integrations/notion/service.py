"""
Notion integration service.

Provides high-level operations (create task, update status, etc.)
using per-user OAuth tokens instead of a shared API key.

SCHEMA HANDLING
    Users pick an arbitrary Notion database, so we cannot assume it has the
    columns this app writes. Two mechanisms cover that:

      1. ensure_schema() adds the missing properties when the user selects a
         database, so the common case needs no manual setup.
      2. Every write reads the data source's real schema and emits only
         properties that exist, shaped by their ACTUAL type. A missing or
         retyped column degrades that one field instead of failing the whole
         request with a 400 from Notion.

    Previously the payload was hardcoded, so a single missing column produced
    "Owner is not a property that exists…" and killed the entire sync.

NOTION API VERSION
    notion-client 3.x targets the 2025-09-03 API, where a database contains
    one or more *data sources* and the schema lives on the data source, not
    the database. Schema reads/writes therefore go through client.data_sources
    while pages.create() still accepts a database_id parent.
"""

from typing import Any, Optional

from notion_client import Client

STATUS_MAP = {
    "pending": "Not started",
    "completed": "Done",
}

# Notion rejects rich_text / url values longer than 2000 characters.
_MAX_TEXT = 2000


class NotionSchemaError(RuntimeError):
    """The selected Notion data source cannot satisfy a sync operation."""


# Properties this app writes, with the definition used to create them when
# absent. Status is declared as a *select*, not Notion's status type: the API
# cannot create or modify status properties, so a select keeps setup fully
# automatic. An existing status-typed column is detected and written correctly
# regardless — see _build_value().
REQUIRED_PROPERTIES: dict[str, dict] = {
    "Owner": {"rich_text": {}},
    "Due Date": {"date": {}},
    "Priority": {
        "select": {
            "options": [
                {"name": "Low", "color": "blue"},
                {"name": "Medium", "color": "yellow"},
                {"name": "High", "color": "red"},
            ]
        }
    },
    "Status": {
        "select": {
            "options": [
                {"name": "Not started", "color": "default"},
                {"name": "Done", "color": "green"},
            ]
        }
    },
    "Source Summary": {"rich_text": {}},
    "Session Link": {"url": {}},
}


def _truncate(value: Any) -> str:
    text = "" if value is None else str(value)
    return text[:_MAX_TEXT]


def _build_value(prop_type: str, value: Any) -> Optional[dict]:
    """
    Shape a single value for a Notion property of the given type.

    Returns None when the value cannot be represented in that type (a people
    column, say, which needs a user id rather than a name) so the caller can
    skip the property rather than send something Notion will reject.
    """
    empty = value is None or value == ""

    if empty:
        # Only types where an explicit empty is meaningful and accepted.
        if prop_type == "date":
            return {"date": None}
        if prop_type == "url":
            return {"url": None}
        if prop_type == "rich_text":
            return {"rich_text": []}
        return None

    if prop_type == "title":
        return {"title": [{"text": {"content": _truncate(value)}}]}
    if prop_type == "rich_text":
        return {"rich_text": [{"text": {"content": _truncate(value)}}]}
    if prop_type == "select":
        # Notion forbids commas in select option names.
        return {"select": {"name": _truncate(value).replace(",", " ")[:100]}}
    if prop_type == "status":
        return {"status": {"name": _truncate(value)[:100]}}
    if prop_type == "multi_select":
        return {"multi_select": [{"name": _truncate(value).replace(",", " ")[:100]}]}
    if prop_type == "date":
        return {"date": {"start": value}}
    if prop_type == "url":
        return {"url": _truncate(value)}
    if prop_type == "number":
        try:
            return {"number": float(value)}
        except (TypeError, ValueError):
            return None
    if prop_type == "checkbox":
        return {"checkbox": bool(value)}

    # people, relation, files, formula, rollup and friends need ids or are
    # read-only. Skip rather than guess.
    return None


class NotionOAuthService:
    """
    High-level Notion operations using an authenticated client.

    This class does NOT create or own the client - it receives one from the
    caller (via get_client()), keeping each request scoped to the
    authenticated user's token.
    """

    def __init__(
        self,
        client: Client,
        database_id: str | None = None,
        data_source_id: str | None = None,
    ):
        """
        Args:
            client: A notion_client.Client authenticated with a user's OAuth token.
            database_id: The database UUID used as the page parent.
            data_source_id: The data source holding the schema. Optional -
                resolved from the database when omitted, so rows saved before
                this id was stored keep working.
        """
        self.client = client
        self._database_id = database_id
        self._data_source_id = data_source_id
        self._schema_cache: Optional[dict] = None

    @property
    def database_id(self) -> str:
        return self._database_id or ""

    def set_database_id(self, database_id: str) -> None:
        self._database_id = database_id
        self._schema_cache = None

    # -----------------------------------------------------
    # SCHEMA
    # -----------------------------------------------------

    def _resolve_data_source_id(self) -> str:
        if self._data_source_id:
            return self._data_source_id
        if not self._database_id:
            raise NotionSchemaError("No Notion database is selected.")
        database = self.client.databases.retrieve(database_id=self._database_id)
        sources = database.get("data_sources") or []
        if not sources:
            raise NotionSchemaError(
                "This Notion database exposes no data source, so its columns "
                "cannot be read. Try re-selecting the database in Integrations."
            )
        self._data_source_id = sources[0]["id"]
        return self._data_source_id

    def _schema(self, refresh: bool = False) -> dict:
        """Property name -> property object, from the data source."""
        if self._schema_cache is not None and not refresh:
            return self._schema_cache
        data_source = self.client.data_sources.retrieve(
            data_source_id=self._resolve_data_source_id()
        )
        self._schema_cache = data_source.get("properties") or {}
        return self._schema_cache

    def _title_property_name(self) -> str:
        """
        The name of the database's title column.

        Not assumed to be "Name" - Notion lets users rename it, and a database
        whose title column is called "Task" used to fail every sync.
        """
        for name, prop in self._schema().items():
            if prop.get("type") == "title":
                return name
        raise NotionSchemaError(
            "The selected Notion database has no title column, so tasks "
            "cannot be created in it. Pick a different database."
        )

    def ensure_schema(self) -> dict:
        """
        Add any of REQUIRED_PROPERTIES the data source is missing.

        Called when the user selects a database, so syncing works without them
        hand-building a schema. Never raises for a property Notion refuses -
        those are reported back so the UI can name them.

        Returns:
            {"added": [names], "already_present": [names],
             "manual": [{"name", "type", "reason"}]}
        """
        schema = self._schema(refresh=True)
        missing = [name for name in REQUIRED_PROPERTIES if name not in schema]
        already = [name for name in REQUIRED_PROPERTIES if name in schema]

        if not missing:
            return {"added": [], "already_present": already, "manual": []}

        data_source_id = self._resolve_data_source_id()
        added: list[str] = []
        manual: list[dict] = []

        try:
            self.client.data_sources.update(
                data_source_id=data_source_id,
                properties={name: REQUIRED_PROPERTIES[name] for name in missing},
            )
            added = list(missing)
        except Exception:
            # One rejected property must not block the rest, so retry singly.
            for name in missing:
                try:
                    self.client.data_sources.update(
                        data_source_id=data_source_id,
                        properties={name: REQUIRED_PROPERTIES[name]},
                    )
                    added.append(name)
                except Exception as exc:
                    manual.append({
                        "name": name,
                        "type": next(iter(REQUIRED_PROPERTIES[name])),
                        "reason": str(exc)[:200],
                    })

        self._schema_cache = None
        return {"added": added, "already_present": already, "manual": manual}

    # -----------------------------------------------------
    # STATUS / DATABASE INFO
    # -----------------------------------------------------

    def get_status(self) -> dict:
        return {"connected": True}

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
    # PAYLOAD BUILDING
    # -----------------------------------------------------

    def _task_properties(
        self,
        title: str,
        owner: str,
        due_date: str | None,
        priority: str,
        summary: str,
        session_link: str | None,
        status: str,
        include_title: bool = True,
    ) -> dict:
        """
        Build a properties payload containing only columns that exist,
        each shaped by the type it actually has in the database.
        """
        schema = self._schema()
        properties: dict[str, dict] = {}

        if include_title:
            title_name = self._title_property_name()
            properties[title_name] = {
                "title": [{"text": {"content": _truncate(title or "Untitled Task")}}]
            }

        wanted = [
            ("Owner", owner),
            ("Due Date", due_date),
            ("Priority", (priority or "medium").capitalize()),
            ("Status", STATUS_MAP.get(status, "Not started")),
            ("Source Summary", summary),
            ("Session Link", session_link),
        ]

        for name, value in wanted:
            prop = schema.get(name)
            if not prop:
                continue
            built = _build_value(prop.get("type", ""), value)
            if built is not None:
                properties[name] = built

        return properties

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
        if not self._database_id:
            raise NotionSchemaError("No Notion database is selected.")

        page = self.client.pages.create(
            parent={"database_id": self._database_id},
            properties=self._task_properties(
                title=title,
                owner=owner,
                due_date=due_date,
                priority=priority,
                summary=summary,
                session_link=session_link,
                status=status,
            ),
        )
        return {"page_id": page["id"], "page_url": page["url"]}

    # -----------------------------------------------------
    # READ
    # -----------------------------------------------------

    def get_task(self, page_id: str) -> dict:
        """
        Retrieve a task page from Notion.

        Tolerant of missing columns - every field defaults rather than
        raising KeyError on a database that lacks it.
        """
        page = self.client.pages.retrieve(page_id=page_id)
        properties = page.get("properties") or {}

        task = {
            "title": "",
            "owner": "",
            "priority": None,
            "due_date": None,
            "summary": "",
            "session_link": None,
        }

        def _plain(name: str, key: str) -> str:
            items = (properties.get(name) or {}).get(key) or []
            return items[0]["plain_text"] if items else ""

        for name, prop in properties.items():
            if prop.get("type") == "title":
                task["title"] = _plain(name, "title")
                break

        task["owner"] = _plain("Owner", "rich_text")
        task["summary"] = _plain("Source Summary", "rich_text")

        priority = (properties.get("Priority") or {}).get("select")
        if priority:
            task["priority"] = priority["name"].lower()

        due = (properties.get("Due Date") or {}).get("date")
        if due:
            task["due_date"] = due.get("start")

        task["session_link"] = (properties.get("Session Link") or {}).get("url")

        return task

    # -----------------------------------------------------
    # UPDATE
    # -----------------------------------------------------

    def update_task_status(self, page_id: str, action_status: str) -> None:
        """Update the Status property, whatever type it happens to be."""
        prop = self._schema().get("Status")
        if not prop:
            return
        built = _build_value(
            prop.get("type", ""),
            STATUS_MAP.get(action_status, "Not started"),
        )
        if built is None:
            return
        self.client.pages.update(page_id=page_id, properties={"Status": built})

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
        """Update a task page, writing only columns that exist."""
        self.client.pages.update(
            page_id=page_id,
            properties=self._task_properties(
                title=title,
                owner=owner,
                due_date=due_date,
                priority=priority,
                summary=summary,
                session_link=session_link,
                status=status,
            ),
        )
