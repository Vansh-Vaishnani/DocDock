module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.04)',
        'medium': '0 4px 16px -4px rgba(15,23,42,0.10), 0 2px 6px -2px rgba(15,23,42,0.06)',
        'large': '0 12px 40px -8px rgba(15,23,42,0.14), 0 4px 12px -4px rgba(15,23,42,0.08)',
        'xl': '0 24px 60px -12px rgba(15,23,42,0.18), 0 8px 20px -6px rgba(15,23,42,0.10)',
        'emerald': '0 6px 24px -4px rgba(16,185,129,0.35)',
        'emerald-sm': '0 3px 12px -3px rgba(16,185,129,0.25)',
        'emerald-lg': '0 12px 40px -6px rgba(16,185,129,0.45)',
        'card': '0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.04)',
        'card-hover': '0 8px 30px -6px rgba(15,23,42,0.12), 0 2px 8px -2px rgba(15,23,42,0.07)',
        'inner-sm': 'inset 0 1px 3px 0 rgba(15,23,42,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'pop-in': 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s ease-in-out infinite',
        'typing': 'typingBounce 1.4s ease-in-out infinite',
        'progress-bar': 'progressBar 4s linear forwards',
        'dot-pulse': 'dotPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.93)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-5px)' },
        },
        progressBar: {
          from: { width: '100%' },
          to: { width: '0%' },
        },
        dotPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.25)', opacity: '0.7' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
