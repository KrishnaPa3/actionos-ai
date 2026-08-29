import Card from "../ui/Card";
import { COLORS } from "../ui/colors";

export default function EditableCard({

    title,
    badge,
    children,
    actions,
    style = {}

}) {

    return (

        <Card
            hover
            style={{
                marginBottom: "18px",
                fontFamily: "var(--body)",
                transition: "all 0.35s ease",
                ...style
            }}
        >

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "24px",
                    marginBottom: "24px"
                }}
            >

                {/* Left Side */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap"
                    }}
                >

                    <h3
                        style={{
                            margin: 0,
                            color: COLORS.text,
                            fontFamily: "var(--body)",
                            fontSize: "24px",
                            fontWeight: 700,
                            lineHeight: 1.35,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            transition: "all .3s ease"
                        }}
                    >
                        {title}
                    </h3>

                    {badge}

                </div>

                {/* Right Side */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexShrink: 0
                    }}
                >

                    {actions}

                </div>

            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontFamily: "var(--body)"
                }}
            >

                {children}

            </div>

        </Card>

    );

}