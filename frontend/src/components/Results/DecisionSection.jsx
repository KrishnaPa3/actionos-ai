import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import DecisionButtons from "./DecisionButtons";
import {
    BadgeCheck
} from "../ui/icons";

export default function DecisionSection({

    decisions,

    onAcceptDecision,

    onRejectDecision,

    onEditDecision,

    onDeleteDecision

})  {

    if (!decisions || decisions.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<BadgeCheck size={22} />}
                    title="Decisions"
                />

                <EmptySection
                    icon={<BadgeCheck size={42} />}
                    title="No Decisions"
                    description="No decisions were identified in this meeting."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<BadgeCheck size={22} />}
                title={`Decisions (${decisions.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {decisions.map((decision, index) => (

                    <EditableCard
                        key={index}
                        title={decision.title}

                        actions={

                       <DecisionButtons

    onAgree={() =>
        onAcceptDecision(decision)
    }

    onDisagree={() =>
        onRejectDecision(decision)
    }

    onEdit={() =>
        onEditDecision(decision)
    }

    onDelete={() =>
        onDeleteDecision(decision)
    }

/>
                        }

                    >

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                lineHeight: 1.6
                            }}
                        >

                            <div>
                                <strong>Reason:</strong> {decision.reason}
                            </div>

                            <div>
                                <strong>Confidence:</strong>{" "}
                                {(decision.confidence * 100).toFixed(0)}%
                            </div>

                        </div>

                    </EditableCard>

                ))}

            </div>

        </section>

    );

}