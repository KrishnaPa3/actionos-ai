import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import InfoRow from "./InfoRow";
import ActionButtons from "./ActionButtons";

import {
    ClipboardList,
    Calendar,
    User
} from "../ui/icons";

export default function ActionPlanSection({ actionPlans }) {

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
                            {plan.title || plan.action || "Action Plan"}
                        </h3>

                        <InfoRow
                            icon={<User size={16} />}
                            label="Owner"
                            value={plan.owner || "Unassigned"}
                        />

                        <InfoRow
                            icon={<Calendar size={16} />}
                            label="Due"
                            value={plan.due_date || "Not specified"}
                        />

                        <ActionButtons

    compact

    onEdit={() => console.log("Edit", index)}

    onConfirm={() => console.log("Complete", index)}

    onDelete={() => console.log("Delete", index)}

/>

                    </div>

                ))}

            </div>

        </section>

    );

}