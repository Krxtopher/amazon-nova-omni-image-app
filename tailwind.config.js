/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {},
            animation: {
                'spin-slow': 'spin-slow 8s linear infinite',
                'spin-reverse': 'spin-reverse 12s linear infinite',
                'pulse-slow': 'pulse-slow 6s ease-in-out infinite',
                'bounce-slow': 'bounce-slow 10s ease-in-out infinite',
                'shimmer': 'shimmer 3s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'fade-in': 'fade-in 0.6s ease-out forwards',
                'fade-in-slow': 'fade-in 1s ease-out forwards',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
