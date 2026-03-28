import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, MapPin, Truck, Users, Store,
    CreditCard, Banknote, ChevronRight, AlertCircle,
    CheckCircle, Phone, Mail, User, FileText,
} from 'lucide-react';
import AddressMapPicker from '@/Components/AddressMapPicker';


// ── Section wrapper ──────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sienna/10">
                    <Icon size={16} className="text-sienna" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            </div>
            {children}
        </div>
    );
}

// ── Field ────────────────────────────────────────────────────────
function Field({ label, error, required, children }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> {error}
                </p>
            )}
        </div>
    );
}

const inputCls = "w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none transition-all focus:border-sienna focus:ring-2 focus:ring-sienna/20";

// ── Delivery Method Button ───────────────────────────────────────
function MethodButton({ value, current, onChange, icon: Icon, label, description }) {
    const active = current === value;
    return (
        <button
            type="button"
            onClick={() => onChange(value)}
            className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                active
                    ? 'border-sienna bg-sienna/5 shadow-sm'
                    : 'border-border bg-canvas hover:border-sienna/40'
            }`}
        >
            <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                active ? 'bg-sienna text-white' : 'bg-surface text-ink-muted'
            }`}>
                <Icon size={18} />
            </div>
            <div>
                <p className={`text-sm font-semibold ${active ? 'text-sienna' : 'text-ink'}`}>{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            </div>
            {active && <CheckCircle size={16} className="ml-auto mt-1 flex-shrink-0 text-sienna" />}
        </button>
    );
}

