import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Every color/radius/shadow/duration below resolves to a CSS custom property
// defined in packages/ui/src/tokens/tokens.css — this file wires those tokens
// into Tailwind's utility classes (bg-bg-2, text-cyan-400, shadow-glow-red,
// duration-fast, ...). No raw hex/px values should be added here — add the
// token in tokens.css first, then reference it here.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
          4: "var(--bg-4)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
        },
        cyan: {
          200: "var(--accent-cyan-200)",
          400: "var(--accent-cyan-400)",
          500: "var(--accent-cyan-500)",
          600: "var(--accent-cyan-600)",
          900: "var(--accent-cyan-900)",
        },
        amber: {
          300: "var(--accent-amber-300)",
          400: "var(--accent-amber-400)",
          500: "var(--accent-amber-500)",
          900: "var(--accent-amber-900)",
        },
        red: {
          300: "var(--accent-red-300)",
          400: "var(--accent-red-400)",
          500: "var(--accent-red-500)",
          600: "var(--accent-red-600)",
          900: "var(--accent-red-900)",
        },
        green: {
          400: "var(--accent-green-400)",
          500: "var(--accent-green-500)",
          900: "var(--accent-green-900)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        "glow-cyan": "var(--shadow-glow-cyan)",
        "glow-red": "var(--shadow-glow-red)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "250ms",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
