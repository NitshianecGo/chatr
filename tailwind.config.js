/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#05070d',
          900: '#0b0f1a',
          850: '#0f1424',
          800: '#141a2e',
          700: '#1c2338',
          600: '#2a3350',
        },
        mint: {
          400: '#6ee7b7',
          500: '#34d399',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        indigo: {
          400: '#818cf8',
          500: '#6366f1',
        },
        pink: {
          400: '#f472b6',
          500: '#ec4899',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        aurora: 'linear-gradient(120deg, #6ee7b7 0%, #818cf8 45%, #f472b6 100%)',
        'aurora-soft': 'linear-gradient(135deg, rgba(110,231,183,0.18) 0%, rgba(129,140,248,0.18) 45%, rgba(244,114,182,0.18) 100%)',
        'bubble-sent': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(129,140,248,0.25)',
        glass: '0 8px 32px rgba(0,0,0,0.35)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(3%,-4%) scale(1.05)' },
          '66%': { transform: 'translate(-3%,3%) scale(0.97)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-4%,4%) scale(1.08)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(8px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
      },
      animation: {
        float: 'float 18s ease-in-out infinite',
        drift: 'drift 22s ease-in-out infinite',
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        popIn: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
