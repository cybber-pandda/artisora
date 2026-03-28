import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token:                 token,
        email:                 email,
        password:              '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Reset Password — Artisora" />

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
                    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">

                        {/* Icon + heading */}
                        <div className="mb-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sienna/10">
                                <ShieldCheck size={22} className="text-sienna" />
                            </div>
                            <h1 className="font-display text-3xl font-semibold text-ink">
                                Set new password
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                Choose a strong password for your account{' '}
                                <span className="font-medium text-ink-soft">{email}</span>.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">

                            {/* Email — hidden but shown as read-only context */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={inputCls}
                                    autoComplete="username"
                                    required
                                />
                                <InputError message={errors.email} className="mt-1.5" />
                            </div>

                            {/* New Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                                >
                                    <Lock size={14} className="text-ink-muted" />
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoComplete="new-password"
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.password} className="mt-1.5" />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label
                                    htmlFor="password_confirmation"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                                >
                                    <KeyRound size={14} className="text-ink-muted" />
                                    Confirm New Password
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoComplete="new-password"
                                    required
                                />
                                <InputError message={errors.password_confirmation} className="mt-1.5" />
                            </div>

                            {/* Password hint */}
                            <div className="rounded-lg border border-border bg-canvas px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">
                                    Password requirements
                                </p>
                                <ul className="space-y-1">
                                    {[
                                        'At least 8 characters',
                                        'Mix of uppercase and lowercase',
                                        'At least one number or symbol',
                                    ].map((req) => (
                                        <li key={req} className="flex items-center gap-2 text-xs text-ink-muted">
                                            <span className="h-1 w-1 rounded-full bg-sienna flex-shrink-0" />
                                            {req}
                                        </li>
                                    ))}
                                </ul>
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
                                        Resetting…
                                    </>
                                ) : (
                                    <>
                                        Reset Password
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