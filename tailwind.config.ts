import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07091a',
        surface: '#161822',
        surface2: '#1c1e2d',
        surface3: '#20223a',
        border: '#292d3e',
        borderHover: '#3a3f60',
        text: '#f3f4f6',
        muted: '#9ca3af',
        mutedDim: '#6b7280',
        faint: '#4b5270',
        amber: '#f5a623',
        amberLight: '#fbbf24',
        amberDim: '#6b552a',
        teal: '#1eb996',
        sky: '#60a5fa',
        violet: '#a78bfa',
        red: '#ef4444',
        redLight: '#f87171',
      },
      fontFamily: {
        serif: ['Fredoka', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
