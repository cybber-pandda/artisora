import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.js',
    ],

    // ── Safelist — protect dynamic & opacity classes from purging ──
    safelist: [
        // Sienna opacity variants (used in modals, buttons, icons)
        'bg-sienna/5',
        'bg-sienna/8',
        'bg-sienna/10',
        'bg-sienna/20',
        'ring-sienna/20',
        'ring-sienna/30',
        'focus:ring-sienna/20',
        'hover:bg-sienna/5',

        // Gradient classes
        'from-sienna',
        'from-sienna-600',
        'via-umber',
        'to-sienna',
        'to-sienna-600',
        'to-umber',
        'from-emerald-400',
        'to-teal-500',
        'from-blue-400',
        'to-indigo-500',
        'from-cobalt',
        'to-blue-500',

        // Role badge classes (generated dynamically)
        'bg-red-100',    'text-red-700',
        'bg-blue-100',   'text-blue-700',
        'bg-emerald-100','text-emerald-700',
        'bg-amber-100',  'text-amber-800',

        // Border opacity
        'border-sienna/30',
        'border-sienna/40',
        'border-sienna/50',

        // Text opacity
        'text-sienna-300',
    ],

    theme: {
        extend: {
            // ── Brand Palette ─────────────────────────────────────────
            colors: {
                // Canvas & surfaces
                canvas:  '#FAF7F2',
                linen:   '#EDE8E0',
                surface: '#FFFFFF',

                // Ink (text & nav)
                ink: {
                    DEFAULT: '#1C1917',
                    soft:    '#44403C',
                    muted:   '#78716C',
                    subtle:  '#A8A29E',
                },

                // Brand accent — Burnt Sienna
                sienna: {
                    50:      '#FDF4EF',
                    100:     '#FAE4D4',
                    200:     '#F4C6A8',
                    300:     '#ECA071',
                    400:     '#E27540',
                    DEFAULT: '#C2541A',
                    600:     '#A3431A',
                    700:     '#863618',
                    800:     '#6B2C15',
                    900:     '#572512',
                },

                // Supporting accent — Raw Umber
                umber: {
                    DEFAULT: '#7C5C3E',
                    light:   '#A07850',
                    dark:    '#5A3E28',
                },

                // Artist role — Cobalt Blue
                cobalt: {
                    50:      '#EEF2FB',
                    100:     '#D5DFEF',
                    DEFAULT: '#2B4C9B',
                    700:     '#1E3A80',
                    900:     '#122060',
                },

                // Border colors
                border: {
                    DEFAULT: '#DDD6CE',
                    soft:    '#E7E2DA',
                },
            },

            // ── Typography ────────────────────────────────────────────
            fontFamily: {
                display: ['"Cormorant Garamond"', ...defaultTheme.fontFamily.serif],
                sans:    ['"DM Sans"', ...defaultTheme.fontFamily.sans],
            },

            fontSize: {
                '2xs':  ['0.625rem',  { lineHeight: '1rem' }],
                'xs':   ['0.75rem',   { lineHeight: '1.125rem' }],
                'sm':   ['0.875rem',  { lineHeight: '1.375rem' }],
                'base': ['1rem',      { lineHeight: '1.625rem' }],
                'md':   ['1.0625rem', { lineHeight: '1.75rem' }],
                'lg':   ['1.125rem',  { lineHeight: '1.75rem' }],
                'xl':   ['1.25rem',   { lineHeight: '1.875rem' }],
                '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
                '3xl':  ['1.875rem',  { lineHeight: '2.375rem' }],
                '4xl':  ['2.25rem',   { lineHeight: '2.75rem' }],
                '5xl':  ['3rem',      { lineHeight: '1.1',    letterSpacing: '-0.02em' }],
                '6xl':  ['3.75rem',   { lineHeight: '1',      letterSpacing: '-0.03em' }],
            },

            // ── Spacing (4pt grid) ─────────────────────────────────────
            spacing: {
                '0.5':       '0.125rem',
                '1':         '0.25rem',
                '1.5':       '0.375rem',
                '2':         '0.5rem',
                '2.5':       '0.625rem',
                '3':         '0.75rem',
                '3.5':       '0.875rem',
                '4':         '1rem',
                '5':         '1.25rem',
                '6':         '1.5rem',
                '7':         '1.75rem',
                '8':         '2rem',
                '9':         '2.25rem',
                '10':        '2.5rem',
                '11':        '2.75rem',
                '12':        '3rem',
                '14':        '3.5rem',
                '16':        '4rem',
                '18':        '4.5rem',
                '20':        '5rem',
                'sidebar':   '15rem',
                'sidebar-lg':'17.5rem',
            },

            // ── Border radius ─────────────────────────────────────────
            borderRadius: {
                'sm':    '0.25rem',
                DEFAULT: '0.375rem',
                'md':    '0.5rem',
                'lg':    '0.75rem',
                'xl':    '1rem',
                '2xl':   '1.5rem',
            },

            // ── Shadows ───────────────────────────────────────────────
            boxShadow: {
                'xs':     '0 1px 2px 0 rgba(28,25,23,0.05)',
                'sm':     '0 1px 3px 0 rgba(28,25,23,0.08), 0 1px 2px -1px rgba(28,25,23,0.06)',
                DEFAULT:  '0 4px 6px -1px rgba(28,25,23,0.08), 0 2px 4px -2px rgba(28,25,23,0.06)',
                'md':     '0 6px 16px -2px rgba(28,25,23,0.10), 0 2px 6px -2px rgba(28,25,23,0.06)',
                'lg':     '0 12px 32px -4px rgba(28,25,23,0.12), 0 4px 8px -2px rgba(28,25,23,0.06)',
                'xl':     '0 24px 48px -8px rgba(28,25,23,0.16)',
                'navbar': '0 1px 0 0 #DDD6CE',
                'sidebar':'1px 0 0 0 #DDD6CE',
            },

            // ── Height tokens ─────────────────────────────────────────
            height: {
                'navbar': '4rem',
                'topbar': '3.5rem',
            },

            // ── Width tokens ──────────────────────────────────────────
            width: {
                'sidebar':    '15rem',
                'sidebar-lg': '17.5rem',
            },

            // ── Opacity scale (enables bg-*/10, bg-*/20 etc.) ─────────
            opacity: {
                5:  '0.05',
                8:  '0.08',
                10: '0.10',
                15: '0.15',
                20: '0.20',
                25: '0.25',
                30: '0.30',
                40: '0.40',
                50: '0.50',
                60: '0.60',
                70: '0.70',
                75: '0.75',
                80: '0.80',
                90: '0.90',
                95: '0.95',
            },

            // ── Animation ─────────────────────────────────────────────
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            transitionDuration: {
                DEFAULT: '150ms',
                '200':   '200ms',
                '300':   '300ms',
            },
        },
    },

    plugins: [],
};