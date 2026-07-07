/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#050607',
        panel: '#0c1012',
        amber: '#ffb020',
        teal: '#2be3b8',
        redact: '#d1352b',
        paper: '#e8e6df',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-data)'],
      },
    },
  },
  plugins: [],
}
