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
        // Winter Ice / Alpine Minimal palette - premium, calm, high-contrast
        primary: {
          50: '#F9FBFD',   // snow - lightest background
          100: '#F6F5FA',  // frost - secondary background
          200: '#E0EEF7',  // ice-200 - soft surface/cards
          300: '#D5E8F2',  // ice-300 - borders/dividers
          400: '#B6CFE8',  // ice-400 - muted panels
          500: '#5483BA',  // steel-400 - UI emphasis
          600: '#4FA3B8',  // arctic teal - CTA accent
          700: '#2D5A85',  // glacier-700 - structure
          800: '#004681',  // alpine-800 - primary anchor navy
          900: '#003366',  // deeper alpine
          950: '#002244',  // deepest alpine
        },
        // CTA Accent - muted arctic teal for primary actions
        accent: {
          50: '#F0F9FB',
          100: '#E1F3F7',
          200: '#C3E7EF',
          300: '#9DD8E5',
          400: '#6FC4D6',
          500: '#4FA3B8',  // primary CTA - muted arctic teal
          600: '#3D8CA0',
          700: '#2E6B7A',
          800: '#235560',
          900: '#1A4049',
        },
        // Periwinkle - optional restrained accent
        nebula: {
          50: '#F7F9FC',
          100: '#EEF2F9',
          200: '#C7D3E8',  // periwinkle-200
          300: '#B5C5DE',
          400: '#9BA9D0',  // periwinkle-400
          500: '#7B8DBF',
          600: '#6175AB',
          700: '#4D5E8E',
          800: '#3D4A6F',
          900: '#2E3851',
        },
        // Foundation - ice and snow backgrounds
        cosmos: {
          50: '#F9FBFD',   // snow
          100: '#F6F5FA',  // frost
          200: '#E0EEF7',  // ice-200
          300: '#D5E8F2',  // ice-300
          400: '#B6CFE8',  // ice-400
          800: '#2D5A85',  // glacier for dark elements
          900: '#004681',  // alpine for darkest elements
          950: '#002244',  // deepest alpine
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'winter-gradient': 'linear-gradient(180deg, #F9FBFD 0%, #E0EEF7 100%)',
        'hero-gradient': 'linear-gradient(135deg, #F6F5FA 0%, #D5E8F2 40%, #9BA9D0 100%)',
        'frost-glow': 'radial-gradient(ellipse at top, rgba(84, 131, 186, 0.08) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}
