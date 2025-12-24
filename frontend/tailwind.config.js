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
        // Icy mountainous palette - serene, calm, premium
        primary: {
          50: '#e8f0f8',
          100: '#cfe0f0',
          200: '#b6cfe8',
          300: '#7fa5d1',
          400: '#5483ba',
          500: '#3d6a9e',
          600: '#2d5a85',
          700: '#004681',
          800: '#003a6b',
          900: '#002d54',
        },
        // Ice - for backgrounds, gradients, subtle layers
        ice: {
          50: '#f9fbfd',
          100: '#f0f6fb',
          200: '#e0eef7',
          300: '#d5e8f2',
          400: '#c5dceb',
          500: '#a8c8db',
        },
        // Frost - periwinkle tones for accents
        frost: {
          100: '#dfe4f0',
          200: '#c7d3e8',
          300: '#9ba9d0',
          400: '#7688c0',
          500: '#5a72af',
        },
        // Snow - background whites with subtle blue undertones
        snow: {
          white: '#fafafa',
          frost: '#f6f5fa',
          soft: '#f0f4f9',
        },
        // Text colors
        text: {
          heading: '#004681',
          body: '#2d5a85',
          muted: '#5a72af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'ice-gradient': 'linear-gradient(135deg, #f0f6fb 0%, #e0eef7 50%, #d5e8f2 100%)',
        'frost-glow': 'radial-gradient(ellipse at top, rgba(61, 106, 158, 0.08) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}
