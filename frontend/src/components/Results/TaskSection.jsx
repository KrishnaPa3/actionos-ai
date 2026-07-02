import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import InfoRow from "./InfoRow";
import PriorityBadge from "./PriorityBadge";
import EmptySection from "./EmptySection";
import ActionButtons from "./ActionButtons";

import {
    CheckSquare,
    User,
    Calendar,
    Flag
} from "../ui/icons";

export default function TaskSection({ tasks }) {

    if (!tasks || tasks.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<CheckSquare size={22} />}
                    title="Tasks"
                />

                <EmptySection
                    icon={<CheckSquare size={42} />}
                    title="No Tasks"
                    description="No actionable tasks were extracted from this meeting."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<CheckSquare size={22} />}
                title={`Tasks (${tasks.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {tasks.map((task, index) => (

                    <EditableCard
    key={index}
    title={task.task}

    actions={

        <ActionButtons

    compact

    onEdit={() => console.log("Edit", index)}

    onConfirm={() => console.log("Complete", index)}

    onDelete={() => console.log("Delete", index)}

/>

    }

>

    <InfoRow
        icon={<User size={16} />}
        label="Owner"
        value={task.owner || "Unassigned"}
    />

    <InfoRow
        icon={<Calendar size={16} />}
        label="Due"
        value={task.due_date || "Not specified"}
    />

    <InfoRow
        icon={<Flag size={16} />}
        label="Priority"
        value={<PriorityBadge priority={task.priority} />}
    />

</EditableCard>

                ))}

            </div>

        </section>

    );

}