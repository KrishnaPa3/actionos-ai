import { motion } from "motion/react";
import { COLORS } from "./colors";

export default function EmptyState({

    title,

    description

}) {

    return (

        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
                textAlign: "center",
                padding: "60px 20px"
            }}
        >

            <h2
                style={{
                    color: COLORS.text
                }}
            >

                {title}

            </h2>

            <p
                style={{
                    color: COLORS.textSecondary
                }}
            >

                {description}

            </p>

        </motion.div>

    );

}
