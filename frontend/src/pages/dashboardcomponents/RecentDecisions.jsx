import {
    CheckCircle2,
    Clock3,
    XCircle,
    ChevronRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./RecentDecisions.css";

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

                    {recentDecisions.map(decision => {

                        const status = getStatus(
                            decision.decision_status
                        );

                        const Icon = status.icon;

                        return (

                            <div
                                key={decision.id}
                                className={`decisionCard ${status.className}`}
                                role="button"
                                tabIndex={0}
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

                            </div>

                        );

                    })}

                </div>

            )}

        </div>

    );

}