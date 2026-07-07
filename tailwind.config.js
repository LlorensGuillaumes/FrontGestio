// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    // Esta línea es la correcta para tu estructura de carpetas
    "./app/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
