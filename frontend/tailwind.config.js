/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 与 design-tokens.css 同步：可在 className 中直接用 bg-primary/500 等
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#0a0a0f',
        },
        surface: {
          light:  '#f8fafc',
          DEFAULT: '#ffffff',
          dark:   '#0d0d1a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      maxWidth: {
        content: '1700px',
      },
      // 与 design-tokens.css 对齐的圆角档位
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
      // 动画时长档位
      transitionDuration: {
        instant: '120ms',
        fast:    '180ms',
        base:    '240ms',
        slow:    '360ms',
        slower:  '480ms',
        page:    '560ms',
      },
      // 缓动函数档位
      transitionTimingFunction: {
        standard:    'cubic-bezier(0.2, 0, 0, 1)',
        decelerate:  'cubic-bezier(0, 0, 0, 1)',
        accelerate:  'cubic-bezier(0.3, 0, 1, 1)',
        spring:      'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // 阴影层级
      boxShadow: {
        z1: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.06)',
        z2: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.6) inset',
        z3: '0 8px 32px rgba(0, 0, 0, 0.10), 0 1px 0 rgba(255, 255, 255, 0.7) inset',
        z4: '0 24px 64px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
        accent: '0 8px 24px var(--accent-glow)',
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translate3d(0, 24px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'blur-in': {
          '0%':   { opacity: '0', filter: 'blur(12px)', transform: 'translate3d(0, 16px, 0)' },
          '100%': { opacity: '1', filter: 'blur(0)',    transform: 'translate3d(0, 0, 0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up var(--motion-slow) var(--ease-decelerate) both',
        'fade-in':    'fade-in var(--motion-base) var(--ease-standard) both',
        'scale-in':   'scale-in var(--motion-base) var(--ease-spring) both',
        'blur-in':    'blur-in var(--motion-slower) var(--ease-decelerate) both',
      },
    },
  },
  plugins: [],
}