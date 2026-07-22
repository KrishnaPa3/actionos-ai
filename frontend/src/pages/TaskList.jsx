import { useCallback, useEffect, useState } from "react";
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
const [search, setSearch] = useState("");

const [priority, setPriority] = useState("");
const [status, setStatus] = useState("");
const [owner, setOwner] = useState("");

const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");
const [owners, setOwners] = useState([]);

const [session, setSession] = useState("");

const [sessions, setSessions] = useState([]);
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
      />
    </motion.div>
  );
}
