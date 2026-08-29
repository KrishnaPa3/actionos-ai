import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";

import TaskListHeader from "../components/tasks/TaskListHeader";
import TaskSearchBar from "../components/tasks/TaskSearchBar";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";
import { ListChecks } from "../components/ui/icons";
import { COLORS } from "../components/ui/colors";

import "./TaskList.css";
import { apiFetch } from "../lib/api";

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "80px" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        <ListChecks size={36} color={COLORS.primary} />
      </motion.div>
    </div>
  );
}

export default function TaskList() {
  // Search state
const location = useLocation();

const urlSearch = new URLSearchParams(location.search).get("search") || "";

const [search, setSearch] = useState(urlSearch);
const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);

// The navbar search arrives here as ?search=..., including while we are
// already on this page. Adjusting during render rather than in an effect
// keeps it off the cascading-render path.
if (urlSearch !== seenUrlSearch) {
  setSeenUrlSearch(urlSearch);
  setSearch(urlSearch);
}

const [priority, setPriority] = useState("");
const [status, setStatus] = useState("");
const [owner, setOwner] = useState("");

const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");
const [owners, setOwners] = useState([]);
const [sessions, setSessions] = useState([]);
const [session, setSession] = useState("");
const [toast, setToast] = useState({ message: "", type: "success" });
const [dateMode, setDateMode] = useState("");


const [selectedDate, setSelectedDate] = useState("");
const [endDate, setEndDate] = useState("");
  // Load tasks from backend
  const loadTasks = useCallback(async (signal) => {
    setLoading(true);
    setLoadError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (priority) {
    params.append("priority", priority);
}
if (owner) {
  params.append("owner", owner);
}
if (status) {
    params.append("status", status);
}
if (session) {
    params.append("session", session);
}
if (dateMode && selectedDate) {
    params.append("date_mode", dateMode);
    params.append("date", selectedDate);
}

if (dateMode === "between" && endDate) {
    params.append("end", endDate);
} 

      const response = await apiFetch(
        `/actions?${params.toString()}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch actions");
      }

      const data = await response.json();

      if (!signal.aborted) {
        setTasks(data.actions || []);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.error("Error loading actions:", err);
      if (!signal.aborted) {
        setTasks([]);
        setLoadError("Please check your connection and try again.");
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [search, priority, status, owner, session, dateMode, selectedDate, endDate]);
async function loadFilters() {
  try {
    const response = await apiFetch(
      "/actions/filters"
    );

    if (!response.ok) {
      throw new Error("Failed to load filters");
    }

    const data = await response.json();

    setOwners(data.owners || []);
    setSessions(data.sessions || []);
  } catch (err) {
    console.error(err);
  }
}

const showToast = (message, type = "success") => {
  setToast({ message, type });
  window.setTimeout(() => {
    setToast({ message: "", type });
  }, 3000);
};

  // Debounce search and cancel obsolete requests so earlier responses cannot
  // overwrite the result for the user's latest term.
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => { void loadTasks(controller.signal); },
      search.trim() ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadTasks, search]);
useEffect(() => {
  const timeout = window.setTimeout(() => { void loadFilters(); }, 0);
  return () => window.clearTimeout(timeout);
}, []);

  if (loading && tasks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <motion.div
      className="task-list-container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <TaskListHeader />

      <TaskSearchBar
        search={search}
        setSearch={setSearch}
      />

<TaskFilters
  priority={priority}
  setPriority={setPriority}

  status={status}
  setStatus={setStatus}

  owner={owner}
  setOwner={setOwner}
  owners={owners}

  session={session}
  setSession={setSession}
  sessions={sessions}

  dateMode={dateMode}
  setDateMode={setDateMode}

  selectedDate={selectedDate}
  setSelectedDate={setSelectedDate}

  endDate={endDate}
  setEndDate={setEndDate}
/>
<TaskTable
        tasks={tasks}
        loading={loading}
        error={loadError}
        hasActiveFilters={Boolean(
          search.trim() || priority || status || owner || session ||
          dateMode || selectedDate || endDate
        )}
                    onSyncComplete={(actionId, data, app) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === actionId
                ? {
                    ...t,
                    ...(app === "google"
                      ? {
                          google_synced: true,
                          google_event_id: data.event_id,
                          google_event_url: data.event_url || "",
                          google_last_synced: new Date().toISOString(),
                        }
                      : app === "slack"
                        ? {
                            slack_synced: true,
                            slack_message_ts: data.message_ts || null,
                            slack_channel_id: data.channel_id || null,
                            slack_last_synced: new Date().toISOString(),
                          }
                        : {
                            notion_synced: true,
                            notion_page_id: data.page_id,
                            notion_page_url: data.page_url || "",
                            notion_last_synced: new Date().toISOString(),
                          }),
                  }
                : t,
            ),
          );
          const appName = typeof app === "string"
            ? app.charAt(0).toUpperCase() + app.slice(1)
            : "Notion";
          showToast(`Synced to ${appName}`);
        }}
      />
      {toast.message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#16a34a",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "10px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
            fontFamily: "var(--body)",
            fontSize: "14px",
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </motion.div>
  );
}
