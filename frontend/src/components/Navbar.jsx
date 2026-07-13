import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Button from "./ui/Button";

import {
  Target,
  LayoutDashboard,
  History,
  FileText,
  ListChecks,
  BellRing,
  ExternalLink,
  Mic,
} from "./ui/icons";

import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const openResults = () => {
    navigate("/results");
  };

  const loadReminders = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/reminders");
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error("Failed to load reminders", error);
    }
  };

  useEffect(() => {
    loadReminders();

    const interval = setInterval(loadReminders, 30000);

    const handleReminderUpdate = () => {
      loadReminders();
    };

    window.addEventListener(
      "remindersUpdated",
      handleReminderUpdate
    );

    return () => {
      clearInterval(interval);

      window.removeEventListener(
        "remindersUpdated",
        handleReminderUpdate
      );
    };
  }, []);

  const openTask = (reminder) => {
    navigate(
      `/results/${reminder.session_id}`,
      {
        state: {
          highlightActionId: reminder.action_id,
        },
      }
    );

    setShowReminders(false);
    setActiveMenu(null);
  };

  return (
    <nav className="navbar">

      {/* Logo */}

      <div
        className="nav-logo"
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Target size={28} />

        <span
          style={{
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "0.5px",
          }}
        >
          ActionOS
        </span>
      </div>

      {/* Navigation */}

      <div
        className="nav-links"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >

        {/* Dashboard */}

        <Button
          size="sm"
          variant={
            location.pathname === "/" ||
            location.pathname === "/dashboard"
              ? "primary"
              : "ghost"
          }
          icon={<LayoutDashboard size={18} />}
          onClick={() => navigate("/")}
        >
          Dashboard
        </Button>

        {/* Record */}

        <Button
          size="sm"
          variant={
            location.pathname === "/record"
              ? "primary"
              : "ghost"
          }
          icon={<Mic size={18} />}
          onClick={() => navigate("/record")}
        >
          Record
        </Button>

        {/* Meetings */}

        <Button
          size="sm"
          variant={
            location.pathname === "/sessions"
              ? "primary"
              : "ghost"
          }
          icon={<History size={18} />}
          onClick={() => navigate("/sessions")}
        >
          Meetings
        </Button>

        {/* Tasks */}

        <Button
          size="sm"
          variant={
            location.pathname === "/tasks"
              ? "primary"
              : "ghost"
          }
          icon={<ListChecks size={18} />}
          onClick={() => navigate("/tasks")}
        >
          Tasks
        </Button>

        {/* Results */}

        <Button
          size="sm"
          variant={
            location.pathname.startsWith("/results")
              ? "primary"
              : "ghost"
          }
          icon={<FileText size={18} />}
          onClick={openResults}
        >
          Results
        </Button>

        {/* Reminder Bell */}

        <div
          className="notificationBell"
          onClick={() => {
            setShowReminders(!showReminders);
            setActiveMenu(null);
          }}
        >
          <BellRing size={20} />

          {reminders.length > 0 && (
            <span className="notificationCount">
              {reminders.length}
            </span>
          )}
        </div>
                {/* Reminder Popup */}

        {showReminders && (

          <div className="reminderPopup">

            <div className="reminderPopupHeader">

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <BellRing size={18} />
                Reminders
              </span>

              <span className="reminderCount">
                {reminders.length}
              </span>

            </div>

            {reminders.length === 0 ? (

              <div className="emptyReminder">
                You're all caught up.
              </div>

            ) : (

              reminders.map((reminder) => (

                <div
                  key={reminder.id}
                  className="reminderCard"
                >

                  <div className="reminderHeader">

                    <div>

                      <div className="reminderTitle">
                        {reminder.title}
                      </div>

                      <div
                        className={
                          reminder.is_default
                            ? "autoReminderBadge"
                            : "manualReminderBadge"
                        }
                      >

                        {reminder.is_default
                          ? "Auto Reminder"
                          : "Custom Reminder"}

                      </div>

                    </div>

                  </div>

                  <div className="reminderDue">

                    🕒{" "}

                    {new Date(
                      reminder.due_date
                    ).toLocaleString()}

                  </div>

                  <button
                    className="openReminder"
                    onClick={() => openTask(reminder)}
                  >
                    <ExternalLink size={16} />

                    <span>
                      Open Task
                    </span>

                  </button>

                </div>

              ))

            )}

          </div>

        )}
              </div>

    </nav>

  );

}