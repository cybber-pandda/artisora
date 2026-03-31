import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { router } from '@inertiajs/react';
import { AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Loader2, Shield, Eye, EyeOff, AlertTriangle, CheckCircle, PackageCheck, Camera, Upload, ZoomIn } from 'lucide-react';
import ReviewModal from '@/Components/ReviewModal';
import ImageLightbox, { ExpandableImage } from '@/Components/ImageLightbox';

const KEY   = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

const MY_ROUTE_SOURCE  = 'my-route-src';
const MY_ROUTE_LAYER   = 'my-route-layer';
const OTHER_ROUTE_SOURCE = 'other-route-src';
const OTHER_ROUTE_LAYER  = 'other-route-layer';

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
    const walkingSpeed = 1.4;
    const secs = Math.round(meters / walkingSpeed);
    if (secs < 60) return `<1 min`;
    return `~${Math.round(secs / 60)} min on foot`;
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
    return json.routes[0].geometry; // GeoJSON LineString
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

function removeRouteLine(map, sourceId, layerId) {
    if (!map) return;
    if (map.getLayer(layerId))  map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
}

/**
 * MeetupTrackingMap
 *
 * Props:
 *   order        : { id, meetup_lat, meetup_lng, meetup_label }
 *   role         : 'buyer' | 'artist'
 *   onClose()    : close / dismiss the tracking panel
 */
