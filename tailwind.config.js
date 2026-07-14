/** @type {import('tailwindcss').Config} */
// Byte-identical theo-* tokens to vault-origin/tailwind.config.js (the VA-T1 `C` palette) so the
// DMS browser renders native inside the Origin shell — same warm "Claude" palette.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theo: {
          bg: '#FAF9F5',
          surface: '#F0EEE6',
          bubble: '#EDEAE0',
          card: '#FFFFFF',
          ink: '#28261F',
          ink2: '#6B6A63',
          ink3: '#94928A',
          line: '#E4E1D6',
          line2: '#D8D4C7',
          coral: '#D97757',
          coralDk: '#BD5D3A',
          coralSoft: '#F4E6DD',
          coralTint: '#EFE4DC',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
