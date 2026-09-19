import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3357e6",
          600: "#2543c2",
          700: "#1c349b",
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
