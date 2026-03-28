import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck, Users, Globe, Clock, Ruler, Weight,
    ChevronRight, CheckCircle, Package, ArrowLeft,
    AlertCircle, User,
} from 'lucide-react';

const inputCls = 'block w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const VEHICLE_ICONS = { motorcycle: '🏍️', car: '🚗', van: '🚐' };

// ── Tab selector ─────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
    return (
        <div className="flex gap-1 rounded-xl border border-border bg-canvas p-1">
            <button
                onClick={() => setTab('trusted')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    tab === 'trusted' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
                }`}
            >
                <Users size={14} /> Trusted Driver
            </button>
            <button
                onClick={() => setTab('freelance')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    tab === 'freelance' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
                }`}
            >
                <Globe size={14} /> Freelance Marketplace
            </button>
        </div>
    );
}

// ── Trusted Driver Card ──────────────────────────────────────────
function DriverCard({ driver, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(driver.id)}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selected
                    ? 'border-sienna bg-sienna/5 shadow-md'
                    : 'border-border bg-canvas hover:border-sienna/40 hover:bg-sienna/5'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg">
                    {VEHICLE_ICONS[driver.vehicle_type] ?? '🚐'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{driver.name}</p>
                    <p className="text-xs text-ink-muted">
                        {driver.vehicle_type} · {driver.plate_number}
                        {driver.city_coverage && ` · ${driver.city_coverage}`}
                    </p>
                </div>
                {selected && <CheckCircle size={18} className="flex-shrink-0 text-sienna" />}
            </div>
        </button>
    );
}

