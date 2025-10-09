/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9edff",
          200: "#b5dbff",
          300: "#7fc0ff",
          400: "#379aff",
          500: "#0f7eff",
          600: "#035fe5",
          700: "#0249b2",
          800: "#033f8e",
          900: "#043671"
        }
      }
    },
  },
  plugins: [],
};
