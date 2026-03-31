import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { router } from '@inertiajs/react';
import { AnimatePresence } from 'framer-motion';
import {
    X, MapPin, Navigation, Loader2, Shield, AlertTriangle,
    CheckCircle, PackageCheck, Camera, Upload, ZoomIn, Store,
} from 'lucide-react';
import ReviewModal from '@/Components/ReviewModal';
import ImageLightbox, { ExpandableImage } from '@/Components/ImageLightbox';

const KEY   = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

const ROUTE_SOURCE = 'pickup-route-src';
const ROUTE_LAYER  = 'pickup-route-layer';

function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6_371_000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}

function formatETA(meters) {
    // ~30 km/h average city driving
    const secs = Math.round(meters / 8.33);
    if (secs < 60) return `<1 min`;
    return `~${Math.round(secs / 60)} min drive`;
}

/* ── OSRM road route fetcher ──────────────────────────────────── */
async function fetchOSRMRoute(fromLng, fromLat, toLng, toLat) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromLng},${fromLat};${toLng},${toLat}` +
        `?overview=full&geometries=geojson&steps=false`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) return null;
    return json.routes[0].geometry;
}

/* ── Draw / update a route line on the map ────────────────────── */
function upsertRouteLine(map, sourceId, layerId, geojson, color) {
    if (!map || !geojson) return;
    const data = { type: 'Feature', geometry: geojson };
    if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(data);
    } else {
        map.addSource(sourceId, { type: 'geojson', data });
        map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.8 },
        });
    }
}

/**
 * PickupTrackingMap
 *
 * For "pickup" orders — the artist's location is fixed, only the buyer moves.
 *
 * Props:
 *   order   : { id, pickup_lat, pickup_lng, pickup_label, meetup_proof_url }
 *   role    : 'buyer' | 'artist'
 *   onClose : dismiss the tracking panel
 */
export default function PickupTrackingMap({ order, role, onClose }) {
    const containerRef  = useRef(null);
    const mapRef        = useRef(null);
    const shopMarkerRef = useRef(null);
    const buyerMarkerRef = useRef(null);
    const watchRef      = useRef(null);
    const pollRef       = useRef(null);
    const routeTimer    = useRef(null);

    const [phase,    setPhase]    = useState('consent');
    const [buyerPos, setBuyerPos] = useState(null);
    const [distance, setDistance] = useState(null);
    const [starting, setStarting] = useState(false);
    const [error,    setError]    = useState(null);
    const [locationBlocked, setLocationBlocked] = useState(false);

    /* ── Check geolocation permission on mount ───────────────── */
    useEffect(() => {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
                if (result.state === 'denied') setLocationBlocked(true);
                result.onchange = () => {
                    setLocationBlocked(result.state === 'denied');
                    if (result.state === 'denied') setError('Location access is blocked. Please enable it in your browser settings.');
                };
            }).catch(() => {});
        }
    }, []);

    const shopLat = order.pickup_lat;
    const shopLng = order.pickup_lng;

    /* ── Init map ────────────────────────────────────────────── */
    useEffect(() => {
        if (!shopLat || !shopLng) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            center: [shopLng, shopLat],
            zoom: 15,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            // Artist's fixed pin 🏠
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center';
            el.innerHTML = `
                <div style="width:40px;height:40px;background:#0d9488;border:3px solid white;
                    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                    box-shadow:0 4px 14px rgba(13,148,136,.5);
                    display:flex;align-items:center;justify-content:center">
                    <span style="transform:rotate(45deg);font-size:18px">🏠</span>
                </div>
                <div style="margin-top:4px;background:#0d9488;color:white;font-size:10px;
                    font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap">Pick-up Here</div>
            `;
            shopMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([shopLng, shopLat])
                .addTo(map);
        });

        return () => { map.remove(); cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Refresh route line (buyer → artist shop) ────────────── */
    const refreshRoute = useCallback((pos) => {
        clearTimeout(routeTimer.current);
        routeTimer.current = setTimeout(async () => {
            const map = mapRef.current;
            if (!map || !map.isStyleLoaded()) return;
            const geojson = await fetchOSRMRoute(pos.lng, pos.lat, shopLng, shopLat);
            upsertRouteLine(map, ROUTE_SOURCE, ROUTE_LAYER, geojson, '#2563eb');
        }, 1500);
    }, [shopLat, shopLng]);

    /* ── Update buyer marker + route when position changes ──── */
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !buyerPos) return;

        if (buyerMarkerRef.current) {
            buyerMarkerRef.current.setLngLat([buyerPos.lng, buyerPos.lat]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = `
                width:18px;height:18px;border-radius:50%;
                background:#2563eb;border:3px solid white;
                box-shadow:0 0 0 4px rgba(37,99,235,.25);
            `;
            buyerMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([buyerPos.lng, buyerPos.lat])
                .setPopup(new maplibregl.Popup({ offset: 12 }).setText(role === 'buyer' ? 'You' : 'Buyer'))
                .addTo(map);

            // Fit bounds to show both markers
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend([shopLng, shopLat]);
            bounds.extend([buyerPos.lng, buyerPos.lat]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        }

        setDistance(haversineMeters(buyerPos.lat, buyerPos.lng, shopLat, shopLng));
        refreshRoute(buyerPos);
    }, [buyerPos, shopLat, shopLng, role, refreshRoute]);

    /* ── Cleanup ─────────────────────────────────────────────── */
    const cleanup = () => {
        clearInterval(pollRef.current);
        clearTimeout(routeTimer.current);
        if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };

    /* ── GPS watch (only buyer tracks GPS) ───────────────────── */
    const startGPS = useCallback(() => {
        if (!navigator.geolocation) { setError('Geolocation is not supported.'); return Promise.reject('no_geolocation'); }
        return new Promise((resolve, reject) => {
            // First call getCurrentPosition to trigger the browser permission prompt immediately
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setBuyerPos({ lat, lng });
                    setLocationBlocked(false);
                    // Now start continuous watching
                    watchRef.current = navigator.geolocation.watchPosition(
                        (pos) => {
                            const { latitude: lat, longitude: lng } = pos.coords;
                            setBuyerPos({ lat, lng });
                            // Push location to server so artist can see
                            fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/location`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.content,
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                body: JSON.stringify({ lat, lng }),
                            }).catch(() => {});
                        },
                        () => {},
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                    resolve();
                },
                (err) => {
                    setLocationBlocked(true);
                    setError('Location access denied. Please allow location in your browser settings and try again.');
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, [order.id, role]);

    /* ── Poll buyer's location (artist polls) ────────────────── */
    const startPolling = useCallback(() => {
        pollRef.current = setInterval(() => {
            fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/poll`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(d => {
                const s = d.session;
                if (!s) return;
                // For artist, the "other" is the buyer
                if (role === 'artist' && s.other_lat && s.other_lng) {
                    setBuyerPos({ lat: s.other_lat, lng: s.other_lng });
                }
            })
            .catch(() => {});
        }, 4000);
    }, [order.id, role]);

    /* ── Consent & start ─────────────────────────────────────── */
    const startTracking = async () => {
        setStarting(true);
        setError(null);
        try {
            // Start GPS FIRST so the browser permission prompt appears immediately
            if (role === 'buyer') {
                await startGPS();
            }

            // Then register with the server
            const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.content;
            const commonHeaders = {
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            const startRes = await fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/start`, {
                method: 'POST',
                headers: commonHeaders,
            });
            if (!startRes.ok) throw new Error(`Server error ${startRes.status}`);

            const consentRes = await fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/consent`, {
                method: 'POST',
                headers: commonHeaders,
            });
            if (!consentRes.ok) throw new Error(`Server error ${consentRes.status}`);

            setPhase('active');
            startPolling();
        } catch (err) {
            // If GPS was denied, the error is already set by startGPS
            if (!error) {
                setError('Failed to start tracking. Please try again.');
            }
        } finally {
            setStarting(false);
        }
    };

    const stopTracking = async () => {
        cleanup();
        try {
            await fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/stop`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
        } catch {}
        setPhase('arrived');
    };

    // ── Proof upload state (artist side) ─────────────────────
    const [completing, setCompleting] = useState(false);
    const [proofFile, setProofFile]     = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [proofExpanded, setProofExpanded] = useState(false);
    const [showReview, setShowReview]   = useState(false);
    const proofInputRef = useRef(null);

    const handleProofSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
    };

    const uploadProof = () => {
        if (!proofFile) return;
        setCompleting(true);
        const formData = new FormData();
        formData.append('proof', proofFile);
        router.post(route('artist.orders.meetup-proof', order.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => { setCompleting(false); setPhase('ended'); },
        });
    };

    // ── No pickup location set ───────────────────────────────
    if (!shopLat || !shopLng) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center space-y-2">
                <AlertTriangle size={24} className="mx-auto text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                    The artist hasn't set a pick-up location yet.
                </p>
                <p className="text-xs text-amber-600">
                    Please contact the artist for pickup details.
                </p>
                <button type="button" onClick={onClose} className="text-xs text-sienna underline hover:opacity-80">Close</button>
            </div>
        );
    }

    /* ── Render ──────────────────────────────────────────────── */
    return (
        <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100">
                        <Store size={14} className="text-teal-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-ink">Pick-up Navigation</p>
                        <p className="text-xs text-ink-muted line-clamp-1">{order.pickup_label ?? "Artist's location"}</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Map */}
            <div ref={containerRef} style={{ height: 260, width: '100%' }} />

            {/* Route legend — only shown when active */}
            {phase === 'active' && (
                <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-6 rounded-full bg-blue-600" />
                        {role === 'buyer' ? 'Your route to artist' : "Buyer's route to you"}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 border-2 border-white shadow" />
                        {role === 'buyer' ? 'You' : 'Buyer'}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block text-base">🏠</span>
                        Pick-up
                    </span>
                </div>
            )}

            {/* Phase: Consent */}
            {phase === 'consent' && (
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
                        <Shield size={18} className="mt-0.5 flex-shrink-0 text-teal-600" />
                        <div className="text-xs text-teal-800 space-y-1">
                            <p className="font-semibold text-sm">
                                {role === 'buyer'
                                    ? 'Share your location with the artist'
                                    : "Monitor the buyer's approach"}
                            </p>
                            <p>
                                {role === 'buyer'
                                    ? "Your live location will be shared so the artist can prepare your artwork for hand-off. It's only visible during this session."
                                    : "Start tracking to see the buyer's real-time position as they head to your location. Your studio pin is fixed on the map."}
                            </p>
                        </div>
                    </div>
                    {error && (
                        <div className="flex items-start gap-2 text-xs text-red-600">
                            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {locationBlocked && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Location access is blocked</p>
                                <p>Please enable location access in your browser settings, then reload this page.</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPhase('ended')}
                            className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors">
                            Skip
                        </button>
                        <button type="button" onClick={startTracking} disabled={starting || locationBlocked}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60">
                            {starting ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                            {starting ? 'Starting…' : role === 'buyer' ? 'Share My Location' : 'Start Monitoring'}
                        </button>
                    </div>
                </div>
            )}

            {/* Phase: Active tracking */}
            {phase === 'active' && (
                <div className="p-4 space-y-3">
                    {/* Distance card */}
                    <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 text-center">
                        <p className="text-xs text-teal-600 font-medium mb-1">
                            {role === 'buyer' ? 'You → Pick-up Location' : 'Buyer → Your Location'}
                        </p>
                        <p className="text-2xl font-bold text-teal-700">
                            {distance !== null ? formatDistance(distance) : '—'}
                        </p>
                        <p className="text-xs text-teal-500 mt-0.5">
                            {distance !== null ? formatETA(distance) : 'Locating…'}
                        </p>
                    </div>

                    {role === 'buyer' && (
                        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <MapPin size={11} />
                            Head to the artist's location shown on the map
                        </p>
                    )}
                    {role === 'artist' && !buyerPos && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600">
                            <Loader2 size={11} className="animate-spin" />
                            Waiting for buyer to share their location…
                        </p>
                    )}
                    {role === 'artist' && buyerPos && (
                        <p className="flex items-center gap-1.5 text-xs text-teal-600">
                            <Navigation size={11} />
                            Buyer is on their way!
                        </p>
                    )}

                    <button type="button" onClick={stopTracking}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
                        <X size={14} />
                        {role === 'buyer' ? "I've Arrived" : 'Buyer Has Arrived'}
                    </button>
                </div>
            )}

            {/* Phase: Arrived — hand-off */}
            {phase === 'arrived' && (
                <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                            <PackageCheck size={28} className="text-emerald-600" />
                        </div>
                        <p className="text-sm font-semibold text-ink">
                            {role === 'artist'
                                ? 'Upload proof of hand-off'
                                : 'Waiting for artist to confirm hand-off'}
                        </p>
                        <p className="text-xs text-ink-muted">
                            {role === 'artist'
                                ? 'Take a photo showing the artwork was handed to the buyer.'
                                : 'The artist will upload a proof photo. You can then confirm receipt.'}
                        </p>
                    </div>

                    {/* ── Artist: proof upload with preview ───── */}
                    {role === 'artist' && (
                        <>
                            <input
                                ref={proofInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleProofSelect}
                                className="hidden"
                            />
                            {proofPreview ? (
                                <>
                                    <div className="relative group">
                                        <img
                                            src={proofPreview}
                                            alt="Proof preview"
                                            className="h-40 w-full rounded-xl object-cover border border-border cursor-pointer"
                                            onClick={() => setProofExpanded(true)}
                                        />
                                        <div
                                            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer"
                                            onClick={() => setProofExpanded(true)}
                                        >
                                            <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setProofFile(null); setProofPreview(null); }}
                                            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-ink-muted text-center">Tap image to expand. Ready to send?</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setProofFile(null); setProofPreview(null); }}
                                            className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors"
                                        >
                                            Retake
                                        </button>
                                        <button
                                            type="button"
                                            onClick={uploadProof}
                                            disabled={completing}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                                        >
                                            {completing
                                                ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                                                : <><Upload size={14} /> Send Proof</>}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {proofExpanded && <ImageLightbox src={proofPreview} alt="Proof preview" onClose={() => setProofExpanded(false)} />}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => proofInputRef.current?.click()}
                                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm text-ink-muted hover:border-sienna/40 hover:text-sienna transition-colors"
                                >
                                    <Camera size={24} />
                                    <span>Take Photo or Choose File</span>
                                </button>
                            )}
                        </>
                    )}

                    {/* ── Buyer: view proof + confirm ───────── */}
                    {role === 'buyer' && (
                        <>
                            {order.meetup_proof_url && (
                                <ExpandableImage
                                    src={order.meetup_proof_url}
                                    alt="Hand-off proof"
                                    className="h-40 border border-border rounded-xl overflow-hidden"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => setShowReview(true)}
                                disabled={!order.meetup_proof_url}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                <CheckCircle size={15} /> Order Received — Leave a Review
                            </button>
                            {!order.meetup_proof_url && (
                                <p className="text-xs text-amber-600 text-center">
                                    Waiting for the artist to upload proof of hand-off…
                                </p>
                            )}
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => setPhase('ended')}
                        className="w-full rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors"
                    >
                        Not yet — skip for now
                    </button>
                </div>
            )}

            {/* Phase: Ended */}
            {phase === 'ended' && (
                <div className="p-4 text-center space-y-2">
                    <div className="text-2xl">✅</div>
                    <p className="text-sm font-semibold text-ink">Tracking stopped</p>
                    <p className="text-xs text-ink-muted">Your location data has been cleared.</p>
                    <button type="button" onClick={onClose} className="mt-2 text-xs text-sienna underline hover:opacity-80">Close</button>
                </div>
            )}

            {/* Review Modal (buyer only) */}
            <AnimatePresence>
                {showReview && (
                    <ReviewModal
                        order={order}
                        isMeetup={false}
                        onClose={() => { setShowReview(false); setPhase('ended'); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
