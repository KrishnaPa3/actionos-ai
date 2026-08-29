import { motion } from "motion/react";
import { COLORS, FONTS } from "./colors";
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
            background: "linear-gradient(180deg, #4C8DF7, #2E6FE0)",
            color: "#FFFFFF",
            border: "none",
            boxShadow:
                "0 12px 30px rgba(59, 130, 246, .30), inset 0 1px 0 rgba(255, 255, 255, .28)"
        },

        secondary: {
            background: "rgba(255, 255, 255, .045)",
            color: "#E4E8EF",
            border: `1px solid ${COLORS.hairline}`,
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, .06)"
        },

        outline: {
            background: COLORS.primarySoft,
            color: COLORS.primaryInk,
            border: "none",
            boxShadow: `inset 0 0 0 1px ${COLORS.primaryRing}`
        },

        ghost: {
            background: "transparent",
            color: COLORS.textSecondary,
            border: "none",
            boxShadow: "none"
        },

        success: {
            background: COLORS.successSoft,
            color: COLORS.successInk,
            border: "none",
            boxShadow: `inset 0 0 0 1px ${COLORS.successRing}`
        },

        warning: {
            background: COLORS.warningSoft,
            color: COLORS.warningInk,
            border: "none",
            boxShadow: `inset 0 0 0 1px ${COLORS.warningRing}`
        },

        danger: {
            background: COLORS.dangerSoft,
            color: COLORS.dangerInk,
            border: "none",
            boxShadow: `inset 0 0 0 1px ${COLORS.dangerRing}`
        }

    };

    const sizes = {

        sm: {
            height: "40px",
            padding: "0 15px",
            fontSize: "13px"
        },

        md: {
            height: "46px",
            padding: "0 20px",
            fontSize: "13.5px"
        },

        lg: {
            height: "52px",
            padding: "0 24px",
            fontSize: "14px"
        }

    };

    const buttonBaseStyle = {

        display: "inline-flex",

        alignItems: "center",

        justifyContent: "center",

        gap: "9px",

        borderRadius: RADIUS.round,

        cursor: disabled
            ? "not-allowed"
            : "pointer",

        opacity: disabled ? 0.45 : 1,

        fontFamily: FONTS.body,

        fontWeight: 700,

        letterSpacing: ".1px",

        whiteSpace: "nowrap",

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

            whileHover={!disabled ? { y: -2, transition: { duration: 0.18 } } : undefined}

            whileTap={!disabled ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}

        >

            {icon}

            {children}

        </motion.button>

    );

}
