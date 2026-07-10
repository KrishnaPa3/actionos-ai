import TaskRow from "./TaskRow";
import { useNavigate } from "react-router-dom";
export default function TaskTable({ tasks, loading }) {
const navigate = useNavigate();
  if (loading) {
    return (
      <div className="task-loading">
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-empty-state">
        <h3>No tasks yet</h3>

        <p>
          Tasks and reminders extracted from meetings will appear here.
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
/>
      ))}
    </section>
  );
}