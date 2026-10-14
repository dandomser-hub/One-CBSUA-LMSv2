/* Tailwind preset that maps utilities to lms-tokens.css variables.
   Because values come from CSS variables, dark mode needs no `dark:` prefixes:
   bg-surface, text-muted, bg-primary etc. switch automatically with data-theme.

   Usage in tailwind.config.js:
     import lmsPreset from './tailwind.lms-preset.js'
     export default { presets: [lmsPreset], content: [...] }
   and import lms-tokens.css once in your global stylesheet. */

const v = (name) => `var(--${name})`

export default {
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), alt: v('surface-alt') },
        border: v('border'),
        foreground: v('text'),
        muted: v('text-muted'),
        link: v('text-link'),
        focus: v('focus-ring'),
        primary: {
          DEFAULT: v('primary'),
          hover: v('primary-hover'),
          subtle: v('primary-subtle'),
          on: v('on-primary'),
        },
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover'),
          subtle: v('accent-subtle'),
          text: v('accent-text'),
          on: v('on-accent'),
        },
        info: { DEFAULT: v('info'), bg: v('info-bg'), text: v('info-text') },
        success: { DEFAULT: v('success'), bg: v('success-bg'), text: v('success-text') },
        warning: { DEFAULT: v('warning'), bg: v('warning-bg'), text: v('warning-text') },
        danger: { DEFAULT: v('danger'), bg: v('danger-bg'), text: v('danger-text') },
        earth: v('earth'),

        /* Raw scales for illustrations, charts, and one-off cases (theme-invariant) */
        green: {
          50: '#F3F9EC',
          100: '#E2F0D0',
          200: '#C6E1A3',
          300: '#A3CD72',
          400: '#7FB645',
          500: '#5F9B2C',
          600: '#4A7D22',
          700: '#3A611D',
          800: '#2F4C1B',
          900: '#1F3412',
          950: '#121F0A',
        },
        gold: {
          50: '#FFF9E5',
          100: '#FFF0BF',
          200: '#FFE28A',
          300: '#FFD04D',
          400: '#F2B922',
          500: '#D99A0B',
          600: '#B07607',
          700: '#865808',
          800: '#5F3F0B',
          900: '#3A2D0A',
        },
      },
      ringColor: { DEFAULT: v('focus-ring') },
    },
  },
}
