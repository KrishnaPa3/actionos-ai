import TaskRow from "./TaskRow";
  export default function TaskTable({ tasks, loading, error, hasActiveFilters, onSyncComplete }) {
    if (loading) {
      return (
        <div className="task-loading">
          Loading tasks...
        </div>
      );
    }

    if (error) {
      return (
        <div className="task-empty-state">
          <h3>Could not load tasks</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="task-empty-state">
          <h3>{hasActiveFilters ? "No matching tasks" : "No tasks yet"}</h3>

          <p>{hasActiveFilters
            ? "Try a different search term or clear one of the filters."
            : "Tasks extracted from meetings will appear here."}
          </p>
        </div>
      );
    }

    return (
      <section className="task-table">
        {tasks.map((task) => (
        <TaskRow
    key={task.id}
    actionId={task.id}
    type="task"
    title={task.title}
    priority={task.priority}
    dueDate={task.due_date}
    owner={task.owner}
    sourceSession={task.sessions?.meeting_name || "Unknown Session"}
    sessionId={task.session_id}
    status={task.status}
    notionSynced={task.notion_synced || false}
    notionPageId={task.notion_page_id || null}
    notionPageUrl={task.notion_page_url || null}
    googleSynced={task.google_synced || false}
    googleEventId={task.google_event_id || null}
    googleEventUrl={task.google_event_url || null}
    slackSynced={!!(task.slack_synced && task.slack_message_ts)}
    slackMessageTs={task.slack_message_ts || null}
    onSyncComplete={onSyncComplete}
/>
        ))}
      </section>
    );
  }

