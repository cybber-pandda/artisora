import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KEY       = import.meta.env.VITE_MAPTILER_API_KEY;
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

// ── Routing providers (OSRM is free + follows real roads) ─────────
// Primary: OSRM public API (free, no key needed, real road routing)
const OSRM_ROUTE_URL = (from, to) =>
    `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true&alternatives=true`;

// Fallback: MapTiler (needs paid plan for directions)
const MAPTILER_ROUTE_URL = (from, to) =>
    `https://api.maptiler.com/directions/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?key=${KEY}&geometries=geojson&overview=full`;

// Philippines default center
const PH_CENTER = [121.0, 14.6];

// Throttle: at most one route fetch per 15 seconds
const REROUTE_THROTTLE_MS = 15_000;

/**
 * fetchRoute — fetch a driving route that follows real roads.
 * Tries OSRM first (free, excellent road routing), falls back to MapTiler.
 *
 * Returns: { geometry, durationSec, distanceMeters } or null
 */
async function fetchDrivingRoute(from, to) {
    // ── Try OSRM first (free, follows roads perfectly) ────────────
    try {
        const url = OSRM_ROUTE_URL([from.lng, from.lat], [to.lng, to.lat]);
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
                const route = data.routes[0];
                return {
                    geometry:       route.geometry,
                    durationSec:    route.duration || 0,
                    distanceMeters: route.distance || 0,
                    turnByTurn:     route.legs?.[0]?.steps || [],
                };
            }
        }
    } catch (e) {
        console.warn('[DeliveryMap] OSRM failed, trying MapTiler...', e);
    }

    // ── Fallback: MapTiler Directions ──────────────────────────────
    try {
        const url = MAPTILER_ROUTE_URL([from.lng, from.lat], [to.lng, to.lat]);
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes?.[0]?.geometry) {
                const route = data.routes[0];
                return {
                    geometry:       route.geometry,
                    durationSec:    route.duration || 0,
                    distanceMeters: route.distance || 0,
                    turnByTurn:     route.legs?.[0]?.steps || [],
                };
            }
        }
    } catch (e) {
        console.warn('[DeliveryMap] MapTiler Directions also failed', e);
    }

    return null;
}

/**
 * DeliveryMap — reusable MapLibre GL map with LIVE road-following rerouting.
 *
 * Uses OSRM (free) for real road routing — just like Waze / Google Maps.
 *
 * Props:
 *  pickup:         { lat, lng }  — pickup point (green pin)
 *  dropoff:        { lat, lng }  — dropoff / buyer point (red pin)
 *  driverLocation: { lat, lng }  — live driver position (blue pulse)
 *  status:         string        — delivery status ('picked_up','in_transit','delivered')
 *  pickupLabel:    string
 *  dropoffLabel:   string
 *  className:      string
 *  onRouteInfo:    (info) => void — callback with { durationMin, distanceKm }
 */
