import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ShoppingBag, Brush, Truck, ArrowRight } from 'lucide-react';

const roles = [
    {
        icon:        ShoppingBag,
        title:       'Register as Buyer',
        description: 'Discover and purchase original paintings from talented local artists.',
        perks:       ['Browse thousands of artworks', 'Secure checkout', 'Order tracking'],
        href:        '/register/buyer',
        accent:      'from-emerald-400 to-teal-500',
        bg:          'hover:border-emerald-300 hover:bg-emerald-50',
        iconBg:      'bg-emerald-100 text-emerald-600',
    },
    {
        icon:        Brush,
        title:       'Register as Artist',
        description: 'Showcase your portfolio, sell your work, and grow your creative business.',
        perks:       ['Free portfolio page', 'GCash payouts', 'Analytics dashboard'],
        href:        '/register/artist',
        accent:      'from-cobalt to-blue-500',
        bg:          'hover:border-blue-300 hover:bg-blue-50',
        iconBg:      'bg-blue-100 text-blue-600',
    },
    {
        icon:        Truck,
        title:       'Apply as Driver',
        description: 'Deliver artworks safely and earn on your schedule.',
        perks:       ['Flexible hours', 'Per-delivery earnings', 'In-app navigation'],
        href:        '/register/driver',
        accent:      'from-amber-400 to-orange-500',
        bg:          'hover:border-amber-300 hover:bg-amber-50',
        iconBg:      'bg-amber-100 text-amber-600',
    },
];

export default function RoleSelection() {
    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Create Account — Artisora" />

            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
            />

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <span className="font-display text-xl font-semibold text-ink">Artisora</span>
                </Link>
                <p className="text-sm text-ink-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-sienna hover:text-sienna-600 underline underline-offset-2">
                        Sign in
                    </Link>
                </p>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-16">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-12"
                >
                    <h1 className="font-display text-5xl font-semibold text-ink">
                        Join Artisora
                    </h1>
                    <p className="mt-3 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
                        The Philippine marketplace for original paintings. Choose how you'd like to participate.
                    </p>
                </motion.div>

                {/* Role cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    {roles.map((role, i) => {
                        const Icon = role.icon;
                        return (
                            <motion.div
                                key={role.title}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.1, duration: 0.35 }}
                                whileHover={{ y: -4 }}
                            >
                                <Link
                                    href={role.href}
                                    className={`group flex flex-col h-full rounded-2xl border-2 border-border bg-surface p-7 shadow-xs transition-all duration-200 ${role.bg}`}
                                >
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${role.iconBg}`}>
                                        <Icon size={22} />
                                    </div>

                                    {/* Title + description */}
                                    <h2 className="font-display text-2xl font-semibold text-ink mb-2">
                                        {role.title}
                                    </h2>
                                    <p className="text-sm text-ink-muted leading-relaxed mb-5">
                                        {role.description}
                                    </p>

                                    {/* Perks */}
                                    <ul className="space-y-1.5 mb-6 flex-1">
                                        {role.perks.map((perk) => (
                                            <li key={perk} className="flex items-center gap-2 text-sm text-ink-soft">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sienna flex-shrink-0" />
                                                {perk}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2 text-sm font-semibold text-sienna group-hover:gap-3 transition-all">
                                        Get started
                                        <ArrowRight size={15} />
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>

                <p className="mt-10 text-center text-xs text-ink-subtle">
                    By registering you agree to our{' '}
                    <a href="#" className="underline hover:text-ink-muted">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="underline hover:text-ink-muted">Privacy Policy</a>.
                </p>
            </main>
        </div>
    );
}