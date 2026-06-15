/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Base (Dark Mode - Primary)
                'deep-bg': '#020617',      // Slate 950 - primary canvas
                'surface': '#0f172a',       // Slate 900 - cards
                'surface-elevated': '#1e293b', // Slate 800 - nested elements

                // Primary Pulse (Indigo to Purple gradient colors)
                primary: {
                    light: '#818cf8',        // Indigo 400
                    DEFAULT: '#6366f1',      // Indigo 500
                    dark: '#4f46e5',         // Indigo 600
                },
                accent: {
                    light: '#c084fc',        // Purple 400
                    DEFAULT: '#a855f7',      // Purple 500
                    dark: '#9333ea',         // Purple 600
                },

                // Status colors
                success: '#10b981',          // Emerald 500
                warning: '#f59e0b',          // Amber 500
                error: '#ef4444',            // Red 500
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'bento': '12px',
                'bento-lg': '16px',
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(99, 102, 241, 0.15)',
                'glow-success': '0 0 20px rgba(16, 185, 129, 0.15)',
                'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15)',
                'bento': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 15px rgba(99, 102, 241, 0.05)',
            },
            backgroundImage: {
                'gradient-pulse': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                'gradient-pulse-hover': 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' },
                },
            },
        },
    },
    plugins: [],
}
