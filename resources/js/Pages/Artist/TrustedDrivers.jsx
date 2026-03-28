import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, X, CheckCircle, User, Truck,
    Shield, AlertTriangle, ArrowLeft,
} from 'lucide-react';
import axios from 'axios';

const VEHICLE_ICONS = { motorcycle: '🏍️', car: '🚗', van: '🚐' };

// ── Driver result row ─────────────────────────────────────────────
function DriverRow({ driver, onAdd }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-canvas px-4 py-3 hover:border-sienna/30 transition-colors"
        >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-base">
                {VEHICLE_ICONS[driver.vehicle_type] ?? '🚐'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{driver.name}</p>
                <p className="text-xs text-ink-muted">
                    {driver.email} · {driver.vehicle_type}
                    {driver.city_coverage && ` · ${driver.city_coverage}`}
                </p>
            </div>
            <button
                onClick={() => onAdd(driver)}
                className="flex-shrink-0 rounded-lg bg-sienna px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sienna-600"
            >
                Add
            </button>
        </motion.div>
    );
}

// ── Trusted driver card ───────────────────────────────────────────
function TrustedCard({ driver, onRemove }) {
    const [confirm, setConfirm] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg">
                {VEHICLE_ICONS[driver.vehicle_type] ?? '🚐'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{driver.name}</p>
                    {driver.is_verified && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <Shield size={9} /> Verified
                        </span>
                    )}
                </div>
                <p className="text-xs text-ink-muted">
                    {driver.email} · {driver.vehicle_type} · {driver.plate_number}
                    {driver.city_coverage && ` · ${driver.city_coverage}`}
                </p>
            </div>

            {confirm ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted">Remove?</span>
                    <button
                        onClick={() => { onRemove(driver.id); setConfirm(false); }}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                    >
                        Yes
                    </button>
                    <button
                        onClick={() => setConfirm(false)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted hover:bg-canvas"
                    >
                        No
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setConfirm(true)}
                    className="flex-shrink-0 rounded-lg border border-border p-1.5 text-ink-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                    <X size={14} />
                </button>
            )}
        </motion.div>
    );
}

export default function TrustedDrivers({ trustedDrivers: initial }) {
    const { flash } = usePage().props;
    const [trusted, setTrusted] = useState(initial);
    const [query, setQuery]     = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounce = useRef(null);

    // Debounced search
    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        if (query.length < 2) { setResults([]); return; }

        debounce.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get(route('artist.trusted-drivers.search'), { params: { q: query } });
                setResults(res.data);
            } finally {
                setSearching(false);
            }
        }, 400);
    }, [query]);

    const handleAdd = (driver) => {
        router.post(route('artist.trusted-drivers.add'), { driver_id: driver.id }, {
            preserveScroll: true,
            onSuccess: () => {
                setTrusted(prev => [...prev, driver]);
                setQuery('');
                setResults([]);
            },
        });
    };

    const handleRemove = (driverId) => {
        router.delete(route('artist.trusted-drivers.remove', driverId), {
            preserveScroll: true,
            onSuccess: () => setTrusted(prev => prev.filter(d => d.id !== driverId)),
        });
    };

    const trustedIds = new Set(trusted.map(d => d.id));

    return (
        <AppLayout title="Trusted Drivers">
            <Head title="Trusted Drivers — Artisora" />

            <div className="mx-auto max-w-2xl space-y-6">

                {/* Header */}
                <div>
                    <h2 className="font-display text-3xl font-semibold text-ink">Trusted Drivers</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                        Drivers you trust get priority private assignment for your delivery orders.
                    </p>
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

                {/* Search */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                        Add a Driver
                    </p>

                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                            type="text"
                            className="block w-full rounded-lg border border-border bg-canvas py-2.5 pl-9 pr-4 text-sm text-ink placeholder-ink-subtle focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                            placeholder="Search drivers by name or email…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {searching && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                <svg className="h-4 w-4 animate-spin text-sienna" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {results.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="space-y-2"
                            >
                                {results
                                    .filter(d => !trustedIds.has(d.id))
                                    .map(driver => (
                                        <DriverRow key={driver.id} driver={driver} onAdd={handleAdd} />
                                    ))}
                                {results.every(d => trustedIds.has(d.id)) && (
                                    <p className="text-center text-sm text-ink-muted py-3">
                                        All matching drivers are already in your trusted list.
                                    </p>
                                )}
                            </motion.div>
                        )}
                        {query.length >= 2 && !searching && results.length === 0 && (
                            <p className="text-center text-sm text-ink-muted py-3">
                                No verified drivers found matching "{query}".
                            </p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Trusted list */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                        Your Trusted List ({trusted.length})
                    </p>

                    {trusted.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <Users size={36} className="text-ink-subtle" />
                            <p className="text-sm font-medium text-ink">No trusted drivers yet</p>
                            <p className="text-xs text-ink-muted">
                                Search above and add drivers you've worked with before.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {trusted.map(driver => (
                                <TrustedCard key={driver.id} driver={driver} onRemove={handleRemove} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
