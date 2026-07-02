import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import ActionButtons from "./ActionButtons";

import {
    TriangleAlert
} from "../ui/icons";

export default function RiskSection({ risks }) {

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

                {risks.map((risk, index) => (

                    <EditableCard
                        key={index}
                        title={risk}

                        actions={

                            <ActionButtons

                                compact

                                showConfirm={false}

                                onEdit={() =>
                                    console.log("Edit risk", index)
                                }

                                onDelete={() =>
                                    console.log("Delete risk", index)
                                }

                            />

                        }

                    >

                        <div
                            style={{
                                lineHeight: 1.7
                            }}
                        >
                            This potential risk was identified by the AI.
                        </div>

                    </EditableCard>

                ))}

            </div>

        </section>

    );

}