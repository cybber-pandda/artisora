import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Brush, CreditCard, Globe, Instagram, ArrowLeft } from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const Field = ({ label, icon: Icon, error, hint, children }) => (
    <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            {Icon && <Icon size={14} className="text-ink-muted" />}
            {label}
        </label>
        {children}
        {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
        <InputError message={error} className="mt-1" />
    </div>
);

const SPECIALTIES = [
    'Oil Painting', 'Watercolor', 'Acrylic', 'Digital Art',
    'Charcoal / Sketch', 'Mixed Media', 'Sculpture', 'Photography', 'Other',
];

export default function RegisterArtist() {
    const { data, setData, post, processing, errors } = useForm({
        name:             '',
        email:            '',
        password:         '',
        password_confirmation: '',
        display_name:     '',
        phone_number:     '',
        gcash_number:     '',
        bio:              '',
        specialty:        '',
        portfolio_url:    '',
        instagram_handle: '',
        facebook_url:     '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register.artist.store'));
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Register as Artist — Artisora" />
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
                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                            <Brush size={22} className="text-blue-600" />
                        </div>
                        <h1 className="font-display text-3xl font-semibold text-ink">Artist Application</h1>
                        <p className="mt-1 text-sm text-ink-muted">Set up your artist profile and start selling your work.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
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

                        <div className="pt-2 border-t border-border">
                            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Artist Profile</p>
                        </div>

                        <Field label="Display / Artist Name" icon={Brush} error={errors.display_name} hint="This is what buyers will see on your listings.">
                            <input className={inputCls} value={data.display_name} onChange={e => setData('display_name', e.target.value)} placeholder="e.g. Juan Arts" required />
                        </Field>

                        <Field label="Specialty" error={errors.specialty}>
                            <select className={inputCls} value={data.specialty} onChange={e => setData('specialty', e.target.value)}>
                                <option value="">Select your primary medium…</option>
                                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>

                        <Field label="Bio" error={errors.bio} hint="Tell buyers about yourself and your art (max 1000 characters).">
                            <textarea
                                rows={3}
                                className={inputCls}
                                value={data.bio}
                                onChange={e => setData('bio', e.target.value)}
                                placeholder="I create expressive oil paintings inspired by the Philippine landscape…"
                                maxLength={1000}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Phone Number" icon={Phone} error={errors.phone_number}>
                                <input className={inputCls} value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" />
                            </Field>
                            <Field label="GCash Number" icon={CreditCard} error={errors.gcash_number} hint="For receiving payouts.">
                                <input className={inputCls} value={data.gcash_number} onChange={e => setData('gcash_number', e.target.value)} placeholder="+63 9XX XXX XXXX" />
                            </Field>
                        </div>

                        <div className="pt-2 border-t border-border">
                            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Online Presence <span className="normal-case tracking-normal font-normal">(optional)</span></p>
                        </div>

                        <Field label="Portfolio Website" icon={Globe} error={errors.portfolio_url}>
                            <input type="url" className={inputCls} value={data.portfolio_url} onChange={e => setData('portfolio_url', e.target.value)} placeholder="https://yourportfolio.com" />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Instagram Handle" icon={Instagram} error={errors.instagram_handle}>
                                <input className={inputCls} value={data.instagram_handle} onChange={e => setData('instagram_handle', e.target.value)} placeholder="@yourhandle" />
                            </Field>
                            <Field label="Facebook Page URL" error={errors.facebook_url}>
                                <input type="url" className={inputCls} value={data.facebook_url} onChange={e => setData('facebook_url', e.target.value)} placeholder="https://facebook.com/yourpage" />
                            </Field>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60 mt-2"
                        >
                            {processing ? 'Submitting…' : 'Create Artist Account'}
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