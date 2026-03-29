import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Truck, Package, Clock, CheckCircle, MapPin,
    User, Navigation, RefreshCw, AlertCircle, Route,
    Wifi, WifiOff,
} from 'lucide-react';
import axios from 'axios';
import DeliveryMap from '@/Components/DeliveryMap';

// ── Status Stepper ────────────────────────────────────────────────────
const STATUS_STEPS = [
    { key: 'pending_driver', label: 'Driver Assigned' },
    { key: 'searching',      label: 'Finding Driver' },
    { key: 'picked_up',      label: 'Picked Up' },
    { key: 'in_transit',     label: 'In Transit' },
    { key: 'delivered',      label: 'Delivered' },
];

function StatusStepper({ status }) {
    const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);

    return (
        <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
                const done    = i < currentIdx;
                const current = i === currentIdx;
                const isLast  = i === STATUS_STEPS.length - 1;
                return (
                    <div key={step.key} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                                done    ? 'border-emerald-500 bg-emerald-500' :
                                current ? 'border-sienna bg-sienna' :
                                          'border-border bg-canvas'
                            }`}>
                                {done ? (
                                    <CheckCircle size={14} className="text-white" />
                                ) : (
                                    <span className={`text-[10px] font-bold ${current ? 'text-white' : 'text-ink-muted'}`}>
                                        {i + 1}
                                    </span>
                                )}
                            </div>
                            <p className={`text-center text-[10px] font-medium w-14 leading-tight ${
                                done || current ? 'text-ink' : 'text-ink-subtle'
                            }`}>
                                {step.label}
                            </p>
                        </div>
                        {!isLast && (
                            <div className={`h-0.5 flex-1 -mt-5 mx-1 rounded-full transition-all ${
                                done ? 'bg-emerald-500' : 'bg-border'
                            }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Coordinate Validation ─────────────────────────────────────────────
/**
 * Validate that lat/lng are real WGS84 coordinates.
 * Rejects null, zero, and out-of-bounds values.
 */
function isValidCoordinate(lat, lng) {
    return (
        lat !== null && lat !== undefined &&
        lng !== null && lng !== undefined &&
        lat !== 0 && lng !== 0 &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT — TrackOrder (Buyer's real-time delivery tracking)
// ═══════════════════════════════════════════════════════════════════════
export default function TrackOrder({ order, delivery: initialDelivery }) {
    const [delivery, setDelivery] = useState(initialDelivery);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [routeInfo, setRouteInfo] = useState(null);

    // ── Connection state ──────────────────────────────────────────────
    // 'websocket' = live push updates, 'polling' = fallback HTTP
    const [connectionMode, setConnectionMode] = useState('websocket');

    // ── Refs for watchdog / fallback ──────────────────────────────────
    const lastUpdateRef      = useRef(Date.now());
    const fallbackIntervalRef = useRef(null);
    const watchdogRef        = useRef(null);

    // ═══════════════════════════════════════════════════════════════════
    //  Hybrid tracking: Polling starts IMMEDIATELY, WebSocket upgrades it
    // ═══════════════════════════════════════════════════════════════════
    //
    // Strategy:
    //  1. Start HTTP polling immediately on mount (guaranteed data flow)
    //  2. Connect WebSocket in parallel (faster when available)
    //  3. Once FIRST WebSocket event arrives, stop polling
    //  4. Watchdog: if WebSocket goes silent for 20s, restart polling
    //
    // This ensures the icon always moves, even if Pusher auth fails.
    //

    // ── Polling fetcher (used by both immediate poll and interval) ─────
    const fetchDriverLocation = useCallback(async () => {
        try {
            const { data } = await axios.get(route('buyer.delivery.location', delivery.id));

            if (isValidCoordinate(data.driver_lat, data.driver_lng)) {
                setDelivery(prev => ({
                    ...prev,
                    driver_lat:           data.driver_lat,
                    driver_lng:           data.driver_lng,
                    status:               data.status,
                    estimated_arrival_at: data.estimated_arrival_at,
                    adjusted_eta:         data.adjusted_eta,
                }));
                setLastUpdated(new Date());
                lastUpdateRef.current = Date.now();
            }
        } catch {
            // Silently ignore — will retry on next interval
        }
    }, [delivery.id]);

    useEffect(() => {
        const orderId = order.id;
        if (!orderId) return;

        // Don't track if delivery is done
        if (delivery.status === 'delivered') return;

        // ── 1. Start polling IMMEDIATELY (guaranteed updates) ─────────
        // Do one fetch right away so the icon position is fresh
        fetchDriverLocation();

        // Then poll every 10 seconds
        fallbackIntervalRef.current = setInterval(fetchDriverLocation, 10_000);
        setConnectionMode('polling');

        // ── 2. Connect WebSocket in parallel (upgrade path) ──────────
        let channel = null;

        if (window.Echo) {
            try {
                channel = window.Echo.private(`orders.${orderId}`);

                channel.listen('.DriverLocationUpdated', (event) => {
                    // Validate incoming coordinates
                    if (!isValidCoordinate(event.latitude, event.longitude)) {
                        console.warn('[TrackOrder] Invalid WS coordinates:', event);
                        return;
                    }

                    // ── Update delivery state with new GPS data ──
                    setDelivery(prev => ({
                        ...prev,
                        driver_lat: event.latitude,
                        driver_lng: event.longitude,
                    }));

                    setLastUpdated(new Date());
                    lastUpdateRef.current = Date.now();

                    // ── WebSocket is working — stop polling to save resources ──
                    if (fallbackIntervalRef.current) {
                        console.log('[TrackOrder] WebSocket active — stopping polling');
                        clearInterval(fallbackIntervalRef.current);
                        fallbackIntervalRef.current = null;
                        setConnectionMode('websocket');
                    }
                });

                // ── 3. Watchdog: restart polling if WS goes silent ────────
                watchdogRef.current = setInterval(() => {
                    const timeSinceUpdate = Date.now() - lastUpdateRef.current;

                    if (timeSinceUpdate > 20_000 && !fallbackIntervalRef.current) {
                        console.warn('[TrackOrder] WebSocket stale (20s), restarting polling');
                        fallbackIntervalRef.current = setInterval(fetchDriverLocation, 10_000);
                        setConnectionMode('polling');
                    }
                }, 5_000);
            } catch (err) {
                console.warn('[TrackOrder] Echo subscribe failed:', err);
                // Polling is already running, so we're fine
            }
        } else {
            console.warn('[TrackOrder] Echo not available — using polling only');
        }

        // ── Cleanup on unmount ───────────────────────────────────────
        return () => {
            if (channel) {
                channel.stopListening('.DriverLocationUpdated');
                window.Echo?.leave(`orders.${orderId}`);
            }
            if (watchdogRef.current) {
                clearInterval(watchdogRef.current);
                watchdogRef.current = null;
            }
            if (fallbackIntervalRef.current) {
                clearInterval(fallbackIntervalRef.current);
                fallbackIntervalRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.id]);

    // ═══════════════════════════════════════════════════════════════════
    //  Derived values
    // ═══════════════════════════════════════════════════════════════════

    const formattedEta = delivery.adjusted_eta
        ? new Date(delivery.adjusted_eta).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
        : null;

    // ── Memoize coordinate objects to prevent unnecessary DeliveryMap re-renders ──
    const driverLocation = useMemo(() => (
        delivery.driver_lat && delivery.driver_lng
            ? { lat: delivery.driver_lat, lng: delivery.driver_lng }
            : null
    ), [delivery.driver_lat, delivery.driver_lng]);

    const pickup = useMemo(() => (
        delivery.pickup_lat && delivery.pickup_lng
            ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng }
            : null
    ), [delivery.pickup_lat, delivery.pickup_lng]);

    // Dropoff: use delivery coords → fallback to order coords (buyer's pinned address)
    const dropoff = useMemo(() => (
        (delivery.dropoff_lat && delivery.dropoff_lng)
            ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }
            : (order.delivery_lat && order.delivery_lng)
                ? { lat: order.delivery_lat, lng: order.delivery_lng }
                : null
    ), [delivery.dropoff_lat, delivery.dropoff_lng, order.delivery_lat, order.delivery_lng]);

    const isDelivered = delivery.status === 'delivered';

    return (
        <AppLayout title="Track Order">
            <Head title={`Tracking Order #${order.id} — Artisora`} />

            <div className="mx-auto max-w-3xl space-y-6">

                {/* Header */}
                <div>
                    <h2 className="font-display text-3xl font-semibold text-ink">
                        Tracking Order #{order.id}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                        {connectionMode === 'websocket' ? 'Real-time updates' : 'Polling every 10 seconds'} · Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                {/* Delivered banner */}
                {isDelivered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-emerald-800">Artwork Delivered!</p>
                            <p className="text-sm text-emerald-700">
                                Your painting has been safely delivered. Enjoy your artwork!
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Status stepper */}
                <div className="rounded-xl border border-border bg-surface p-5">
                    <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                        Delivery Status
                    </p>
                    <StatusStepper status={delivery.status} />
                </div>

                {/* Map */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <DeliveryMap
                        pickup={pickup}
                        dropoff={dropoff}
                        driverLocation={driverLocation}
                        status={delivery.status}
                        driverIconState="vehicle"
                        pickupLabel="🎨 Artist"
                        dropoffLabel={`📦 ${order.buyer_name}`}
                        className="h-80"
                        onRouteInfo={setRouteInfo}
                    />
                </div>

                {/* Live Route Info */}
                {routeInfo && !isDelivered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                            <Route size={15} className="animate-pulse" />
                            Live Route Tracking
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-blue-800">
                                🚗 {routeInfo.durationMin} min
                            </span>
                            <span className="text-blue-600">
                                {routeInfo.distanceKm} km away
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Driver + ETA info */}
                <div className="grid grid-cols-2 gap-4">

                    {/* Driver info */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Driver</p>
                        {delivery.driver ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl">
                                        {delivery.driver.vehicle_type === 'motorcycle' ? '🏍️'
                                        : delivery.driver.vehicle_type === 'van' ? '🚐' : '🚗'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{delivery.driver.name}</p>
                                        <p className="text-xs text-ink-muted">{delivery.driver.plate_number}</p>
                                    </div>
                                </div>
                                {driverLocation && (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                                        <Navigation size={12} className="animate-pulse" />
                                        Live location active
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-ink-muted">
                                <User size={16} /> Awaiting driver assignment
                            </div>
                        )}
                    </div>

                    {/* ETA */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Estimated Arrival
                        </p>
                        {formattedEta ? (
                            <>
                                <p className="font-display text-3xl font-semibold text-sienna">{formattedEta}</p>
                                <div className="flex items-center gap-1.5 text-xs text-amber-700">
                                    <AlertCircle size={11} />
                                    Includes +{delivery.buffer_time} min fragile packing buffer
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-ink-muted">ETA will appear once driver is en route</p>
                        )}
                    </div>
                </div>

                {/* Logistics */}
                <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                        Package Details
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-ink-soft">
                        {delivery.dimensions && (
                            <span className="flex items-center gap-1.5">
                                🎨 <strong className="text-ink">{delivery.dimensions}</strong>
                            </span>
                        )}
                        {delivery.weight && (
                            <span className="flex items-center gap-1.5">
                                ⚖️ <strong className="text-ink">{delivery.weight} kg</strong>
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-ink-muted" />
                            <strong className="text-ink">{delivery.buffer_time} min</strong> handling buffer
                        </span>
                    </div>
                </div>

                {/* Connection status indicator */}
                {!isDelivered && (
                    <div className={`flex items-center justify-center gap-2 text-xs ${
                        connectionMode === 'websocket' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                        {connectionMode === 'websocket' ? (
                            <>
                                <Wifi size={12} className="animate-pulse" />
                                Connected — receiving real-time updates
                            </>
                        ) : (
                            <>
                                <WifiOff size={12} />
                                Reconnecting... using fallback polling (every 10s)
                            </>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
