/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: "#00a884",
          greenHover: "#06cf9c",
          dark: "#111b21",
          card: "#202c33",
          lightCard: "#ffffff",
          muted: "#8696a0",
          border: "#222e35",
        },
      },
    },
  },
  plugins: [],
};
