import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LerpAnimator } from '@/Utils/LerpAnimator';
import { applyRotationOffset } from '@/Utils/BearingResolver';

const KEY       = import.meta.env.VITE_MAPTILER_API_KEY;
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

// ── Routing providers (OSRM is free + follows real roads) ─────────
const OSRM_ROUTE_URL = (from, to) =>
    `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true&alternatives=true`;

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
export async function fetchDrivingRoute(from, to) {
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
 * DeliveryMap — reusable MapLibre GL map with LIVE road-following rerouting
 * and hybrid GPS snapping support.
 *
 * Props:
 *  pickup:           { lat, lng }  — pickup point (green pin)
 *  dropoff:          { lat, lng }  — dropoff / buyer point (red pin)
 *  driverLocation:   { lat, lng }  — live driver position
 *  status:           string        — delivery status
 *  activeBearing:    number        — bearing for driver icon rotation (degrees)
 *  snapMode:         'snapped' | 'offroad' — current snap mode
 *  routeGeometry:    [number,number][]|null — route coords from pipeline (including tail)
 *  driverIconState:  'puck' | 'vehicle'    — stationary puck vs moving vehicle
 *  gpsAccuracy:      number | null         — GPS accuracy in meters (for circle layer)
 *  pickupLabel:      string
 *  dropoffLabel:     string
 *  className:        string
 *  onRouteInfo:      (info) => void
 *  onRouteReady:     (routeCoords) => void — callback with canonical route coords for parent pipeline
 */
function DeliveryMapInner({
    pickup,
    dropoff,
    driverLocation,
    status = '',
    activeBearing = 0,
    snapMode = null,
    routeGeometry = null,
    driverIconState = 'vehicle',
    gpsAccuracy = null,
    pickupLabel  = '🎨 Pickup',
    dropoffLabel = '📦 Buyer',
    className = '',
    onRouteInfo,
    onRouteReady,
}) {
    const containerRef        = useRef(null);
    const mapRef              = useRef(null);
    const driverMarker        = useRef(null);
    const driverIconEl        = useRef(null);    // rotatable element (van OR beam)
    const driverPuckEl        = useRef(null);    // puck container
    const driverVehicleEl     = useRef(null);    // vehicle container
    const routePopup          = useRef(null);
    const lastRerouteTime     = useRef(0);
    const initialRouteDrawn   = useRef(false);
    const routeGeometryRef    = useRef(null);
    const lerpRef             = useRef(null);
    const currentIconStateRef = useRef('vehicle'); // track current state for transitions
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

            // ── Initial driver marker ──────────────────────
            if (driverLocation?.lat && driverLocation?.lng) {
                const { marker, iconEl, puckEl, vehicleEl } = createDriverMarker(map, driverLocation, driverIconState);
                driverMarker.current = marker;
                driverIconEl.current = iconEl;
                driverPuckEl.current = puckEl;
                driverVehicleEl.current = vehicleEl;
            }

            // ── Fit bounds to show all points ──────────────────
            fitAllPoints(map, pickup, dropoff, driverLocation);
        });

        // ── Create lerp animator with synchronized frame callback ──
        lerpRef.current = new LerpAnimator({
            duration: 2500, // 2.5s ease-out
            onFrame: ({ lat, lng }) => {
                if (!mapRef.current) return;
                // Slide the driver marker smoothly
                if (driverMarker.current) {
                    driverMarker.current.setLngLat([lng, lat]);
                }
            },
            onFrameSync: ({ lat, lng, bearing, routeGeometry: routeGeo }) => {
                if (!mapRef.current) return;

                // ── Synchronized frame contract ──
                // Both icon position and route line are updated on the SAME
                // rAF frame to prevent any single-frame desync.

                // 1. Update driver icon bearing based on current icon state
                if (typeof bearing === 'number') {
                    if (currentIconStateRef.current === 'puck') {
                        // Puck: rotate the beam to match compass heading (no offset needed,
                        // the beam's conic gradient already points "up" = forward)
                        if (driverPuckEl.current) {
                            const beamEl = driverPuckEl.current.querySelector('.puck-beam');
                            if (beamEl) beamEl.style.transform = `rotate(${bearing}deg)`;
                        }
                    } else {
                        // Vehicle: rotate the van emoji with offset
                        if (driverIconEl.current) {
                            const displayBearing = applyRotationOffset(bearing);
                            driverIconEl.current.style.transform = `rotate(${displayBearing}deg)`;
                        }
                    }
                }

                // 1b. Update accuracy circle position
                if (mapRef.current.getSource('accuracy-circle')) {
                    mapRef.current.getSource('accuracy-circle').setData({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [lng, lat] },
                        properties: {},
                    });
                }

                // 2. Synchronize the route line's leading edge
                if (routeGeo && routeGeo.length > 0 && mapRef.current.getSource('active-route')) {
                    // Replace the first coordinate with the lerped position
                    const updatedCoords = [[lng, lat], ...routeGeo.slice(1)];
                    mapRef.current.getSource('active-route').setData({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: updatedCoords,
                        },
                    });
                } else if (routeGeometryRef.current && mapRef.current.getSource('active-route')) {
                    // Fallback: use the stored route geometry
                    const coords = routeGeometryRef.current.coordinates;
                    const updatedCoords = [[lng, lat], ...coords.slice(1)];
                    mapRef.current.getSource('active-route').setData({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: updatedCoords,
                        },
                    });
                }
            },
            onComplete: ({ lat, lng }) => {
                if (mapRef.current) {
                    mapRef.current.easeTo({
                        center: [lng, lat],
                        duration: 600,
                    });
                }
            },
        });

        return () => {
            if (lerpRef.current) {
                lerpRef.current.destroy();
                lerpRef.current = null;
            }
            map.remove();
            mapRef.current = null;
            setMapReady(false);
            initialRouteDrawn.current = false;
            routeGeometryRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Draw the initial static route (pickup→dropoff) once map is ready ──
    async function drawStaticRoute(map, from, to) {
        const routeData = await fetchDrivingRoute(from, to);
        if (!routeData) {
            addStraightLine(map, from, to, 'overview-route');
            return;
        }

        addRouteToMap(map, 'overview-route', routeData.geometry, {
            color: '#94a3b8',
            width: 3,
            opacity: 0.5,
            dash: [6, 4],
        });

        // Store the canonical route geometry and notify parent
        routeGeometryRef.current = routeData.geometry;
        if (onRouteReady && routeData.geometry?.coordinates) {
            onRouteReady(routeData.geometry.coordinates);
        }

        initialRouteDrawn.current = true;
    }

    // ── Update route geometry from pipeline (offroad tail / pruned) ──
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (!routeGeometry || routeGeometry.length < 2) return;

        // Feed the pipeline's route geometry into the lerp animator
        // so the sync callback updates the leading edge on every frame
        if (lerpRef.current) {
            lerpRef.current.setRouteGeometry(routeGeometry);
        }

        // Also update the map source directly for immediate visual feedback
        updateOrCreateRouteSource(mapRef.current, 'active-route', {
            type: 'LineString',
            coordinates: routeGeometry,
        });
    }, [routeGeometry, mapReady]);

    // ── Update bearing from pipeline ──
    useEffect(() => {
        if (lerpRef.current && typeof activeBearing === 'number') {
            // Feed the raw geographic bearing to the lerp animator;
            // the offset is applied in onFrameSync when setting CSS transform
            lerpRef.current.setBearing(activeBearing);
        }
    }, [activeBearing]);

    // ── Icon state transitions (puck ↔ vehicle) ──────────────────
    useEffect(() => {
        if (!driverPuckEl.current || !driverVehicleEl.current) return;
        if (driverIconState === currentIconStateRef.current) return;

        currentIconStateRef.current = driverIconState;

        if (driverIconState === 'puck') {
            // Crossfade: vehicle → puck
            driverVehicleEl.current.style.opacity = '0';
            driverVehicleEl.current.style.pointerEvents = 'none';
            driverPuckEl.current.style.opacity = '1';
            driverPuckEl.current.style.pointerEvents = 'auto';
        } else {
            // Crossfade: puck → vehicle
            driverPuckEl.current.style.opacity = '0';
            driverPuckEl.current.style.pointerEvents = 'none';
            driverVehicleEl.current.style.opacity = '1';
            driverVehicleEl.current.style.pointerEvents = 'auto';
        }
    }, [driverIconState]);

    // ── GPS Accuracy Circle Layer (MapLibre native) ──────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (!driverLocation?.lat || !driverLocation?.lng) return;

        const map = mapRef.current;
        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [driverLocation.lng, driverLocation.lat],
            },
            properties: {},
        };

        // Create or update the accuracy source
        if (!map.getSource('accuracy-circle')) {
            map.addSource('accuracy-circle', { type: 'geojson', data: geojson });

            // Circle layer that scales with zoom to represent meters on the map.
            // circle-radius uses a zoom-interpolated expression so accuracy (in meters)
            // maps correctly at each zoom level.
            map.addLayer({
                id: 'accuracy-circle',
                type: 'circle',
                source: 'accuracy-circle',
                paint: {
                    'circle-radius': accuracyToRadius(gpsAccuracy),
                    'circle-color': 'rgba(66, 133, 244, 0.08)',
                    'circle-stroke-color': 'rgba(66, 133, 244, 0.2)',
                    'circle-stroke-width': 1,
                },
            }, getFirstSymbolLayerId(map)); // Insert below labels
        } else {
            map.getSource('accuracy-circle').setData(geojson);
            map.setPaintProperty('accuracy-circle', 'circle-radius', accuracyToRadius(gpsAccuracy));
        }

        // Only show when in puck mode
        const visibility = (driverIconState === 'puck' && gpsAccuracy > 0) ? 'visible' : 'none';
        if (map.getLayer('accuracy-circle')) {
            map.setLayoutProperty('accuracy-circle', 'visibility', visibility);
        }
    }, [driverLocation?.lat, driverLocation?.lng, gpsAccuracy, driverIconState, mapReady]);

    // ── Live reroute: driver → dropoff ────────────────────────────
    const doReroute = useCallback(async (driverLoc) => {
        const map = mapRef.current;
        if (!map || !dropoff?.lat || !dropoff?.lng) return;
        if (!driverLoc?.lat || !driverLoc?.lng) return;

        const activeStatuses = ['picked_up', 'in_transit'];
        if (!activeStatuses.includes(status)) return;

        // Throttle
        const now = Date.now();
        if (now - lastRerouteTime.current < REROUTE_THROTTLE_MS) return;
        lastRerouteTime.current = now;

        // Fetch real road route from driver's current position → dropoff
        const routeData = await fetchDrivingRoute(driverLoc, dropoff);

        if (!routeData) {
            const straightGeom = {
                type: 'LineString',
                coordinates: [
                    [driverLoc.lng, driverLoc.lat],
                    [dropoff.lng, dropoff.lat],
                ],
            };
            updateOrCreateRouteSource(map, 'active-route', straightGeom);
            routeGeometryRef.current = straightGeom;
            return;
        }

        // ── Update route geometry (in-place setData, no teardown) ──
        routeGeometryRef.current = routeData.geometry;
        updateOrCreateRouteSource(map, 'active-route', routeData.geometry);

        // Notify parent with the new canonical route coords
        if (onRouteReady && routeData.geometry?.coordinates) {
            onRouteReady(routeData.geometry.coordinates);
        }

        // ── Draw COMPLETED segment (pickup → driver) ─────────
        if (pickup?.lat && pickup?.lng) {
            const completedRoute = await fetchDrivingRoute(pickup, driverLoc);
            if (completedRoute) {
                updateOrCreateRouteSource(map, 'completed-segment', completedRoute.geometry, {
                    color: '#86efac', width: 4, opacity: 0.5,
                });
            }
        }

        // ── Hide the initial overview route once live route is active ──
        removeLayerSafe(map, 'overview-route');
        removeSourceSafe(map, 'overview-route');

        // ── Update ETA info ──────────────────────────────────
        const durationMin = Math.round(routeData.durationSec / 60);
        const distanceKm  = (routeData.distanceMeters / 1000).toFixed(1);

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

    }, [dropoff, pickup, status, onRouteInfo, onRouteReady]);

    // ── Move driver marker (LERP) + trigger reroute ───────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (!driverLocation?.lat || !driverLocation?.lng) return;

        // Ensure driver marker exists
        if (!driverMarker.current) {
            const { marker, iconEl, puckEl, vehicleEl } = createDriverMarker(mapRef.current, driverLocation, driverIconState);
            driverMarker.current = marker;
            driverIconEl.current = iconEl;
            driverPuckEl.current = puckEl;
            driverVehicleEl.current = vehicleEl;
            // First position — jump immediately, don't animate
            if (lerpRef.current) {
                lerpRef.current.jumpTo(driverLocation);
            }
        } else {
            // Subsequent positions — smooth lerp animation (2.5s ease-out)
            if (lerpRef.current) {
                lerpRef.current.animateTo(driverLocation);
            } else {
                driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
            }
        }

        // Trigger live reroute (will follow real roads, throttled to 15s)
        doReroute(driverLocation);
    }, [driverLocation?.lat, driverLocation?.lng, mapReady, doReroute]);

    // ── When status becomes "delivered", show final completed route ──
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        if (status !== 'delivered') return;

        const map = mapRef.current;

        // Stop any running animation
        if (lerpRef.current) lerpRef.current.stop();

        // Remove active route artifacts
        ['active-route-glow', 'active-route-shadow', 'active-route', 'active-route-dash'].forEach(id => removeLayerSafe(map, id));
        removeSourceSafe(map, 'active-route');
        removeLayerSafe(map, 'completed-segment');
        removeSourceSafe(map, 'completed-segment');
        removeLayerSafe(map, 'overview-route');
        removeSourceSafe(map, 'overview-route');

        routeGeometryRef.current = null;

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

                /* ── Driver icon container ── */
                .driver-dot{display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;z-index:5;width:80px;height:80px}

                /* ── Puck state (stationary compass) ── */
                .driver-puck{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;transition:opacity 0.25s ease}
                .puck-beam{
                    position:absolute;width:80px;height:80px;border-radius:50%;
                    background:conic-gradient(
                        from -30deg,
                        transparent 0deg,
                        rgba(66,133,244,0.30) 15deg,
                        rgba(66,133,244,0.12) 30deg,
                        rgba(66,133,244,0.04) 50deg,
                        transparent 60deg
                    );
                    transition:transform 0.1s linear
                }
                .puck-dot{
                    position:relative;z-index:2;
                    width:18px;height:18px;border-radius:50%;
                    background:#4285F4;
                    border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,.3)
                }

                /* ── Vehicle state (moving van) ── */
                .driver-vehicle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;transition:opacity 0.25s ease}
                .driver-icon-rotatable{font-size:26px;transition:transform 0.15s linear}
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
//  REACT.MEMO — avoid re-renders when parent state changes
// ═══════════════════════════════════════════════════════════════════
const DeliveryMap = memo(DeliveryMapInner, (prevProps, nextProps) => {
    return (
        prevProps.driverLocation?.lat === nextProps.driverLocation?.lat &&
        prevProps.driverLocation?.lng === nextProps.driverLocation?.lng &&
        prevProps.status === nextProps.status &&
        prevProps.pickup?.lat === nextProps.pickup?.lat &&
        prevProps.pickup?.lng === nextProps.pickup?.lng &&
        prevProps.dropoff?.lat === nextProps.dropoff?.lat &&
        prevProps.dropoff?.lng === nextProps.dropoff?.lng &&
        prevProps.activeBearing === nextProps.activeBearing &&
        prevProps.snapMode === nextProps.snapMode &&
        prevProps.routeGeometry === nextProps.routeGeometry &&
        prevProps.driverIconState === nextProps.driverIconState &&
        prevProps.gpsAccuracy === nextProps.gpsAccuracy &&
        prevProps.className === nextProps.className
    );
});

