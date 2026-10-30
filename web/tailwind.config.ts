import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0251FD", light: "#3B82F6", bg: "#EFF6FF" },
        accent: "#F97901",
        violet: { DEFAULT: "#8B5CF6" },
        ok: "#10B981",
        canvas: "#F1F5F9",
        line: "#E2E8F0",
        ink: { DEFAULT: "#0F172A", soft: "#64748B", mute: "#94A3B8" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Inter", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)" },
    },
  },
  plugins: [],
};

export default config;
