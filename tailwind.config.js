/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        panel: '#18181b',
        line: '#27272a',
        ink: '#ffffff',
        'ink-faint': '#a1a1aa',
        primary: '#4f46e5',
        accent: '#8b5cf6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
