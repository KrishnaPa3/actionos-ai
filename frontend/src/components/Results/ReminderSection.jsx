import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";
import InfoRow from "./InfoRow";
import ActionButtons from "./ActionButtons";

import {
    Bell,
    Calendar,
    Clock3
} from "../ui/icons";

export default function ReminderSection({ reminders }) {

    if (!reminders || reminders.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<Bell size={22} />}
                    title="Reminders"
                />

                <EmptySection
                    icon={<Bell size={42} />}
                    title="No Reminders"
                    description="No reminders were extracted from this meeting."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<Bell size={22} />}
                title={`Reminders (${reminders.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {reminders.map((reminder, index) => (

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
                            {reminder.reminder || reminder.title || "Reminder"}
                        </h3>

                        <InfoRow
                            icon={<Calendar size={16} />}
                            label="Date"
                            value={reminder.date || "Not specified"}
                        />

                        <InfoRow
                            icon={<Clock3 size={16} />}
                            label="Time"
                            value={reminder.time || "Not specified"}
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