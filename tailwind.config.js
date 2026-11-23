/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // FT identity (see project §8)
        canvas: '#ECEDEF',
        surface: '#F5F6F7',
        ink: '#3B2314', // dark brown — primary text / headings
        accent: '#F7941E', // FT orange
        muted: '#8A8A92', // secondary text
        // Heat bands (see §4.5)
        band: {
          hot: '#E0452F',
          warm: '#F7941E',
          lukewarm: '#E8C547',
          cold: '#8FA3B0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
