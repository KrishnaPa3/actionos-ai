import { COLORS } from "./colors";
import { RADIUS } from "./radius";

export default function Card({
  children,
  onClick,
  style = {},
  hover = true,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: "22px",
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!hover) return;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.borderColor = COLORS.primary;
      }}
      onMouseLeave={(e) => {
        if (!hover) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >
      {children}
    </div>
  );
}