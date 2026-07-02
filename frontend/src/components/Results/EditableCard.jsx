import Card from "../ui/Card";
import { COLORS } from "../ui/colors";

export default function EditableCard({

    title,

    children,

    actions

}) {

    return (

        <Card
            hover
            style={{
                marginBottom: "18px",
                fontFamily: '"Space Mono", monospace'
            }}
        >

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",

                    gap: "28px",

                    marginBottom: "24px"
                }}
            >

                <h3
                    style={{
                        flex: 1,

                        margin: 0,

                        color: COLORS.text,

                        fontFamily: '"Space Mono", monospace',

                        fontSize: "24px",

                        fontWeight: 700,

                        lineHeight: 1.35,

                        overflowWrap: "anywhere",

                        wordBreak: "break-word"
                    }}
                >

                    {title}

                </h3>

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

                    fontFamily: '"Space Mono", monospace'
                }}
            >

                {children}

            </div>

        </Card>

    );

}