export default function DeliveryMap({
    pickup,
    dropoff,
    driverLocation,
    status = '',
    pickupLabel  = '🎨 Pickup',
    dropoffLabel = '📦 Buyer',
    className = '',
    onRouteInfo,
}) {
    const containerRef        = useRef(null);
    const mapRef              = useRef(null);
    const driverMarker        = useRef(null);
    const routePopup          = useRef(null);
    const lastRerouteTime     = useRef(0);
    const initialRouteDrawn   = useRef(false);
    const [mapReady, setMapReady] = useState(false);

    // ── Bootstrap map ─────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

        let center = PH_CENTER;
        let zoom   = 6;

        if (pickup?.lat && pickup?.lng) {
            center = [pickup.lng, pickup.lat];
            zoom   = 12;
        } else if (dropoff?.lat && dropoff?.lng) {
            center = [dropoff.lng, dropoff.lat];
            zoom   = 12;
        }

        const map = new maplibregl.Map({
            container: containerRef.current,
            style:     MAP_STYLE,
            center,
            zoom,
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
            setMapReady(true);

            // ── Pickup marker (green) ──────────────────────────
            if (pickup?.lat && pickup?.lng) {
                const el = markerEl('#22c55e', '🎨');
                new maplibregl.Marker({ element: el })
                    .setLngLat([pickup.lng, pickup.lat])
                    .setPopup(popupHtml(`<strong>${pickupLabel}</strong><br/><small>Pickup Location</small>`))
                    .addTo(map);
            }

            // ── Dropoff / Buyer marker (red) ───────────────────
            if (dropoff?.lat && dropoff?.lng) {
                const el = markerEl('#ef4444', '📍');
                new maplibregl.Marker({ element: el })
                    .setLngLat([dropoff.lng, dropoff.lat])
                    .setPopup(popupHtml(`<strong>${dropoffLabel}</strong><br/><small>Delivery Destination</small>`))
                    .addTo(map);
            }

            // ── Initial route: pickup → dropoff (road-following static overview) ──
            if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
                drawStaticRoute(map, pickup, dropoff);
            }

            // ── Initial driver marker ──────────────────────────
            if (driverLocation?.lat && driverLocation?.lng) {
                driverMarker.current = createDriverMarker(map, driverLocation);
            }

            // ── Fit bounds to show all points ──────────────────
            fitAllPoints(map, pickup, dropoff, driverLocation);
        });

        return () => {
            map.remove();
            mapRef.current = null;
            setMapReady(false);
            initialRouteDrawn.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Draw the initial static route (pickup→dropoff) once map is ready ──
    async function drawStaticRoute(map, from, to) {
        const routeData = await fetchDrivingRoute(from, to);
        if (!routeData) {
            // absolute last resort: straight line
            addStraightLine(map, from, to, 'overview-route');
            return;
        }

        // Draw the full route overview (gray, dashed — "planned route")
        addRouteToMap(map, 'overview-route', routeData.geometry, {
            color: '#94a3b8',
            width: 3,
            opacity: 0.5,
            dash: [6, 4],
        });

        initialRouteDrawn.current = true;
    }

    // ── Live reroute: driver → dropoff ────────────────────────────
    const doReroute = useCallback(async (driverLoc) => {
        const map = mapRef.current;
        if (!map || !dropoff?.lat || !dropoff?.lng) return;
        if (!driverLoc?.lat || !driverLoc?.lng) return;

        // Only reroute during active delivery
        const activeStatuses = ['picked_up', 'in_transit'];
        if (!activeStatuses.includes(status)) return;

        // Throttle
        const now = Date.now();
        if (now - lastRerouteTime.current < REROUTE_THROTTLE_MS) return;
        lastRerouteTime.current = now;

        // Fetch real road route from driver's current position → dropoff
        const routeData = await fetchDrivingRoute(driverLoc, dropoff);

        // ── Clean up old active route layers ──────────────────
        ['active-route-glow', 'active-route-shadow', 'active-route', 'active-route-dash'].forEach(id => removeLayerSafe(map, id));
        removeSourceSafe(map, 'active-route');

        // Clean up old completed segment
        removeLayerSafe(map, 'completed-segment');
        removeSourceSafe(map, 'completed-segment');

        if (!routeData) {
            // If all routing APIs fail, draw straight line as last resort
            addStraightLine(map, driverLoc, dropoff, 'active-route');
            return;
        }

        // ── Draw ACTIVE route (driver → dropoff) ─────────────
        map.addSource('active-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: routeData.geometry },
        });

        // Glow (outermost — gives the route a "selected" feel like Google Maps)
        map.addLayer({
            id:     'active-route-glow',
            type:   'line',
            source: 'active-route',
            paint: {
                'line-color':   '#3b82f6',
                'line-width':   14,
                'line-opacity': 0.06,
                'line-blur':    6,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        // Shadow (wider, darker)
        map.addLayer({
            id:     'active-route-shadow',
            type:   'line',
            source: 'active-route',
            paint: {
                'line-color':   '#1e40af',
                'line-width':   8,
                'line-opacity': 0.18,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        // Main route line (vivid blue — like Google Maps / Waze)
        map.addLayer({
            id:     'active-route',
            type:   'line',
            source: 'active-route',
            paint: {
                'line-color':   '#4285F4',
                'line-width':   5,
                'line-opacity': 0.95,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        // White dash overlay (marching ants for direction indication)
        map.addLayer({
            id:     'active-route-dash',
            type:   'line',
            source: 'active-route',
            paint: {
                'line-color':     '#ffffff',
                'line-width':     2,
                'line-opacity':   0.45,
                'line-dasharray': [0, 2, 2],
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        // ── Draw COMPLETED segment (pickup → driver) ─────────
        if (pickup?.lat && pickup?.lng) {
            const completedRoute = await fetchDrivingRoute(pickup, driverLoc);
            if (completedRoute) {
                map.addSource('completed-segment', {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: completedRoute.geometry },
                });
                map.addLayer({
                    id:     'completed-segment',
                    type:   'line',
                    source: 'completed-segment',
                    paint: {
                        'line-color':   '#86efac',
                        'line-width':   4,
                        'line-opacity': 0.5,
                    },
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                });
            }
        }

        // ── Hide the initial overview route once live route is active ──
        removeLayerSafe(map, 'overview-route');
        removeSourceSafe(map, 'overview-route');

        // ── Update ETA info ──────────────────────────────────
        const durationMin = Math.round(routeData.durationSec / 60);
        const distanceKm  = (routeData.distanceMeters / 1000).toFixed(1);

        // Callback for parent components (TrackOrder / ActiveDelivery)
        if (onRouteInfo) {
            onRouteInfo({ durationMin, distanceKm });
        }

        // Midpoint label on the route
        if (routePopup.current) routePopup.current.remove();

        if (durationMin > 0) {
            const coords = routeData.geometry.coordinates;
            const mid = coords[Math.floor(coords.length / 2)];

            routePopup.current = new maplibregl.Popup({
                closeButton:  false,
                closeOnClick: false,
                className:    'route-eta-popup',
                anchor:       'bottom',
            })
            .setLngLat(mid)
            .setHTML(`
                <div class="eta-badge">
                    <span class="eta-icon">🚗</span>
                    <span class="eta-text">${durationMin} min</span>
                    <span class="eta-dist">${distanceKm} km</span>
                </div>
            `)
            .addTo(map);
        }

    }, [dropoff, pickup, status, onRouteInfo]);

    // ── Move driver marker + trigger reroute ──────────────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (!driverLocation?.lat || !driverLocation?.lng) return;

        // Update marker position (smooth)
        if (driverMarker.current) {
            driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
        } else {
            driverMarker.current = createDriverMarker(mapRef.current, driverLocation);
        }

        // Pan to keep driver visible
        mapRef.current.easeTo({
            center: [driverLocation.lng, driverLocation.lat],
            duration: 900,
        });

        // Trigger live reroute (will follow real roads)
        doReroute(driverLocation);
    }, [driverLocation?.lat, driverLocation?.lng, mapReady, doReroute]);

    // ── When status becomes "delivered", show final completed route ──
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (status !== 'delivered') return;

        const map = mapRef.current;

        // Remove active route artifacts
        ['active-route-glow', 'active-route-shadow', 'active-route', 'active-route-dash'].forEach(id => removeLayerSafe(map, id));
        removeSourceSafe(map, 'active-route');
        removeLayerSafe(map, 'completed-segment');
        removeSourceSafe(map, 'completed-segment');
        removeLayerSafe(map, 'overview-route');
        removeSourceSafe(map, 'overview-route');

        if (routePopup.current) {
            routePopup.current.remove();
            routePopup.current = null;
        }

        // Draw the full completed route (green solid line)
        if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
            (async () => {
                const routeData = await fetchDrivingRoute(pickup, dropoff);
                if (routeData) {
                    addRouteToMap(map, 'final-route', routeData.geometry, {
                        color: '#22c55e',
                        width: 5,
                        opacity: 0.75,
                        dash: null,
                    });
                } else {
                    addStraightLine(map, pickup, dropoff, 'final-route');
                }
            })();
        }
    }, [status, mapReady, pickup, dropoff]);

    return (
        <>
            <style>{`
                .map-pin{display:flex;flex-direction:column;align-items:center;cursor:pointer}
                .pin-circle{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.35);font-size:17px}
                .pin-tail{width:2px;height:10px;border-radius:1px;margin-top:-2px}
                .driver-dot{display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;font-size:26px;z-index:5}
                .driver-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;background:rgba(66,133,244,.2);animation:dring 1.5s ease-in-out infinite}
                @keyframes dring{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}

                .route-eta-popup .maplibregl-popup-content{
                    background:rgba(255,255,255,.96);backdrop-filter:blur(12px);
                    border-radius:12px;padding:0;overflow:hidden;
                    box-shadow:0 4px 20px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06);
                    border:1px solid rgba(66,133,244,.12)
                }
                .route-eta-popup .maplibregl-popup-tip{border-top-color:rgba(255,255,255,.96)}

                .eta-badge{display:flex;align-items:center;gap:6px;padding:6px 12px}
                .eta-icon{font-size:14px}
                .eta-text{font-size:13px;font-weight:700;color:#1d4ed8}
                .eta-dist{font-size:10px;color:#64748b;font-weight:500}
            `}</style>
            <div ref={containerRef} className={`relative w-full overflow-hidden ${className}`}>
                {!KEY && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-stone-100">
                        <span className="text-2xl">🗺️</span>
                        <p className="text-sm font-medium text-stone-600">Map unavailable</p>
                        <p className="text-xs text-stone-400">VITE_MAPTILER_API_KEY not set</p>
                    </div>
                )}
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

function removeLayerSafe(map, id) {
    try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
}
function removeSourceSafe(map, id) {
    try { if (map.getSource(id)) map.removeSource(id); } catch {}
}

/** Add a route geometry to the map with styling */
function addRouteToMap(map, sourceId, geometry, { color, width, opacity, dash }) {
    removeLayerSafe(map, sourceId);
    removeSourceSafe(map, sourceId);

    map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry },
    });

    map.addLayer({
        id:     sourceId,
        type:   'line',
        source: sourceId,
        paint: {
            'line-color':   color,
            'line-width':   width,
            'line-opacity': opacity,
            ...(dash ? { 'line-dasharray': dash } : {}),
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
}

/** Last resort: straight line when ALL routing APIs fail */
function addStraightLine(map, from, to, sourceId) {
    removeLayerSafe(map, sourceId);
    removeSourceSafe(map, sourceId);

    map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [from.lng, from.lat],
                    [to.lng, to.lat],
                ],
            },
        },
    });
    map.addLayer({
        id:     sourceId,
        type:   'line',
        source: sourceId,
        paint: {
            'line-color':     '#94a3b8',
            'line-width':     2,
            'line-opacity':   0.5,
            'line-dasharray': [6, 4],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
}

/** Fit the map bounds to include all provided points */
function fitAllPoints(map, pickup, dropoff, driver) {
    const points = [];
    if (pickup?.lat  && pickup?.lng)  points.push([pickup.lng, pickup.lat]);
    if (dropoff?.lat && dropoff?.lng) points.push([dropoff.lng, dropoff.lat]);
    if (driver?.lat  && driver?.lng)  points.push([driver.lng, driver.lat]);

    if (points.length < 2) return;

    const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
    points.forEach(p => bounds.extend(p));

    map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 15,
        duration: 700,
    });
}

function markerEl(color, emoji) {
    const el = document.createElement('div');
    el.className = 'map-pin';
    el.innerHTML = `
        <div class="pin-circle" style="background:${color}">${emoji}</div>
        <div class="pin-tail" style="background:${color}"></div>
    `;
    return el;
}

function popupHtml(html) {
    return new maplibregl.Popup({ offset: 32 }).setHTML(html);
}

function createDriverMarker(map, loc) {
    const el = document.createElement('div');
    el.className = 'driver-dot';
    el.innerHTML = `<div class="driver-ring"></div><span>🚐</span>`;

    return new maplibregl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popupHtml('<strong>🚐 Driver</strong><br/><small>Live Location</small>'))
        .addTo(map);
}
