import type { Config } from "tailwindcss";

// Paleta neumorphic/skeuomorphic (docs/design/telas/... demo "Soft UI Kit").
// Cores resolvem em CSS custom properties definidas em app/globals.css (:root
// + prefers-color-scheme + [data-theme]), então claro/escuro são o mesmo
// arquivo de tokens — nada aqui muda entre temas, só os valores das variáveis.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface": "var(--ink)",
        "on-surface-variant": "var(--ink-soft)",
        "surface-container-lowest": "var(--bg)",
        "surface-container-low": "var(--bg)",
        "surface-container": "var(--bg)",
        "surface-container-high": "var(--bg)",
        "surface-container-highest": "var(--bg)",
        surface: "var(--bg)",
        "surface-variant": "var(--bg)",
        "surface-bright": "var(--bg)",
        "surface-dim": "var(--bg)",
        "surface-tint": "var(--accent)",
        background: "var(--bg)",
        "on-background": "var(--ink)",
        outline: "var(--ink-soft)",
        "outline-variant": "var(--line)",

        primary: "var(--accent)",
        "primary-container": "var(--accent-2)",
        "on-primary": "var(--accent-ink)",
        "on-primary-container": "var(--accent-ink)",
        "primary-fixed": "var(--accent-soft)",
        "primary-fixed-dim": "var(--accent-soft)",
        "on-primary-fixed": "var(--accent)",
        "on-primary-fixed-variant": "var(--accent)",

        secondary: "var(--secondary)",
        "secondary-container": "var(--secondary-soft)",
        "on-secondary-container": "var(--on-secondary-soft)",
        "secondary-fixed": "var(--secondary-soft)",
        "secondary-fixed-dim": "var(--secondary-soft)",
        "on-secondary-fixed": "var(--secondary)",
        "on-secondary-fixed-variant": "var(--secondary)",

        tertiary: "var(--tertiary)",
        "tertiary-container": "var(--tertiary-soft)",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "var(--tertiary)",
        "tertiary-fixed": "var(--tertiary-soft)",
        "tertiary-fixed-dim": "var(--tertiary-soft)",
        "on-tertiary-fixed": "var(--tertiary)",
        "on-tertiary-fixed-variant": "var(--tertiary)",

        error: "var(--error)",
        "error-container": "var(--error-soft)",
        "on-error": "#ffffff",
        "on-error-container": "var(--on-error-soft)",

        "inverse-surface": "var(--ink)",
        "inverse-on-surface": "var(--bg)",
        "inverse-primary": "var(--accent-soft)",
      },
      boxShadow: {
        neu: "8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)",
        "neu-sm": "5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)",
        "neu-inset": "inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)",
        "neu-inset-sm": "inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      spacing: {
        gutter: "1rem",
        "gutter-sm": "0.75rem",
        "gutter-lg": "1.5rem",
        margin: "1rem",
        "margin-sm": "0.75rem",
        "margin-lg": "2rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        "body-lg": ["var(--font-inter)"],
        caption: ["var(--font-inter)"],
        "body-md": ["var(--font-inter)"],
        "label-md": ["var(--font-inter)"],
        "label-sm": ["var(--font-inter)"],
        "title-md": ["var(--font-quicksand)", "var(--font-inter)"],
        "headline-xl": ["var(--font-quicksand)", "var(--font-inter)"],
        "headline-md": ["var(--font-quicksand)", "var(--font-inter)"],
        "headline-lg": ["var(--font-quicksand)", "var(--font-inter)"],
      },
      fontSize: {
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "title-md": ["18px", { lineHeight: "26px", fontWeight: "700" }],
        "headline-xl": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-md": [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "headline-lg": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "700" },
        ],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};

export default config;
