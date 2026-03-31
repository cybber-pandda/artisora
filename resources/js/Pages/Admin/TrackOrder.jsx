import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Truck, Clock, CheckCircle, Navigation, AlertCircle,
    Route, Wifi, WifiOff, ArrowLeft, User, Palette,
    Phone, Mail, MapPin, Shield,
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
                                {done
                                    ? <CheckCircle size={14} className="text-white" />
                                    : <span className={`text-[10px] font-bold ${current ? 'text-white' : 'text-ink-muted'}`}>{i + 1}</span>}
                            </div>
                            <p className={`text-center text-[10px] font-medium w-14 leading-tight ${done || current ? 'text-ink' : 'text-ink-subtle'}`}>
                                {step.label}
                            </p>
                        </div>
                        {!isLast && (
                            <div className={`h-0.5 flex-1 -mt-5 mx-1 rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function isValidCoordinate(lat, lng) {
    return (
        lat !== null && lat !== undefined &&
        lng !== null && lng !== undefined &&
        lat !== 0 && lng !== 0 &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
}

// ── Info Card ─────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, iconBg, iconColor, title, children }) {
    return (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon size={13} className={iconColor} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
            </div>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT — Admin Live Order Tracking
// ═══════════════════════════════════════════════════════════════════════
export default function AdminTrackOrder({ order, delivery: initialDelivery, buyer, artist, driver }) {
    const [delivery, setDelivery]           = useState(initialDelivery);
    const [lastUpdated, setLastUpdated]     = useState(new Date());
    const [routeInfo, setRouteInfo]         = useState(null);
    const [connectionMode, setConnectionMode] = useState('polling');

    const lastUpdateRef       = useRef(Date.now());
    const fallbackIntervalRef = useRef(null);
    const watchdogRef         = useRef(null);

    // ── Polling ──────────────────────────────────────────────────────
    const fetchDriverLocation = useCallback(async () => {
        try {
            const { data } = await axios.get(route('admin.delivery.location', delivery.id));
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
        } catch { /* silent */ }
    }, [delivery.id]);

    // ── Hybrid tracking ──────────────────────────────────────────────
    useEffect(() => {
        if (!order.id || delivery.status === 'delivered') return;

        fetchDriverLocation();
        fallbackIntervalRef.current = setInterval(fetchDriverLocation, 10_000);
        setConnectionMode('polling');

        let channel = null;
        if (window.Echo) {
            try {
                channel = window.Echo.private(`orders.${order.id}`);
                channel.listen('.DriverLocationUpdated', (event) => {
                    if (!isValidCoordinate(event.latitude, event.longitude)) return;
                    setDelivery(prev => ({ ...prev, driver_lat: event.latitude, driver_lng: event.longitude }));
                    setLastUpdated(new Date());
                    lastUpdateRef.current = Date.now();
                    if (fallbackIntervalRef.current) {
                        clearInterval(fallbackIntervalRef.current);
                        fallbackIntervalRef.current = null;
                        setConnectionMode('websocket');
                    }
                });
                watchdogRef.current = setInterval(() => {
                    if (Date.now() - lastUpdateRef.current > 20_000 && !fallbackIntervalRef.current) {
                        fallbackIntervalRef.current = setInterval(fetchDriverLocation, 10_000);
                        setConnectionMode('polling');
                    }
                }, 5_000);
            } catch { /* polling already running */ }
        }

        return () => {
            if (channel) {
                channel.stopListening('.DriverLocationUpdated');
                window.Echo?.leave(`orders.${order.id}`);
            }
            if (watchdogRef.current)         clearInterval(watchdogRef.current);
            if (fallbackIntervalRef.current)  clearInterval(fallbackIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.id]);

    // ── Derived values ───────────────────────────────────────────────
    const formattedEta = delivery.adjusted_eta
        ? new Date(delivery.adjusted_eta).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
        : null;

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
            <Head title={`Admin — Tracking Order #${order.id} — Artisora`} />

            <div className="mx-auto max-w-5xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={route('admin.orders')}
                        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
                    >
                        <ArrowLeft size={14} /> All Orders
                    </Link>
                </div>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                                <Shield size={16} className="text-violet-600" />
                            </div>
                            <h2 className="font-display text-3xl font-semibold text-ink">
                                Order #{order.id}
                            </h2>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted ml-10">
                            Admin view · {connectionMode === 'websocket' ? 'Real-time' : 'Polling (10s)'}
                            {' '}· Updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>
                    {!isDelivered && (
                        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            connectionMode === 'websocket'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                            {connectionMode === 'websocket'
                                ? <><Wifi size={11} className="animate-pulse" /> Live</>
                                : <><WifiOff size={11} /> Polling</>}
                        </div>
                    )}
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
                            <p className="font-semibold text-emerald-800">Delivery Completed</p>
                            <p className="text-sm text-emerald-700">
                                Artwork was successfully delivered to {buyer.name}.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Status stepper */}
                <div className="rounded-xl border border-border bg-surface p-5">
                    <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-ink-muted">Delivery Status</p>
                    <StatusStepper status={delivery.status} />
                </div>

                {/* Map — full width */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <DeliveryMap
                        pickup={pickup}
                        dropoff={dropoff}
                        driverLocation={driverLocation}
                        status={delivery.status}
                        driverIconState="vehicle"
                        pickupLabel={`🎨 ${artist.name}`}
                        dropoffLabel={`📦 ${buyer.name}`}
                        className="h-96"
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
                            Live Route
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-blue-800">🚗 {routeInfo.durationMin} min</span>
                            <span className="text-blue-600">{routeInfo.distanceKm} km away</span>
                        </div>
                    </motion.div>
                )}

                {/* Three-column: Buyer | Driver+ETA | Artist */}
                <div className="grid grid-cols-3 gap-4">

                    {/* Buyer */}
                    <InfoCard icon={User} iconBg="bg-sky-100" iconColor="text-sky-600" title="Buyer">
                        <p className="text-sm font-semibold text-ink">{buyer.name}</p>
                        <div className="space-y-1.5 text-xs text-ink-soft">
                            <div className="flex items-center gap-2">
                                <Mail size={11} className="text-ink-muted flex-shrink-0" /> {buyer.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={11} className="text-ink-muted flex-shrink-0" /> {buyer.phone}
                            </div>
                            {buyer.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin size={11} className="mt-0.5 text-ink-muted flex-shrink-0" /> {buyer.address}
                                </div>
                            )}
                        </div>
                    </InfoCard>

                    {/* Driver + ETA */}
                    <InfoCard
                        icon={delivery.driver ? Truck : Clock}
                        iconBg={delivery.driver ? 'bg-emerald-100' : 'bg-amber-100'}
                        iconColor={delivery.driver ? 'text-emerald-600' : 'text-amber-600'}
                        title="Driver"
                    >
                        {driver ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">
                                        {driver.vehicle_type === 'motorcycle' ? '🏍️'
                                        : driver.vehicle_type === 'van' ? '🚐' : '🚗'}
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{driver.name}</p>
                                        <p className="text-xs text-ink-muted">{driver.plate_number}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-xs text-ink-soft">
                                    <div className="flex items-center gap-2">
                                        <Mail size={11} className="text-ink-muted flex-shrink-0" /> {driver.email}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={11} className="text-ink-muted flex-shrink-0" /> {driver.phone}
                                    </div>
                                </div>
                                {driverLocation && (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                                        <Navigation size={11} className="animate-pulse" /> Live GPS active
                                    </div>
                                )}
                                {formattedEta && (
                                    <div className="mt-2 rounded-lg bg-sienna/5 border border-sienna/20 px-3 py-2">
                                        <p className="text-[10px] text-ink-muted mb-0.5">ETA</p>
                                        <p className="font-display text-xl font-semibold text-sienna">{formattedEta}</p>
                                        <p className="text-[10px] text-amber-600">+{delivery.buffer_time} min buffer</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-ink-muted">No driver assigned</p>
                        )}
                    </InfoCard>

                    {/* Artist */}
                    <InfoCard icon={Palette} iconBg="bg-sienna/10" iconColor="text-sienna" title="Artist">
                        <p className="text-sm font-semibold text-ink">{artist.name}</p>
                        <div className="space-y-1.5 text-xs text-ink-soft">
                            <div className="flex items-center gap-2">
                                <Mail size={11} className="text-ink-muted flex-shrink-0" /> {artist.email}
                            </div>
                            {artist.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={11} className="text-ink-muted flex-shrink-0" /> {artist.phone}
                                </div>
                            )}
                            {artist.city && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={11} className="text-ink-muted flex-shrink-0" /> {artist.city}
                                </div>
                            )}
                        </div>
                        {/* Items */}
                        <div className="mt-1 space-y-1 border-t border-border pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Items</p>
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-ink-soft truncate">{item.title}</span>
                                    <span className="font-semibold text-sienna flex-shrink-0 ml-2">₱{Number(item.price).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </InfoCard>
                </div>

                {/* Package details */}
                {(delivery.dimensions || delivery.weight) && (
                    <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">Package Details</p>
                        <div className="flex flex-wrap gap-5 text-sm text-ink-soft">
                            {delivery.dimensions && (
                                <span className="flex items-center gap-2">
                                    🎨 <strong className="text-ink">{delivery.dimensions}</strong>
                                </span>
                            )}
                            {delivery.weight && (
                                <span className="flex items-center gap-2">
                                    ⚖️ <strong className="text-ink">{delivery.weight} kg</strong>
                                </span>
                            )}
                            <span className="flex items-center gap-2">
                                <Clock size={13} className="text-ink-muted" />
                                <strong className="text-ink">{delivery.buffer_time} min</strong> handling buffer
                            </span>
                            <span className="flex items-center gap-2 capitalize">
                                {delivery.type === 'private' ? '🔒 Private' : '🌐 Freelance'} delivery
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
