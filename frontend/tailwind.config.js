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
        'registryBlue': '#1E3A8A', // Deep institutional blue
        'registryGold': '#D4AF37', // Official gold accent
        'registryLight': '#F8FAFC',
        'registryDark': '#0F172A',
        'primary-blue': '#1E3A8A', // Override old primary
        'primary-hover': '#1E40AF',
        'bg-light': '#F8FAFC',
        'text-main': '#0F172A',
        'text-muted': '#64748B',
        'border-default': '#E2E8F0',
      }
    },
  },
  plugins: [],
}
