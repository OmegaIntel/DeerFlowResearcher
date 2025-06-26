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
        'openbb': {
          'bg': {
            'primary': {
              DEFAULT: '#000000',
              light: '#FFFFFF'
            },
            'secondary': {
              DEFAULT: '#0A0A0A',
              light: '#F5F5F5'
            },
            'widget': {
              DEFAULT: '#1A1A1A',
              light: '#FFFFFF'
            },
            'hover': {
              DEFAULT: '#2A2A2A',
              light: '#E5E5E5'
            }
          },
          'accent': {
            DEFAULT: '#00D9FF',
            light: '#0099CC'
          },
          'success': '#00FF88',
          'danger': '#FF4444',
          'warning': '#FFA500',
          'blue': '#4169E1',
          'text': {
            'primary': {
              DEFAULT: '#FFFFFF',
              light: '#000000'
            },
            'secondary': {
              DEFAULT: '#CCCCCC',
              light: '#555555'
            },
            'muted': {
              DEFAULT: '#888888',
              light: '#999999'
            }
          },
          'border': {
            DEFAULT: '#333333',
            light: '#E0E0E0'
          }
        }
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Droid Sans Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xxs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.875rem',  // 14px
        'base': '1rem',    // 16px
        'lg': '1.125rem',  // 18px
        'xl': '1.25rem',   // 20px
      },
    },
  },
  plugins: [],
}