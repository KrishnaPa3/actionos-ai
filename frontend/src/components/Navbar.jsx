import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { AnimatePresence, motion } from "motion/react";

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
  Blocks,
  ChevronDown,
  User,
  LogOut,
} from "./ui/icons";

import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const { user } = useAuth();

  const profileRef = useRef(null);
  const meetingsRef = useRef(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const openResults = () => {
    navigate("/results");
    setShowMeetings(false);
  };

  const loadReminders = async () => {
    try {
      const response = await apiFetch("/reminders");
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error("Failed to load reminders", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const handleReminderUpdate = () => {
      loadReminders();
    };

    if (document.hidden) return;

    loadReminders();

    const interval = setInterval(loadReminders, 30000);

    window.addEventListener("remindersUpdated", handleReminderUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("remindersUpdated", handleReminderUpdate);
    };
  }, []);

  function openTask(reminder) {
    navigate(`/results/${reminder.session_id}`, {
      state: {
        highlightActionId: reminder.action_id,
      },
    });

    setShowReminders(false);
    setActiveMenu(null);
  }

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (meetingsRef.current && !meetingsRef.current.contains(e.target)) {
        setShowMeetings(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
            location.pathname === "/" || location.pathname === "/dashboard"
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
          variant={location.pathname === "/record" ? "primary" : "ghost"}
          icon={<Mic size={18} />}
          onClick={() => navigate("/record")}
        >
          Record
        </Button>

        {/* Meetings Dropdown */}
        <div ref={meetingsRef} className="meetingsDropdownWrapper">
          <Button
            size="sm"
            variant={
              location.pathname === "/sessions" ||
              location.pathname.startsWith("/results")
                ? "primary"
                : "ghost"
            }
            icon={<History size={18} />}
            onClick={() => {
              setShowMeetings(!showMeetings);
              setShowReminders(false);
              setShowProfileMenu(false);
            }}
            style={{ gap: "6px" }}
          >
            Meetings
            <motion.span
              animate={{ rotate: showMeetings ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "inline-flex" }}
            >
              <ChevronDown size={16} />
            </motion.span>
          </Button>

          <AnimatePresence>
            {showMeetings && (
              <motion.div
                className="meetingsDropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <button
                  className="dropdownItem"
                  onClick={() => {
                    navigate("/sessions");
                    setShowMeetings(false);
                  }}
                >
                  <History size={18} />
                  <div className="dropdownItemText">
                    <span className="dropdownItemLabel">Session History</span>
                    <span className="dropdownItemDesc">
                      Browse past meetings
                    </span>
                  </div>
                </button>

                <div className="dropdownDivider" />

                <button
                  className="dropdownItem"
                  onClick={() => {
                    openResults();
                    setShowMeetings(false);
                  }}
                >
                  <FileText size={18} />
                  <div className="dropdownItemText">
                    <span className="dropdownItemLabel">Session Info</span>
                    <span className="dropdownItemDesc">
                      View extracted insights
                    </span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tasks */}
        <Button
          size="sm"
          variant={location.pathname === "/tasks" ? "primary" : "ghost"}
          icon={<ListChecks size={18} />}
          onClick={() => navigate("/tasks")}
        >
          Tasks
        </Button>

        {/* Integrations */}
        <Button
          size="sm"
          variant={location.pathname === "/integrations" ? "primary" : "ghost"}
          icon={<Blocks size={18} />}
          onClick={() => navigate("/integrations")}
        >
          Integrations
        </Button>

        {/* Reminder Bell */}
        <div
          className="notificationBell"
          onClick={() => {
            setShowReminders(!showReminders);
            setShowProfileMenu(false);
            setActiveMenu(null);
          }}
        >
          <BellRing size={20} />
          {reminders.length > 0 && (
            <span className="notificationCount">{reminders.length}</span>
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
              <span className="reminderCount">{reminders.length}</span>
            </div>

            {reminders.length === 0 ? (
              <div className="emptyReminder">{"You're all caught up."}</div>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="reminderCard">
                  <div className="reminderHeader">
                    <div>
                      <div className="reminderTitle">{reminder.title}</div>
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

                    <div className="reminderDue">
                      <span role="img" aria-label="time">{'\u{1F552}'}</span>{" "}
                      {new Date(reminder.due_date).toLocaleString()}
                    </div>

                    <button
                      className="openReminder"
                      onClick={() => openTask(reminder)}
                    >
                      <ExternalLink size={16} />
                      <span>Open Task</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Profile Menu */}
        <div ref={profileRef} className="profileMenuContainer">
          <button
            className="profileButton"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowReminders(false);
            }}
          >
            <div className="profileAvatar">
              {(
                user?.user_metadata?.username ||
                user?.email ||
                "U"
              )[0].toUpperCase()}
            </div>
            <span>
              {user?.user_metadata?.username || user?.email}
            </span>
            <span>{'\u{25BC}'}</span>
          </button>

          {showProfileMenu && (
            <div className="profileDropdown">
              <div className="profileDropdownHeader">
                <strong>
                  {user?.user_metadata?.username || "User"}
                </strong>
                <small>{user?.email}</small>
              </div>

              <button
                className="profileDropdownItem"
                onClick={() => {
                  navigate("/profile");
                  setShowProfileMenu(false);
                }}
              >
                <User size={16} />
                Profile
              </button>

              <button
                className="profileDropdownItem"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