// ── Order Summary Sidebar ────────────────────────────────────────
function OrderSummary({ cartItems, subtotal, deliveryMethod }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4 sticky top-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Order Summary
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cartItems.map(item => (
                    <div key={item.art_post_id} className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-canvas">
                            {item.thumbnail
                                ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center text-lg">🎨</div>
                            }
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-ink line-clamp-1">{item.title}</p>
                        </div>
                        <p className="flex-shrink-0 text-sm font-bold text-sienna">
                            ₱{Number(item.price).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm text-ink-soft">
                    <span>{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-ink-soft">
                    <span>Shipping</span>
                    <span className={deliveryMethod === 'delivery' ? 'text-amber-600' : 'text-green-600 font-medium'}>
                        {deliveryMethod === 'delivery' ? 'To be arranged' : 'N/A'}
                    </span>
                </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between font-display text-xl font-bold text-ink">
                <span>Total</span>
                <span className="text-sienna">₱{subtotal.toLocaleString()}</span>
            </div>
        </div>
    );
}

// ── Main Checkout Page ───────────────────────────────────────────
export default function Checkout({ cartItems, subtotal, prefill }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name:       prefill.full_name       ?? '',
        email:           prefill.email           ?? '',
        phone_number:    prefill.phone_number    ?? '',
        delivery_method: 'delivery',
        address_line:    prefill.address_line    ?? '',
        city:            prefill.city            ?? '',
        province:        prefill.province        ?? '',
        postal_code:     prefill.postal_code     ?? '',
        delivery_lat:    '',
        delivery_lng:    '',
        meetup_location: '',
        notes:           '',
        payment_method:  'cod',
        gcash_number:    prefill.gcash_number    ?? '',
    });


    const submit = (e) => {
        e.preventDefault();
        post(route('buyer.checkout.store'));
    };

    const isDelivery = data.delivery_method === 'delivery';
    const isMeetup   = data.delivery_method === 'meetup';
    const isGcash    = data.payment_method  === 'gcash';

    return (
        <AppLayout title="Checkout">
            <Head title="Checkout — Artisora" />

            <div className="mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 text-sm text-ink-muted mb-1">
                        <Link href={route('buyer.cart')} className="hover:text-sienna transition-colors">Cart</Link>
                        <ChevronRight size={13} />
                        <span className="text-ink font-medium">Checkout</span>
                    </div>
                    <h2 className="font-display text-3xl font-semibold text-ink">Checkout</h2>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                        {/* Left: Form */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* ── 1. Contact Information ──────────── */}
                            <Section title="Contact Information" icon={User}>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Full Name" error={errors.full_name} required>
                                        <input
                                            type="text"
                                            value={data.full_name}
                                            onChange={e => setData('full_name', e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="Email Address" error={errors.email} required>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            placeholder="juan@example.com"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="Phone Number" error={errors.phone_number} required>
                                        <input
                                            type="tel"
                                            value={data.phone_number}
                                            onChange={e => setData('phone_number', e.target.value)}
                                            placeholder="09XXXXXXXXX"
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>
                            </Section>

                            {/* ── 2. Delivery Method ──────────────── */}
                            <Section title="Delivery Method" icon={Truck}>
                                <div className="space-y-3">
                                    <MethodButton
                                        value="delivery"
                                        current={data.delivery_method}
                                        onChange={v => setData('delivery_method', v)}
                                        icon={Truck}
                                        label="Delivery"
                                        description="We'll arrange delivery to your address via courier."
                                    />
                                    <MethodButton
                                        value="meetup"
                                        current={data.delivery_method}
                                        onChange={v => setData('delivery_method', v)}
                                        icon={Users}
                                        label="Meet Up"
                                        description="Coordinate a place to meet with the artist."
                                    />
                                    <MethodButton
                                        value="pickup"
                                        current={data.delivery_method}
                                        onChange={v => setData('delivery_method', v)}
                                        icon={Store}
                                        label="Pick Up"
                                        description="Pick up the artwork directly from the artist's studio."
                                    />
                                </div>

                                {/* Delivery address fields */}
                                <AnimatePresence>
                                    {isDelivery && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-border bg-canvas/60 p-4 sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <Field label="Street / Barangay Address" error={errors.address_line} required>
                                                        <input
                                                            type="text"
                                                            value={data.address_line}
                                                            onChange={e => setData('address_line', e.target.value)}
                                                            placeholder="123 Rizal St., Barangay Poblacion"
                                                            className={inputCls}
                                                        />
                                                    </Field>
                                                </div>
                                                <Field label="City / Municipality" error={errors.city} required>
                                                    <input
                                                        type="text"
                                                        value={data.city}
                                                        onChange={e => setData('city', e.target.value)}
                                                        placeholder="Makati City"
                                                        className={inputCls}
                                                    />
                                                </Field>
                                                <Field label="Province" error={errors.province} required>
                                                    <input
                                                        type="text"
                                                        value={data.province}
                                                        onChange={e => setData('province', e.target.value)}
                                                        placeholder="Metro Manila"
                                                        className={inputCls}
                                                    />
                                                </Field>
                                                <Field label="Postal Code" error={errors.postal_code} required>
                                                    <input
                                                        type="text"
                                                        value={data.postal_code}
                                                        onChange={e => setData('postal_code', e.target.value)}
                                                        placeholder="1234"
                                                        className={inputCls}
                                                    />
                                                </Field>
                                            </div>

                                            {/* ── Map pin picker ──────────────── */}
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-sienna" />
                                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                                        Pin Your Exact Location
                                                    </p>
                                                </div>
                                                <p className="text-xs text-ink-muted">
                                                    Your address is automatically pinned below. Drag the pin to fine-tune your exact drop-off point so the driver can navigate directly to you.
                                                </p>
                                                <AddressMapPicker
                                                    initialAddress={
                                                        [data.address_line, data.city, data.province, data.postal_code]
                                                            .filter(Boolean).join(', ')
                                                    }
                                                    onChange={(lat, lng) => {
                                                        setData(prev => ({
                                                            ...prev,
                                                            delivery_lat: lat ?? '',
                                                            delivery_lng: lng ?? '',
                                                        }));
                                                    }}
                                                />
                                            </div>

                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Meetup location field */}
                                <AnimatePresence>
                                    {isMeetup && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4">
                                                <Field label="Preferred Meet-up Location" error={errors.meetup_location} required>
                                                    <input
                                                        type="text"
                                                        value={data.meetup_location}
                                                        onChange={e => setData('meetup_location', e.target.value)}
                                                        placeholder="e.g. SM Mall of Asia, Pasay City"
                                                        className={inputCls}
                                                    />
                                                </Field>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Section>

                            {/* ── 3. Payment Method ───────────────── */}
                            <Section title="Payment Method" icon={CreditCard}>
                                <div className="space-y-3">
                                    <MethodButton
                                        value="cod"
                                        current={data.payment_method}
                                        onChange={v => setData('payment_method', v)}
                                        icon={Banknote}
                                        label="Cash on Delivery / Meetup"
                                        description="Pay in cash when you receive or meet to get your artwork."
                                    />
                                    <MethodButton
                                        value="gcash"
                                        current={data.payment_method}
                                        onChange={v => setData('payment_method', v)}
                                        icon={CreditCard}
                                        label="GCash"
                                        description="Pay via GCash mobile wallet. You'll send to the artist's GCash."
                                    />
                                </div>

                                {/* GCash number field */}
                                <AnimatePresence>
                                    {isGcash && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                                                <div className="flex items-start gap-2 text-xs text-blue-700">
                                                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                                    Payment instructions will be sent to your email. Please prepare your GCash for the transfer.
                                                </div>
                                                <Field label="Your GCash Number" error={errors.gcash_number} required>
                                                    <input
                                                        type="tel"
                                                        value={data.gcash_number}
                                                        onChange={e => setData('gcash_number', e.target.value)}
                                                        placeholder="09XXXXXXXXX"
                                                        className={inputCls}
                                                    />
                                                </Field>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Section>

                            {/* ── 4. Additional Notes ─────────────── */}
                            <Section title="Additional Notes" icon={FileText}>
                                <Field label="Notes (Optional)" error={errors.notes}>
                                    <textarea
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        rows={3}
                                        placeholder="Any special instructions, preferred schedule, packaging requests…"
                                        className={`${inputCls} resize-none`}
                                    />
                                </Field>
                            </Section>

                            {/* ── Submit ─────────────────────────── */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sienna py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-sienna-600 hover:shadow-xl disabled:opacity-60"
                            >
                                <ShoppingBag size={18} />
                                {processing ? 'Placing Order…' : 'Place Order'}
                            </button>

                            <p className="text-center text-xs text-ink-muted">
                                By placing an order you agree to our terms of service.
                            </p>
                        </div>

                        {/* Right: Summary */}
                        <div>
                            <OrderSummary
                                cartItems={cartItems}
                                subtotal={subtotal}
                                deliveryMethod={data.delivery_method}
                            />
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
