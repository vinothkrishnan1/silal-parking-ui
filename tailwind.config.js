// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': '#EC1B22',
        'primary-blue': '#004EA8',
        'premium-gold': '#D4AF37',
        'premium-black': '#0a0a0a',
        'premium-gray': '#f8fafc',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', ...defaultTheme.fontFamily.sans],
        logo: ['Cinzel', 'Outfit', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'premium-hover': '0 20px 40px -10px rgba(0,0,0,0.12)',
        'premium-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(212, 175, 55, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      }
    }
  },
  plugins: [],
};
