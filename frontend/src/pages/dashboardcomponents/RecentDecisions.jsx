import {
    CheckCircle2,
    Clock3,
    XCircle,
    ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";

import { useNavigate } from "react-router-dom";

import "./RecentDecisions.css";

const decisionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut", delay: i * 0.06 },
  }),
};

export default function RecentDecisions({ decisions }) {

    const navigate = useNavigate();

    const recentDecisions = decisions.filter(
        decision => decision.decision_status === "pending"
    );

    function getStatus(status) {

        switch (status) {

            case "accepted":
                return {
                    icon: CheckCircle2,
                    className: "accepted",
                    label: "Accepted",
                };

            case "rejected":
                return {
                    icon: XCircle,
                    className: "rejected",
                    label: "Rejected",
                };

            default:
                return {
                    icon: Clock3,
                    className: "pending",
                    label: "Pending",
                };

        }

    }

    return (

        <div className="recentDecisionsCard">

            <div className="recentDecisionsHeader">

                <h2>Pending Decisions</h2>

                <span>{recentDecisions.length}</span>

            </div>

            {recentDecisions.length === 0 ? (

                <div className="emptyDecisions">

                    No pending decisions.

                </div>

            ) : (

                <div className="recentDecisionsBody">

                    {recentDecisions.map((decision, i) => {

                        const status = getStatus(
                            decision.decision_status
                        );

                        const Icon = status.icon;

                        return (

                            <motion.div
                                key={decision.id}
                                className={`decisionCard ${status.className}`}
                                role="button"
                                tabIndex={0}
                                custom={i}
                                variants={decisionVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover={{
                                  x: 4,
                                  transition: { duration: 0.15 },
                                }}
                                onClick={() =>
                                    navigate(
                                        `/results/${decision.session_id}`,
                                        {
                                            state: {
                                                scrollTo: "decisions",
                                            },
                                        }
                                    )
                                }
                                onKeyDown={(e) => {

                                    if (
                                        e.key === "Enter" ||
                                        e.key === " "
                                    ) {

                                        navigate(
                                            `/results/${decision.session_id}`,
                                            {
                                                state: {
                                                    scrollTo: "decisions",
                                                },
                                            }
                                        );

                                    }

                                }}
                            >

                                <div className="decisionTop">

                                    <div className="decisionStatus">

                                        <Icon size={15} />

                                        <span>{status.label}</span>

                                    </div>

                                    <ChevronRight
                                        size={18}
                                        className="decisionArrow"
                                    />

                                </div>

                                <h3>

                                    {decision.title}

                                </h3>

                                <p>

                                    {decision.sessions?.meeting_name ||
                                        "Unknown Meeting"}

                                </p>

                            </motion.div>

                        );

                    })}

                </div>

            )}

        </div>

    );

}
