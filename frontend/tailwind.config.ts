import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#0a0e1a",
          surface: "#111827",
          border: "#1f2937",
          accent: "#e94560",
          amber: "#f59e0b",
          green: "#10b981",
          blue: "#3b82f6",
          text: "#e5e7eb",
          muted: "#6b7280",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
