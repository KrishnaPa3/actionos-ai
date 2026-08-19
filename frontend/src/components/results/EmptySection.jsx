import { COLORS } from "../ui/colors";

export default function EmptySection({

    icon,

    title = "Nothing here",

    description = "There is no data to display."

}) {

    return (

        <div
            style={{

                display: "flex",

                flexDirection: "column",

                alignItems: "center",

                justifyContent: "center",

                textAlign: "center",

                padding: "40px 20px",

                color: COLORS.textSecondary,

                border: `1px dashed ${COLORS.border}`,

                borderRadius: "12px",

                marginTop: "10px",

                fontFamily: '"Space Mono", monospace'

            }}
        >

            <div
                style={{
                    marginBottom: "14px",
                    opacity: 0.8
                }}
            >
                {icon}
            </div>

            <h3
                style={{
                    margin: "0 0 8px 0",

                    color: COLORS.text,

                    fontSize: "18px",

                    fontWeight: 700,

                    fontFamily: '"Space Mono", monospace'
                }}
            >
                {title}
            </h3>

            <p
                style={{
                    margin: 0,

                    maxWidth: "320px",

                    lineHeight: "1.6",

                    fontFamily: '"Space Mono", monospace',

                    fontSize: "15px"
                }}
            >
                {description}
            </p>

        </div>

    );

}