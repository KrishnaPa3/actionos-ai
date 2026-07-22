import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import SearchBar from "../components/ui/SearchBar";
import EmptyState from "../components/ui/EmptyState";
import StatBadge from "../components/ui/StatBadge";
import DeleteMeetingModal from "../components/DeleteMeetingModal";
import { apiFetch } from "../lib/api";

import {
    History,
    Mic,
    CheckSquare,
    ClipboardList,
    TriangleAlert
} from "../components/ui/icons";

import { COLORS } from "../components/ui/colors";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const meetingVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "80px" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        <History size={36} color={COLORS.primary} />
      </motion.div>
    </div>
  );
}

export default function SessionsPage() {

    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState("");
    const [loading, setLoading] = useState(true);
    const [meetingToDelete, setMeetingToDelete] = useState(null);

    const navigate = useNavigate();

    async function loadMeetings() {

        try {

            const response = await apiFetch("/sessions");

            const data = await response.json();

            setMeetings(data.sessions);
            setFilteredMeetings(data.sessions);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    }

    const deleteMeeting = async () => {

        if (!meetingToDelete) return;

        try {

            const response = await apiFetch(
    `/sessions/${meetingToDelete.id}`,
    {
        method: "DELETE",
    }
);

            const data = await response.json();

            console.log(data);

            if (!response.ok) {

                throw new Error(
                    data.detail || "Delete failed"
                );

            }

            setMeetingToDelete(null);

            await loadMeetings();

            setToast("✓ Meeting deleted successfully");

            setTimeout(() => {

                setToast("");

            }, 3000);

        } catch (err) {

            console.error(err);

            alert(err.message);

        }

    };

    useEffect(() => {

        loadMeetings();

    }, []);

    useEffect(() => {

        const filtered = meetings.filter((meeting) =>
            meeting.meeting_name
                .toLowerCase()
                .includes(search.toLowerCase())
        );

        setFilteredMeetings(filtered);

    }, [search, meetings]);

    if (loading) {

        return <LoadingSpinner />;

    }

    return (
        <div
    style={{
        maxWidth: "950px",
        margin: "40px auto",
        padding: "0 20px"
    }}
>

    <PageHeader
        icon={<History size={30} />}
        title="Meeting History"
        subtitle={`${meetings.length} meetings stored`}
    />

    <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search meetings..."
    />

    {filteredMeetings.length === 0 && (
        <EmptyState
            title="No meetings found"
            description="Record your first meeting to get started."
        />
    )}

    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {filteredMeetings.map((meeting) => (

        <motion.div key={meeting.id} variants={meetingVariants}>
          <Card
            onClick={() =>
                navigate(`/results/${meeting.id}`)
            }
            style={{
                marginBottom: "18px"
            }}
          >

            <h2
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: COLORS.text,
                    marginBottom: "10px"
                }}
            >
                <Mic size={22} />
                {meeting.meeting_name}
            </h2>

            <p
                style={{
                    color: COLORS.textSecondary,
                    marginBottom: "18px"
                }}
            >
                {new Date(
                    meeting.created_at
                ).toLocaleString()}
            </p>

            <div
                style={{
                    display: "flex",
                    gap: "14px",
                    flexWrap: "wrap"
                }}
            >
                <StatBadge
                    icon={<CheckSquare size={16} />}
                    value={meeting.task_count || 0}
                    label="Tasks"
                />

               <StatBadge
    icon={<ClipboardList size={16} />}
    value={meeting.decision_count || 0}
    label="Decisions"
/>

                <StatBadge
                    icon={<TriangleAlert size={16} />}
                    value={meeting.risk_count || 0}
                    label="Risks"
                />

                {/* NEW ACTION PLANS BADGE */}
                <StatBadge
                    icon={<ClipboardList size={16} />}
                    value={meeting.action_plan_count || 0}
                    label="Action Plans"
                />
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "20px"
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMeetingToDelete(meeting);
                    }}
                    style={{
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "16px",
                    }}
                >
                    🗑 Delete
                </button>
            </div>

        </Card>
        </motion.div>

      ))}
    </motion.div>
                <DeleteMeetingModal
                open={meetingToDelete !== null}
                meeting={meetingToDelete}
                onCancel={() => setMeetingToDelete(null)}
                onConfirm={deleteMeeting}
            />

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                    style={{
                        position: "fixed",
                        bottom: "24px",
                        right: "24px",
                        background: "#16a34a",
                        color: "#fff",
                        padding: "12px 18px",
                        borderRadius: "10px",
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "14px",
                        fontWeight: 600,
                        zIndex: 9999,
                    }}
                >
                    {toast}
                </motion.div>
              )}
            </AnimatePresence>

        </div>
    );
}
