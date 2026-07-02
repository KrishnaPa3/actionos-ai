import { COLORS } from "./colors";
import { RADIUS } from "./radius";

export default function StatBadge({

    icon,

    label,

    value

}) {

    return (

        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: COLORS.background,
                padding: "8px 12px",
                borderRadius: RADIUS.round
            }}
        >

            {icon}

            <span>

                {value} {label}

            </span>

        </div>

    );

}