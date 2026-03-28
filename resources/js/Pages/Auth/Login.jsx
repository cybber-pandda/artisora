import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email:    '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Sign In — Artisora" />

            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
            />

            {/* Header */}
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <span className="font-display text-xl font-semibold text-ink">
                        Artisora
                    </span>
                </Link>
                <p className="text-sm text-ink-muted">
                    Don't have an account?{' '}
                    <Link
                        href="/register"
                        className="font-medium text-sienna underline underline-offset-2 hover:text-sienna-600"
                    >
                        Register
                    </Link>
                </p>
            </header>

            <main className="flex items-center justify-center px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-md"
                >
                    {/* Card */}
                    <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">

                        {/* Heading */}
                        <div className="mb-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sienna/10">
                                <span className="text-2xl">🎨</span>
                            </div>
                            <h1 className="font-display text-3xl font-semibold text-ink">
                                Welcome back
                            </h1>
                            <p className="mt-1 text-sm text-ink-muted">
                                Sign in to your Artisora account.
                            </p>
                        </div>

                        {/* Status message (e.g. password reset success) */}
                        {status && (
                            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">

                            {/* Email */}
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
                                    autoComplete="username"
                                    autoFocus
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="juan@email.com"
                                    className={inputCls}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1.5" />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                                    >
                                        <Lock size={14} className="text-ink-muted" />
                                        Password
                                    </label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-xs font-medium text-sienna underline underline-offset-2 hover:text-sienna-600"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    required
                                />
                                <InputError message={errors.password} className="mt-1.5" />
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center gap-2.5">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-sienna accent-sienna focus:ring-sienna/30"
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-ink-soft select-none cursor-pointer"
                                >
                                    Keep me signed in
                                </label>
                            </div>

                            {/* Submit */}
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
                                        Signing in…
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Divider */}
                        <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs text-ink-subtle">or</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        {/* Register links */}
                        <div className="space-y-2.5">
                            <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                New to Artisora?
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: '🛍️ Buyer',  href: '/register/buyer' },
                                    { label: '🖌️ Artist', href: '/register/artist' },
                                    { label: '🚚 Driver', href: '/register/driver' },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="rounded-lg border border-border bg-canvas px-3 py-2 text-center text-xs font-medium text-ink-soft transition-colors hover:border-sienna/40 hover:bg-sienna/5 hover:text-sienna"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <p className="mt-6 text-center text-xs text-ink-subtle">
                        By signing in you agree to our{' '}
                        <a href="#" className="underline hover:text-ink-muted">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="underline hover:text-ink-muted">Privacy Policy</a>.
                    </p>
                </motion.div>
            </main>
        </div>
    );
}