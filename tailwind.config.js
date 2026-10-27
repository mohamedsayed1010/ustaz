import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem', xl: '2.5rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          foreground: 'hsl(var(--surface-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          soft: 'hsl(var(--primary-soft) / <alpha-value>)',
          pale: 'hsl(var(--primary-pale) / <alpha-value>)',
        },
        /* Soft orange — marks, stars, role dots, CTAs on navy; never body text on white. */
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
        },
        /* Midnight navy — the foundation: bands, featured marks, structure. */
        navy: {
          DEFAULT: 'hsl(var(--navy) / <alpha-value>)',
          foreground: 'hsl(var(--navy-foreground) / <alpha-value>)',
          strong: 'hsl(var(--navy-strong) / <alpha-value>)',
          deep: 'hsl(var(--navy-deep) / <alpha-value>)',
          raised: 'hsl(var(--navy-raised) / <alpha-value>)',
          soft: 'hsl(var(--navy-soft) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
          soft: 'hsl(var(--accent-soft) / <alpha-value>)',
          /* Text-grade teal — see globals.css. */
          strong: 'hsl(var(--accent-strong) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          strong: 'hsl(var(--destructive-strong) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          strong: 'hsl(var(--success-strong) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          strong: 'hsl(var(--warning-strong) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
          strong: 'hsl(var(--info-strong) / <alpha-value>)',
        },
        role: {
          teacher: 'hsl(var(--role-teacher) / <alpha-value>)',
          student: 'hsl(var(--role-student) / <alpha-value>)',
          parent: 'hsl(var(--role-parent) / <alpha-value>)',
          admin: 'hsl(var(--role-admin) / <alpha-value>)',
        },
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
        },
        spotlight: {
          DEFAULT: 'hsl(var(--spotlight) / <alpha-value>)',
          foreground: 'hsl(var(--spotlight-foreground) / <alpha-value>)',
        },
        /* The stage behind the hero and statement bands (themed). */
        stage: {
          DEFAULT: 'hsl(var(--stage) / <alpha-value>)',
          foreground: 'hsl(var(--stage-foreground) / <alpha-value>)',
          muted: 'hsl(var(--stage-muted) / <alpha-value>)',
          raised: 'hsl(var(--stage-raised) / <alpha-value>)',
          line: 'hsl(var(--stage-line) / <alpha-value>)',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#128C7E',
          ink: '#075E54',
        },
      },
      fontFamily: {
        /* Alexandria — an Egyptian-designed geometric face — sets every heading.
           IBM Plex Sans Arabic carries running text; Plex Mono carries data labels. */
        display: ['Alexandria', 'IBM Plex Sans Arabic', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans Arabic', 'IBM Plex Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
        latin: ['IBM Plex Sans', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['clamp(2.375rem, 4.8vw, 4.25rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.14', letterSpacing: '-0.018em', fontWeight: '700' }],
        'display-lg': ['clamp(1.625rem, 2.8vw, 2.375rem)', { lineHeight: '1.2', letterSpacing: '-0.012em', fontWeight: '600' }],
        'heading-lg': ['clamp(1.375rem, 2vw, 1.75rem)', { lineHeight: '1.3', letterSpacing: '-0.008em', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-sm': ['1.0625rem', { lineHeight: '1.45', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.8' }],
        body: ['0.9688rem', { lineHeight: '1.75' }],
        'body-sm': ['0.875rem', { lineHeight: '1.7' }],
        caption: ['0.8125rem', { lineHeight: '1.55' }],
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '600' }],
        price: ['1.625rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        metric: ['clamp(1.625rem, 2.4vw, 2rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      /* Tight, consistent corners: 10px containers, 8px controls, 5px chips. */
      borderRadius: {
        xs: 'calc(var(--radius) - 7px)',
        sm: 'calc(var(--radius) - 5px)',
        md: 'calc(var(--radius) - 3px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 2px)',
        '2xl': 'calc(var(--radius) + 4px)',
        '3xl': 'calc(var(--radius) + 8px)',
      },
      spacing: {
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        section: 'clamp(4rem, 8vw, 7rem)',
      },
      /* Hairlines do the separating; elevation is reserved for things that float. */
      boxShadow: {
        xs: '0 1px 0 0 hsl(var(--shadow-color) / 0.04)',
        soft: '0 1px 2px 0 hsl(var(--shadow-color) / 0.06)',
        card: '0 1px 2px 0 hsl(var(--shadow-color) / 0.04)',
        lift: '0 2px 6px -1px hsl(var(--shadow-color) / 0.08), 0 16px 36px -12px hsl(var(--shadow-color) / 0.2)',
        glow: '0 0 0 1px hsl(var(--brand) / 0.4)',
        insetTop: 'inset 0 1px 0 0 hsl(0 0% 100% / 0.06)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(-200%)' } },
        /* Continuous hero motion — transform/opacity only, all very slow. */
        'orbit-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'node-breathe': {
          '0%,100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'bar-rise': {
          '0%,100%': { transform: 'scaleY(0.55)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        /* Floating decoration is retired; the names stay so stale classes are inert. */
        'float-slow': 'none',
        'float-slower': 'none',
        shimmer: 'shimmer 2.2s infinite',
        'orbit-spin': 'orbit-spin 120s linear infinite',
        'node-breathe': 'node-breathe 3.6s cubic-bezier(0.4,0,0.2,1) infinite',
        'bar-rise': 'bar-rise 3.2s cubic-bezier(0.45,0,0.55,1) infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24,0,0.38,1) infinite',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [animate],
}
