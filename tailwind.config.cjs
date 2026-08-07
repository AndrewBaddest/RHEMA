/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d4af37',
        bg: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        muted: '#a0a0a0',
        error: '#cf6679',
        success: '#4caf50',
        card: '#1a1a1a',
      },
    },
  },
  plugins: [],
}
