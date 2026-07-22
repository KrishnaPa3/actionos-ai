import { motion } from "motion/react";
import { COLORS } from "./colors";
import { TYPOGRAPHY } from "./typography";

export default function PageHeader({

    icon,

    title,

    subtitle,

    right

}) {

    return (

        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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

        </motion.div>

    );

}
