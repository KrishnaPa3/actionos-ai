import { motion } from "motion/react";
import { COLORS } from "./colors";
import { RADIUS } from "./radius";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function Card({
  children,
  onClick,
  style = {},
  hover = true,
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: "22px",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      whileHover={
        hover
          ? {
              y: -4,
              borderColor: COLORS.primary,
              boxShadow: `0 8px 30px rgba(59, 130, 246, 0.15)`,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {children}
    </motion.div>
  );
}