export default DeliveryMap;

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

function removeLayerSafe(map, id) {
    try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
}
function removeSourceSafe(map, id) {
    try { if (map.getSource(id)) map.removeSource(id); } catch {}
}

function updateOrCreateRouteSource(map, sourceId, geometry, style) {
    const geojson = { type: 'Feature', geometry };
    const existing = map.getSource(sourceId);

    if (existing) {
        existing.setData(geojson);
        return;
    }

    if (sourceId === 'active-route') {
        map.addSource('active-route', { type: 'geojson', data: geojson });
        map.addLayer({
            id: 'active-route-glow', type: 'line', source: 'active-route',
            paint: { 'line-color': '#3b82f6', 'line-width': 14, 'line-opacity': 0.06, 'line-blur': 6 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
        map.addLayer({
            id: 'active-route-shadow', type: 'line', source: 'active-route',
            paint: { 'line-color': '#1e40af', 'line-width': 8, 'line-opacity': 0.18 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
        map.addLayer({
            id: 'active-route', type: 'line', source: 'active-route',
            paint: { 'line-color': '#4285F4', 'line-width': 5, 'line-opacity': 0.95 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
        map.addLayer({
            id: 'active-route-dash', type: 'line', source: 'active-route',
            paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.45, 'line-dasharray': [0, 2, 2] },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
    } else if (sourceId === 'completed-segment') {
        map.addSource('completed-segment', { type: 'geojson', data: geojson });
        map.addLayer({
            id: 'completed-segment', type: 'line', source: 'completed-segment',
            paint: {
                'line-color':   style?.color   ?? '#86efac',
                'line-width':   style?.width   ?? 4,
                'line-opacity': style?.opacity ?? 0.5,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
    } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
            id: sourceId, type: 'line', source: sourceId,
            paint: {
                'line-color':   style?.color   ?? '#94a3b8',
                'line-width':   style?.width   ?? 3,
                'line-opacity': style?.opacity ?? 0.5,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
    }
}

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

/**
 * Create the driver marker with dual-state DOM structure.
 *
 * Structure:
 *  .driver-dot (container)
 *  ├─ .driver-puck (shown when stationary)
 *  │   ├─ .puck-beam (conic gradient, rotated by heading)
 *  │   └─ .puck-dot (solid blue circle)
 *  └─ .driver-vehicle (shown when moving)
 *      ├─ .driver-ring (pulsing blue ring)
 *      └─ .driver-icon-rotatable (🚐 emoji)
 *
 * Returns: { marker, iconEl, puckEl, vehicleEl }
 */
function createDriverMarker(map, loc, initialState = 'vehicle') {
    const el = document.createElement('div');
    el.className = 'driver-dot';

    // ── Puck state ──
    const puckEl = document.createElement('div');
    puckEl.className = 'driver-puck';
    puckEl.style.opacity = initialState === 'puck' ? '1' : '0';
    puckEl.style.pointerEvents = initialState === 'puck' ? 'auto' : 'none';
    puckEl.innerHTML = `
        <div class="puck-beam"></div>
        <div class="puck-dot"></div>
    `;

    // ── Vehicle state ──
    const vehicleEl = document.createElement('div');
    vehicleEl.className = 'driver-vehicle';
    vehicleEl.style.opacity = initialState === 'vehicle' ? '1' : '0';
    vehicleEl.style.pointerEvents = initialState === 'vehicle' ? 'auto' : 'none';

    const iconEl = document.createElement('span');
    iconEl.className = 'driver-icon-rotatable';
    iconEl.textContent = '🚐';

    vehicleEl.innerHTML = `<div class="driver-ring"></div>`;
    vehicleEl.appendChild(iconEl);

    // Assemble
    el.appendChild(puckEl);
    el.appendChild(vehicleEl);

    const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popupHtml('<strong>🚐 Driver</strong><br/><small>Live Location</small>'))
        .addTo(map);

    return { marker, iconEl, puckEl, vehicleEl };
}

/**
 * Convert GPS accuracy (meters) into a MapLibre circle-radius zoom expression.
 * Uses the Mercator projection formula to translate meters → pixels at each zoom.
 *
 * At zoom z, 1 meter ≈ (256 / (2π * 6378137)) * 2^z pixels
 *
 * @param {number|null} accuracyMeters
 * @returns {object} — MapLibre style expression for circle-radius
 */
function accuracyToRadius(accuracyMeters) {
    if (!accuracyMeters || accuracyMeters <= 0) {
        return 0; // hide
    }

    // MapLibre expression: meters_to_pixels * accuracy
    // meters_to_pixels_at_equator = 256 / (2 * PI * 6378137) = ~6.388e-6
    // At zoom z, pixels = accuracy * 6.388e-6 * 2^z
    //
    // We use an interpolation expression for readability and to cap max size:
    return [
        'interpolate', ['exponential', 2], ['zoom'],
        0,  accuracyMeters * 0.0000064,  // ~0px at z0
        10, accuracyMeters * 0.0065,     // small circle
        15, accuracyMeters * 0.21,       // visible ring
        20, accuracyMeters * 6.7,        // large at street level
    ];
}

/**
 * Find the first symbol layer id in the map style.
 * Used to insert the accuracy circle layer below labels.
 *
 * @param {maplibregl.Map} map
 * @returns {string|undefined}
 */
function getFirstSymbolLayerId(map) {
    const layers = map.getStyle().layers;
    for (const layer of layers) {
        if (layer.type === 'symbol') return layer.id;
    }
    return undefined;
}
