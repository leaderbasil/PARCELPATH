import type { Config } from "tailwindcss";

/**
 * Design tokens are the ONLY source of colours and typography.
 * Components must never use hard-coded palette classes such as `bg-gray-50`.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        text: {
          DEFAULT: "#1E293B",
          muted: "#64748B",
        },
        primary: {
          soft: "#EEF2FF",
          DEFAULT: "#6366F1",
          strong: "#4F46E5",
        },
        success: {
          soft: "#DCFCE7",
          DEFAULT: "#16A34A",
          strong: "#15803D",
        },
        warning: {
          soft: "#FEF3C7",
          DEFAULT: "#F59E0B",
          strong: "#B45309",
        },
        danger: {
          soft: "#FEE2E2",
          DEFAULT: "#DC2626",
          strong: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Cairo", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
