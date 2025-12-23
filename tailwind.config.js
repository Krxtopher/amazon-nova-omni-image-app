/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Lato', 'sans-serif'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                background: "hsl(var(--color-background))",
                foreground: "hsl(var(--color-foreground))",
                card: {
                    DEFAULT: "hsl(var(--color-card))",
                    foreground: "hsl(var(--color-card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--color-popover))",
                    foreground: "hsl(var(--color-popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--color-primary))",
                    foreground: "hsl(var(--color-primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--color-secondary))",
                    foreground: "hsl(var(--color-secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--color-muted))",
                    foreground: "hsl(var(--color-muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--color-accent))",
                    foreground: "hsl(var(--color-accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--color-destructive))",
                    foreground: "hsl(var(--color-destructive-foreground))",
                },
                border: "hsl(var(--color-border))",
                input: "hsl(var(--color-input))",
                ring: "hsl(var(--color-ring))",
            },
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
