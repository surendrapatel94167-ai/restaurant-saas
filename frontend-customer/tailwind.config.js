/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff4ed', 100: '#ffe4d1', 200: '#ffc49d', 300: '#ffa266',
          400: '#ff8438', 500: '#ff6b1a', 600: '#f2560a', 700: '#c9440a',
          800: '#9e3710', 900: '#7a2d11',
        },
        ink: { 800: '#26304a', 900: '#1a2234', 950: '#10151f' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,21,18,0.04), 0 4px 12px rgba(28,21,18,0.06)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
