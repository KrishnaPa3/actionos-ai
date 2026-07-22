  import TaskRow from "./TaskRow";
  export default function TaskTable({ tasks, loading, error, hasActiveFilters }) {
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

    confirmed={task.confirmed}
    notionPageUrl={task.notion_page_url}
/>
        ))}
      </section>
    );
  }
