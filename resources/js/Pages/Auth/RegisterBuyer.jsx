import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, MapPin, ArrowLeft } from 'lucide-react';
import InputError from '@/Components/InputError';

const Field = ({ label, icon: Icon, error, children }) => (
    <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            {Icon && <Icon size={14} className="text-ink-muted" />}
            {label}
        </label>
        {children}
        <InputError message={error} className="mt-1" />
    </div>
);

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

export default function RegisterBuyer() {
    const { data, setData, post, processing, errors } = useForm({
        name:         '',
        email:        '',
        password:     '',
        password_confirmation: '',
        phone_number: '',
        address_line: '',
        city:         '',
        province:     '',
        postal_code:  '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register.buyer.store'));
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Register as Buyer — Artisora" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap" />

            <div className="mx-auto max-w-xl px-6 py-12">
                <Link href="/register" className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
                    <ArrowLeft size={14} /> Back to role selection
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-border bg-surface p-8 shadow-sm"
                >
                    {/* Header */}
                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                            <span className="text-2xl">🛍️</span>
                        </div>
                        <h1 className="font-display text-3xl font-semibold text-ink">Create Buyer Account</h1>
                        <p className="mt-1 text-sm text-ink-muted">Start discovering original artwork from Filipino artists.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Section: Account */}
                        <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted">Account Details</p>

                        <Field label="Full Name" icon={User} error={errors.name}>
                            <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Juan dela Cruz" required />
                        </Field>

                        <Field label="Email Address" icon={Mail} error={errors.email}>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} placeholder="juan@email.com" required />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Password" icon={Lock} error={errors.password}>
                                <input type="password" className={inputCls} value={data.password} onChange={e => setData('password', e.target.value)} required />
                            </Field>
                            <Field label="Confirm Password" error={errors.password_confirmation}>
                                <input type="password" className={inputCls} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} required />
                            </Field>
                        </div>

                        {/* Divider */}
                        <div className="pt-2 border-t border-border">
                            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Delivery Information <span className="normal-case tracking-normal font-normal">(optional)</span></p>
                        </div>

                        <Field label="Phone Number" icon={Phone} error={errors.phone_number}>
                            <input className={inputCls} value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" />
                        </Field>

                        <Field label="Address" icon={MapPin} error={errors.address_line}>
                            <input className={inputCls} value={data.address_line} onChange={e => setData('address_line', e.target.value)} placeholder="House No., Street, Barangay" />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="City / Municipality" error={errors.city}>
                                <input className={inputCls} value={data.city} onChange={e => setData('city', e.target.value)} placeholder="Quezon City" />
                            </Field>
                            <Field label="Province" error={errors.province}>
                                <input className={inputCls} value={data.province} onChange={e => setData('province', e.target.value)} placeholder="Metro Manila" />
                            </Field>
                        </div>

                        <Field label="Postal Code" error={errors.postal_code}>
                            <input className={inputCls} value={data.postal_code} onChange={e => setData('postal_code', e.target.value)} placeholder="1100" />
                        </Field>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60 mt-2"
                        >
                            {processing ? 'Creating account…' : 'Create Buyer Account'}
                        </button>

                        <p className="text-center text-sm text-ink-muted">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-sienna underline underline-offset-2">Sign in</Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}