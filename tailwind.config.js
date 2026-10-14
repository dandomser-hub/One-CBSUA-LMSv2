import lmsPreset from './tailwind.lms-preset.js'
/** @type {import('tailwindcss').Config} */
export default {
  presets: [lmsPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } },
  plugins: [],
}
