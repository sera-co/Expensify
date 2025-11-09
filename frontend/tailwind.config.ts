import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // Remove the components line since it's already covered by ./app/**
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;