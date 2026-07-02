import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import SearchBar from "../components/ui/SearchBar";
import EmptyState from "../components/ui/EmptyState";
import StatBadge from "../components/ui/StatBadge";

import {
    History,
    Mic,
    CheckSquare,
    Bell,
    ClipboardList,
    TriangleAlert
} from "../components/ui/icons";

import { COLORS } from "../components/ui/colors";

export default function SessionsPage() {

    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {

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

                    key={meeting.session_id}

                    onClick={() =>
                        navigate(`/results/${meeting.session_id}`)
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

                            value={meeting.tasks?.length || 0}

                            label="Tasks"

                        />

                        <StatBadge

                            icon={<Bell size={16} />}

                            value={meeting.reminders?.length || 0}

                            label="Reminders"

                        />

                        <StatBadge

                            icon={<ClipboardList size={16} />}

                            value={meeting.decisions?.length || 0}

                            label="Decisions"

                        />

                        <StatBadge

                            icon={<TriangleAlert size={16} />}

                            value={meeting.risks?.length || 0}

                            label="Risks"

                        />

                    </div>

                </Card>

            ))}

        </div>

    );

}