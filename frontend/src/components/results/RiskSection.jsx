import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import ActionButtons from "./ActionButtons";
import RiskMeter from "./RiskMeter";

import {
    TriangleAlert,
    ShieldAlert,
    ShieldCheck,
    Brain,
    Gauge
} from "../ui/icons";

export default function RiskSection({

    risks,

    onEditRisk,

    onDeleteRisk,

    onResolveRisk

}) {
    if (!risks || risks.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<TriangleAlert size={22} />}
                    title="Risks"
                />

                <EmptySection
                    icon={<TriangleAlert size={42} />}
                    title="No Risks"
                    description="No risks were detected in this meeting."
                />

            </section>

        );

    }

    const getRiskColor = (score) => {

        if (score <= 25) return "#22c55e";

        if (score <= 50) return "#eab308";

        if (score <= 75) return "#f97316";

        return "#ef4444";

    };

    const getRiskLevel = (score) => {

        if (score <= 25) return "LOW";

        if (score <= 50) return "MEDIUM";

        if (score <= 75) return "HIGH";

        return "CRITICAL";

    };

    return (

        <section>

            <SectionHeader
                icon={<TriangleAlert size={22} />}
                title={`Risks (${risks.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {risks.map((risk) => (

                    <EditableCard

                        key={risk.id}

                        title={risk.title}
                            style={{

        borderLeft:
            risk.status === "Resolved"
                ? "6px solid #22c55e"
                : "6px solid transparent",

        boxShadow:
            risk.status === "Resolved"
                ? "0 0 18px rgba(34,197,94,0.15)"
                : undefined,

        transition: "all .35s ease"

    }}


                        actions={

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px"
                                }}
                            >

                               <span
    style={{
        background:
            risk.status === "Resolved"
                ? "#22c55e"
                : getRiskColor(risk.risk_score),

        color: "#fff",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        minWidth: "100px",
        textAlign: "center"
    }}
>
    {
        risk.status === "Resolved"
            ? "RESOLVED"
            : getRiskLevel(risk.risk_score)
    }
</span>
                                <ActionButtons
    compact
    showConfirm

    onEdit={() => onEditRisk(risk)}

    onConfirm={() => onResolveRisk(risk)}

    onDelete={() => onDeleteRisk(risk)}
/>

                            </div>

                        }

                    >

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "22px"
                            }}
                        >

                            {/* Impact */}

                            <div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontWeight: 600,
                                        marginBottom: "8px"
                                    }}
                                >
                                    <ShieldAlert size={18} />
                                    Impact
                                </div>

                                <div>
                                    {risk.impact}
                                </div>

                            </div>

                            {/* Mitigation */}

                            <div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontWeight: 600,
                                        marginBottom: "8px"
                                    }}
                                >
                                    <ShieldCheck size={18} />
                                    Mitigation
                                </div>

                                <div>
                                    {risk.mitigation}
                                </div>

                            </div>

                            {/* Risk Meter */}

                            <div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontWeight: 600,
                                        marginBottom: "10px"
                                    }}
                                >
                                    <Gauge size={18} />
                                    Risk Meter
                                </div>

                                <RiskMeter
    score={risk.risk_score}
    color={
        risk.status === "Resolved"
            ? "#22c55e"
            : getRiskColor(risk.risk_score)
    }
/>

                            </div>

                            {/* Confidence */}

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontWeight: 600
                                }}
                            >

                                <Brain size={18} />

                                <span>
                                    AI Confidence:
                                </span>

                                <span>
                                    {Math.round(risk.confidence * 100)}%
                                </span>

                            </div>

                        </div>

                    </EditableCard>

                ))}

            </div>

        </section>

    );

}