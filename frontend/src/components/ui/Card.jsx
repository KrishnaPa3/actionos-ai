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
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.hairline}`,
        borderRadius: RADIUS.lg,
        boxShadow: COLORS.cardShadow,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "24px",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      whileHover={
        hover
          ? {
              y: -4,
              borderColor: COLORS.primaryRing,
              boxShadow:
                "0 30px 66px rgba(2, 6, 18, .52), inset 0 1px 0 rgba(255, 255, 255, .09)",
              transition: { duration: 0.22 },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {children}
    </motion.div>
  );
}
