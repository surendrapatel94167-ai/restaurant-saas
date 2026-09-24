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
          50: '#fff4ed', 100: '#ffe6d5', 200: '#fec9a4', 300: '#fda76b',
          400: '#fb7f35', 500: '#f4600f', 600: '#e34a09', 700: '#bc370a',
          800: '#952c10', 900: '#792710',
        },
        ink: { 800: '#2a211c', 900: '#1c1512', 950: '#120d0b' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,21,18,0.04), 0 4px 12px rgba(28,21,18,0.06)',
      },
    },
  },
  plugins: [],
};
