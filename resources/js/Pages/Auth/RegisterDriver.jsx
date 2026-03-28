import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Truck, Hash, MapPin, Upload, ArrowLeft, CalendarDays } from 'lucide-react';
import InputError from '@/Components/InputError';
import { useRef, useState } from 'react';

const inputCls = 'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const Field = ({ label, icon: Icon, error, hint, required, children }) => (
    <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            {Icon && <Icon size={14} className="text-ink-muted" />}
            {label}
            {required && <span className="text-sienna">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
        <InputError message={error} className="mt-1" />
    </div>
);

const VEHICLE_TYPES = [
    { value: 'motorcycle', label: '🏍️  Motorcycle' },
    { value: 'car',        label: '🚗  Car / SUV' },
    { value: 'van',        label: '🚐  Van' },
];

export default function RegisterDriver() {
    const fileRef = useRef();
    const [preview, setPreview] = useState(null);

    // useForm with forceFormData: true — required for file uploads with Inertia
    const { data, setData, post, processing, errors } = useForm({
        name:                  '',
        email:                 '',
        password:              '',
        password_confirmation: '',
        phone_number:          '',
        vehicle_type:          '',
        plate_number:          '',
        license_number:        '',
        license_expiry:        '',
        city_coverage:         '',
        license_image:         null,
    });

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('license_image', file);
        setPreview(URL.createObjectURL(file));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('register.driver.store'), {
            forceFormData: true, // ensures multipart/form-data for file upload
        });
    };

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Apply as Driver — Artisora" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap" />

            <div className="mx-auto max-w-xl px-6 py-12">
                <Link href="/register" className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
                    <ArrowLeft size={14} /> Back to role selection
                </Link>

                {/* Pending notice banner */}
                <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                    <p className="text-sm text-amber-800">
                        Driver accounts require admin verification before you can accept jobs.
                        You'll be notified by email once approved.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-border bg-surface p-8 shadow-sm"
                >
                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                            <Truck size={22} className="text-amber-600" />
                        </div>
                        <h1 className="font-display text-3xl font-semibold text-ink">Driver Application</h1>
                        <p className="mt-1 text-sm text-ink-muted">Apply to deliver artworks across the Philippines.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted">Account Details</p>

                        <Field label="Full Name" icon={User} error={errors.name} required>
                            <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Juan dela Cruz" required />
                        </Field>

                        <Field label="Email Address" icon={Mail} error={errors.email} required>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} placeholder="juan@email.com" required />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Password" icon={Lock} error={errors.password} required>
                                <input type="password" className={inputCls} value={data.password} onChange={e => setData('password', e.target.value)} required />
                            </Field>
                            <Field label="Confirm Password" error={errors.password_confirmation} required>
                                <input type="password" className={inputCls} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} required />
                            </Field>
                        </div>

                        <div className="pt-2 border-t border-border">
                            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Vehicle & License</p>
                        </div>

                        <Field label="Phone Number" icon={Phone} error={errors.phone_number} required>
                            <input className={inputCls} value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" required />
                        </Field>

                        <Field label="Vehicle Type" icon={Truck} error={errors.vehicle_type} required>
                            <select className={inputCls} value={data.vehicle_type} onChange={e => setData('vehicle_type', e.target.value)} required>
                                <option value="">Select vehicle type…</option>
                                {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Plate Number" icon={Hash} error={errors.plate_number} required>
                                <input className={inputCls} value={data.plate_number} onChange={e => setData('plate_number', e.target.value)} placeholder="ABC 1234" required />
                            </Field>
                            <Field label="License Number" error={errors.license_number}>
                                <input className={inputCls} value={data.license_number} onChange={e => setData('license_number', e.target.value)} placeholder="N01-12-345678" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="License Expiry" icon={CalendarDays} error={errors.license_expiry}>
                                <input type="date" className={inputCls} value={data.license_expiry} onChange={e => setData('license_expiry', e.target.value)} />
                            </Field>
                            <Field label="City / Area Coverage" icon={MapPin} error={errors.city_coverage}>
                                <input className={inputCls} value={data.city_coverage} onChange={e => setData('city_coverage', e.target.value)} placeholder="Metro Manila" />
                            </Field>
                        </div>

                        {/* License image upload */}
                        <Field
                            label="Driver's License Photo"
                            icon={Upload}
                            error={errors.license_image}
                            hint="Upload a clear photo or scan of your license. JPG, PNG or PDF — max 5MB."
                            required
                        >
                            <div
                                onClick={() => fileRef.current.click()}
                                className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                                    preview
                                        ? 'border-sienna bg-sienna/5'
                                        : 'border-border hover:border-sienna hover:bg-sienna/5'
                                }`}
                            >
                                {preview ? (
                                    <img src={preview} alt="License preview" className="max-h-36 rounded-md object-contain" />
                                ) : (
                                    <>
                                        <Upload size={24} className="mb-2 text-ink-subtle" />
                                        <p className="text-sm font-medium text-ink-soft">Click to upload license</p>
                                        <p className="mt-1 text-xs text-ink-subtle">JPG, PNG, PDF up to 5MB</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="hidden"
                                onChange={handleFile}
                            />
                            {preview && (
                                <button
                                    type="button"
                                    onClick={() => { setPreview(null); setData('license_image', null); fileRef.current.value = ''; }}
                                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                                >
                                    Remove file
                                </button>
                            )}
                        </Field>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60 mt-2"
                        >
                            {processing ? 'Submitting application…' : 'Submit Driver Application'}
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