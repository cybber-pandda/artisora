import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Clock, CheckCircle, XCircle, Truck,
    ChevronDown, ChevronUp, Phone, Mail, MapPin,
    User, Palette, ArrowRight, Eye,
} from 'lucide-react';

const STATUS = {
    pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700 border-amber-200',     dot: 'bg-amber-500' },
    confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    shipped:   { label: 'Shipped',   color: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
    completed: { label: 'Completed', color: 'bg-stone-100 text-stone-600 border-stone-200',       dot: 'bg-stone-400' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500' },
};

const DELIVERY_LABELS = { delivery: '🚚 Delivery', meetup: '🤝 Meet Up', pickup: '🏪 Pick Up' };
const PAYMENT_LABELS  = { gcash: '💳 GCash', cod: '💵 Cash on Delivery' };
const VEHICLE_ICONS   = { motorcycle: '🏍️', car: '🚗', van: '🚐' };

function OrderRow({ order }) {
    const [expanded, setExpanded] = useState(false);
    const status = STATUS[order.status] ?? STATUS.pending;

    const timeStr = new Date(order.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`overflow-hidden rounded-2xl border bg-surface shadow-xs transition-all ${
                order.status === 'shipped' ? 'border-blue-200' : 'border-border'
            }`}
        >
            {/* Row header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-canvas/40 transition-colors"
            >
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${status.dot}`} />

                <div className="min-w-0 flex-1 grid grid-cols-5 gap-4 items-center">
                    <div>
                        <p className="text-sm font-semibold text-ink">Order #{order.id}</p>
                        <p className="text-xs text-ink-muted">{timeStr}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ink-muted">Buyer</p>
                        <p className="text-sm font-medium text-ink truncate">{order.buyer_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ink-muted">Artist</p>
                        <p className="text-sm font-medium text-ink truncate">{order.artist_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ink-muted">Amount</p>
                        <p className="text-sm font-semibold text-sienna">₱{Number(order.subtotal).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                </div>

                {expanded
                    ? <ChevronUp size={15} className="flex-shrink-0 text-ink-muted" />
                    : <ChevronDown size={15} className="flex-shrink-0 text-ink-muted" />}
            </button>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                    >
                        <div className="grid grid-cols-3 gap-4 p-5">

                            {/* Buyer info */}
                            <div className="rounded-xl bg-canvas/60 p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100">
                                        <User size={13} className="text-sky-600" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Buyer</p>
                                </div>
                                <p className="text-sm font-semibold text-ink">{order.buyer_name}</p>
                                <div className="flex items-center gap-2 text-xs text-ink-soft">
                                    <Mail size={11} className="text-ink-muted flex-shrink-0" /> {order.buyer_email}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-ink-soft">
                                    <Phone size={11} className="text-ink-muted flex-shrink-0" /> {order.buyer_phone}
                                </div>
                                {order.buyer_address && (
                                    <div className="flex items-start gap-2 text-xs text-ink-soft">
                                        <MapPin size={11} className="mt-0.5 text-ink-muted flex-shrink-0" /> {order.buyer_address}
                                    </div>
                                )}
                                <div className="pt-1 text-xs text-ink-muted">
                                    {DELIVERY_LABELS[order.delivery_method]}
                                    {' · '}{PAYMENT_LABELS[order.payment_method]}
                                </div>
                            </div>

                            {/* Artist info */}
                            <div className="rounded-xl bg-canvas/60 p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sienna/10">
                                        <Palette size={13} className="text-sienna" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Artist</p>
                                </div>
                                <p className="text-sm font-semibold text-ink">{order.artist_name}</p>
                                <div className="flex items-center gap-2 text-xs text-ink-soft">
                                    <Mail size={11} className="text-ink-muted flex-shrink-0" /> {order.artist_email}
                                </div>
                                <div className="mt-2 space-y-1">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-ink-soft">
                                            <span className="text-[10px]">🎨</span> {item.title} — ₱{Number(item.price).toLocaleString()}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Driver / delivery info */}
                            <div className="rounded-xl bg-canvas/60 p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                                        <Truck size={13} className="text-emerald-600" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Driver</p>
                                </div>
                                {order.driver ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{VEHICLE_ICONS[order.driver.vehicle_type] ?? '🚗'}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-ink">{order.driver.name}</p>
                                                <p className="text-xs text-ink-muted">{order.driver.plate_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-ink-soft">
                                            <Mail size={11} className="text-ink-muted flex-shrink-0" /> {order.driver.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-ink-soft">
                                            <Phone size={11} className="text-ink-muted flex-shrink-0" /> {order.driver.phone}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-ink-muted">No driver assigned yet</p>
                                )}

                                {/* Track button */}
                                {(order.status === 'shipped' || order.status === 'completed') && order.has_delivery && (
                                    <Link
                                        href={route('admin.orders.track', order.id)}
                                        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        <Eye size={13} /> View Live Map
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function AdminOrders({ orders, counts }) {
    const [filter, setFilter] = useState('all');

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const tabs = [
        { key: 'all',       label: 'All',         count: counts.total },
        { key: 'pending',   label: '⏳ Pending',   count: counts.pending },
        { key: 'confirmed', label: '✅ Confirmed', count: counts.confirmed },
        { key: 'shipped',   label: '🚚 Shipped',   count: counts.shipped },
        { key: 'completed', label: '✓ Completed', count: null },
        { key: 'cancelled', label: '✗ Cancelled', count: null },
    ];

    return (
        <AppLayout title="Orders">
            <Head title="Orders — Admin — Artisora" />

            <div className="mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-display text-3xl font-semibold text-ink">All Orders</h2>
                        <p className="mt-1 text-sm text-ink-muted">Full platform order visibility and delivery tracking.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {counts.shipped} active deliveries
                        </span>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 rounded-xl border border-border bg-canvas p-1 overflow-x-auto">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setFilter(t.key)}
                            className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                                filter === t.key ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
                            }`}
                        >
                            {t.label}
                            {t.count !== null && t.count > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    t.key === 'pending' ? 'bg-amber-500 text-white' :
                                    t.key === 'shipped' ? 'bg-blue-500 text-white' :
                                    'bg-border text-ink-muted'
                                }`}>{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table header */}
                {filtered.length > 0 && (
                    <div className="grid grid-cols-[20px_1fr] gap-4 px-5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                        <div />
                        <div className="grid grid-cols-5 gap-4">
                            <span>Order</span>
                            <span>Buyer</span>
                            <span>Artist</span>
                            <span>Amount</span>
                            <span className="text-right">Status</span>
                        </div>
                    </div>
                )}

                {/* Orders list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                        <Package size={40} className="mb-4 text-ink-subtle" />
                        <p className="font-display text-xl font-semibold text-ink">No orders here</p>
                        <p className="mt-1 text-sm text-ink-muted">No orders match this filter.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(order => (
                            <OrderRow key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
