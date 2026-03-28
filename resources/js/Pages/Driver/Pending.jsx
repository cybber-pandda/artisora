import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, ShieldCheck, Truck } from 'lucide-react';

const steps = [
    { icon: ShieldCheck, label: 'Admin reviews your application' },
    { icon: CheckCircle, label: 'Account gets verified' },
    { icon: Truck,       label: 'You gain access to the jobs board' },
];

export default function Pending() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 font-sans">
            <Head title="Pending Approval — Artisora" />

            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap"
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
            >
                {/* Warm header band */}
                <div className="bg-amber-50 px-8 py-8 text-center">
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100"
                    >
                        <Clock size={28} className="text-amber-600" />
                    </motion.div>
                    <h1 className="font-display text-3xl font-semibold text-ink">
                        Application Under Review
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        Your driver application has been received. Our team is reviewing your account.
                    </p>
                </div>

                {/* Steps */}
                <div className="px-8 py-6">
                    <p className="mb-4 text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                        What happens next
                    </p>
                    <ol className="space-y-3">
                        {steps.map(({ icon: Icon, label }, i) => (
                            <motion.li
                                key={label}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + i * 0.1, duration: 0.3 }}
                                className="flex items-center gap-3"
                            >
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                    {i + 1}
                                </span>
                                <span className="text-sm text-ink-soft">{label}</span>
                            </motion.li>
                        ))}
                    </ol>
                </div>

                {/* Footer */}
                <div className="border-t border-border px-8 py-4 text-center">
                    <button
                        onClick={() => router.post(route('logout'))}
                        className="text-xs text-ink-subtle underline underline-offset-2 transition-colors hover:text-ink-muted"
                    >
                        Sign out
                    </button>
                </div>
            </motion.div>
        </div>
    );
}