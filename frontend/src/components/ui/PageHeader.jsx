import { COLORS } from "./colors";
import { TYPOGRAPHY } from "./typography";

export default function PageHeader({

    icon,

    title,

    subtitle,

    right

}) {

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "30px"
            }}
        >

            <div>

                <h1
                    style={{
                        ...TYPOGRAPHY.title,
                        color: COLORS.text,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "6px"
                    }}
                >

                    {icon}

                    {title}

                </h1>

                {subtitle && (

                    <p
                        style={{
                            color: COLORS.textSecondary
                        }}
                    >

                        {subtitle}

                    </p>

                )}

            </div>

            {right}

        </div>

    );

}