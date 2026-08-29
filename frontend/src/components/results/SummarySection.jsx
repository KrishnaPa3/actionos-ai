import SectionHeader from "./SectionHeader";
import EmptySection from "./EmptySection";

import {
    FileText
} from "../ui/icons";

export default function SummarySection({ summary }) {

    if (!summary || summary.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<FileText size={22} />}
                    title="Summary"
                />

                <EmptySection
                    icon={<FileText size={42} />}
                    title="No Summary"
                    description="The AI could not generate a meeting summary."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<FileText size={22} />}
                title="Summary"
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                }}
            >

                {summary.map((item, index) => (

                    <div
                        key={index}
                        style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start",

                            padding: "12px 0",

                            borderBottom:
                                index !== summary.length - 1
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "none"
                        }}
                    >

                        <FileText
                            size={18}
                            style={{
                                marginTop: "2px",
                                flexShrink: 0
                            }}
                        />

                        <span
                            style={{
                                lineHeight: 1.7,
                                fontFamily: "var(--body)",
                                fontSize: "16px"
                            }}
                        >
                            {item}
                        </span>

                    </div>

                ))}

            </div>

        </section>

    );

}