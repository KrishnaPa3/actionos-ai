import SectionHeader from "../results/SectionHeader";
import EmptySection from "../results/EmptySection";
import InfoRow from "../results/InfoRow";
import ActionButtons from "../results/ActionButtons";

import {
    ClipboardList
} from "../ui/icons";

export default function ActionPlanSection({
    actionPlans,
    onEdit = () => {},
    onDelete = () => {}
}) {

    if (!actionPlans || actionPlans.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<ClipboardList size={22} />}
                    title="Action Plans"
                />

                <EmptySection
                    icon={<ClipboardList size={42} />}
                    title="No Action Plans"
                    description="No action plans were generated for this meeting."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<ClipboardList size={22} />}
                title={`Action Plans (${actionPlans.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {actionPlans.map((plan, index) => (

                    <div
                        key={index}
                        style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            padding: "18px"
                        }}
                    >

                        <h3
                            style={{
                                marginTop: 0,
                                marginBottom: "16px"
                            }}
                        >
                            {plan.objective || "Action Plan"}
                        </h3>

                        {plan.steps?.map((step, stepIndex) => (

                            <InfoRow
                                key={stepIndex}
                                icon={<ClipboardList size={16} />}
                                label={`Step ${stepIndex + 1}`}
                                value={
                                    step.owner
                                        ? `${step.step} (${step.owner})`
                                        : step.step
                                }
                            />

                        ))}

                        <ActionButtons
                            compact
                            onEdit={() => onEdit(index)}
                            onDelete={() => onDelete(index)}
                        />

                    </div>

                ))}

            </div>

        </section>

    );

}