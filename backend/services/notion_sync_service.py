from datetime import datetime

from services.notion_service import NotionService
from supabase_client import supabase


class NotionSyncService:

    def __init__(self):
        self.notion = NotionService()

    def compare(self, action):

        notion_task = self.notion.get_task(
            action["notion_page_id"]
        )

        changes = {}

        # -----------------------
        # Title
        # -----------------------

        if notion_task["title"] != action["title"]:
            changes["title"] = notion_task["title"]

        # -----------------------
        # Owner
        # -----------------------

        if notion_task["owner"] != (action["owner"] or ""):
            changes["owner"] = notion_task["owner"]

        # -----------------------
        # Priority
        # -----------------------

        if notion_task["priority"] != action["priority"]:
            changes["priority"] = notion_task["priority"]

        # -----------------------
        # Due Date
        # -----------------------

        notion_due = notion_task["due_date"]
        db_due = action["due_date"]

        if notion_due and db_due:

            notion_dt = datetime.fromisoformat(
                notion_due.replace("Z", "+00:00")
            )

            db_dt = datetime.fromisoformat(
                db_due.replace("Z", "+00:00")
            )

            if notion_dt != db_dt:
                changes["due_date"] = notion_due

        elif notion_due != db_due:
            changes["due_date"] = notion_due

        return changes

    # -----------------------------------------------------
    # APPLY CHANGES TO SUPABASE
    # -----------------------------------------------------

    def sync(self, action):

        changes = self.compare(action)

        if not changes:

            return action

        response = (
            supabase
            .table("actions")
            .update(changes)
            .eq("id", action["id"])
            .execute()
        )

        return {
    "updated": bool(changes),
    "changes": changes,
    "action": response.data[0] if changes else action
}