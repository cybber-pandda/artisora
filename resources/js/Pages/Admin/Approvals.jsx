import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, ShieldX, CheckCircle, XCircle,
    Truck, Phone, MapPin, Calendar, FileText,
    ChevronDown, ChevronUp, ExternalLink, Clock,
    Filter, Search,
} from 'lucide-react';

const VEHICLE_ICONS = {
    motorcycle: '🏍️',
    car: '🚗',
    van: '🚐',
};

const FILTER_OPTIONS = [
    { value: 'pending',  label: 'Pending',  icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10 ring-amber-500/20' },
    { value: 'approved', label: 'Approved',  icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 ring-emerald-500/20' },
    { value: 'all',      label: 'All',       icon: Filter,      color: 'text-sky-400',     bg: 'bg-sky-500/10 ring-sky-500/20' },
];

function DriverCard({ driver }) {
    const [expanded, setExpanded] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleAction = (action) => {
        setProcessing(true);

        const routeName = action === 'approve'
            ? 'admin.drivers.approve'
            : 'admin.drivers.reject';

        router.post(route(routeName, driver.id), {}, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const isPending  = !driver.is_verified;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`overflow-hidden rounded-xl border bg-surface shadow-xs transition-shadow hover:shadow-md ${
                isPending ? 'border-amber-200/20' : 'border-border'
            }`}
        >
            {/* Header row */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                        isPending
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    }`}>
                        {driver.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-ink">{driver.name}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                                isPending
                                    ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                            }`}>
                                {isPending ? 'Pending' : 'Approved'}
                            </span>
                        </div>
                        <p className="truncate text-xs text-ink-muted">{driver.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Vehicle badge */}
                    {driver.vehicle_type && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-border">
                            <span>{VEHICLE_ICONS[driver.vehicle_type] ?? '🚗'}</span>
                            {driver.vehicle_type}
                        </span>
                    )}

                    {/* Action buttons */}
                    {isPending && (
                        <>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                disabled={processing}
                                onClick={() => handleAction('approve')}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                                <CheckCircle size={14} />
                                Approve
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                disabled={processing}
                                onClick={() => handleAction('reject')}
                                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 ring-1 ring-red-500/20 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                                <XCircle size={14} />
                                Reject
                            </motion.button>
                        </>
                    )}

                    {!isPending && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={processing}
                            onClick={() => handleAction('reject')}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 ring-1 ring-red-500/20 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                            <ShieldX size={14} />
                            Revoke
                        </motion.button>
                    )}

                    {/* Expand toggle */}
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="rounded-lg p-2 text-ink-muted transition hover:bg-canvas hover:text-ink"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border px-5 py-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Phone */}
                                <div className="flex items-start gap-2.5">
                                    <Phone size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Phone</p>
                                        <p className="text-sm text-ink">{driver.phone_number || '—'}</p>
                                    </div>
                                </div>

                                {/* Plate */}
                                <div className="flex items-start gap-2.5">
                                    <Truck size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Plate Number</p>
                                        <p className="text-sm font-mono font-semibold text-ink">{driver.plate_number || '—'}</p>
                                    </div>
                                </div>

                                {/* City */}
                                <div className="flex items-start gap-2.5">
                                    <MapPin size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">City Coverage</p>
                                        <p className="text-sm text-ink">{driver.city_coverage || '—'}</p>
                                    </div>
                                </div>

                                {/* License number */}
                                <div className="flex items-start gap-2.5">
                                    <FileText size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">License #</p>
                                        <p className="text-sm font-mono text-ink">{driver.license_number || '—'}</p>
                                    </div>
                                </div>

                                {/* License expiry */}
                                <div className="flex items-start gap-2.5">
                                    <Calendar size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">License Expiry</p>
                                        <p className="text-sm text-ink">{driver.license_expiry || '—'}</p>
                                    </div>
                                </div>

                                {/* Applied date */}
                                <div className="flex items-start gap-2.5">
                                    <Clock size={14} className="mt-0.5 text-ink-muted flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Applied</p>
                                        <p className="text-sm text-ink">{driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* License image */}
                            {driver.license_image_url && (
                                <div className="mt-4 rounded-lg border border-border bg-canvas p-3">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                        License Document
                                    </p>
                                    <a
                                        href={driver.license_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-500 transition hover:text-sky-400"
                                    >
                                        <ExternalLink size={14} />
                                        View document
                                    </a>
                                </div>
                            )}

                            {/* Verified at info */}
                            {driver.verified_at && (
                                <p className="mt-3 text-xs text-emerald-500">
                                    ✓ Verified on {new Date(driver.verified_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function Approvals({ drivers, filter }) {
    const [search, setSearch] = useState('');

    const filteredDrivers = drivers?.data?.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()) ||
        (d.plate_number && d.plate_number.toLowerCase().includes(search.toLowerCase()))
    ) ?? [];

    return (
        <AppLayout title="Driver Approvals">
            <div className="max-w-4xl space-y-6">
                {/* Header */}
                <div>
                    <h2 className="font-display text-4xl font-semibold text-ink">Driver Approvals</h2>
                    <p className="mt-1 text-base text-ink-muted">
                        Review and verify driver applications.
                    </p>
                </div>

                {/* Filters & search */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Filter tabs */}
                    <div className="flex gap-2">
                        {FILTER_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isActive = filter === opt.value;
                            return (
                                <Link
                                    key={opt.value}
                                    href={`/admin/approvals?filter=${opt.value}`}
                                    preserveState
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ring-1 ${
                                        isActive
                                            ? `${opt.bg} ${opt.color}`
                                            : 'bg-transparent text-ink-muted ring-border hover:bg-canvas'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {opt.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-sky-500/30">
                        <Search size={14} className="text-ink-muted" />
                        <input
                            type="text"
                            placeholder="Search by name, email, plate…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-sm text-ink placeholder-ink-muted outline-none sm:w-56"
                        />
                    </div>
                </div>

                {/* Driver list */}
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredDrivers.length > 0 ? (
                            filteredDrivers.map((driver) => (
                                <DriverCard key={driver.id} driver={driver} />
                            ))
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center py-16 text-center"
                            >
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-canvas">
                                    <ShieldCheck size={28} className="text-ink-muted" />
                                </div>
                                <p className="text-sm font-medium text-ink-muted">
                                    {filter === 'pending'
                                        ? 'No pending driver applications'
                                        : 'No drivers found'}
                                </p>
                                <p className="mt-1 text-xs text-ink-subtle">
                                    {filter === 'pending'
                                        ? 'All applications have been reviewed.'
                                        : 'Try adjusting your search or filter.'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Pagination */}
                {drivers?.links && drivers.links.length > 3 && (
                    <div className="flex items-center justify-center gap-1 pt-2">
                        {drivers.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                preserveState
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                    link.active
                                        ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20'
                                        : link.url
                                            ? 'text-ink-muted hover:bg-canvas'
                                            : 'text-ink-subtle cursor-not-allowed opacity-40'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
