/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./public/index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        // Brand (kept distinct from shadcn's "accent" hover token, which we don't use).
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        hair: "rgb(var(--hair) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        // shadcn semantic tokens (mapped onto the palette; primary follows the accent theme).
        background: "rgb(var(--surface) / <alpha-value>)",
        foreground: "rgb(var(--ink) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--surface-2) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--surface-2) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(255 255 255 / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--surface-3) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--surface-3) / <alpha-value>)",
          foreground: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--bad) / <alpha-value>)",
          foreground: "rgb(255 255 255 / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--accent) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl2: "1.25rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgb(255 255 255 / 0.08), 0 12px 40px -14px rgb(0 0 0 / 0.45)",
        lift: "0 24px 70px -24px rgb(0 0 0 / 0.55)",
        glow: "0 0 0 1px rgb(var(--accent) / 0.35), 0 8px 30px -8px rgb(var(--accent) / 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.6" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.22,1,0.36,1) infinite",
        float: "float 6s ease-in-out infinite",
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
