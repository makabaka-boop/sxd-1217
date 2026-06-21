/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        graphite: {
          50: '#F5F5F7',
          100: '#E8E8ED',
          200: '#D1D1D9',
          300: '#A1A1AA',
          400: '#71717A',
          500: '#52525B',
          600: '#3F3F46',
          700: '#27272A',
          800: '#1C1C1E',
          900: '#121214',
          950: '#0A0A0B',
        },
        brand: {
          50: '#FFF4EC',
          100: '#FFE4D1',
          200: '#FFC7A0',
          300: '#FFA86E',
          400: '#FF8C42',
          500: '#FF6F19',
          600: '#E85700',
          700: '#BF4500',
          800: '#933500',
          900: '#6A2600',
        },
        success: '#3ECF8E',
        warning: '#FFB020',
        danger: '#FF5A5F',
        info: '#7A8CFF',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(0, 0, 0, 0.3)',
        soft: '0 2px 10px -2px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
