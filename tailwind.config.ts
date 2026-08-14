import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#14151a',
        surface: '#1c1e26',
        surface2: '#23252f',
        border: '#2e3140',
        text: '#f2f0e8',
        muted: '#8b8d97',
        amber: '#e8ab4f',
        amberDim: '#6b552a',
        teal: '#4fc9c0',
        red: '#e2645a',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
