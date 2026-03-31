import AppLayout from '@/Layouts/AppLayout';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    ShoppingBag, Clock, CheckCircle, XCircle, Truck,
    ChevronDown, ChevronUp, Package, Navigation, MapPin, Star, Camera, Store,
} from 'lucide-react';
import MeetupTrackingMap from '@/Components/MeetupTrackingMap';
import PickupTrackingMap from '@/Components/PickupTrackingMap';
import ReviewModal from '@/Components/ReviewModal';
import { ExpandableImage } from '@/Components/ImageLightbox';


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
    const [trackingOpen, setTrackingOpen] = useState(false);
    const [pickupTrackingOpen, setPickupTrackingOpen] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const status = STATUS[order.status] ?? STATUS.pending;
    const StatusIcon = status.icon;

    const timeAgo = new Date(order.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
        <>
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

                            {/* Meetup pending_buyer: artist countered */}
                            {order.delivery_method === 'meetup' && order.meetup_status === 'pending_buyer' && (
                                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                                    <p className="text-xs font-semibold text-orange-700">🎨 Artist proposed a different meet-up spot</p>
                                    <p className="text-xs text-orange-600">{order.meetup_proposed_label}</p>
                                    <Link
                                        href={route('buyer.meetup.review', order.id)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-200 transition-colors"
                                    >
                                        <MapPin size={12} /> Review Artist's Suggestion →
                                    </Link>
                                </div>
                            )}

                            {/* Confirmed meet-up location chip */}
                            {order.delivery_method === 'meetup' && order.meetup_status === 'agreed' && order.meetup_lat && (
                                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
                                    <CheckCircle size={13} className="flex-shrink-0" />
                                    <div>
                                        <span className="font-semibold">Meet-up confirmed: </span>
                                        {order.meetup_label}
                                    </div>
                                </div>
                            )}

                            {/* Go to Meet-up tracking */}
                            {order.delivery_method === 'meetup'
                                && order.meetup_status === 'agreed'
                                && order.meetup_lat
                                && ['confirmed', 'completed'].includes(order.status) && (
                                <div className="space-y-2">
                                    {trackingOpen ? (
                                        <MeetupTrackingMap
                                            order={order}
                                            role="buyer"
                                            onClose={() => setTrackingOpen(false)}
                                        />
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setTrackingOpen(true)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-violet-300 bg-violet-50 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                                            >
                                                <Navigation size={15} /> Go to Meet-up 📍
                                            </button>

                                            {/* Artist proof thumbnail (expandable) */}
                                            {order.meetup_proof_url && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-ink-muted">Artist's proof of hand-off:</p>
                                                    <ExpandableImage
                                                        src={order.meetup_proof_url}
                                                        alt="Hand-off proof"
                                                        className="h-28 border border-border rounded-xl overflow-hidden"
                                                    />
                                                </div>
                                            )}

                                            {/* Order Received button — only if proof exists */}
                                            {order.status === 'confirmed' && order.meetup_proof_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReview(true)}
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                >
                                                    <CheckCircle size={15} /> ✅ Order Received
                                                </button>
                                            )}

                                            {/* Waiting for artist proof */}
                                            {order.status === 'confirmed' && !order.meetup_proof_url && (
                                                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                                    <Camera size={14} />
                                                    Waiting for artist to upload proof of hand-off…
                                                </div>
                                            )}

                                            {/* Completed: show own review */}
                                            {order.status === 'completed' && order.review && (
                                                <div className="rounded-xl border border-border bg-canvas p-3 space-y-1">
                                                    <p className="text-xs font-semibold text-ink-muted">Your review:</p>
                                                    <div className="flex items-center gap-1">
                                                        {[1,2,3,4,5].map(n => (
                                                            <Star key={n} size={14} className={n <= order.review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />
                                                        ))}
                                                    </div>
                                                    {order.review.comment && (
                                                        <p className="text-xs text-ink-muted">"{order.review.comment}"</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Track delivery button (hide once order is completed) */}
                            {order.has_delivery && order.status !== 'completed' && (
                                <Link
                                    href={route('buyer.track', order.id)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                                >
                                    <Navigation size={15} /> Track My Artwork Live
                                </Link>
                            )}

                            {/* ── Delivery proof, confirmation & review ─── */}
                            {order.delivery_method === 'delivery' && ['shipped', 'completed'].includes(order.status) && (
                                <div className="space-y-2">
                                    {/* Driver's proof of delivery (expandable) */}
                                    {order.delivery_proof_url && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-ink-muted">Driver's proof of delivery:</p>
                                            <ExpandableImage
                                                src={order.delivery_proof_url}
                                                alt="Delivery proof"
                                                className="h-28 border border-border rounded-xl overflow-hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Order Received button — only if proof exists and not yet confirmed */}
                                    {order.status === 'shipped' && order.delivery_proof_url && (
                                        <button
                                            type="button"
                                            onClick={() => setShowReview(true)}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                        >
                                            <CheckCircle size={15} /> ✅ Order Received
                                        </button>
                                    )}

                                    {/* Waiting for driver proof */}
                                    {order.status === 'shipped' && !order.delivery_proof_url && (
                                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                            <Camera size={14} />
                                            Waiting for driver to upload proof of delivery…
                                        </div>
                                    )}

                                    {/* Completed: show own review */}
                                    {order.status === 'completed' && order.review && (
                                        <div className="rounded-xl border border-border bg-canvas p-3 space-y-1">
                                            <p className="text-xs font-semibold text-ink-muted">Your review:</p>
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4,5].map(n => (
                                                    <Star key={n} size={14} className={n <= order.review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />
                                                ))}
                                            </div>
                                            {order.review.comment && (
                                                <p className="text-xs text-ink-muted">"{order.review.comment}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PICKUP proof, confirmation & review ─── */}
                            {order.delivery_method === 'pickup' && ['confirmed', 'completed'].includes(order.status) && (
                                <div className="space-y-2">
                                    {/* Pickup tracking map toggle */}
                                    {order.status === 'confirmed' && order.pickup_lat && (
                                        pickupTrackingOpen ? (
                                            <PickupTrackingMap
                                                order={order}
                                                role="buyer"
                                                onClose={() => setPickupTrackingOpen(false)}
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setPickupTrackingOpen(true)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-teal-300 bg-teal-50 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                                            >
                                                <Navigation size={15} /> Navigate to Pick-up 📍
                                            </button>
                                        )
                                    )}

                                    {/* Status banner */}
                                    {order.status === 'confirmed' && !order.meetup_proof_url && (
                                        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                                            <Store size={14} />
                                            Head to the artist’s location to collect your artwork.
                                        </div>
                                    )}

                                    {/* Artist's proof of handoff (expandable) */}
                                    {order.meetup_proof_url && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-ink-muted">Artist's proof of hand-off:</p>
                                            <ExpandableImage
                                                src={order.meetup_proof_url}
                                                alt="Pickup proof"
                                                className="h-28 border border-border rounded-xl overflow-hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Order Received button — only if proof exists */}
                                    {order.status === 'confirmed' && order.meetup_proof_url && (
                                        <button
                                            type="button"
                                            onClick={() => setShowReview(true)}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                        >
                                            <CheckCircle size={15} /> ✅ Order Received
                                        </button>
                                    )}

                                    {/* Waiting for artist proof */}
                                    {order.status === 'confirmed' && !order.meetup_proof_url && (
                                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                            <Camera size={14} />
                                            Waiting for artist to confirm pick-up with a proof photo…
                                        </div>
                                    )}

                                    {/* Completed: show own review */}
                                    {order.status === 'completed' && order.review && (
                                        <div className="rounded-xl border border-border bg-canvas p-3 space-y-1">
                                            <p className="text-xs font-semibold text-ink-muted">Your review:</p>
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4,5].map(n => (
                                                    <Star key={n} size={14} className={n <= order.review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />
                                                ))}
                                            </div>
                                            {order.review.comment && (
                                                <p className="text-xs text-ink-muted">"{order.review.comment}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>

        {/* Review Modal */}
        <AnimatePresence>
            {showReview && (
                <ReviewModal
                    order={order}
                    isMeetup={order.delivery_method === 'meetup'}
                    isDelivery={order.delivery_method === 'delivery'}
                    onClose={() => setShowReview(false)}
                />
            )}
        </AnimatePresence>
        </>
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
