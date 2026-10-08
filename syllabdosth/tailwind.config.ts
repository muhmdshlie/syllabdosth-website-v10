import type { Config } from 'tailwindcss';

// Syllabdosth palette — black & off-white, editorial luxury with a glass touch.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Black & off-white, editorial luxury. (Token names are neutral: noir = black, paper/pearl = off-white.)
        noir: { DEFAULT: '#0B0B0B', deep: '#000000', light: '#1A1A1A', mid: '#2B2B2B' },
        stone: { DEFAULT: '#8A877F', light: '#BDB9B0', pale: '#E4E1D9' },
        taupe: { DEFAULT: '#9C978D', light: '#E8E5DE', deep: '#46433D' },
        pearl: { DEFAULT: '#F2F0EB', soft: '#FAF9F6' },
        paper: { DEFAULT: '#F2F0EB', deep: '#E4E1D9', light: '#F8F7F4' },
        cream: '#F8F7F4',
        ink: { DEFAULT: '#0B0B0B', soft: '#5A5751', deep: '#1A1A1A', 'deep-muted': '#46433D', 'dark-muted': '#A8A59E' },
        soft: '#F5F4F0',
        pending: '#FFF4D6',
        muted: '#ECEAE4',
        line: '#DDDAD2',
        // Admin panel (same look as the previous LMS admin)
        adm: {
          side: '#13121C', side2: '#1C1A28', text: '#1F2937', muted: '#6B7280', line: '#E4ECEA', bg: '#F3FAF8',
          green: '#27AE7A', 'green-soft': '#D7F5EA', orange: '#F4A51C', 'orange-soft': '#FFF1D6',
          red: '#F2603E', 'red-soft': '#FFE4DC', indigo: '#4F5BD5', 'indigo-soft': '#E3E6FB', blue: '#2F80ED', 'blue-soft': '#E1EEFD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        accent: ['Italiana', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      borderRadius: { card: '6px' },
      maxWidth: { page: '1240px' },
    },
  },
  plugins: [],
};
export default config;
