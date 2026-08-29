import { FONTS } from "./colors";

// EB Garamond sits small on the line, so every step is ~1px larger than a
// sans would need at the same optical size.

export const TYPOGRAPHY = {

    title: {
        fontFamily: FONTS.display,
        fontSize: "60px",
        fontWeight: 500,
        letterSpacing: "-.8px",
        lineHeight: 1.05,
    },

    heading: {
        fontFamily: FONTS.display,
        fontSize: "29px",
        fontWeight: 500,
        letterSpacing: "-.2px",
        lineHeight: 1.16,
    },

    subheading: {
        fontFamily: FONTS.body,
        fontSize: "17px",
        fontWeight: 600,
        letterSpacing: ".01em",
    },

    body: {
        fontFamily: FONTS.body,
        fontSize: "16.5px",
        fontWeight: 400,
        lineHeight: 1.62,
    },

    small: {
        fontFamily: FONTS.body,
        fontSize: "15px",
        fontWeight: 500,
    },

    meta: {
        fontFamily: FONTS.body,
        fontSize: "14px",
        fontWeight: 500,
    },

    eyebrow: {
        fontFamily: FONTS.body,
        fontSize: "12.5px",
        fontWeight: 600,
        letterSpacing: ".18em",
        textTransform: "uppercase",
    },

};