export default function MeetupTrackingMap({ order, role, onClose }) {
    const containerRef   = useRef(null);
    const mapRef         = useRef(null);
    const meetMarkerRef  = useRef(null);
    const myMarkerRef    = useRef(null);
    const otherMarkerRef = useRef(null);
    const watchRef       = useRef(null);
    const pollRef        = useRef(null);
    const myRouteTimer   = useRef(null);   // debounce my route refreshes
    const otherRouteTimer= useRef(null);

    const [phase,       setPhase]     = useState('consent');
    const [sessionData, setSession]   = useState(null);
    const [myPos,       setMyPos]     = useState(null);
    const [otherPos,    setOtherPos]  = useState(null);
    const [myDist,      setMyDist]    = useState(null);
    const [otherDist,   setOtherDist] = useState(null);
    const [starting,    setStarting]  = useState(false);
    const [error,       setError]     = useState(null);
    const [locationBlocked, setLocationBlocked] = useState(false);
    // Note: We do NOT use navigator.permissions.query() on mount because it
    // incorrectly returns 'denied' on Android Chrome even when permission is
    // granted at the OS/browser level. locationBlocked is only set when the
    // actual getCurrentPosition() call fails.

    const meetLat = order.meetup_lat;
    const meetLng = order.meetup_lng;

    /* ── Init map ────────────────────────────────────────────── */
    useEffect(() => {
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            center: [meetLng, meetLat],
            zoom: 15,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            // Meet-up pin ⭐
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center';
            el.innerHTML = `
                <div style="width:40px;height:40px;background:#7c3aed;border:3px solid white;
                    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                    box-shadow:0 4px 14px rgba(124,58,237,.5);
                    display:flex;align-items:center;justify-content:center">
                    <span style="transform:rotate(45deg);font-size:18px">⭐</span>
                </div>
                <div style="margin-top:4px;background:#7c3aed;color:white;font-size:10px;
                    font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap">Meet Here</div>
            `;
            meetMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([meetLng, meetLat])
                .addTo(map);
        });

        return () => { map.remove(); stopTracking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Refresh MY route line ───────────────────────────────── */
    const refreshMyRoute = useCallback((pos) => {
        clearTimeout(myRouteTimer.current);
        myRouteTimer.current = setTimeout(async () => {
            const map = mapRef.current;
            if (!map || !map.isStyleLoaded()) return;
            const geojson = await fetchOSRMRoute(pos.lng, pos.lat, meetLng, meetLat);
            upsertRouteLine(map, MY_ROUTE_SOURCE, MY_ROUTE_LAYER, geojson, '#2563eb');
        }, 1500); // debounce 1.5 s so we don't spam OSRM on every GPS tick
    }, [meetLat, meetLng]);

    /* ── Refresh OTHER party's route line ────────────────────── */
    const refreshOtherRoute = useCallback((pos) => {
        clearTimeout(otherRouteTimer.current);
        otherRouteTimer.current = setTimeout(async () => {
            const map = mapRef.current;
            if (!map || !map.isStyleLoaded()) return;
            const geojson = await fetchOSRMRoute(pos.lng, pos.lat, meetLng, meetLat);
            upsertRouteLine(map, OTHER_ROUTE_SOURCE, OTHER_ROUTE_LAYER, geojson, '#f97316');
        }, 1500);
    }, [meetLat, meetLng]);

    /* ── Update MY marker + route when my position changes ──── */
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !myPos) return;

        // Marker
        if (myMarkerRef.current) {
            myMarkerRef.current.setLngLat([myPos.lng, myPos.lat]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = `
                width:18px;height:18px;border-radius:50%;
                background:#2563eb;border:3px solid white;
                box-shadow:0 0 0 4px rgba(37,99,235,.25);
            `;
            myMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([myPos.lng, myPos.lat])
                .setPopup(new maplibregl.Popup({ offset: 12 }).setText('You'))
                .addTo(map);
        }

        setMyDist(haversineMeters(myPos.lat, myPos.lng, meetLat, meetLng));
        refreshMyRoute(myPos);
    }, [myPos, meetLat, meetLng, refreshMyRoute]);

    /* ── Update OTHER marker + route ─────────────────────────── */
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !otherPos) {
            otherMarkerRef.current?.remove();
            otherMarkerRef.current = null;
            setOtherDist(null);
            removeRouteLine(mapRef.current, OTHER_ROUTE_SOURCE, OTHER_ROUTE_LAYER);
            return;
        }

        const label = role === 'buyer' ? '🎨' : '🛍️';
        if (otherMarkerRef.current) {
            otherMarkerRef.current.setLngLat([otherPos.lng, otherPos.lat]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = `
                width:20px;height:20px;border-radius:50%;
                background:#f97316;border:3px solid white;
                box-shadow:0 0 0 4px rgba(249,115,22,.25);
                display:flex;align-items:center;justify-content:center;
                font-size:10px;
            `;
            el.textContent = label;
            otherMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([otherPos.lng, otherPos.lat])
                .setPopup(new maplibregl.Popup({ offset: 12 }).setText(role === 'buyer' ? 'Artist' : 'Buyer'))
                .addTo(map);
        }

        setOtherDist(haversineMeters(otherPos.lat, otherPos.lng, meetLat, meetLng));
        refreshOtherRoute(otherPos);
    }, [otherPos, meetLat, meetLng, role, refreshOtherRoute]);

    /* ── GPS watch ───────────────────────────────────────────── */
    const startGPS = useCallback(() => {
        if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return Promise.reject('no_geolocation'); }
        return new Promise((resolve, reject) => {
            // First call getCurrentPosition to trigger the browser permission prompt immediately
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setMyPos({ lat, lng });
                    setLocationBlocked(false);
                    // Now start continuous watching
                    watchRef.current = navigator.geolocation.watchPosition(
                        (pos) => {
                            const { latitude: lat, longitude: lng } = pos.coords;
                            setMyPos({ lat, lng });
                            fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/location`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.content,
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                body: JSON.stringify({ lat, lng }),
                            })
                            .then(r => r.json())
                            .then(d => { if (d.session?.status === 'ended') handleSessionEnded(); })
                            .catch(() => {});
                        },
                        () => {},
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                    resolve();
                },
                (err) => {
                    setLocationBlocked(true);
                    setError('Location access denied. Please allow location access in your browser settings and try again.');
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, [order.id, role]);

    /* ── Poll other party's location ─────────────────────────── */
    const startPolling = useCallback(() => {
        pollRef.current = setInterval(() => {
            fetch(`/${role === 'buyer' ? 'buyer' : 'artist'}/orders/${order.id}/meetup-session/poll`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(d => {
                const s = d.session;
                if (!s || s.status === 'ended') { handleSessionEnded(); return; }
                setSession(s);
                if (s.other_lat && s.other_lng) {
                    setOtherPos({ lat: s.other_lat, lng: s.other_lng });
                } else {
                    setOtherPos(null);
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
            await startGPS();

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
                setError('Failed to start tracking session. Please try again.');
            }
        } finally {
            setStarting(false);
        }
    };

    const declineTracking = () => setPhase('ended');

    const stopTracking = async () => {
        clearInterval(pollRef.current);
        clearTimeout(myRouteTimer.current);
        clearTimeout(otherRouteTimer.current);
        if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
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
        // Go to the confirmation step so the user can mark the order as completed
        setPhase('arrived');
    };

    const handleSessionEnded = () => {
        clearInterval(pollRef.current);
        clearTimeout(myRouteTimer.current);
        clearTimeout(otherRouteTimer.current);
        if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
        // Both parties arrived — prompt for order completion
        setPhase('arrived');
    };

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

    /* ── Render ──────────────────────────────────────────────── */
    return (
        <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                        <Navigation size={14} className="text-violet-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-ink">Meet-up Navigation</p>
                        <p className="text-xs text-ink-muted line-clamp-1">{order.meetup_label ?? 'Agreed meet-up spot'}</p>
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
                        Your route
                    </span>
                    {sessionData?.other_consented && (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-6 rounded-full bg-orange-500" />
                            {role === 'buyer' ? 'Artist' : 'Buyer'}'s route
                        </span>
                    )}
                </div>
            )}

            {/* Phase: Consent */}
            {phase === 'consent' && (
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                        <Shield size={18} className="mt-0.5 flex-shrink-0 text-violet-600" />
                        <div className="text-xs text-violet-800 space-y-1">
                            <p className="font-semibold text-sm">Location Sharing Consent</p>
                            <p>Your live location will be shared with the <strong>{role === 'buyer' ? 'artist' : 'buyer'}</strong> <em>only</em> during this meet-up session. It will not be stored after the session ends.</p>
                            <p>Both parties must consent for mutual visibility. If only one party consents, their location is <strong>not shown</strong> to the other.</p>
                        </div>
                    </div>
                    {error && (
                        <div className="flex items-start gap-2 text-xs text-red-600">
                            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {locationBlocked && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Location access was denied</p>
                                <p>Go to your browser site settings, allow location for this site, then try again.</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={declineTracking}
                            className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors">
                            Decline
                        </button>
                        <button type="button" onClick={startTracking} disabled={starting}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60">
                            {starting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                            {starting ? 'Starting…' : 'Share My Location'}
                        </button>
                    </div>
                </div>
            )}

            {/* Phase: Active tracking */}
            {phase === 'active' && (
                <div className="p-4 space-y-3">
                    {/* Distance cards */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium mb-0.5">You → Meet-up</p>
                            <p className="text-lg font-bold text-blue-700">{myDist !== null ? formatDistance(myDist) : '—'}</p>
                            <p className="text-xs text-blue-500">{myDist !== null ? formatETA(myDist) : ''}</p>
                        </div>
                        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                            <p className="text-xs text-orange-600 font-medium mb-0.5">
                                {role === 'buyer' ? 'Artist' : 'Buyer'} → Meet-up
                            </p>
                            {sessionData?.other_consented ? (
                                <>
                                    <p className="text-lg font-bold text-orange-700">{otherDist !== null ? formatDistance(otherDist) : '—'}</p>
                                    <p className="text-xs text-orange-500">{otherDist !== null ? formatETA(otherDist) : 'Locating…'}</p>
                                </>
                            ) : (
                                <div className="flex items-center justify-center gap-1 text-xs text-orange-500 mt-1">
                                    <EyeOff size={12} />
                                    <span>Not sharing</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Eye size={11} />
                        {sessionData?.other_consented
                            ? `${role === 'buyer' ? 'Artist' : 'Buyer'}'s location is visible on the map`
                            : `${role === 'buyer' ? 'Artist' : 'Buyer'} has not opted in to share their location`}
                    </p>

                    <button type="button" onClick={stopTracking}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
                        <X size={14} />
                        Stop Sharing My Location
                    </button>
                </div>
            )}

            {/* Phase: Arrived — role-specific hand-off */}
            {phase === 'arrived' && (
                <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                            <PackageCheck size={28} className="text-emerald-600" />
                        </div>
                        <p className="text-sm font-semibold text-ink">
                            {role === 'artist'
                                ? 'Upload a proof photo of the hand-off'
                                : 'Artist has shared a proof photo'}
                        </p>
                        <p className="text-xs text-ink-muted">
                            {role === 'artist'
                                ? 'Take a photo showing the artwork was handed to the buyer. This is visible to the buyer and admin.'
                                : 'Review the proof and confirm you received the artwork.'}
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
                                    {/* Expandable preview */}
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

                                    {/* Retake / Send */}
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

                                    {/* Lightbox */}
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

                    {/* ── Buyer: view proof (expandable) + open review ── */}
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
                    <p className="text-xs text-ink-muted">Your location data has been cleared and is no longer shared.</p>
                    <button type="button" onClick={onClose} className="mt-2 text-xs text-sienna underline hover:opacity-80">Close</button>
                </div>
            )}

            {/* Review Modal (buyer only) */}
            <AnimatePresence>
                {showReview && (
                    <ReviewModal
                        order={order}
                        isMeetup={true}
                        onClose={() => { setShowReview(false); setPhase('ended'); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
