/** @type {import('tailwindcss').Config} */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#000000',
          card: '#121212',
          light: '#1E1E1E'
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8'
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#15803D'
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#B91C1C'
        }
      }
    },
  },
  plugins: [],
};

export default config;