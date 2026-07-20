import os
import logging
from pathlib import Path
from pprint import pprint

from dotenv import load_dotenv
from notion_client import Client

load_dotenv(Path(__file__).parent.parent / ".env")

STATUS_MAP = {
    "pending": "Not started",
    "completed": "Done",
}


class NotionService:

    def __init__(self):

        api_key = os.getenv("NOTION_API_KEY")
        database_id = os.getenv("NOTION_DATABASE_ID")

        if not api_key:
            raise ValueError("NOTION_API_KEY not found")

        if not database_id:
            raise ValueError("NOTION_DATABASE_ID not found")

        self.client = Client(
            auth=api_key,
            log_level=logging.DEBUG
        )

        self.database_id = database_id

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    def get_status(self):

        return {
            "connected": True,
            "database_id": self.database_id
        }

    # -----------------------------------------------------
    # DATABASE INFO
    # -----------------------------------------------------

    def get_database(self):

        database = self.client.databases.retrieve(
            database_id=self.database_id
        )

        title = ""

        if database.get("title"):

            title = "".join(
                text["plain_text"]
                for text in database["title"]
            )

        return {
            "id": database["id"],
            "title": title
        }

    # -----------------------------------------------------
    # CREATE
    # -----------------------------------------------------

    def create_task(
        self,
        title,
        owner,
        due_date,
        priority,
        summary,
        session_link,
        status="pending",
    ):

        payload = {

            "parent": {
                "database_id": self.database_id
            },

            "properties": {

                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": title
                            }
                        }
                    ]
                },

                "Owner": {
                    "rich_text": [
                        {
                            "text": {
                                "content": owner or ""
                            }
                        }
                    ]
                },

                "Due Date": {
                    "date": {
                        "start": due_date
                    }
                },

                "Priority": {
                    "select": {
                        "name": priority.capitalize()
                        if priority
                        else "Medium"
                    }
                },

                "Status": {
                    "status": {
                        "name": STATUS_MAP.get(
                            status,
                            "Not started"
                        )
                    }
                },

                "Source Summary": {
                    "rich_text": [
                        {
                            "text": {
                                "content": summary or ""
                            }
                        }
                    ]
                },

                "Session Link": {
                    "url": session_link if session_link else None
                }

            }

        }

        print("\n========== NOTION PAYLOAD ==========")
        pprint(payload)
        print("====================================\n")

        page = self.client.pages.create(**payload)

        print("\n========== NOTION RESPONSE ==========")
        pprint(page)
        print("=====================================\n")

        return {
            "page_id": page["id"],
            "page_url": page["url"]
        }

    # -----------------------------------------------------
    # READ
    # -----------------------------------------------------

    def get_task(self, page_id: str):

        page = self.client.pages.retrieve(
            page_id=page_id
        )

        properties = page["properties"]

        task = {

            "title": "",

            "owner": "",

            "priority": None,

            "due_date": None,

            "summary": "",

            "session_link": None

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

    def update_task_status(
        self,
        page_id,
        action_status,
    ):

        notion_status = STATUS_MAP.get(
            action_status,
            "Not started"
        )

        self.client.pages.update(

            page_id=page_id,

            properties={

                "Status": {

                    "status": {

                        "name": notion_status

                    }

                }

            }

        )

    # -----------------------------------------------------
    # UPDATE TASK
    # -----------------------------------------------------

    def update_task(
        self,
        page_id,
        title,
        owner,
        due_date,
        priority,
        summary,
        session_link,
        status,
    ):

        self.client.pages.update(

            page_id=page_id,

            properties={

                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": title
                            }
                        }
                    ]
                },

                "Owner": {
                    "rich_text": [
                        {
                            "text": {
                                "content": owner or ""
                            }
                        }
                    ]
                },

                "Due Date": {
                    "date": {
                        "start": due_date
                    }
                },

                "Priority": {
                    "select": {
                        "name": priority.capitalize()
                        if priority
                        else "Medium"
                    }
                },

                "Status": {
                    "status": {
                        "name": STATUS_MAP.get(
                            status,
                            "Not started"
                        )
                    }
                },

                "Source Summary": {
                    "rich_text": [
                        {
                            "text": {
                                "content": summary or ""
                            }
                        }
                    ]
                },

                "Session Link": {
                    "url": session_link
                }

            }

        )