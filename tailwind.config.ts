import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(240 10% 3.9%)",
        foreground: "hsl(0 0% 98%)",
        muted: {
          DEFAULT: "hsl(240 3.7% 15.9%)",
          foreground: "hsl(240 5% 64.9%)",
        },
        card: {
          DEFAULT: "hsl(240 10% 5%)",
          foreground: "hsl(0 0% 98%)",
        },
        border: "hsl(240 3.7% 15.9%)",
        accent: {
          DEFAULT: "hsl(48 100% 50%)",  // bright yellow
          foreground: "hsl(0 0% 9%)",
        },
        primary: {
          DEFAULT: "hsl(48 100% 55%)",  // bright yellow (slightly brighter for links/highlights)
          foreground: "hsl(0 0% 9%)",
        },
        sidebar: "hsl(240 8% 6%)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
