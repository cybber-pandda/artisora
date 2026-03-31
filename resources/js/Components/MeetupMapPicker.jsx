import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, MapPin, Loader2, CheckCircle, Info, Navigation } from 'lucide-react';

const KEY   = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;
const GEO   = (q) => `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${KEY}&country=ph&language=en&limit=5`;

const PH = { center: [121.0, 12.5], zoom: 5.5 };

/**
 * MeetupMapPicker
 *
 * Props:
 *   artistAnchor  : { lat, lng, label, radius } | null
 *   onChange({ lat, lng, label, note, usedArtistDefault })
 */
export default function MeetupMapPicker({ artistAnchor = null, onChange }) {
    const containerRef   = useRef(null);
    const mapRef         = useRef(null);
    const artistMarkerRef= useRef(null);
    const buyerMarkerRef = useRef(null);
    const circleLayerId  = 'artist-radius-circle';

    const [mode,      setMode]      = useState('confirm');   // 'confirm' | 'suggest'
    const [query,     setQuery]     = useState('');
    const [results,   setResults]   = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDrop,  setShowDrop]  = useState(false);
    const [buyerPin,  setBuyerPin]  = useState(null);        // { lat, lng, label }
    const [note,      setNote]      = useState('');
    const debounceRef = useRef(null);

    /* ── Bootstrap map ──────────────────────────────────────── */
    useEffect(() => {
        const initial = artistAnchor
            ? { center: [artistAnchor.lng, artistAnchor.lat], zoom: 14 }
            : PH;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            ...initial,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            if (artistAnchor) {
                placeArtistMarker(map, artistAnchor.lat, artistAnchor.lng, artistAnchor.label);
                if (artistAnchor.radius) drawRadiusCircle(map, artistAnchor.lat, artistAnchor.lng, artistAnchor.radius);
            }
        });

        map.on('click', (e) => {
            if (mode === 'suggest' || !artistAnchor) {
                const { lng, lat } = e.lngLat;
                placeBuyerMarker(map, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                reverseGeocode(lat, lng);
            }
        });

        return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Re-register click listener when mode changes */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const handler = (e) => {
            if (mode === 'suggest' || !artistAnchor) {
                const { lng, lat } = e.lngLat;
                placeBuyerMarker(map, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                reverseGeocode(lat, lng);
            }
        };
        map.on('click', handler);
        return () => map.off('click', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, artistAnchor]);

    /* Emit on mode / pin change */
    useEffect(() => {
        if (mode === 'confirm' && artistAnchor) {
            onChange?.({
                lat: artistAnchor.lat,
                lng: artistAnchor.lng,
                label: artistAnchor.label ?? '',
                note: '',
                usedArtistDefault: true,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, artistAnchor]);

    useEffect(() => {
        if (mode === 'suggest' && buyerPin) {
            onChange?.({
                lat: buyerPin.lat,
                lng: buyerPin.lng,
                label: buyerPin.label,
                note,
                usedArtistDefault: false,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buyerPin, note]);

    /* ── Markers ─────────────────────────────────────────────── */
    function placeArtistMarker(map, lat, lng, label) {
        if (artistMarkerRef.current) return;
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
        el.innerHTML = `
            <div style="position:relative">
                <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;
                    background:#7c3aed;border:3px solid white;
                    box-shadow:0 3px 12px rgba(124,58,237,.5);
                    transform:rotate(-45deg);
                    display:flex;align-items:center;justify-content:center">
                    <span style="transform:rotate(45deg);font-size:15px">🎨</span>
                </div>
            </div>
            <div style="margin-top:4px;background:#7c3aed;color:white;font-size:10px;
                font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap;
                box-shadow:0 2px 6px rgba(0,0,0,.25)">Artist's Spot</div>
        `;
        artistMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 30 })
                .setText(label ?? 'Artist\'s preferred meet-up spot'))
            .addTo(map);
    }

    function placeBuyerMarker(map, lat, lng, label) {
        if (buyerMarkerRef.current) {
            buyerMarkerRef.current.setLngLat([lng, lat]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:grab';
            el.innerHTML = `
                <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;
                    background:#0d9488;border:3px solid white;
                    box-shadow:0 3px 10px rgba(0,0,0,.4);
                    transform:rotate(-45deg);
                    display:flex;align-items:center;justify-content:center">
                    <span style="transform:rotate(45deg);font-size:13px">📍</span>
                </div>
            `;
            buyerMarkerRef.current = new maplibregl.Marker({ element: el, draggable: true })
                .setLngLat([lng, lat])
                .addTo(map);

            buyerMarkerRef.current.on('dragend', () => {
                const p = buyerMarkerRef.current.getLngLat();
                reverseGeocode(p.lat, p.lng);
            });
        }
        setBuyerPin({ lat, lng, label });
    }

    function drawRadiusCircle(map, lat, lng, radiusKm) {
        const steps = 64;
        const earthRadius = 6378.137;
        const angularDistance = radiusKm / earthRadius;
        const coordinates = [];
        for (let i = 0; i <= steps; i++) {
            const bearing = (i * 360) / steps;
            const b = (bearing * Math.PI) / 180;
            const lat1 = (lat * Math.PI) / 180;
            const lng1 = (lng * Math.PI) / 180;
            const lat2 = Math.asin(
                Math.sin(lat1) * Math.cos(angularDistance) +
                Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(b)
            );
            const lng2 =
                lng1 +
                Math.atan2(
                    Math.sin(b) * Math.sin(angularDistance) * Math.cos(lat1),
                    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
                );
            coordinates.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
        }

        if (map.getSource(circleLayerId)) {
            map.getSource(circleLayerId).setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } });
            return;
        }

        map.addSource(circleLayerId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } },
        });
        map.addLayer({
            id: circleLayerId,
            type: 'fill',
            source: circleLayerId,
            paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.08 },
        });
        map.addLayer({
            id: circleLayerId + '-line',
            type: 'line',
            source: circleLayerId,
            paint: { 'line-color': '#7c3aed', 'line-width': 1.5, 'line-dasharray': [4, 3] },
        });
    }

    /* ── Geocode search ──────────────────────────────────────── */
    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        setShowDrop(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 3) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(GEO(val));
                const { features } = await res.json();
                setResults(features ?? []);
            } finally { setSearching(false); }
        }, 380);
    };

    const selectResult = (feat) => {
        const [lng, lat] = feat.geometry.coordinates;
        const label = feat.place_name ?? feat.text ?? query;
        setQuery(label);
        setResults([]);
        setShowDrop(false);
        placeBuyerMarker(mapRef.current, lat, lng, label);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(GEO(`${lng},${lat}`));
            const { features } = await res.json();
            const label = features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setQuery(label);
            setBuyerPin({ lat, lng, label });
            if (mode === 'suggest') onChange?.({ lat, lng, label, note, usedArtistDefault: false });
        } catch {
            setBuyerPin({ lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
    };

    const switchToSuggest = () => {
        setMode('suggest');
        // Remove buyer marker if any when switching back to confirm
    };

    const switchToConfirm = () => {
        setMode('confirm');
        if (buyerMarkerRef.current) {
            buyerMarkerRef.current.remove();
            buyerMarkerRef.current = null;
        }
        setBuyerPin(null);
        setQuery('');
    };

    return (
        <div className="space-y-4">
            {/* Mode switcher */}
            {artistAnchor ? (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={switchToConfirm}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                            mode === 'confirm'
                                ? 'border-violet-500 bg-violet-50 text-violet-700'
                                : 'border-border bg-canvas text-ink hover:border-violet-300'
                        }`}
                    >
                        <CheckCircle size={15} />
                        Use Artist's Spot
                    </button>
                    <button
                        type="button"
                        onClick={switchToSuggest}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                            mode === 'suggest'
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-border bg-canvas text-ink hover:border-teal-300'
                        }`}
                    >
                        <Navigation size={15} />
                        Suggest Different Spot
                    </button>
                </div>
            ) : (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                    <span>The artist hasn't set a default meet-up spot yet. Pin your preferred location below and the artist will confirm it.</span>
                </div>
            )}

            {/* Artist anchor info chip */}
            {artistAnchor && mode === 'confirm' && (
                <div className="flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs">
                    <div className="h-6 w-6 flex-shrink-0 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs">🎨</div>
                    <div>
                        <p className="font-semibold text-violet-800">Artist's Preferred Spot</p>
                        <p className="text-violet-600 line-clamp-1">{artistAnchor.label ?? 'See map pin'}</p>
                    </div>
                    {artistAnchor.radius && (
                        <span className="ml-auto flex-shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-violet-600 font-medium">
                            ±{artistAnchor.radius}km
                        </span>
                    )}
                </div>
            )}

            {/* Suggest mode: search bar */}
            {(mode === 'suggest' || !artistAnchor) && (
                <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => setShowDrop(true)}
                        placeholder="Search a meet-up location…"
                        className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-10 text-sm text-ink placeholder-ink-subtle outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                    {searching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-teal-500" />}
                    {showDrop && results.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                            {results.map((feat, i) => (
                                <button key={i} type="button" onClick={() => selectResult(feat)}
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-stone-50 transition-colors border-b border-border last:border-0">
                                    <MapPin size={13} className="mt-0.5 flex-shrink-0 text-teal-500" />
                                    <span className="text-ink">{feat.place_name ?? feat.text}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Map */}
            <div className="relative overflow-hidden rounded-xl border border-border shadow-sm">
                <div ref={containerRef} style={{ height: 300, width: '100%' }} />
                {mode === 'suggest' && !buyerPin && (
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-teal-300/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-teal-700 shadow-sm backdrop-blur-sm">
                        🔍 Search above or tap the map to pin your spot
                    </div>
                )}
                {!artistAnchor && !buyerPin && (
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm backdrop-blur-sm">
                        Tap the map to suggest a meet-up location
                    </div>
                )}
            </div>

            {/* Buyer's suggested pin confirmation */}
            {mode === 'suggest' && buyerPin && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs">
                        <CheckCircle size={14} className="flex-shrink-0 text-teal-600" />
                        <div className="min-w-0">
                            <p className="font-semibold text-teal-700">Your Suggested Spot</p>
                            <p className="text-teal-600 line-clamp-1">{buyerPin.label}</p>
                        </div>
                        <button type="button" onClick={() => {
                            if (buyerMarkerRef.current) { buyerMarkerRef.current.remove(); buyerMarkerRef.current = null; }
                            setBuyerPin(null);
                            setQuery('');
                        }} className="ml-auto flex-shrink-0 text-xs text-teal-600 underline hover:text-teal-800">Change</button>
                    </div>

                    {/* Optional note */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1.5">
                            Note for Artist <span className="font-normal normal-case tracking-normal text-ink-subtle">(optional)</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="e.g. It's more accessible for me here since I'll be coming from work…"
                            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none transition resize-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    <p className="flex items-start gap-1.5 text-xs text-ink-muted">
                        <Info size={11} className="mt-0.5 flex-shrink-0" />
                        The artist will review your suggestion and can approve, counter-propose, or revert to their default.
                    </p>
                </div>
            )}

            {/* Confirm mode info */}
            {mode === 'confirm' && artistAnchor && (
                <p className="flex items-start gap-1.5 text-xs text-ink-muted">
                    <Info size={11} className="mt-0.5 flex-shrink-0" />
                    Using the artist's preferred spot. No approval needed — your order will proceed immediately.
                </p>
            )}
        </div>
    );
}
