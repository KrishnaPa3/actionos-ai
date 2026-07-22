import {
    FileText,
    CheckSquare,
    Scale,
    AlertTriangle,
    ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";

import { useNavigate } from "react-router-dom";
import "./RecentMeetings.css";

const meetingVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut", delay: i * 0.06 },
  }),
};

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

                recentSessions.map((session, i) => (

                    <motion.div
                        key={session.id}
                        className="meetingCard"
                        role="button"
                        tabIndex={0}
                        custom={i}
                        variants={meetingVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{
                          x: 4,
                          transition: { duration: 0.15 },
                        }}
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

                    </motion.div>

                ))

            )}

        </div>
    );
}
