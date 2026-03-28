import AppLayout from '@/Layouts/AppLayout';
import { Head, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    ShoppingBag, Clock, CheckCircle, XCircle, Truck,
    ChevronDown, ChevronUp, Package, Navigation,
} from 'lucide-react';


// ── Status config ────────────────────────────────────────────────
const STATUS = {
    pending:   { label: 'Awaiting Artist',   color: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500',  icon: Clock,         tip: 'The artist hasn\'t responded yet. This usually takes 1–2 business days.' },
    confirmed: { label: 'Order Confirmed',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle,   tip: 'The artist accepted your order and will prepare it soon.' },
    shipped:   { label: 'On the Way',        color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500',   icon: Truck,         tip: 'Your order is on its way!' },
    completed: { label: 'Received',          color: 'bg-stone-100 text-stone-600 border-stone-200',    dot: 'bg-stone-400',  icon: CheckCircle,   tip: 'Order completed. Enjoy your artwork!' },
    cancelled: { label: 'Declined',          color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500',    icon: XCircle,       tip: 'The artist was unable to fulfill this order.' },
};

const DELIVERY_LABELS = { delivery: '🚚 Delivery', meetup: '🤝 Meet Up', pickup: '🏪 Pick Up' };
const PAYMENT_LABELS  = { gcash: '💳 GCash',       cod: '💵 Cash on Delivery' };

// ── Buyer Order Card ─────────────────────────────────────────────
function OrderCard({ order }) {
    const [expanded, setExpanded] = useState(false);
    const status = STATUS[order.status] ?? STATUS.pending;
    const StatusIcon = status.icon;

    const timeAgo = new Date(order.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
        >
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-canvas/40 transition-colors"
            >
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${status.dot}`} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base font-semibold text-ink">Order #{order.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                            <StatusIcon size={11} /> {status.label}
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                        {timeAgo} · by {order.artist_name} · ₱{Number(order.subtotal).toLocaleString()}
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

                            {/* Status tip */}
                            <div className={`rounded-xl border px-4 py-3 text-sm ${status.color}`}>
                                {status.tip}
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-canvas">
                                            {item.thumbnail
                                                ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                                                : <div className="flex h-full w-full items-center justify-center text-lg">🎨</div>}
                                        </div>
                                        <p className="min-w-0 flex-1 text-sm font-medium text-ink line-clamp-1">{item.title}</p>
                                        <p className="flex-shrink-0 text-sm font-bold text-sienna">₱{Number(item.price).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas/60 p-4 text-xs">
                                <div>
                                    <p className="text-ink-muted mb-0.5">Delivery</p>
                                    <p className="font-medium text-ink">{DELIVERY_LABELS[order.delivery_method]}</p>
                                </div>
                                <div>
                                    <p className="text-ink-muted mb-0.5">Payment</p>
                                    <p className="font-medium text-ink">{PAYMENT_LABELS[order.payment_method]}</p>
                                </div>
                            </div>

                            {/* Decline reason */}
                            {order.status === 'cancelled' && order.decline_reason && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                                    <p className="font-semibold text-red-700 mb-1">Artist's message:</p>
                                    <p className="text-red-600">{order.decline_reason}</p>
                                </div>
                            )}

                            {/* Track button */}
                            {order.has_delivery && (
                                <Link
                                    href={route('buyer.track', order.id)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                                >
                                    <Navigation size={15} /> Track My Artwork Live
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


// ── Main Page ────────────────────────────────────────────────────
export default function BuyerOrders({ orders }) {
    const { flash } = usePage().props;
    const [filter, setFilter] = useState('all');

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    return (
        <AppLayout title="My Orders">
            <Head title="My Orders — Artisora" />

            <div className="mx-auto max-w-3xl space-y-6">

                <h2 className="font-display text-3xl font-semibold text-ink">My Orders</h2>

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

                {/* Pending notice */}
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        <Clock size={15} />
                        {pendingCount} order{pendingCount !== 1 ? 's' : ''} awaiting artist confirmation.
                    </div>
                )}

                {/* Filter tabs */}
                {orders.length > 0 && (
                    <div className="flex gap-1 rounded-xl border border-border bg-canvas p-1">
                        {['all', 'pending', 'confirmed', 'shipped', 'cancelled'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-all ${
                                    filter === s ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
                                }`}
                            >
                                {s === 'all' ? 'All' : STATUS[s]?.label ?? s}
                            </button>
                        ))}
                    </div>
                )}

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
                        <ShoppingBag size={40} className="mb-4 text-ink-subtle" />
                        <p className="font-display text-xl font-semibold text-ink">No orders yet</p>
                        <p className="mt-1 text-sm text-ink-muted">Your placed orders will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(order => <OrderCard key={order.id} order={order} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
