// Palette is unchanged from the original design — the redesign kept every hex.
// The additions below are soft/translucent derivatives of the same hues.

export const COLORS = {
  page: "#0B1120",

  background: "#111827",
  surface: "#1F2937",
  surfaceHover: "#374151",

  border: "#374151",
  hairline: "rgba(148, 163, 184, .16)",

  primary: "#3B82F6",

  text: "#F9FAFB",
  textSecondary: "#9CA3AF",

  // Warm display cream — headings should read as paper, not screen white.
  cream: "#F7F4EF",

  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Soft fills + rings, used for pills, chips and the active nav halo.
  primarySoft: "rgba(59, 130, 246, .14)",
  primaryRing: "rgba(59, 130, 246, .42)",
  primaryInk: "#94BBFF",

  successSoft: "rgba(34, 197, 94, .14)",
  successRing: "rgba(34, 197, 94, .32)",
  successInk: "#7EE2A2",

  warningSoft: "rgba(245, 158, 11, .14)",
  warningRing: "rgba(245, 158, 11, .30)",
  warningInk: "#F7C46C",

  dangerSoft: "rgba(239, 68, 68, .14)",
  dangerRing: "rgba(239, 68, 68, .30)",
  dangerInk: "#FF9B9B",

  cardBg: "linear-gradient(180deg, rgba(255,255,255,.052), rgba(255,255,255,.018))",
  cardShadow: "0 26px 60px rgba(2, 6, 18, .48), inset 0 1px 0 rgba(255, 255, 255, .07)",
};

export const FONTS = {
  display: '"EB Garamond", Garamond, Georgia, "Times New Roman", serif',
  body: '"EB Garamond", Garamond, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
