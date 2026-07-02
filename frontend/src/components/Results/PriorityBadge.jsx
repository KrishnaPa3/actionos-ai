import { COLORS } from "../ui/colors";
import { RADIUS } from "../ui/radius";

export default function PriorityBadge({ priority = "Medium" }) {

    const level = priority.toLowerCase();

    let background = COLORS.warning;
    let text = "Medium";

    if (level === "low") {
        background = COLORS.success;
        text = "Low";
    }

    if (level === "high") {
        background = COLORS.danger;
        text = "High";
    }

    return (

        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",

                padding: "6px 12px",

                borderRadius: RADIUS.round,

                background,

                color: "#fff",

                fontSize: "13px",

                fontWeight: 600,

                letterSpacing: "0.3px",

                minWidth: "70px"
            }}
        >

            {text}

        </span>

    );

}