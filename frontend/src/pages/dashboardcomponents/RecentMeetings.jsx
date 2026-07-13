import {
    FileText,
    CheckSquare,
    Scale,
    AlertTriangle,
    ChevronRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import "./RecentMeetings.css";

export default function RecentMeetings({ sessions }) {

    const navigate = useNavigate();

    const recentSessions = sessions.slice(0, 5);

    function formatDate(date) {
        return new Date(date).toLocaleDateString(
            "en-GB",
            {
                day: "numeric",
                month: "short",
            }
        );
    }

    return (
        <div className="recentMeetingsCard">

            <div className="recentMeetingsHeader">
                <h2>Recent Meetings</h2>
                <span>{recentSessions.length}</span>
            </div>

            {recentSessions.length === 0 ? (

                <div className="emptyMeetings">
                    No meetings yet.
                </div>

            ) : (

                recentSessions.map((session) => (

                    <div
                        key={session.id}
                        className="meetingCard"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/results/${session.id}`)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                navigate(`/results/${session.id}`);
                            }
                        }}
                    >

                        <div className="meetingTop">

                            <div className="meetingTitle">

                                <FileText size={18} />

                                <h3>
                                    {session.meeting_name}
                                </h3>

                            </div>

                            <ChevronRight
                                size={18}
                                className="meetingArrow"
                            />

                        </div>

                        <p>
                            {formatDate(session.created_at)}
                        </p>

                        <div className="meetingStats">

                            <span>
                                <CheckSquare size={14} />
                                {session.tasks?.length || 0}
                            </span>

                            <span>
                                <Scale size={14} />
                                {session.decisions?.length || 0}
                            </span>

                            <span>
                                <AlertTriangle size={14} />
                                {session.risks?.length || 0}
                            </span>

                        </div>

                    </div>

                ))

            )}

        </div>
    );
}