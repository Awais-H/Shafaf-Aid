/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for the app
        'aid-red': '#dc3545',
        'aid-yellow': '#ffc107',
        'aid-green': '#28a745',
        'aid-gray': '#6c757d',
        // Command center palette
        'cmd-bg': '#0a0a0f',
        'cmd-panel': '#0f1115',
        'cmd-border': '#1e293b',
        'cmd-accent': '#06b6d4',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px 0 rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 25px 5px rgba(6, 182, 212, 0.5)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderWidth: {
        '0.5': '0.5px',
      },
    },
  },
  plugins: [],
};
