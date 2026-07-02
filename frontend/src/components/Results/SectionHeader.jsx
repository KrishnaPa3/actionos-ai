import { COLORS } from "../ui/colors";

export default function SectionHeader({
    icon,
    title,
    right
}) {
    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",

                marginBottom: "18px",
                paddingBottom: "12px",

                borderBottom: `1px solid ${COLORS.border}`
            }}
        >

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                }}
            >

                {icon}

                <h2
                    style={{
                        margin: 0,
                        color: COLORS.text,
                        fontSize: "22px",
                        fontWeight: 600
                    }}
                >
                    {title}
                </h2>

            </div>

            {right}

        </div>

    );
}