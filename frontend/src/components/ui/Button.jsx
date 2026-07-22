import { motion } from "motion/react";
import { COLORS } from "./colors";
import { RADIUS } from "./radius";

export default function Button({

    children,

    icon,

    variant = "primary",

    size = "md",

    onClick,

    type = "button",

    disabled = false,

    style = {}

}) {

    const variants = {

        primary: {
            background: COLORS.primary,
            color: COLORS.text,
            border: "none"
        },

        secondary: {
            background: COLORS.surface,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`
        },

        outline: {
            background: "transparent",
            color: COLORS.primary,
            border: `1px solid ${COLORS.primary}`
        },

        ghost: {
            background: "transparent",
            color: COLORS.text,
            border: "none"
        },

        success: {
            background: COLORS.success,
            color: COLORS.text,
            border: "none"
        },

        warning: {
            background: COLORS.warning,
            color: COLORS.text,
            border: "none"
        },

        danger: {
            background: COLORS.danger,
            color: COLORS.text,
            border: "none"
        }

    };

    const sizes = {

        sm: {
            padding: "8px 14px",
            fontSize: "14px"
        },

        md: {
            padding: "10px 18px",
            fontSize: "15px"
        },

        lg: {
            padding: "14px 24px",
            fontSize: "16px"
        }

    };

    const buttonBaseStyle = {

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        gap: "8px",

        borderRadius: RADIUS.md,

        cursor: disabled
            ? "not-allowed"
            : "pointer",

        opacity: disabled ? 0.5 : 1,

        fontFamily: "inherit",

        fontWeight: 600,

        ...variants[variant],

        ...sizes[size],

        ...style

    };

    return (

        <motion.button

            type={type}

            onClick={onClick}

            disabled={disabled}

            style={buttonBaseStyle}

            whileHover={!disabled ? { y: -2, transition: { duration: 0.15 } } : undefined}

            whileTap={!disabled ? { scale: 0.96, transition: { duration: 0.1 } } : undefined}

        >

            {icon}

            {children}

        </motion.button>

    );

}
