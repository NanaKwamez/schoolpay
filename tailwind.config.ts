import type { Config } from 'tailwindcss'

/**
 * SchoolPay (Morning Glory Academy) — extended theme.
 * Core tokens also live in `app/globals.css` @theme for Tailwind v4.
 */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // CCIT 10.1" Android tablet — portrait ~800px CSS width
        tablet: '820px',
      },
      colors: {
        mga: {
          'green-dark': '#0D3B2E',
          'green-mid': '#1A5C40',
          'green-light': '#2D8A5F',
          'green-pale': '#E8F5EE',
          gold: '#C9A84C',
          'gold-light': '#E8C96A',
          cream: '#F9F6F0',
          'cream-dark': '#F0EBE1',
          navy: '#0A1628',
          'navy-mid': '#112240',
          'accent-blue': '#1E90FF',
        },
      },
      boxShadow: {
        'gold-glow': '0 4px 24px rgba(201,168,76,0.18)',
      },
    },
  },
} satisfies Config
