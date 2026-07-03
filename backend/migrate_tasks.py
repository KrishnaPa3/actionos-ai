from supabase_client import supabase

print("========== MIGRATING TASKS ==========")

# Fetch all sessions
response = (
    supabase
    .table("sessions")
    .select("id, meeting_name, tasks")
    .execute()
)

sessions = response.data

inserted = 0
skipped = 0

for session in sessions:

    session_id = session["id"]
    meeting_name = session["meeting_name"]
    tasks = session.get("tasks") or []

    print(f"\nMeeting: {meeting_name}")

    for task in tasks:

        if isinstance(task, dict):

            title = (
                task.get("title")
                or task.get("task")
                or "Untitled Task"
            )

            priority = task.get("priority", "medium")
            description = task.get("description")
            due_date = task.get("due_date")

        else:

            title = str(task)
            priority = "medium"
            description = None
            due_date = None

        # Skip duplicates
        existing = (
            supabase
            .table("actions")
            .select("id")
            .eq("session_id", session_id)
            .eq("title", title)
            .execute()
        )

        if existing.data:
            skipped += 1
            print(f"  Skipped: {title}")
            continue

        (
            supabase
            .table("actions")
            .insert({
                "session_id": session_id,
                "title": title,
                "description": description,
                "priority": priority,
                "due_date": due_date,
                "status": "pending"
            })
            .execute()
        )

        inserted += 1
        print(f"  Inserted: {title}")

print("\n========== COMPLETE ==========")
print(f"Inserted : {inserted}")
print(f"Skipped  : {skipped}")