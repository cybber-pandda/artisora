import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck, Package, Ruler, Weight, Clock, CheckCircle,
    MapPin, AlertCircle, Globe,
} from 'lucide-react';

const VEHICLE_ICONS = { motorcycle: '🏍️', car: '🚗', van: '🚐' };

// Derive a rough vehicle requirement from dimensions string (simple heuristic)
function vehicleHint(dimensions) {
    if (!dimensions) return null;
    // Look for the largest number in the dimensions string (e.g. "60×90 cm" → 90)
    const nums = dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    const max = Math.max(...nums);
    if (max >= 80) return { label: 'Requires: Van', icon: '🚐', color: 'bg-blue-100 text-blue-700' };
    if (max >= 40) return { label: 'Requires: Car or Van', icon: '🚗', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Fits: Any Vehicle', icon: '🏍️', color: 'bg-emerald-100 text-emerald-700' };
}

// ── Job Card ──────────────────────────────────────────────────────
function JobCard({ job }) {
    const [claiming, setClaiming] = useState(false);
    const hint = vehicleHint(job.dimensions);

    const claim = () => {
        setClaiming(true);
        router.post(route('driver.claim', job.id), {}, {
            preserveScroll: true,
            onFinish: () => setClaiming(false),
        });
    };

    const timePosted = new Date(job.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-xl">
                        🎨
                    </div>
                    <div>
                        <p className="font-semibold text-ink">{job.artwork_title}</p>
                        <p className="text-xs text-ink-muted">Posted {timePosted}</p>
                    </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Open
                </span>
            </div>

            {/* Details */}
            <div className="px-5 pb-4 space-y-3">
                {/* Logistics */}
                <div className="flex flex-wrap gap-3">
                    {job.dimensions && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-muted">
                            <Ruler size={12} />
                            <span className="font-medium text-ink">{job.dimensions}</span>
                        </div>
                    )}
                    {job.weight && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-muted">
                            <Weight size={12} />
                            <span className="font-medium text-ink">{job.weight} kg</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-muted">
                        <Clock size={12} />
                        <span className="font-medium text-ink">+{job.buffer_time}min buffer</span>
                    </div>
                </div>

                {/* Vehicle hint */}
                {hint && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${hint.color}`}>
                        <span>{hint.icon}</span>
                        {hint.label}
                    </div>
                )}

                {/* Pickup info */}
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <MapPin size={14} className="flex-shrink-0 text-ink-muted" />
                    <span>Artist: <strong>{job.artist_name}</strong></span>
                </div>
            </div>

            {/* Fragile notice */}
            <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                Fragile artwork — please handle with care. {job.buffer_time} min buffer required for packing.
            </div>

            {/* Claim button */}
            <div className="border-t border-border p-4">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={claim}
                    disabled={claiming}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600 disabled:opacity-50"
                >
                    <Truck size={15} />
                    {claiming ? 'Claiming…' : 'Claim This Delivery'}
                </motion.button>
            </div>
        </motion.div>
    );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Jobs({ jobs }) {
    const { flash } = usePage().props;

    return (
        <AppLayout title="Available Deliveries">
            <Head title="Available Deliveries — Artisora" />

            <div className="mx-auto max-w-3xl space-y-6">

                {/* Header */}
                <div>
                    <h2 className="font-display text-4xl font-semibold text-ink">Available Deliveries</h2>
                    <p className="mt-1 text-base text-ink-muted">
                        Claim artwork deliveries in your area. Always check dimensions before claiming.
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

                {/* Legend */}
                <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-canvas p-4 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5"><span>🏍️</span> Motorcycle-friendly</span>
                    <span className="flex items-center gap-1.5"><span>🚗</span> Car or larger</span>
                    <span className="flex items-center gap-1.5"><span>🚐</span> Van required (large canvas)</span>
                    <span className="flex items-center gap-1.5"><Clock size={11} /> Buffer = extra packing time added to ETA</span>
                </div>

                {/* Jobs */}
                {jobs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-20 text-center"
                    >
                        <Globe size={36} className="mb-4 text-ink-subtle" />
                        <p className="text-base font-semibold text-ink">No deliveries posted yet</p>
                        <p className="mt-1 text-sm text-ink-muted">
                            Check back soon — artists post new deliveries daily.
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map(job => <JobCard key={job.id} job={job} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}