// ── Logistics fields (shared by both tabs) ───────────────────────
function LogisticsFields({ data, setData }) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <Ruler size={12} /> Dimensions
                </label>
                <input
                    type="text"
                    className={inputCls}
                    value={data.dimensions}
                    onChange={e => setData(d => ({ ...d, dimensions: e.target.value }))}
                    placeholder="e.g. 24×36 in"
                />
            </div>
            <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <Weight size={12} /> Weight (kg)
                </label>
                <input
                    type="number"
                    className={inputCls}
                    value={data.weight}
                    onChange={e => setData(d => ({ ...d, weight: e.target.value }))}
                    placeholder="e.g. 2.5"
                    min="0"
                    step="0.1"
                />
            </div>
            <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <Clock size={12} /> Buffer (min)
                </label>
                <input
                    type="number"
                    className={inputCls}
                    value={data.buffer_time}
                    onChange={e => setData(d => ({ ...d, buffer_time: e.target.value }))}
                    placeholder="30"
                    min="0"
                    max="240"
                />
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Dispatch({ order, artPost, trustedDrivers, artistCoords, existingDelivery }) {
    const { flash } = usePage().props;
    const [tab, setTab]               = useState('trusted');
    const [selectedDriver, setDriver] = useState(null);
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        dimensions:  artPost?.dimensions ?? '',
        weight:      artPost?.weight ?? '',
        buffer_time: 30,
        pickup_lat:  artistCoords?.lat ?? '',
        pickup_lng:  artistCoords?.lng ?? '',
        dropoff_lat: '',
        dropoff_lng: '',
    });

    const handleAssign = () => {
        if (!selectedDriver) return;
        setProcessing(true);
        router.post(route('artist.dispatch.assign', order.id), {
            driver_id:   selectedDriver,
            ...formData,
        }, {
            onFinish: () => setProcessing(false),
        });
    };

    const handlePublish = () => {
        setProcessing(true);
        router.post(route('artist.dispatch.publish', order.id), {
            ...formData,
        }, {
            onFinish: () => setProcessing(false),
        });
    };

    if (existingDelivery) {
        return (
            <AppLayout title="Dispatch">
                <Head title="Dispatch — Artisora" />
                <div className="mx-auto max-w-xl py-16 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                        <CheckCircle size={28} className="text-emerald-600" />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-ink">Delivery Already Dispatched</h2>
                    <p className="text-ink-muted">A delivery has already been created for Order #{order.id}.</p>
                    <Link
                        href={route('artist.orders')}
                        className="inline-flex items-center gap-2 rounded-lg bg-sienna px-5 py-2.5 text-sm font-semibold text-white hover:bg-sienna-600"
                    >
                        Back to Orders
                    </Link>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Dispatch Order">
            <Head title="Dispatch — Artisora" />

            <div className="mx-auto max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={route('artist.orders')}
                        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Orders
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sienna/10">
                        <Truck size={20} className="text-sienna" />
                    </div>
                    <div>
                        <h2 className="font-display text-3xl font-semibold text-ink">Dispatch Order #{order.id}</h2>
                        <p className="mt-0.5 text-sm text-ink-muted">
                            Choose how you want to arrange delivery for {order.buyer_name}.
                        </p>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                    >
                        <CheckCircle size={15} /> {flash.success}
                    </motion.div>
                )}

                {/* Order summary */}
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Order Summary</p>
                    {order.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Package size={16} className="mt-0.5 flex-shrink-0 text-ink-muted" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink">{item.title}</p>
                                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-muted">
                                    {item.dimensions && (
                                        <span className="flex items-center gap-1">
                                            <Ruler size={11} /> {item.dimensions}
                                        </span>
                                    )}
                                    {item.weight && (
                                        <span className="flex items-center gap-1">
                                            <Weight size={11} /> {item.weight} kg
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="border-t border-border pt-2 text-sm text-ink-muted">
                        📍 Deliver to: <span className="font-medium text-ink">{order.buyer_address || 'Address not set'}</span>
                    </div>
                </div>

                {/* Tab selector */}
                <TabBar tab={tab} setTab={setTab} />

                <AnimatePresence mode="wait">

                    {/* ── TRUSTED DRIVER TAB ─────────────────────── */}
                    {tab === 'trusted' && (
                        <motion.div
                            key="trusted"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            {/* Driver list */}
                            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                        Your Trusted Drivers
                                    </p>
                                    <Link
                                        href={route('artist.trusted-drivers')}
                                        className="text-xs font-medium text-sienna hover:underline"
                                    >
                                        Manage →
                                    </Link>
                                </div>

                                {trustedDrivers.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                                        <User size={32} className="text-ink-subtle" />
                                        <p className="text-sm font-medium text-ink">No trusted drivers yet</p>
                                        <p className="text-xs text-ink-muted">
                                            Add drivers you trust to your list from the Trusted Drivers page.
                                        </p>
                                        <Link
                                            href={route('artist.trusted-drivers')}
                                            className="mt-2 rounded-lg bg-sienna px-4 py-2 text-sm font-semibold text-white hover:bg-sienna-600"
                                        >
                                            Add Trusted Driver
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {trustedDrivers.map(driver => (
                                            <DriverCard
                                                key={driver.id}
                                                driver={driver}
                                                selected={selectedDriver === driver.id}
                                                onSelect={setDriver}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Logistics */}
                            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    Artwork Logistics
                                </p>
                                <LogisticsFields data={formData} setData={setFormData} />
                                <p className="text-xs text-ink-muted">
                                    ⏱ Buffer is added to the ETA to account for careful packing of fragile artwork.
                                </p>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAssign}
                                disabled={!selectedDriver || processing}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sienna-600 disabled:opacity-50"
                            >
                                <Users size={16} />
                                {processing ? 'Assigning…' : 'Assign Privately to Driver'}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── FREELANCE MARKETPLACE TAB ──────────────── */}
                    {tab === 'freelance' && (
                        <motion.div
                            key="freelance"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <p>
                                    Publishing to the marketplace means any verified driver can view and claim this delivery.
                                    Your artwork's dimensions and weight will be visible so drivers can check vehicle compatibility.
                                </p>
                            </div>

                            {/* Logistics */}
                            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    Job Post Details
                                </p>
                                <LogisticsFields data={formData} setData={setFormData} />

                                {/* Pickup coords */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 text-xs font-semibold text-ink-muted block">Pickup Lat</label>
                                        <input
                                            type="number"
                                            className={inputCls}
                                            value={formData.pickup_lat}
                                            onChange={e => setFormData(d => ({ ...d, pickup_lat: e.target.value }))}
                                            placeholder="14.5995"
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 text-xs font-semibold text-ink-muted block">Pickup Lng</label>
                                        <input
                                            type="number"
                                            className={inputCls}
                                            value={formData.pickup_lng}
                                            onChange={e => setFormData(d => ({ ...d, pickup_lng: e.target.value }))}
                                            placeholder="120.9842"
                                            step="any"
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-ink-muted">
                                    ⏱ Buffer time is shown to drivers as required extra time for fragile artwork handling.
                                </p>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePublish}
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <Globe size={16} />
                                {processing ? 'Publishing…' : 'Publish to Freelance Marketplace'}
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>
        </AppLayout>
    );
}
