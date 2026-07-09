import { useEffect, useState } from "react";

import TaskListHeader from "../components/tasks/TaskListHeader";
import TaskSearchBar from "../components/tasks/TaskSearchBar";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";

import "./TaskList.css";

export default function TaskList() {
  // Search state
const [search, setSearch] = useState("");

const [priority, setPriority] = useState("");
const [status, setStatus] = useState("");
const [owner, setOwner] = useState("");

const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);
const [owners, setOwners] = useState([]);

const [session, setSession] = useState("");

const [sessions, setSessions] = useState([]);
const [dateMode, setDateMode] = useState("");


const [selectedDate, setSelectedDate] = useState("");
const [endDate, setEndDate] = useState("");
  // Load tasks from backend
  async function loadTasks() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search);
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

      const response = await fetch(
        `http://localhost:8000/actions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch actions");
      }

      const data = await response.json();

      setTasks(data.actions || []);
    } catch (err) {
      console.error("Error loading actions:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }
async function loadFilters() {
  try {
    const response = await fetch(
      "http://localhost:8000/actions/filters"
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
  // Reload whenever the search changes
  useEffect(() => {
    loadTasks();
  }, [search, priority, status, owner, session]);
useEffect(() => {
  loadFilters();
}, []);
  return (
    <div className="task-list-container">
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
      />
    </div>
  );
}