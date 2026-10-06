/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Space theme colors
                'space': {
                    900: '#0a0e17',
                    800: '#0f172a',
                    700: '#1e293b',
                    600: '#334155',
                    500: '#475569',
                },
                'accent': {
                    primary: '#00d4ff',
                    secondary: '#6366f1',
                    glow: '#00d4ff33',
                },
                'risk': {
                    minimal: '#22c55e',
                    low: '#eab308',
                    moderate: '#f59e0b',
                    high: '#ef4444',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'ticker': 'ticker 30s linear infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.6)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'ticker': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
            },
        },
    },
    plugins: [],
}
