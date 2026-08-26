/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            'stella-bg': '#FDFBF7',
            'stella-slate': '#EAE7E0',
            'stella-gold': '#A87B51',
            'stella-amber': '#D4A373',
            'stella-card': 'rgba(255, 255, 255, 0.85)',
            'stella-border': 'rgba(168, 123, 81, 0.25)',
        },
        fontFamily: {
            cairo: ['Cairo', 'sans-serif'],
            tajawal: ['Tajawal', 'sans-serif'],
            amiri: ['Amiri', 'serif'],
        },
        keyframes: {
            twinkle: {
                '0%, 100%': { opacity: 0.1, transform: 'scale(0.8)' },
                '50%': { opacity: 1, transform: 'scale(1.2)' },
            },
            'pulse-slow': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
            },
            'ambient-float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
            },
            'glow-pulse': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
                '50%': { opacity: 1, transform: 'scale(1.15)' },
            }
        },
        animation: {
            twinkle: 'twinkle 3s ease-in-out infinite',
            'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'ambient-float': 'ambient-float 6s ease-in-out infinite',
            'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        }
    },
  },
  plugins: [],
}
