/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0b57d0',
          light: '#e8f0fe',
          dark: '#063b8c',
          hover: '#1a73e8',
        },
        secondary: {
          DEFAULT: '#0f766e', // Teal for stops/routes
          light: '#f0fdfa',
          dark: '#115e59',
        },
        accent: {
          DEFAULT: '#b45309', // Amber for delays/warnings
          light: '#fef3c7',
          dark: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.98)' },
        },
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(11, 87, 208, 0.08)',
        'bottom-nav': '0 -4px 20px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
