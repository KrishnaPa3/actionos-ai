import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import SearchBar from "../components/ui/SearchBar";
import EmptyState from "../components/ui/EmptyState";
import StatBadge from "../components/ui/StatBadge";
import DeleteMeetingModal from "../components/DeleteMeetingModal";

import {
    History,
    Mic,
    CheckSquare,
    ClipboardList,
    TriangleAlert
} from "../components/ui/icons";

import { COLORS } from "../components/ui/colors";

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

            const response = await fetch(
                "http://127.0.0.1:8000/sessions"
            );

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

            const response = await fetch(

                `http://127.0.0.1:8000/sessions/${meetingToDelete.id}`,

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

        return (

            <h2
                style={{
                    color: COLORS.text,
                    textAlign: "center",
                    marginTop: "80px"
                }}
            >
                Loading meetings...
            </h2>

        );

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

    {filteredMeetings.map((meeting) => (

        <Card
            key={meeting.id}
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

    ))}
                <DeleteMeetingModal
                open={meetingToDelete !== null}
                meeting={meetingToDelete}
                onCancel={() => setMeetingToDelete(null)}
                onConfirm={deleteMeeting}
            />

            {toast && (
                <div
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
                        animation: "fadeIn 0.3s ease",
                    }}
                >
                    {toast}
                </div>
            )}

        </div>
    );
}