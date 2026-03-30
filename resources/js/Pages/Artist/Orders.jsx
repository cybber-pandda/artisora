import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Clock, CheckCircle, XCircle, Truck,
    ChevronDown, ChevronUp, Phone, Mail, MapPin,
    CreditCard, Banknote, AlertTriangle, MessageSquare,
} from 'lucide-react';


// ── Status config ────────────────────────────────────────────────
const STATUS = {
    pending:   { label: 'Awaiting Your Response', color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',  icon: Clock },
    confirmed: { label: 'Accepted',               color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
    shipped:   { label: 'Shipped',                color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500',   icon: Truck },
    completed: { label: 'Completed',              color: 'bg-stone-100 text-stone-600 border-stone-200', dot: 'bg-stone-400',  icon: CheckCircle },
    cancelled: { label: 'Declined',               color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500',    icon: XCircle },
};

const DELIVERY_LABELS = { delivery: '🚚 Delivery', meetup: '🤝 Meet Up', pickup: '🏪 Pick Up' };
const PAYMENT_LABELS  = { gcash: '💳 GCash',       cod: '💵 Cash on Delivery' };

// ── Decline Modal ────────────────────────────────────────────────
function DeclineModal({ orderId, onClose, onSubmit }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const presets = [
        'The artwork is no longer available.',
        'I am unable to accommodate the requested delivery method.',
        'I am currently unavailable / on a break.',
        'The buyer did not respond to my follow-up.',
    ];

    const handleSubmit = () => {
        if (!reason.trim()) return;
        setLoading(true);
        onSubmit(reason);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle size={18} className="text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink">Decline Order #{orderId}</h3>
                        <p className="text-xs text-ink-muted">Please provide a reason for the buyer.</p>
                    </div>
                </div>

                {/* Preset reasons */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Quick Reasons</p>
                    {presets.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setReason(p)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                                reason === p ? 'border-sienna bg-sienna/5 text-sienna' : 'border-border text-ink-soft hover:border-sienna/40'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Custom reason */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Or write your own</p>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Explain why you're declining this order…"
                        className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition-all focus:border-sienna focus:ring-2 focus:ring-sienna/20 resize-none"
                    />
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason.trim() || loading}
                        className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? 'Declining…' : 'Decline Order'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Order Card ───────────────────────────────────────────────────
function OrderCard({ order }) {
    const [expanded, setExpanded]       = useState(order.status === 'pending');
    const [decliningId, setDecliningId] = useState(null);
    const status = STATUS[order.status] ?? STATUS.pending;
    const StatusIcon = status.icon;

    const accept = () => router.post(route('artist.orders.accept', order.id), {}, {
        preserveScroll: true,
    });

    const submitDecline = (reason) => {
        router.post(route('artist.orders.decline', order.id), { decline_reason: reason }, {
            preserveScroll: true,
            onFinish: () => setDecliningId(null),
        });
    };

    const markShipped = () => router.post(route('artist.orders.shipped', order.id), {}, {
        preserveScroll: true,
    });

    const timeAgo = new Date(order.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return (
        <>
            <AnimatePresence>
                {decliningId && (
                    <DeclineModal
                        orderId={decliningId}
                        onClose={() => setDecliningId(null)}
                        onSubmit={submitDecline}
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`overflow-hidden rounded-2xl border bg-surface shadow-xs transition-all ${
                    order.status === 'pending' ? 'border-amber-300 shadow-amber-100' : 'border-border'
                }`}
            >
                {/* Card header */}
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-canvas/40 transition-colors"
                >
                    {/* Status dot */}
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${status.dot}`} />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-base font-semibold text-ink">Order #{order.id}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                                <StatusIcon size={11} />
                                {status.label}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-muted">
                            {timeAgo} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · ₱{Number(order.subtotal).toLocaleString()}
                        </p>
                    </div>

                    {expanded ? <ChevronUp size={16} className="flex-shrink-0 text-ink-muted" /> : <ChevronDown size={16} className="flex-shrink-0 text-ink-muted" />}
                </button>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-border"
                        >
                            <div className="p-4 space-y-4">

                                {/* Items */}
                                <div className="space-y-3">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-canvas">
                                                {item.thumbnail
                                                    ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                                                    : <div className="flex h-full w-full items-center justify-center text-lg">🎨</div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-ink line-clamp-1">{item.title}</p>
                                            </div>
                                            <p className="text-sm font-bold text-sienna flex-shrink-0">₱{Number(item.price).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Buyer info */}
                                <div className="rounded-xl bg-canvas/60 p-4 space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Buyer Info</p>
                                    <div className="flex items-center gap-2 text-sm text-ink-soft">
                                        <Phone size={13} className="text-ink-muted" /> {order.buyer.phone_number}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-ink-soft">
                                        <Mail size={13} className="text-ink-muted" /> {order.buyer.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-ink-soft">
                                        <Package size={13} className="text-ink-muted" />
                                        {DELIVERY_LABELS[order.delivery_method]}
                                        {order.delivery_method === 'meetup' && order.meetup_location && ` · ${order.meetup_location}`}
                                    </div>
                                    {order.buyer.address && (
                                        <div className="flex items-start gap-2 text-sm text-ink-soft">
                                            <MapPin size={13} className="mt-0.5 text-ink-muted" /> {order.buyer.address}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-ink-soft">
                                        {order.payment_method === 'gcash'
                                            ? <CreditCard size={13} className="text-ink-muted" />
                                            : <Banknote size={13} className="text-ink-muted" />}
                                        {PAYMENT_LABELS[order.payment_method]}
                                    </div>
                                    {order.notes && (
                                        <div className="flex items-start gap-2 text-sm text-ink-soft">
                                            <MessageSquare size={13} className="mt-0.5 text-ink-muted" /> {order.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Decline reason */}
                                {order.status === 'cancelled' && order.decline_reason && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        <p className="font-semibold mb-1">Your decline reason:</p>
                                        <p>{order.decline_reason}</p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                {order.status === 'pending' && (
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={accept}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                        >
                                            <CheckCircle size={15} /> Accept Order
                                        </button>
                                        <button
                                            onClick={() => setDecliningId(order.id)}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                                        >
                                            <XCircle size={15} /> Decline
                                        </button>
                                    </div>
                                )}


                                {order.status === 'confirmed' && (
                                    <a
                                        href={route('artist.dispatch', order.id)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                                    >
                                        <Truck size={15} /> Dispatch Delivery
                                    </a>
                                )}

                                {order.status === 'shipped' && (
                                    <a
                                        href={route('artist.track', order.id)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300"
                                    >
                                        <Truck size={15} />
                                        Track Delivery →
                                    </a>
                                )}

                                {order.status === 'completed' && (
                                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                        <CheckCircle size={15} />
                                        ✅ Delivery completed successfully
                                    </div>
                                )}


                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}

// ── Main Page ────────────────────────────────────────────────────
export default function ArtistOrders({ orders, counts }) {
    const [filter, setFilter] = useState('all');
    const { flash } = usePage().props;

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const tabs = [
        { key: 'all',       label: 'All',           count: counts.total },
        { key: 'pending',   label: '⏳ Pending',     count: counts.pending },
        { key: 'confirmed', label: '✅ Active',      count: counts.confirmed },
        { key: 'shipped',   label: '🚚 Dispatched',  count: null },
        { key: 'completed', label: '✓ Completed',   count: null },
        { key: 'cancelled', label: 'Declined',       count: null },
    ];

    return (
        <AppLayout title="Orders">
            <Head title="Orders — Artisora" />

            <div className="mx-auto max-w-3xl space-y-6">

                {/* Header */}
                <div>
                    <h2 className="font-display text-3xl font-semibold text-ink">Orders</h2>
                    <p className="mt-1 text-sm text-ink-muted">Review and respond to buyer orders for your artworks.</p>
                </div>

                {/* Flash message */}
                {flash?.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                    >
                        <CheckCircle size={15} /> {flash.success}
                    </motion.div>
                )}

                {/* Summary pills */}
                {counts.pending > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        <Clock size={15} />
                        You have <strong>{counts.pending}</strong> order{counts.pending !== 1 ? 's' : ''} awaiting your response.
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-1 rounded-xl border border-border bg-canvas p-1">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setFilter(t.key)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                                filter === t.key ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
                            }`}
                        >
                            {t.label}
                            {t.count !== null && t.count > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    t.key === 'pending' ? 'bg-amber-500 text-white' : 'bg-border text-ink-muted'
                                }`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Orders list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                        <Package size={40} className="mb-4 text-ink-subtle" />
                        <p className="font-display text-xl font-semibold text-ink">No orders here</p>
                        <p className="mt-1 text-sm text-ink-muted">
                            {filter === 'pending' ? 'No orders waiting for your response.' : 'No orders in this category yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(order => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
