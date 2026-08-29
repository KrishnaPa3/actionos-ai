import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../ui/Button";
import ReminderPanel from "../ReminderPanel";

import notionLogo from "../../assets/integrations/notion-darkmode.svg";
import googleCalendarLogo from "../../assets/integrations/google-calendar.svg";
import slackLogo from "../../assets/integrations/slack-logo.svg";

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
  CheckCircle2,
  Blocks,
  LoaderCircle,
  ChevronDown,
} from "../ui/icons";

import "./TaskRow.css";
import { apiFetch, readErrorDetail } from "../../lib/api";

// Human names for the sync targets, used in error messages.
const SYNC_APP_LABEL = { google: "Google Calendar", notion: "Notion", slack: "Slack" };


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
  notionSynced = false,
  notionPageId = null,
  notionPageUrl = null,
  googleSynced = false,
  googleEventId = null,
  googleEventUrl = null,
  slackSynced = false,
  slackMessageTs = null,
  onSyncComplete,
}) {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);

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

  const handleSyncToApp = async (app) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const endpoint = app === "google"
        ? "/integrations/google/sync-task"
        : app === "notion"
          ? "/integrations/notion/sync-task"
          : "/integrations/slack/sync-task";
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ action_id: actionId }),
      });
      // Without this check a 400 ("No default Slack channel is configured")
      // left data.success undefined and the UI did nothing at all, hiding a
      // message that told the user exactly how to fix it.
      if (!response.ok) {
        throw new Error(await readErrorDetail(response));
      }
      const data = await response.json();
      if (data.success && onSyncComplete) {
        onSyncComplete(actionId, data, app);
      }
    } catch (err) {
      console.error(`Failed to sync to ${app}:`, err);
      alert(`Couldn't sync this task to ${SYNC_APP_LABEL[app] || app}.\n\n${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const dropdownItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 12px",
    border: "none",
    background: "transparent",
    color: "#E2E8F0",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 15,
    fontFamily: "inherit",
    transition: "background .15s",
  };

  const iconStyle = { width: 18, height: 18, display: "block" };

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
        {!isReminder && status !== "completed" && (
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

          {/* Sync Dropdown Button */}
          {!isReminder && (
            <div style={{ position: "relative" }}>
              <Button
                size="xs"
                variant="ghost"
                icon={syncing ? <LoaderCircle size={15} /> : <Blocks size={15} />}
                onClick={() => setSyncMenuOpen(!syncMenuOpen)}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync"}
                {!syncing && <ChevronDown size={12} style={{ marginLeft: 2 }} />}
              </Button>

              {syncMenuOpen && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 99,
                    }}
                    onClick={() => setSyncMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      background: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: 4,
                      minWidth: 210,
                      zIndex: 100,
                      boxShadow: "0 10px 30px rgba(0,0,0,.3)",
                    }}
                  >
                    {/* Notion */}
                    {notionSynced || notionPageId ? (
                      <button
                        onClick={() => {
                          setSyncMenuOpen(false);
                          if (notionPageUrl) {
                            window.open(notionPageUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <img src={notionLogo} alt="Notion" style={iconStyle} />
                        <span style={{ flex: 1 }}>Open in Notion</span>
                        <ExternalLink size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSyncMenuOpen(false);
                          handleSyncToApp("notion");
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <img src={notionLogo} alt="Notion" style={iconStyle} />
                        <span>Sync to Notion</span>
                      </button>
                    )}

                    {/* Google Calendar */}
                    {googleSynced || googleEventId ? (
                      <button
                        onClick={() => {
                          setSyncMenuOpen(false);
                          if (googleEventUrl) {
                            window.open(googleEventUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <img src={googleCalendarLogo} alt="Google Calendar" style={iconStyle} />
                        <span style={{ flex: 1 }}>Open in Google Calendar</span>
                        <ExternalLink size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSyncMenuOpen(false);
                          handleSyncToApp("google");
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <img src={googleCalendarLogo} alt="Google Calendar" style={iconStyle} />
                        <span>Sync to Google Calendar</span>
                      </button>
                    )}

                    {/* Slack */}
                    {slackSynced ? (
                      <button
                        disabled
                        style={{
                          ...dropdownItemStyle,
                          opacity: 0.65,
                          cursor: "default",
                        }}
                      >
                        <img src={slackLogo} alt="Slack" style={iconStyle} />
                        <span>Already sent to Slack</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSyncMenuOpen(false);
                          handleSyncToApp("slack");
                        }}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <img src={slackLogo} alt="Slack" style={iconStyle} />
                        <span>Send to Slack</span>
                      </button>
                    )}

                    <div
                      style={{
                        padding: "8px 12px",
                        color: "#64748B",
                        fontSize: 13,
                        borderTop: "1px solid #334155",
                        marginTop: 4,
                        paddingTop: 8,
                      }}
                    >
                      More apps coming soon
                    </div>
                  </div>
                </>
              )}
            </div>
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

