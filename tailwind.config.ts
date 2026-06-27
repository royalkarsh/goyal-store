import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        inter:   ['var(--font-inter)', 'sans-serif'],
        sans:    ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'green-deep':  '#0D2818',
        'green-mid':   '#1a4429',
        'green-light': '#2d6a4f',
        'green-muted': '#52b788',
        'cream':       '#faf7f2',
        'cream-dark':  '#f0ebe0',
        'saffron':     '#F5A623',
        'saffron-light': '#ffd166',
        'red-fresh':   '#e63946',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'card':       '0 4px 24px rgba(13,40,24,0.08)',
        'card-hover': '0 12px 40px rgba(13,40,24,0.16)',
        'nav':        '0 8px 32px rgba(13,40,24,0.20)',
        'saffron':    '0 8px 24px rgba(245,166,35,0.35)',
      },
    },
  },
  plugins: [],
}

export default config
