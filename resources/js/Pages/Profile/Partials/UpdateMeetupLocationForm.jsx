import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { MapPin, Ruler, Tag, Navigation, Route, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ── OSRM helpers ──────────────────────────────────────────────── */
async function fetchRoute(fromLng, fromLat, toLng, toLat) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromLng},${fromLat};${toLng},${toLat}` +
        `?overview=full&geometries=geojson&steps=false`;

    const res  = await fetch(url);
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No route found');

    const route    = json.routes[0];
    const distKm   = (route.distance / 1000).toFixed(1);
    const mins     = Math.round(route.duration / 60);
    const geojson  = route.geometry;          // GeoJSON LineString
    return { geojson, distKm, mins };
}

const ROUTE_SOURCE = 'meetup-route-source';
const ROUTE_LAYER  = 'meetup-route-layer';
const USER_LAYER   = 'meetup-user-layer';
const USER_SOURCE  = 'meetup-user-source';

export default function UpdateMeetupLocationForm({ meetupLocation, className = '' }) {
    const mapContainerRef = useRef(null);
    const mapRef          = useRef(null);
    const markerRef       = useRef(null);
    const userMarkerRef   = useRef(null);   // blue dot for current position

    const [locating,  setLocating]  = useState(false);
    const [routing,   setRouting]   = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);   // { distKm, mins }
    const [routeErr,  setRouteErr]  = useState(null);
    const [userPos,   setUserPos]   = useState(null);   // { lat, lng }

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        lat:       meetupLocation?.lat   ?? '',
        lng:       meetupLocation?.lng   ?? '',
        label:     meetupLocation?.label ?? '',
        radius_km: meetupLocation?.radius ?? 10,
    });

    const fieldClass =
        'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

    /* ── Clear route layers from map ──────────────────────────── */
    const clearRoute = (map) => {
        if (!map) return;
        if (map.getLayer(ROUTE_LAYER))  map.removeLayer(ROUTE_LAYER);
        if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
        setRouteInfo(null);
        setRouteErr(null);
    };

    /* ── Draw route on map ────────────────────────────────────── */
    const drawRoute = (map, geojson, maplibregl, fromLng, fromLat, toLng, toLat) => {
        clearRoute(map);

        map.addSource(ROUTE_SOURCE, {
            type: 'geojson',
            data: { type: 'Feature', geometry: geojson },
        });

        map.addLayer({
            id:   ROUTE_LAYER,
            type: 'line',
            source: ROUTE_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.85,
            },
        });

        // Fit map to the full route + some padding
        const bounds = new maplibregl.LngLatBounds(
            [fromLng, fromLat], [fromLng, fromLat]
        );
        geojson.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        bounds.extend([toLng, toLat]);
        map.fitBounds(bounds, { padding: 60, duration: 900 });
    };

    /* ── Add / update blue user-dot ───────────────────────────── */
    const ensureUserDot = (map, maplibregl, lng, lat) => {
        if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([lng, lat]);
            return;
        }
        const el = document.createElement('div');
        el.style.cssText = `
            width:18px; height:18px; border-radius:50%;
            background:#3b82f6; border:3px solid #fff;
            box-shadow:0 0 0 4px rgba(59,130,246,0.25);
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
    };

    /* ── Load MapLibre GL once ─────────────────────────────────── */
    useEffect(() => {
        let map;
        let mlgl;

        const initMap = async () => {
            mlgl = (await import('maplibre-gl')).default;
            await import('maplibre-gl/dist/maplibre-gl.css');

            const defaultLat = meetupLocation?.lat ?? 14.5995;
            const defaultLng = meetupLocation?.lng ?? 120.9842;

            map = new mlgl.Map({
                container: mapContainerRef.current,
                style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
                center: [defaultLng, defaultLat],
                zoom: meetupLocation?.lat ? 14 : 11,
                attributionControl: false,
            });

            map.addControl(new mlgl.NavigationControl({ showCompass: false }), 'top-right');

            /* ── Destination marker (sienna teardrop) ─────────── */
            const el = document.createElement('div');
            el.style.cssText = `
                width:32px; height:32px; border-radius:50% 50% 50% 0;
                background:#c0674a; border:3px solid #fff;
                box-shadow:0 2px 8px rgba(0,0,0,0.35);
                transform:rotate(-45deg); cursor:grab;
            `;

            const marker = new mlgl.Marker({ element: el, draggable: true })
                .setLngLat([defaultLng, defaultLat])
                .addTo(map);

            markerRef.current = marker;

            const onMove = () => {
                const { lat, lng } = marker.getLngLat();
                setData(prev => ({
                    ...prev,
                    lat: parseFloat(lat.toFixed(6)),
                    lng: parseFloat(lng.toFixed(6)),
                }));
                // Clear stale route when pin moves
                clearRoute(map);
            };

            marker.on('dragend', onMove);

            map.on('click', (e) => {
                const { lat, lng } = e.lngLat;
                marker.setLngLat([lng, lat]);
                setData(prev => ({
                    ...prev,
                    lat: parseFloat(lat.toFixed(6)),
                    lng: parseFloat(lng.toFixed(6)),
                }));
                clearRoute(map);
            });

            mapRef.current = map;
            // Store maplibregl ref for later use in handlers
            mapRef._mlgl = mlgl;
        };

        initMap();
        return () => {
            map?.remove();
            mapRef.current = null;
            userMarkerRef.current = null;
        };
    }, []);

    /* ── "Use my location" — moves pin to GPS ────────────────── */
    const locateMe = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const lat = parseFloat(coords.latitude.toFixed(6));
                const lng = parseFloat(coords.longitude.toFixed(6));
                setData(prev => ({ ...prev, lat, lng }));
                markerRef.current?.setLngLat([lng, lat]);
                mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
                clearRoute(mapRef.current);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    /* ── "Show route" — GPS → pinned destination ─────────────── */
    const showRoute = async () => {
        const map  = mapRef.current;
        const mlgl = mapRef._mlgl;
        if (!map || !data.lat || !data.lng) return;

        // If we already have user pos, use it directly
        const go = async (fromLat, fromLng) => {
            setRouting(true);
            setRouteErr(null);
            try {
                const { geojson, distKm, mins } = await fetchRoute(
                    fromLng, fromLat,
                    data.lng, data.lat
                );
                ensureUserDot(map, mlgl, fromLng, fromLat);
                drawRoute(map, geojson, mlgl, fromLng, fromLat, data.lng, data.lat);
                setRouteInfo({ distKm, mins });
            } catch {
                setRouteErr('Could not calculate route. Try again.');
            } finally {
                setRouting(false);
            }
        };

        if (userPos) {
            go(userPos.lat, userPos.lng);
            return;
        }

        if (!navigator.geolocation) {
            setRouteErr('Geolocation is not supported by your browser.');
            return;
        }

        setRouting(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const pos = {
                    lat: parseFloat(coords.latitude.toFixed(6)),
                    lng: parseFloat(coords.longitude.toFixed(6)),
                };
                setUserPos(pos);
                go(pos.lat, pos.lng);
            },
            () => {
                setRouting(false);
                setRouteErr('Could not get your location. Please allow location access.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    /* ── Clear route button ───────────────────────────────────── */
    const handleClearRoute = () => {
        clearRoute(mapRef.current);
    };

    /* ── Submit ────────────────────────────────────────────────── */
    const submit = (e) => {
        e.preventDefault();
        post(route('artist.meetup-location.update'), { preserveScroll: true });
    };

    const hasCoords = data.lat !== '' && data.lng !== '';

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
                    <MapPin size={20} className="text-sienna" />
                    Meet-up Location
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                    Set your preferred default meet-up anchor. Buyers will see this when placing orders
                    that require an in-person meet-up. You can still negotiate a different spot per order.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-5">

                {/* Map picker */}
                <div>
                    {/* Toolbar */}
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink-soft">
                            Pin your location — drag the marker or click the map
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Use my location */}
                            <button
                                type="button"
                                onClick={locateMe}
                                disabled={locating || routing}
                                className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-ink-soft shadow-xs transition-colors hover:bg-surface disabled:opacity-60"
                            >
                                <Navigation size={13} />
                                {locating ? 'Locating…' : 'Use my location'}
                            </button>

                            {/* Show route */}
                            {hasCoords && (
                                <button
                                    type="button"
                                    onClick={showRoute}
                                    disabled={routing || locating}
                                    className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-xs transition-colors hover:bg-blue-100 disabled:opacity-60"
                                >
                                    <Route size={13} />
                                    {routing ? 'Routing…' : 'Show route from me'}
                                </button>
                            )}

                            {/* Clear route */}
                            {routeInfo && (
                                <button
                                    type="button"
                                    onClick={handleClearRoute}
                                    className="flex items-center gap-1 rounded-md border border-border bg-canvas px-2 py-1.5 text-xs text-ink-muted shadow-xs transition-colors hover:bg-surface"
                                    title="Clear route"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Map canvas */}
                    <div
                        ref={mapContainerRef}
                        className="h-72 w-full overflow-hidden rounded-lg border border-border shadow-xs"
                        style={{ minHeight: '18rem' }}
                    />

                    {/* Route info banner */}
                    {routeInfo && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            <Route size={15} className="shrink-0" />
                            <span>
                                <strong>{routeInfo.distKm} km</strong> via road ·{' '}
                                <strong>~{routeInfo.mins} min</strong> drive to your anchor
                            </span>
                        </div>
                    )}

                    {/* Route error */}
                    {routeErr && (
                        <p className="mt-1.5 text-xs text-red-600">{routeErr}</p>
                    )}

                    {/* Coord readout */}
                    {hasCoords && !routeInfo && (
                        <p className="mt-1.5 text-xs text-ink-muted">
                            📍 {data.lat}, {data.lng}
                        </p>
                    )}
                    {!hasCoords && (
                        <p className="mt-1.5 text-xs text-amber-600">
                            Click on the map or drag the marker to choose your anchor point.
                        </p>
                    )}

                    <InputError message={errors.lat ?? errors.lng} className="mt-1.5" />
                </div>

                {/* Label */}
                <div>
                    <label
                        htmlFor="meetup_label"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <Tag size={14} className="text-ink-muted" />
                        Location Label
                    </label>
                    <input
                        id="meetup_label"
                        type="text"
                        value={data.label}
                        onChange={(e) => setData('label', e.target.value)}
                        placeholder="e.g. SM Mall of Asia, Starbucks Ayala, My Studio"
                        className={fieldClass}
                    />
                    <InputError message={errors.label} className="mt-1.5" />
                </div>

                {/* Radius */}
                <div>
                    <label
                        htmlFor="meetup_radius"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <Ruler size={14} className="text-ink-muted" />
                        Acceptable Radius —{' '}
                        <span className="text-sienna font-semibold">{data.radius_km} km</span>
                    </label>
                    <input
                        id="meetup_radius"
                        type="range"
                        min={1}
                        max={50}
                        step={1}
                        value={data.radius_km}
                        onChange={(e) => setData('radius_km', Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-sienna"
                    />
                    <div className="mt-1 flex justify-between text-xs text-ink-muted">
                        <span>1 km</span>
                        <span>50 km</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-subtle">
                        Buyers can suggest meet-up spots within this radius from your anchor.
                    </p>
                    <InputError message={errors.radius_km} className="mt-1.5" />
                </div>

                {/* Save */}
                <div className="flex items-center gap-4 pt-1">
                    <button
                        type="submit"
                        disabled={processing || !hasCoords}
                        className="rounded-md bg-sienna px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60"
                    >
                        {processing ? 'Saving…' : 'Save Meet-up Location'}
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-medium text-emerald-600">✓ Meet-up location saved!</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
