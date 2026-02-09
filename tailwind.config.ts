import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        surface: {
          app: "var(--bg-app)",
          card: "var(--bg-card)",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow)",
        "card-hover": "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
    },
  },
  plugins: [],
};
export default config;
