import { useNavigate } from "react-router-dom";

import Button from "../ui/Button";
import ReminderPanel from "../ReminderPanel";

import {
  ListChecks,
  Bell,
  CalendarClock,
  User,
  FileText,
  CircleDot,
  Clock3,
  RotateCcw,
  ExternalLink,
  Flag,
} from "../ui/icons";

import "./TaskRow.css";

export default function TaskRow({
  actionId,
  type = "task",
  title,
  priority = "Medium",
  dueDate,
  owner,
  sourceSession,
  sessionId,
  status = "Open",
}) {
  const navigate = useNavigate();

  const isReminder = type === "reminder";

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "No Due Date";

  const openSourceMeeting = () => {
    if (!sessionId) return;

    navigate(`/results/${sessionId}`);
  };

  return (
    <article className={`task-row priority-${priority.toLowerCase()}`}>
      {/* LEFT */}
      <div className="task-main">

        <div className="task-top">

          <div className="task-type">
            {isReminder ? (
              <>
                <Bell size={14} />
                <span>Reminder</span>
              </>
            ) : (
              <>
                <ListChecks size={14} />
                <span>Task</span>
              </>
            )}
          </div>

          <div className={`priority-pill ${priority.toLowerCase()}`}>
            <Flag size={14} />
            {priority}
          </div>

        </div>

        <h3 className="task-title">
          {title}
        </h3>

        <div
          className="task-source clickable"
          onClick={openSourceMeeting}
        >
          <FileText size={15} />
          <span>{sourceSession}</span>
        </div>

        <div className="task-meta">

          <div className="meta-item">
            <CalendarClock size={15} />
            <span>{formattedDueDate}</span>
          </div>

          <div className="meta-item">
            <User size={15} />
            <span>{owner}</span>
          </div>

        </div>

        {/* Reminder Panel */}
        {!isReminder && (
          <ReminderPanel
            actionId={actionId}
            dueDate={dueDate}
          />
        )}

      </div>

      {/* RIGHT */}
      <div className="task-side">

        <div className="status-pill">
          <CircleDot size={13} />
          {status}
        </div>

        <div className="task-actions">

          {isReminder && (
            <>
              <Button
                size="xs"
                variant="ghost"
                icon={<Clock3 size={15} />}
              >
                Snooze
              </Button>

              <Button
                size="xs"
                variant="ghost"
                icon={<RotateCcw size={15} />}
              >
                Reschedule
              </Button>
            </>
          )}

          <Button
            size="xs"
            variant="ghost"
            icon={<ExternalLink size={15} />}
            onClick={openSourceMeeting}
          >
            Open Source Meeting
          </Button>

        </div>

      </div>

    </article>
  );
}