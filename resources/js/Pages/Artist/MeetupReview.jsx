import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import AddressMapPicker from '@/Components/AddressMapPicker';
import {
    MapPin, CheckCircle, XCircle, RotateCcw, ChevronRight,
    Clock, AlertTriangle, Users, Navigation,
} from 'lucide-react';

const KEY   = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (2 * R * Math.asin(Math.sqrt(a))).toFixed(1);
}

const MAX_ROUNDS = 3;
const STATUS_LABELS = {
    pending_artist: { text: 'Awaiting Your Response', color: 'amber' },
    pending_buyer:  { text: 'Awaiting Buyer Response', color: 'blue' },
    agreed:         { text: 'Location Agreed ✓', color: 'green' },
    reverted:       { text: 'Reverted to Default', color: 'gray' },
};

export default function MeetupReview({ order, artistAnchor }) {
    const containerRef = useRef(null);
    const mapRef       = useRef(null);
    const [counterMode, setCounterMode] = useState(false);
    const [counterPin,  setCounterPin]  = useState(null);

    const { post, processing } = useForm({});
    const counterForm = useForm({ lat: '', lng: '', label: '' });

    useEffect(() => {
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            center: order.meetup_proposed_lng
                ? [order.meetup_proposed_lng, order.meetup_proposed_lat]
                : artistAnchor
                    ? [artistAnchor.lng, artistAnchor.lat]
                    : [121.0, 12.5],
            zoom: order.meetup_proposed_lat ? 14 : 5.5,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            // Artist's anchor pin (purple)
            if (artistAnchor?.lat) {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
                el.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;
                        background:#7c3aed;border:3px solid white;
                        box-shadow:0 3px 12px rgba(124,58,237,.5);
                        transform:rotate(-45deg);
                        display:flex;align-items:center;justify-content:center">
                        <span style="transform:rotate(45deg);font-size:14px">🎨</span>
                    </div>
                    <div style="margin-top:3px;background:#7c3aed;color:white;font-size:9px;
                        font-weight:700;padding:2px 7px;border-radius:10px">Your Default</div>
                `;
                new maplibregl.Marker({ element: el })
                    .setLngLat([artistAnchor.lng, artistAnchor.lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setText(artistAnchor.label ?? 'Your default spot'))
                    .addTo(map);
            }

            // Buyer's proposed pin (teal)
            if (order.meetup_proposed_lat && order.meetup_proposed_lng) {
                const el2 = document.createElement('div');
                el2.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
                el2.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;
                        background:#0d9488;border:3px solid white;
                        box-shadow:0 3px 12px rgba(13,148,136,.5);
                        transform:rotate(-45deg);
                        display:flex;align-items:center;justify-content:center">
                        <span style="transform:rotate(45deg);font-size:14px">🛍️</span>
                    </div>
                    <div style="margin-top:3px;background:#0d9488;color:white;font-size:9px;
                        font-weight:700;padding:2px 7px;border-radius:10px">Buyer's Spot</div>
                `;
                new maplibregl.Marker({ element: el2 })
                    .setLngLat([order.meetup_proposed_lng, order.meetup_proposed_lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setText(order.meetup_proposed_label ?? 'Buyer\'s suggestion'))
                    .addTo(map);

                // Fit bounds to show both pins
                if (artistAnchor?.lat) {
                    const bounds = new maplibregl.LngLatBounds()
                        .extend([artistAnchor.lng, artistAnchor.lat])
                        .extend([order.meetup_proposed_lng, order.meetup_proposed_lat]);
                    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
                }
            }
        });

        return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dist = order.meetup_proposed_lat && artistAnchor?.lat
        ? haversineKm(artistAnchor.lat, artistAnchor.lng, order.meetup_proposed_lat, order.meetup_proposed_lng)
        : null;

    const roundsLeft = MAX_ROUNDS - (order.meetup_round ?? 0) - 1;
    const status = STATUS_LABELS[order.meetup_status] ?? {};

    return (
        <AppLayout title={`Review Meet-up — Order #${order.id}`}>
            <Head title={`Review Meet-up Location — Order #${order.id}`} />

            <div className="mx-auto max-w-3xl space-y-5">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Link href={route('artist.orders')} className="hover:text-sienna transition-colors">Orders</Link>
                    <ChevronRight size={13} />
                    <span className="text-ink font-medium">Meet-up Location Review — Order #{order.id}</span>
                </div>

                {/* Status banner */}
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border ${
                    order.meetup_status === 'pending_artist'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : order.meetup_status === 'agreed'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                    <MapPin size={15} />
                    {status.text ?? order.meetup_status}
                    {order.meetup_expires_at && order.meetup_status === 'pending_artist' && (
                        <span className="ml-auto flex items-center gap-1 text-xs font-normal">
                            <Clock size={12} /> Expires {new Date(order.meetup_expires_at).toLocaleDateString()}
                        </span>
                    )}
                </div>

                {/* Map */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <div ref={containerRef} style={{ height: 320, width: '100%' }} />
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-widest mb-2">
                            <span className="text-base">🎨</span> Your Default
                        </div>
                        <p className="text-sm font-semibold text-ink line-clamp-2">
                            {artistAnchor?.label ?? order.meetup_label ?? 'Not set'}
                        </p>
                        {artistAnchor?.radius && (
                            <p className="text-xs text-violet-600">±{artistAnchor.radius}km radius</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-widest mb-2">
                            <span className="text-base">🛍️</span> Buyer's Suggestion
                        </div>
                        <p className="text-sm font-semibold text-ink line-clamp-2">
                            {order.meetup_proposed_label ?? '—'}
                        </p>
                        {dist && <p className="text-xs text-teal-600">{dist}km from your default</p>}
                        {order.meetup_note && (
                            <p className="text-xs text-ink-muted italic mt-1">"{order.meetup_note}"</p>
                        )}
                    </div>
                </div>

                {/* Round indicator */}
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <AlertTriangle size={12} className="text-amber-500" />
                    Round {order.meetup_round + 1} of {MAX_ROUNDS} · {roundsLeft > 0 ? `${roundsLeft} counter left` : 'Last round — revert will apply on counter'}
                </div>

                {/* Action buttons */}
                {order.meetup_status === 'pending_artist' && !counterMode && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => post(route('artist.meetup.approve', order.id))}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                            <CheckCircle size={16} /> Approve Buyer's Location
                        </button>
                        <button
                            type="button"
                            onClick={() => setCounterMode(true)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sienna bg-sienna/5 py-3.5 text-sm font-semibold text-sienna hover:bg-sienna/10 transition-colors"
                        >
                            <Navigation size={16} /> Counter-Propose
                        </button>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => post(route('artist.meetup.revert', order.id))}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border bg-canvas py-3.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors disabled:opacity-60"
                        >
                            <RotateCcw size={15} /> Revert to Default
                        </button>
                    </div>
                )}

                {/* Counter-propose form */}
                {counterMode && (
                    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                        <p className="text-sm font-semibold text-ink">📍 Choose Your Counter-Proposal</p>
                        <AddressMapPicker
                            initialAddress={artistAnchor?.label ?? ''}
                            onChange={(lat, lng, label) => {
                                counterForm.setData({ lat: lat ?? '', lng: lng ?? '', label: label ?? '' });
                                setCounterPin({ lat, lng, label });
                            }}
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setCounterMode(false)}
                                className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50">
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!counterPin || counterForm.processing}
                                onClick={() => counterForm.post(route('artist.meetup.counter', order.id))}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sienna py-2.5 text-sm font-semibold text-white hover:bg-sienna-600 disabled:opacity-60"
                            >
                                <MapPin size={14} /> Send Counter-Proposal
                            </button>
                        </div>
                    </div>
                )}

                {order.meetup_status === 'agreed' && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-700">Location confirmed!</p>
                            <p className="text-xs text-emerald-600">{order.meetup_label ?? order.meetup_proposed_label}</p>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
