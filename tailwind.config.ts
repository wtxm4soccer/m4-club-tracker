import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orange:      "#FE5A01",
        "orange-deep": "#D44B00",
        ink:         "#0A0A0A",
        paper:       "#F6F3EE",
        "paper-raised": "#FFFFFF",
        navy:        "#2C3A52",
        "navy-deep": "#1D2738",
        line:        "#E3DFD6",
        muted:       "#6F6B62",
        "status-signed":      "#2F8F54",
        "status-sent":        "#D98E04",
        "status-not-sent":    "#B9B4A8",
        "status-confirmed":   "#2F8F54",
        "status-offered":     "#6B4FA0",
        "status-prospective": "#D98E04",
        "status-declined":    "#9B59A0",
        "status-not-selected":"#E05A3A",
        "status-archived":    "#9B968A",
      },
      fontFamily: {
        display: ["var(--font-barlow)", "sans-serif"],
        body:    ["var(--font-inter)",  "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
