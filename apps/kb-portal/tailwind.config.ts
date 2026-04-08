import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#e6f0ff",
          100: "#b3d1ff",
          200: "#80b3ff",
          300: "#4d94ff",
          400: "#1a75ff",
          500: "#0069FF",
          600: "#0054cc",
          700: "#094BB3",
          800: "#003d99",
          900: "#002966",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "var(--tw-prose-body)",
            a: {
              color: "#0069FF",
              textDecoration: "underline",
              fontWeight: "500",
              "&:hover": {
                color: "#0054cc",
              },
            },
            "h2, h3, h4": {
              scrollMarginTop: "6rem",
            },
            code: {
              backgroundColor: "#f3f4f6",
              padding: "0.125rem 0.375rem",
              borderRadius: "0.25rem",
              fontWeight: "400",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
            pre: {
              backgroundColor: "#111827",
              color: "#f3f4f6",
            },
            img: {
              borderRadius: "0.5rem",
            },
            blockquote: {
              borderLeftColor: "#0069FF",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
