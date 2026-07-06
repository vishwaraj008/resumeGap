/** @type {import('tailwindcss').Config} */
// Tokens sourced from stitch_designs/skillpath/DESIGN.md and PRD Section 0 design system.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5", // indigo — CTAs, active states, links
          dark: "#3525CD", // hover / pressed
          light: "#EEF2FF", // light indigo tint (selected card bg)
          fixed: "#E2DFFF",
        },
        success: "#10B981", // emerald — high match, matched skills
        warning: "#F59E0B", // amber — partial / in-progress
        danger: "#EF4444", // rose — missing / low match
        ink: {
          DEFAULT: "#0F172A", // primary text
          soft: "#64748B", // secondary text
        },
        surface: {
          DEFAULT: "#FFFFFF", // cards
          page: "#F8FAFC", // app background
          dim: "#F1F5F9",
        },
        line: "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0px 4px 20px rgba(15, 23, 42, 0.05)",
        "card-hover": "0px 8px 28px rgba(15, 23, 42, 0.10)",
        modal: "0px 20px 60px rgba(15, 23, 42, 0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        shimmer: "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};
