import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

/**
 * Design tokens are the ONLY source of colours and typography.
 * Tokens are CSS variables so light/dark themes swap without touching components.
 */
const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        surface: token("surface"),
        border: token("border"),
        text: { DEFAULT: token("text"), muted: token("text-muted") },
        primary: { soft: token("primary-soft"), DEFAULT: token("primary"), strong: token("primary-strong") },
        success: { soft: token("success-soft"), DEFAULT: token("success"), strong: token("success-strong") },
        warning: { soft: token("warning-soft"), DEFAULT: token("warning"), strong: token("warning-strong") },
        danger: { soft: token("danger-soft"), DEFAULT: token("danger"), strong: token("danger-strong") },
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Cairo", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 1px 3px rgb(var(--color-border) / 0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
