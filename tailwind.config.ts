import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        press: ['"Press Start 2P"', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
      colors: {
        arena: {
          bg: '#05050f',
          gold: '#FFD700',
          red: '#FF4444',
          green: '#00ff88',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
