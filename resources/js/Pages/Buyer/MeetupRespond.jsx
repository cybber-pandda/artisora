import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import AddressMapPicker from '@/Components/AddressMapPicker';
import {
    MapPin, CheckCircle, ChevronRight, Clock, AlertTriangle,
    Navigation, Info,
} from 'lucide-react';

const KEY   = import.meta.env.VITE_MAPTILER_API_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

const MAX_ROUNDS = 3;

export default function MeetupRespond({ order, artistAnchor }) {
    const containerRef = useRef(null);
    const mapRef       = useRef(null);
    const [rejectMode, setRejectMode] = useState(false);
    const [newPin,     setNewPin]     = useState(null);

    const respondForm = useForm({ action: 'accept' });
    const rejectForm  = useForm({ action: 'reject', lat: '', lng: '', label: '', note: '' });

    useEffect(() => {
        const center = order.meetup_proposed_lat
            ? [order.meetup_proposed_lng, order.meetup_proposed_lat]
            : artistAnchor
                ? [artistAnchor.lng, artistAnchor.lat]
                : [121.0, 12.5];

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            center,
            zoom: order.meetup_proposed_lat ? 14 : 5.5,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            // Artist's anchor (purple)
            if (artistAnchor?.lat) {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
                el.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#7c3aed;
                        border:3px solid white;box-shadow:0 3px 12px rgba(124,58,237,.5);
                        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">
                        <span style="transform:rotate(45deg);font-size:14px">🎨</span>
                    </div>
                    <div style="margin-top:3px;background:#7c3aed;color:white;font-size:9px;
                        font-weight:700;padding:2px 7px;border-radius:10px">Artist's Spot</div>
                `;
                new maplibregl.Marker({ element: el })
                    .setLngLat([artistAnchor.lng, artistAnchor.lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setText(artistAnchor.label ?? 'Artist\'s spot'))
                    .addTo(map);
            }

            // Artist's counter proposal (orange)
            if (order.meetup_proposed_lat) {
                const el2 = document.createElement('div');
                el2.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
                el2.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#ea580c;
                        border:3px solid white;box-shadow:0 3px 12px rgba(234,88,12,.5);
                        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">
                        <span style="transform:rotate(45deg);font-size:14px">🎨</span>
                    </div>
                    <div style="margin-top:3px;background:#ea580c;color:white;font-size:9px;
                        font-weight:700;padding:2px 7px;border-radius:10px">Artist Counter</div>
                `;
                new maplibregl.Marker({ element: el2 })
                    .setLngLat([order.meetup_proposed_lng, order.meetup_proposed_lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setText(order.meetup_proposed_label ?? 'Artist\'s counter'))
                    .addTo(map);

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

    const roundsLeft = MAX_ROUNDS - (order.meetup_round ?? 0) - 1;

    return (
        <AppLayout title={`Respond to Meet-up — Order #${order.id}`}>
            <Head title={`Artist's Meet-up Counter-Proposal — Order #${order.id}`} />

            <div className="mx-auto max-w-3xl space-y-5">
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Link href={route('buyer.orders')} className="hover:text-sienna transition-colors">My Orders</Link>
                    <ChevronRight size={13} />
                    <span className="text-ink font-medium">Respond to Meet-up Proposal — Order #{order.id}</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700">
                    <MapPin size={15} />
                    Artist proposed a different meet-up location
                    {order.meetup_expires_at && (
                        <span className="ml-auto flex items-center gap-1 text-xs font-normal">
                            <Clock size={12} /> Expires {new Date(order.meetup_expires_at).toLocaleDateString()}
                        </span>
                    )}
                </div>

                {/* Map */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <div ref={containerRef} style={{ height: 300, width: '100%' }} />
                </div>

                {/* Artist's counter detail */}
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-700">🎨 Artist's Counter-Proposal</p>
                    <p className="text-base font-semibold text-ink">{order.meetup_proposed_label}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <AlertTriangle size={12} className="text-amber-500" />
                    Round {order.meetup_round} of {MAX_ROUNDS} · {roundsLeft > 0 ? `You have ${roundsLeft} more round(s) to counter` : 'Final round — rejection will revert to artist default'}
                </div>

                {!rejectMode ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            disabled={respondForm.processing}
                            onClick={() => respondForm.post(route('buyer.meetup.respond', order.id))}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            <CheckCircle size={16} /> Accept This Location
                        </button>
                        <button
                            type="button"
                            onClick={() => setRejectMode(true)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sienna bg-sienna/5 py-3.5 text-sm font-semibold text-sienna hover:bg-sienna/10"
                        >
                            <Navigation size={16} /> {roundsLeft > 0 ? 'Suggest a Different Spot' : 'Reject (Revert to Artist Default)'}
                        </button>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                        <p className="text-sm font-semibold text-ink">📍 Suggest Your Preferred Location</p>
                        {roundsLeft <= 0 && (
                            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                                <Info size={13} className="mt-0.5 flex-shrink-0" />
                                Max rounds reached. If you reject, the meet-up will revert to the artist's default location.
                            </div>
                        )}
                        {roundsLeft > 0 && (
                            <>
                                <AddressMapPicker
                                    initialAddress=""
                                    onChange={(lat, lng, label) => {
                                        rejectForm.setData(prev => ({ ...prev, lat: lat ?? '', lng: lng ?? '', label: label ?? '' }));
                                        setNewPin({ lat, lng, label });
                                    }}
                                />
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1.5">
                                        Your Note <span className="font-normal normal-case tracking-normal text-ink-subtle">(optional)</span>
                                    </label>
                                    <textarea
                                        value={rejectForm.data.note}
                                        onChange={e => rejectForm.setData('note', e.target.value)}
                                        rows={2}
                                        placeholder="Explain why you prefer this spot…"
                                        className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none resize-none focus:border-sienna focus:ring-2 focus:ring-sienna/20"
                                    />
                                </div>
                            </>
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setRejectMode(false)}
                                className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50">
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={(roundsLeft > 0 && !newPin) || rejectForm.processing}
                                onClick={() => rejectForm.post(route('buyer.meetup.respond', order.id))}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sienna py-2.5 text-sm font-semibold text-white hover:bg-sienna-600 disabled:opacity-60"
                            >
                                <MapPin size={14} />
                                {roundsLeft > 0 ? 'Send My Suggestion' : 'Revert to Artist Default'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
