/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'openbb-bg-primary': '#000000',
        'openbb-bg-secondary': '#0A0A0A', 
        'openbb-bg-widget': '#1A1A1A',
        'openbb-bg-hover': '#2A2A2A',
        'openbb-accent': '#00D9FF',
        'openbb-success': '#00FF88',
        'openbb-danger': '#FF4444',
        'openbb-warning': '#FFA500',
        'openbb-blue': '#4169E1',
        'openbb-text-primary': '#FFFFFF',
        'openbb-text-secondary': '#CCCCCC',
        'openbb-text-muted': '#888888',
        'openbb-border': '#333333',
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Droid Sans Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xxs': '0.625rem', // 10px
      },
    },
  },
  plugins: [],
}