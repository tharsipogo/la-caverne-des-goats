import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#101118',
        surface: '#161822',
        surface2: '#1c1e2d',
        surface3: '#20223a',
        border: '#292d3e',
        borderHover: '#3a3f60',
        text: '#f3f4f6',
        muted: '#9ca3af',
        mutedDim: '#6b7280',
        faint: '#4b5270',
        amber: '#f59e0b',
        amberLight: '#fbbf24',
        amberDim: '#6b552a',
        teal: '#34d399',
        sky: '#60a5fa',
        violet: '#a78bfa',
        red: '#ef4444',
        redLight: '#f87171',
      },
      fontFamily: {
        serif: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
