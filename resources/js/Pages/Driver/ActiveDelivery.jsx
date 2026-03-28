import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Package, Ruler, Weight, Clock, CheckCircle,
    Phone, Navigation, Truck, AlertCircle, User,
    ArrowLeft, ChevronRight, RefreshCw, Shield, Route,
} from 'lucide-react';
import axios from 'axios';
import DeliveryMap from '@/Components/DeliveryMap';

// ── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG = {
    picked_up:  { label: 'Head to Pickup',  color: 'bg-amber-100 text-amber-800 border-amber-200',   dot: 'bg-amber-500',  icon: Truck },
    in_transit: { label: 'In Transit',       color: 'bg-blue-100 text-blue-800 border-blue-200',      dot: 'bg-blue-500',   icon: Navigation },
    delivered:  { label: 'Delivered ✓',      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
};

// ── Step Indicator ────────────────────────────────────────────────
const STEPS = [
    { key: 'picked_up',  label: 'Pickup Artwork',  icon: Package },
    { key: 'in_transit', label: 'In Transit',       icon: Navigation },
    { key: 'delivered',  label: 'Delivered',         icon: CheckCircle },
];

function StepBar({ status }) {
    const idx = STEPS.findIndex(s => s.key === status);
    return (
        <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
                const done    = i < idx;
                const current = i === idx;
                const Icon    = step.icon;
                const isLast  = i === STEPS.length - 1;
                return (
                    <div key={step.key} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                                done    ? 'border-emerald-500 bg-emerald-500' :
                                current ? 'border-sienna bg-sienna' :
                                          'border-border bg-canvas'
                            }`}>
                                <Icon size={16} className={done ? 'text-white' : current ? 'text-white' : 'text-ink-muted'} />
                            </div>
                            <span className={`text-center text-[10px] font-semibold w-20 leading-tight ${
                                done || current ? 'text-ink' : 'text-ink-subtle'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className={`h-0.5 flex-1 -mt-6 mx-1 rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── GPS Sharing Hook ──────────────────────────────────────────────
function useGpsSharing(deliveryId, shouldAutoStart) {
    const [sharing, setSharing]   = useState(false);
    const [error, setError]       = useState(null);
    const [location, setLocation] = useState(null);
    const intervalRef = useRef(null);

    const sendLocation = useCallback((lat, lng) => {
        axios.post(route('driver.location', deliveryId), { lat, lng })
            .catch(() => {});
        setLocation({ lat, lng });
    }, [deliveryId]);

    const start = useCallback(() => {
        if (!navigator.geolocation) {
            setError('GPS not available on this device.');
            return;
        }
        setSharing(true);
        setError(null);

        const send = () => {
            navigator.geolocation.getCurrentPosition(
                pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
                () => setError('Could not get GPS fix. Please enable location services.'),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        };

        send(); // immediate first hit
        intervalRef.current = setInterval(send, 10000); // then every 10s
    }, [sendLocation]);

    const stop = useCallback(() => {
        setSharing(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Auto-start when shouldAutoStart is true (in_transit or picked_up)
    useEffect(() => {
        if (shouldAutoStart && !sharing) {
            start();
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldAutoStart]);

    return { sharing, start, stop, error, location };
}

// ════════════════════════════════════════════════════════════════════
//  MAIN PAGE — ActiveDelivery
// ════════════════════════════════════════════════════════════════════
export default function ActiveDelivery({ delivery, order, artist }) {
    const { flash } = usePage().props;
    const [transitProcessing, setTransitProcessing] = useState(false);
    const [deliveredProcessing, setDeliveredProcessing] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);

    const isPickedUp  = delivery.status === 'picked_up';
    const isInTransit = delivery.status === 'in_transit';
    const isDelivered = delivery.status === 'delivered';
    const isActive    = isPickedUp || isInTransit;

    // GPS auto-starts for both picked_up and in_transit — driver's location
    // is always useful for the buyer to see
    const gps = useGpsSharing(delivery.id, isActive);

    const status     = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.picked_up;
    const StatusIcon = status.icon;

    // ── Map coordinates ───────────────────────────────────────────
    const pickup = (delivery.pickup_lat && delivery.pickup_lng)
        ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng }
        : (artist?.lat && artist?.lng)
            ? { lat: artist.lat, lng: artist.lng }
            : null;

    // Dropoff: delivery coords → fallback to order coords (buyer's pinned address)
    const dropoff = (delivery.dropoff_lat && delivery.dropoff_lng)
        ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }
        : (order.delivery_lat && order.delivery_lng)
            ? { lat: order.delivery_lat, lng: order.delivery_lng }
            : null;

    // Live driver location from GPS sharing or from server data
    const driverLocation = gps.location
        ?? (delivery.driver_lat && delivery.driver_lng
            ? { lat: delivery.driver_lat, lng: delivery.driver_lng }
            : null);

    // ── Actions ───────────────────────────────────────────────────
    const handleMarkInTransit = () => {
        setTransitProcessing(true);
        router.post(route('driver.transit', delivery.id), {}, {
            onFinish: () => setTransitProcessing(false),
        });
    };

    const handleMarkDelivered = () => {
        setDeliveredProcessing(true);
        router.post(route('driver.delivered', delivery.id), {}, {
            onFinish: () => setDeliveredProcessing(false),
        });
    };

    const fmtEta = delivery.estimated_arrival_at
        ? new Date(delivery.estimated_arrival_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <AppLayout title="Active Delivery">
            <Head title={`Delivery #${delivery.id} — Artisora`} />

            <div className="mx-auto max-w-3xl space-y-5">

                {/* Back */}
                <Link
                    href={route('driver.my-jobs')}
                    className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                    <ArrowLeft size={14} /> My Deliveries
                </Link>

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${status.color}`}>
                        <StatusIcon size={20} />
                    </div>
                    <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">
                            Delivery #{delivery.id}
                        </h2>
                        <p className="text-sm text-ink-muted">Order #{order.id} · {order.buyer_name}</p>
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

                {/* Delivered banner */}
                {isDelivered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                            <CheckCircle size={24} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-display text-lg font-semibold text-emerald-800">🎉 Delivery Complete!</p>
                            <p className="text-sm text-emerald-700">Great work. The artwork has been delivered safely.</p>
                        </div>
                    </motion.div>
                )}

                {/* Step bar */}
                <div className="rounded-xl border border-border bg-surface p-5">
                    <StepBar status={delivery.status} />
                </div>

                {/* ── MAP ──────────────────────────────────────── */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <DeliveryMap
                        pickup={pickup}
                        dropoff={dropoff}
                        driverLocation={driverLocation}
                        status={delivery.status}
                        pickupLabel={`🎨 ${artist?.name ?? 'Artist'}`}
                        dropoffLabel={`📦 ${order.buyer_name}`}
                        className="h-80"
                        onRouteInfo={setRouteInfo}
                    />
                </div>

                {/* ── LIVE ROUTE INFO ──────────────────────────── */}
                {routeInfo && isActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                            <Route size={15} className="animate-pulse" />
                            Live Route
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-blue-800">
                                🚗 {routeInfo.durationMin} min
                            </span>
                            <span className="text-blue-600">
                                {routeInfo.distanceKm} km to destination
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* ── GPS STATUS CARD ─────────────────────────── */}
                {isActive && (
                    <div className={`flex items-center gap-3 rounded-xl border p-4 ${
                        gps.sharing ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
                    }`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            gps.sharing ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                            <Navigation size={18} className={
                                gps.sharing ? 'text-emerald-600 animate-pulse' : 'text-amber-600'
                            } />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${gps.sharing ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {gps.sharing ? '📡 Sharing Your Location Live' : '⚠️ Location Not Sharing'}
                            </p>
                            <p className="text-xs text-ink-muted">
                                {gps.sharing
                                    ? 'The buyer sees your real-time position. Updating every 10 seconds.'
                                    : 'Tap "Share GPS" to let the buyer track your location.'}
                            </p>
                            {gps.error && <p className="mt-1 text-xs font-medium text-red-600">{gps.error}</p>}
                        </div>
                        {!gps.sharing && (
                            <button
                                onClick={gps.start}
                                className="flex-shrink-0 rounded-xl bg-sienna px-4 py-2.5 text-xs font-bold text-white hover:bg-sienna-600 transition-colors"
                            >
                                Share GPS
                            </button>
                        )}
                        {gps.sharing && gps.location && (
                            <div className="flex-shrink-0 text-right">
                                <p className="text-[10px] font-mono text-emerald-600">
                                    {gps.location.lat.toFixed(4)}, {gps.location.lng.toFixed(4)}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── ACTION BUTTONS ──────────────────────────── */}
                {isPickedUp && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <Package size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Step 1: Head to the artist's location</p>
                                <p className="mt-1 text-xs">Pick up the artwork carefully. Once you have it in hand, tap the button below to start delivery.</p>
                            </div>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleMarkInTransit}
                            disabled={transitProcessing}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-4 text-base font-bold text-white shadow-md transition-all hover:bg-sienna-600 hover:shadow-lg disabled:opacity-50"
                        >
                            <Truck size={20} />
                            {transitProcessing ? 'Updating…' : '✅ I\'ve Picked Up the Artwork — Start Delivery'}
                        </motion.button>
                    </motion.div>
                )}

                {isInTransit && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                            <Navigation size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Step 2: Deliver to the buyer</p>
                                <p className="mt-1 text-xs">Your location is being shared with the buyer. Drive safely! When you arrive and hand over the artwork, tap below.</p>
                            </div>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleMarkDelivered}
                            disabled={deliveredProcessing}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50"
                        >
                            <CheckCircle size={20} />
                            {deliveredProcessing ? 'Completing…' : '🎉 Mark as Delivered'}
                        </motion.button>
                    </motion.div>
                )}

                {/* ── INFO CARDS ──────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pickup point */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">📍 Pickup Location</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎨</span>
                            <div>
                                <p className="text-sm font-semibold text-ink">{artist?.name ?? 'Artist'}</p>
                                <p className="text-xs text-ink-muted">{artist?.address ?? 'Contact artist for address'}</p>
                            </div>
                        </div>
                        {!pickup && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                                No GPS coords on file — use the address above
                            </p>
                        )}
                    </div>

                    {/* Drop-off point */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">📦 Deliver To</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🏠</span>
                            <div>
                                <p className="text-sm font-semibold text-ink">{order.buyer_name}</p>
                                <p className="text-xs text-ink-muted">{order.address}</p>
                            </div>
                        </div>
                        {order.buyer_phone && (
                            <a
                                href={`tel:${order.buyer_phone}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-canvas border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-sienna hover:text-white hover:border-sienna transition-colors"
                            >
                                <Phone size={12} /> Call: {order.buyer_phone}
                            </a>
                        )}
                    </div>
                </div>

                {/* ETA */}
                {fmtEta && !isDelivered && (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-ink-muted">
                            <Clock size={15} />
                            Estimated Arrival (incl. {delivery.buffer_time}min fragile buffer)
                        </div>
                        <span className="font-display text-xl font-bold text-sienna">{fmtEta}</span>
                    </div>
                )}

                {/* Artwork details */}
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">🖼 Package Details</p>
                    {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-canvas">
                                {item.thumbnail
                                    ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-xl">🎨</div>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-ink line-clamp-1">{item.title}</p>
                                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-muted">
                                    {item.dimensions && (
                                        <span className="flex items-center gap-1">
                                            <Ruler size={10} /> {item.dimensions}
                                        </span>
                                    )}
                                    {item.weight && (
                                        <span className="flex items-center gap-1">
                                            <Weight size={10} /> {item.weight} kg
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                        ⚠️ Fragile artwork — handle with care. +{delivery.buffer_time} min packing buffer required.
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
