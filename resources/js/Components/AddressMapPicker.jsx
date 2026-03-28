import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const KEY    = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE  = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;
const GEO    = (q) => `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${KEY}&country=ph&language=en&limit=5`;

const PH = { center: [121.0, 12.5], zoom: 5.5 };

/**
 * AddressMapPicker — like Shopee's address + map flow.
 *
 * Props:
 *   initialAddress: string   — pre-filled address text
 *   onChange(lat, lng, label) — called whenever the pin moves
 */
export default function AddressMapPicker({ initialAddress = '', onChange }) {
    const containerRef = useRef(null);
    const mapRef       = useRef(null);
    const markerRef    = useRef(null);

    const [query,     setQuery]     = useState(initialAddress);
    const [results,   setResults]   = useState([]);
    const [searching, setSearching] = useState(false);
    const [pinLabel,  setPinLabel]  = useState('');
    const [pinSet,    setPinSet]    = useState(false);
    const [showDrop,  setShowDrop]  = useState(false);
    const debounceRef = useRef(null);

    // ── Bootstrap map ─────────────────────────────────────────────
    useEffect(() => {
        const map = new maplibregl.Map({
            container: containerRef.current,
            style:     STYLE,
            center:    PH.center,
            zoom:      PH.zoom,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        mapRef.current = map;

        // Click-to-place marker
        map.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            placeMarker(map, lat, lng, 'Custom pin');
            reverseGeocode(lat, lng);
        });

        return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Geocode as user types ─────────────────────────────────────
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
            } finally {
                setSearching(false);
            }
        }, 380);
    };

    // Select from dropdown
    const selectResult = (feat) => {
        const [lng, lat] = feat.geometry.coordinates;
        const label = feat.place_name ?? feat.text ?? query;

        setQuery(label);
        setResults([]);
        setShowDrop(false);

        placeMarker(mapRef.current, lat, lng, label);
        mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    };

    // Reverse geocode when user clicks map
    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(GEO(`${lng},${lat}`));
            const { features } = await res.json();
            const label = features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPinLabel(label);
            setQuery(label);
            onChange?.(lat, lng, label);
        } catch {
            onChange?.(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    };

    // ── Place / move draggable marker ─────────────────────────────
    const placeMarker = (map, lat, lng, label) => {
        if (markerRef.current) {
            markerRef.current.setLngLat([lng, lat]);
        } else {
            const el = document.createElement('div');
            el.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;cursor:grab">
                    <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;
                                background:#c26a4e;border:3px solid white;
                                box-shadow:0 3px 10px rgba(0,0,0,.4);
                                transform:rotate(-45deg);
                                display:flex;align-items:center;justify-content:center">
                        <span style="transform:rotate(45deg);font-size:14px">📍</span>
                    </div>
                </div>
            `;

            markerRef.current = new maplibregl.Marker({ element: el, draggable: true })
                .setLngLat([lng, lat])
                .addTo(map);

            // On drag end, reverse geocode new position
            markerRef.current.on('dragend', () => {
                const pos = markerRef.current.getLngLat();
                reverseGeocode(pos.lat, pos.lng);
            });
        }

        setPinLabel(label);
        setPinSet(true);
        onChange?.(lat, lng, label);
    };

    // Auto-geocode if initialAddress passed and field not yet manually touched
    useEffect(() => {
        if (!initialAddress || pinSet || !mapRef.current) return;
        const timer = setTimeout(async () => {
            if (!initialAddress.trim()) return;
            try {
                const res  = await fetch(GEO(initialAddress));
                const data = await res.json();
                const feat = data.features?.[0];
                if (feat) selectResult(feat);
            } catch {}
        }, 600);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapRef.current, initialAddress]);

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => setShowDrop(true)}
                    placeholder="Search your delivery address…"
                    className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-10 text-sm text-ink placeholder-ink-subtle outline-none transition focus:border-sienna focus:ring-2 focus:ring-sienna/20"
                />
                {searching && (
                    <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-sienna" />
                )}

                {/* Dropdown */}
                {showDrop && results.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                        {results.map((feat, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => selectResult(feat)}
                                className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-stone-50 transition-colors border-b border-border last:border-0"
                            >
                                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-sienna" />
                                <span className="text-ink">{feat.place_name ?? feat.text}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map container */}
            <div className="relative overflow-hidden rounded-xl border border-border shadow-sm">
                <div ref={containerRef} style={{ height: '320px', width: '100%' }} />

                {/* Overlay tip */}
                {!pinSet && (
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-sienna/30 bg-white/90 px-3 py-1.5 text-xs font-medium text-sienna shadow-sm backdrop-blur-sm">
                        🔍 Search above or tap the map to pin your location
                    </div>
                )}
            </div>

            {/* Confirmed pin */}
            {pinSet && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs">
                    <CheckCircle size={14} className="flex-shrink-0 text-emerald-600" />
                    <div>
                        <p className="font-semibold text-emerald-700">Pin confirmed</p>
                        <p className="text-emerald-600 line-clamp-1">{pinLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setPinSet(false);
                            setPinLabel('');
                            if (markerRef.current) {
                                markerRef.current.remove();
                                markerRef.current = null;
                            }
                            onChange?.(null, null, '');
                        }}
                        className="ml-auto text-xs text-emerald-600 underline hover:text-emerald-800"
                    >
                        Change
                    </button>
                </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <AlertCircle size={11} />
                Drag the pin to fine-tune your exact drop-off location.
            </p>
        </div>
    );
}
