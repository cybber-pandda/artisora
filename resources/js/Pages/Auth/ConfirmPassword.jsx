import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Confirm Password — Artisora" />

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

                        <div className="mb-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                                <ShieldCheck size={22} className="text-amber-600" />
                            </div>
                            <h1 className="font-display text-3xl font-semibold text-ink">
                                Confirm your identity
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                This is a secure area. Please confirm your password before continuing.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                                >
                                    <Lock size={14} className="text-ink-muted" />
                                    Your Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.password} className="mt-1.5" />
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
                                        Confirming…
                                    </>
                                ) : (
                                    <>
                                        Confirm & Continue
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