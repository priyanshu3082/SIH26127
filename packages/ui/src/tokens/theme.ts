// JS-side mirror of tokens.css, for contexts that can't read CSS custom
// properties directly — deck.gl layer color arrays, canvas/WebGL, chart
// color scales. Keep these values in sync with tokens.css by hand; there
// are few enough that a build-time generator would be overkill here.

export const colors = {
  bg0: "#070a10",
  bg1: "#0c111b",
  bg2: "#121927",
  bg3: "#1a2233",
  bg4: "#232c40",

  borderSubtle: "#1c2432",
  borderDefault: "#2a3448",
  borderStrong: "#3c4a63",

  textPrimary: "#e8ecf4",
  textSecondary: "#9aa7bd",
  textMuted: "#6b7690",
  textDisabled: "#454f63",

  cyan200: "#a8f0ff",
  cyan400: "#3fd8f0",
  cyan500: "#22c5e0",
  cyan600: "#14a3bd",
  cyan900: "#0a2e38",

  amber300: "#ffd88a",
  amber400: "#ffb84d",
  amber500: "#f59e0b",
  amber900: "#3a2508",

  red300: "#ffb3b3",
  red400: "#ff6b6b",
  red500: "#ef4444",
  red600: "#c8302f",
  red900: "#3a0f0f",

  green400: "#4ade80",
  green500: "#22c55e",
  green900: "#0e2e1a",
} as const;

/** RGBA byte arrays for deck.gl layers (which want [r,g,b,a] 0-255, not hex). */
export const deckColors = {
  cyan: [34, 197, 224] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  cyanBright: [63, 216, 240] as [number, number, number],
};

export const fonts = {
  display: `"Space Grotesk", "Segoe UI", system-ui, sans-serif`,
  mono: `"JetBrains Mono", "SFMono-Regular", Consolas, monospace`,
};

export const durations = {
  fast: 150,
  base: 200,
  slow: 250,
};

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export const severityColor: Record<SeverityLevel, string> = {
  low: colors.textSecondary,
  medium: colors.amber500,
  high: colors.amber400,
  critical: colors.red500,
};
