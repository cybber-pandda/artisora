import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Forgot Password — Artisora" />

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
                    <Link
                        href="/login"
                        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
                    >
                        <ArrowLeft size={14} /> Back to sign in
                    </Link>

                    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">

                        {/* Icon + heading */}
                        <div className="mb-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sienna/10">
                                <Mail size={22} className="text-sienna" />
                            </div>
                            <h1 className="font-display text-3xl font-semibold text-ink">
                                Forgot your password?
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                No problem. Enter your email and we'll send you a link to reset your password.
                            </p>
                        </div>

                        {/* Success status */}
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                            >
                                ✓ {status}
                            </motion.div>
                        )}

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                                >
                                    <Mail size={14} className="text-ink-muted" />
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="juan@email.com"
                                    className={inputCls}
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.email} className="mt-1.5" />
                            </div>

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
                                        Sending link…
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}