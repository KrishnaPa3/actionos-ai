import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { AnimatePresence, motion } from "motion/react";

import {
  LayoutDashboard,
  Calendar,
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

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    path: "/",
    isActive: (p) => p === "/" || p === "/dashboard",
  },
  {
    key: "record",
    label: "Record",
    Icon: Mic,
    path: "/record",
    isActive: (p) => p === "/record",
  },
  {
    key: "meetings",
    label: "Meetings",
    Icon: Calendar,
    hasMenu: true,
    isActive: (p) => p === "/sessions" || p.startsWith("/results"),
  },
  {
    key: "tasks",
    label: "Tasks",
    Icon: ListChecks,
    path: "/tasks",
    isActive: (p) => p === "/tasks",
  },
  {
    key: "integrations",
    label: "Integrations",
    Icon: Blocks,
    path: "/integrations",
    isActive: (p) => p === "/integrations",
  },
];

/* The latte-art spiral that replaced the target mark. */
function BrandMark() {
  return (
    <span className="navMark">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round">
        <path d="M2.6 10v4" />
        <path d="M7.3 6.6v10.8" />
        <path d="M12 3.2v17.6" />
        <path d="M16.7 7.8v8.4" />
        <path d="M21.4 9.8v4.4" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [condensed, setCondensed] = useState(false);

  const profileRef = useRef(null);
  const meetingsRef = useRef(null);
  const remindersRef = useRef(null);

  const activeKey =
    (NAV_ITEMS.find((item) => item.isActive(location.pathname)) || {}).key || null;

  /* The active tab is highlighted with a plain CSS background rather than a
     measured, absolutely-positioned element. Measuring meant the highlight
     could disagree with the tab React had actually marked active — and it had
     to be re-measured on font load, resize and the condense transition. */

  /* ---- the bar contracts once you scroll ---- */

  useEffect(() => {
    function onScroll() {
      setCondensed(window.scrollY > 24);
    }

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---- reminders ---- */

  const loadReminders = async () => {
    try {
      const response = await apiFetch("/reminders");
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error("Failed to load reminders", error);
    }
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

  /* ---- dismiss the open surfaces ---- */

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (meetingsRef.current && !meetingsRef.current.contains(e.target)) {
        setShowMeetings(false);
      }
      if (remindersRef.current && !remindersRef.current.contains(e.target)) {
        setShowReminders(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function onEscape(e) {
      if (e.key !== "Escape") return;
      setShowMeetings(false);
      setShowProfileMenu(false);
      setShowReminders(false);
    }

    document.addEventListener("keydown", onEscape);

    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  const closeAll = () => {
    setShowMeetings(false);
    setShowProfileMenu(false);
    setShowReminders(false);
  };

  function handleNavClick(item) {
    if (item.hasMenu) {
      setShowMeetings((open) => !open);
      setShowProfileMenu(false);
      setShowReminders(false);
      return;
    }

    closeAll();
    navigate(item.path);
  }


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  function openTask(reminder) {
    navigate(`/results/${reminder.session_id}`, {
      state: {
        highlightActionId: reminder.action_id,
      },
    });

    setShowReminders(false);
  }

  const displayName = user?.user_metadata?.username || user?.email || "";
  const initial = (displayName || "U")[0].toUpperCase();

  return (
    <div className={`navShell${condensed ? " isCondensed" : ""}`}>
      <nav className="navbar">
        {/* Brand */}
        <div className="nav-logo" onClick={() => { closeAll(); navigate("/"); }}>
          <BrandMark />
          <span className="navWord">ActionOS</span>
        </div>

        {/* Navigation */}
        <div className="nav-links">

          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const { Icon } = item;

            return (
              <div
                key={item.key}
                className="navSlot"
                ref={item.hasMenu ? meetingsRef : undefined}
              >
                <button
                  type="button"
                  className={`navItem${active ? " isActive" : ""}`}
                  onClick={() => handleNavClick(item)}
                  aria-current={active ? "page" : undefined}
                  aria-expanded={item.hasMenu ? showMeetings : undefined}
                >
                  <Icon size={17} />
                  <span className="navLabel">{item.label}</span>
                  {item.hasMenu && (
                    <motion.span
                      className="navChev"
                      animate={{ rotate: showMeetings ? 180 : 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <ChevronDown size={14} />
                    </motion.span>
                  )}
                </button>

                {item.hasMenu && (
                  <AnimatePresence>
                    {showMeetings && (
                      <motion.div
                        className="meetingsDropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        <button
                          className="dropdownItem"
                          onClick={() => {
                            navigate("/sessions");
                            setShowMeetings(false);
                          }}
                        >
                          <span className="dropdownItemIcon isBlue">
                            <Calendar size={18} />
                          </span>
                          <span className="dropdownItemText">
                            <span className="dropdownItemLabel">All Meetings</span>
                            <span className="dropdownItemDesc">
                              Everything you have recorded
                            </span>
                          </span>
                        </button>

                        <button
                          className="dropdownItem"
                          onClick={() => {
                            navigate("/results");
                            setShowMeetings(false);
                          }}
                        >
                          <span className="dropdownItemIcon isGreen">
                            <FileText size={18} />
                          </span>
                          <span className="dropdownItemText">
                            <span className="dropdownItemLabel">Meeting Recap</span>
                            <span className="dropdownItemDesc">
                              Summary, tasks, decisions, risks
                            </span>
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>

        {/* Tools */}
        <div className="navTools">

          <div className="navBellWrap" ref={remindersRef}>
            <button
              type="button"
              className="navIconBtn"
              onClick={() => {
                setShowReminders((open) => !open);
                setShowProfileMenu(false);
                setShowMeetings(false);
              }}
              aria-label={`Reminders (${reminders.length})`}
            >
              <BellRing size={19} />
              {reminders.length > 0 && (
                <span className="notificationCount">{reminders.length}</span>
              )}
            </button>

            <AnimatePresence>
              {showReminders && (
                <motion.div
                  className="reminderPopup"
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="reminderPopupHeader">
                    <span>Reminders</span>
                    <span className="reminderCount">{reminders.length}</span>
                  </div>

                  {reminders.length === 0 ? (
                    <div className="emptyReminder">{"You're all caught up."}</div>
                  ) : (
                    reminders.map((reminder) => (
                      <div key={reminder.id} className="reminderCard">
                        <div className="reminderTitle">{reminder.title}</div>

                        <div
                          className={
                            reminder.is_default
                              ? "autoReminderBadge"
                              : "manualReminderBadge"
                          }
                        >
                          {reminder.is_default ? "Auto" : "Custom"}
                        </div>

                        <div className="reminderDue">
                          {new Date(reminder.due_date).toLocaleString()}
                        </div>

                        <button
                          className="openReminder"
                          onClick={() => openTask(reminder)}
                        >
                          <ExternalLink size={15} />
                          <span>Open task</span>
                        </button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="profileMenuContainer" ref={profileRef}>
            <button
              type="button"
              className="profileButton"
              onClick={() => {
                setShowProfileMenu((open) => !open);
                setShowReminders(false);
                setShowMeetings(false);
              }}
            >
              <span className="profileAvatar">{initial}</span>
              <span className="profileName">{displayName}</span>
              <ChevronDown size={14} />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="profileDropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="profileDropdownHeader">
                    <strong>{user?.user_metadata?.username || "User"}</strong>
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

                  <button className="profileDropdownItem" onClick={handleLogout}>
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </div>
  );
}
