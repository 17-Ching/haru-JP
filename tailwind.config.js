/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
        primary: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        accent: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ["'Inter'", "'Noto Sans JP'", 'sans-serif'],
        jp:   ["'Noto Sans JP'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      boxShadow: {
        'card':  '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)',
        'hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(99,102,241,0.15)',
        'glow':  '0 0 24px rgba(34,211,238,0.25)',
      },
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'float-slow': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        }
      }
    }
  },
  plugins: []
}
