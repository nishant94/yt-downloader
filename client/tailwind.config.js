/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // Use class strategy instead of attribute
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#7c3aed", // Royal purple
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#7c3aed",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
        royal: {
          blue: "#3b3b98",
          gold: "#ffd700",
          magenta: "#b53471",
          emerald: "#009432",
        },
        pink: {
          500: "#e84393",
        },
        purple: {
          500: "#6c47ff",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(30px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        glow: {
          "0%, 100%": { filter: "drop-shadow(0 0 16px #ffd700)" },
          "50%": { filter: "drop-shadow(0 0 32px #7c3aed)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-8px)" },
          "40%, 80%": { transform: "translateX(8px)" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) both",
        fadeIn: "fadeIn 1.2s ease both",
        "gradient-x": "gradient-x 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
      },
    },
  },
  plugins: [],
};
