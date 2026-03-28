import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, LogOut } from 'lucide-react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const resend = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Verify Email — Artisora" />

            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
            />

            {/* Header */}
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <span className="font-display text-xl font-semibold text-ink">Artisora</span>
                </Link>
            </header>

            <main className="flex items-center justify-center px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-md"
                >
                    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm text-center">

                        {/* Animated envelope */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sienna/10"
                        >
                            <Mail size={36} className="text-sienna" />
                        </motion.div>

                        <h1 className="font-display text-3xl font-semibold text-ink">
                            Check your email
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                            Thanks for joining Artisora! Before getting started, please verify
                            your email address by clicking the link we just sent you.
                        </p>

                        {/* Resend success */}
                        {status === 'verification-link-sent' && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                            >
                                ✓ A new verification link has been sent to your email.
                            </motion.div>
                        )}

                        {/* Steps */}
                        <div className="mt-8 rounded-xl border border-border bg-canvas px-5 py-4 text-left">
                            <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                                What to do next
                            </p>
                            {[
                                'Open the email from Artisora',
                                'Click the "Verify Email Address" button',
                                'You\'ll be redirected back automatically',
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sienna text-xs font-bold text-white">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm text-ink-soft">{step}</span>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-3">
                            <form onSubmit={resend}>
                                <motion.button
                                    type="submit"
                                    disabled={processing}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex w-full items-center justify-center gap-2 rounded-md bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={15} />
                                            Resend Verification Email
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-canvas py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-linen hover:text-ink"
                            >
                                <LogOut size={15} />
                                Sign out
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}