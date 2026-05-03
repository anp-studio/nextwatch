/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#141313',
        surface: '#141313',
        'surface-dim': '#141313',
        'surface-bright': '#3a3939',
        'surface-container-lowest': '#0e0e0e',
        'surface-container-low': '#1c1b1b',
        'surface-container': '#201f1f',
        'surface-container-high': '#2a2a2a',
        'surface-container-highest': '#353434',
        'surface-variant': '#353434',
        'surface-tint': '#c6c6c7',
        'on-background': '#e5e2e1',
        'on-surface': '#e5e2e1',
        'on-surface-variant': '#c4c7c8',
        outline: '#8e9192',
        'outline-variant': '#444748',
        primary: '#ffffff',
        'on-primary': '#2f3131',
        secondary: '#b9c8de',
        'on-secondary': '#233143',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      borderRadius: {
        card: '0.5rem',
      },
      boxShadow: {
        glow: '0 24px 64px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
