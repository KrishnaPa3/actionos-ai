import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import ActionButtons from "./ActionButtons";

import {
    BadgeCheck
} from "../ui/icons";

export default function DecisionSection({ decisions }) {

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
                        title={decision}

                        actions={

                            <ActionButtons

                                compact

                                showConfirm={false}

                                onEdit={() =>
                                    console.log("Edit decision", index)
                                }

                                onDelete={() =>
                                    console.log("Delete decision", index)
                                }

                            />

                        }

                    >

                        <div
                            style={{
                                lineHeight: 1.7
                            }}
                        >
                            This decision was extracted from the meeting.
                        </div>

                    </EditableCard>

                ))}

            </div>

        </section>

    );

}