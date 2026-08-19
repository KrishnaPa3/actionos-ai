import { COLORS } from "../ui/colors";

export default function InfoRow({
    icon,
    label,
    value,
    color = COLORS.text
}) {

    return (

        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",

                padding: "10px 0",

                borderBottom: `1px solid ${COLORS.border}`
            }}
        >

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",

                    color: COLORS.textSecondary,

                    fontWeight: 500
                }}
            >

                {icon}

                <span>{label}</span>

            </div>

            <div
                style={{
                    color,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center"
                }}
            >

                {value || "-"}

            </div>

        </div>

    );

}