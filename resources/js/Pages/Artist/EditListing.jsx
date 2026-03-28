import { useState, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, X, Image, Video, Tag, DollarSign,
    Ruler, Brush, ArrowLeft, Save, AlertCircle, FileText, CheckCircle, Star, Weight,
} from 'lucide-react';

import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const MEDIUMS = [
    'Oil on Canvas', 'Acrylic', 'Watercolor', 'Oil on Linen',
    'Mixed Media', 'Charcoal & Ink', 'Digital Art', 'Pastel', 'Other',
];

export default function EditListing({ listing }) {
    const coverRef = useRef();
    const galleryRef = useRef();

    // Cover image state
    const [coverPreview, setCoverPreview] = useState(listing.cover_image_url || null);
    const [coverChanged, setCoverChanged] = useState(false);

    // Gallery media state
    const [existingMedia, setExistingMedia] = useState(listing.media || []);
    const [newPreviews, setNewPreviews] = useState([]);
    const [removeMediaIds, setRemoveMediaIds] = useState([]);

    const { data, setData, processing, errors } = useForm({
        title:        listing.title || '',
        description:  listing.description || '',
        medium:       listing.medium || '',
        dimensions:   listing.dimensions || '',
        weight:       listing.weight || '',
        price:        listing.price || '',
        is_sold:      listing.is_sold || false,
        cover_image:  null,
        new_media:    [],
        remove_media: [],
    });


    // ── Cover image handler ──────────────────────────────────
    const handleCover = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverPreview(URL.createObjectURL(file));
        setCoverChanged(true);
        setData('cover_image', file);
    };

    const removeCoverPreview = () => {
        setCoverPreview(null);
        setCoverChanged(true);
        setData('cover_image', null);
        if (coverRef.current) coverRef.current.value = '';
    };

    // ── Gallery handlers ─────────────────────────────────────
    const handleGallery = (e) => {
        const files = Array.from(e.target.files);
        const previews = files.map(file => ({
            file,
            url:  URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name,
        }));
        setNewPreviews(prev => [...prev, ...previews]);
        setData('new_media', [...data.new_media, ...files]);
    };

    const removeExisting = (mediaId) => {
        setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
        setRemoveMediaIds(prev => [...prev, mediaId]);
    };

    const removeNew = (index) => {
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
        setData('new_media', data.new_media.filter((_, i) => i !== index));
    };

    const submit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('title', data.title);
        formData.append('description', data.description || '');
        formData.append('medium', data.medium);
        formData.append('dimensions', data.dimensions || '');
        formData.append('weight', data.weight || '');
        formData.append('price', data.price);
        formData.append('is_sold', data.is_sold ? '1' : '0');


        if (data.cover_image) {
            formData.append('cover_image', data.cover_image);
        }

        removeMediaIds.forEach(id => formData.append('remove_media[]', id));
        data.new_media.forEach(file => formData.append('new_media[]', file));

        router.post(route('artist.listings.update', listing.id), formData, {
            forceFormData: true,
        });
    };

    const totalMedia = existingMedia.length + newPreviews.length;

    return (
        <AppLayout title="Edit Listing">
            <Head title="Edit Listing — Artisora" />

            <div className="mx-auto max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={route('artist.listings')}
                        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Listings
                    </Link>
                </div>

                <div>
                    <h2 className="font-display text-3xl font-semibold text-ink">
                        Edit Listing
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        Update your painting's details, photos, or price.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* ═══ Cover Image ═════════════════════════════════ */}
                    <div className="rounded-xl border-2 border-sienna/20 bg-surface p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <Star size={14} className="text-sienna" />
                            <p className="text-xs font-semibold uppercase tracking-widest text-sienna">
                                Cover Photo
                            </p>
                        </div>
                        <p className="text-sm text-ink-muted">
                            This image is displayed as the thumbnail in the shop browse page.
                        </p>

                        {coverPreview ? (
                            <div className="group relative inline-block">
                                <img
                                    src={coverPreview}
                                    alt="Cover preview"
                                    className="h-48 w-48 rounded-xl border-2 border-sienna/30 object-cover shadow-sm"
                                    onError={() => setCoverPreview(null)}
                                />
                                <button
                                    type="button"
                                    onClick={removeCoverPreview}
                                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                                >
                                    <X size={13} />
                                </button>
                                <span className="absolute bottom-2 left-2 rounded-full bg-sienna px-2.5 py-0.5 text-2xs font-bold text-white shadow">
                                    Shop Cover
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => coverRef.current.click()}
                                className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sienna/30 bg-sienna/5 transition-colors hover:border-sienna/50 hover:bg-sienna/10"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sienna/10">
                                    <Image size={20} className="text-sienna" />
                                </div>
                                <p className="text-xs font-semibold text-sienna">
                                    Upload Cover Photo
                                </p>
                            </button>
                        )}

                        <input
                            ref={coverRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleCover}
                        />
                        <InputError message={errors.cover_image} className="mt-1" />
                    </div>

                    {/* ═══ Gallery Media ═══════════════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Gallery Photos & Videos
                        </p>

                        <div className="grid grid-cols-3 gap-3">
                            {/* Existing media */}
                            {existingMedia.map(media => (
                                <div key={media.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-canvas">
                                    {media.type === 'video' ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                                            <Video size={24} className="text-sienna" />
                                            <p className="text-2xs font-medium text-ink-soft line-clamp-2">{media.name}</p>
                                        </div>
                                    ) : (
                                        <img src={media.url} alt="" className="h-full w-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeExisting(media.id)}
                                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* New previews */}
                            {newPreviews.map((preview, i) => (
                                <div key={`new-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/30">
                                    {preview.type === 'video' ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                                            <Video size={24} className="text-sienna" />
                                            <p className="text-2xs">{preview.name}</p>
                                        </div>
                                    ) : (
                                        <img src={preview.url} alt="" className="h-full w-full object-cover" />
                                    )}
                                    <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-2xs font-bold text-white">
                                        New
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeNew(i)}
                                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* Add more */}
                            {totalMedia < 10 && (
                                <button
                                    type="button"
                                    onClick={() => galleryRef.current.click()}
                                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-ink-subtle transition-colors hover:border-sienna/40 hover:text-sienna"
                                >
                                    <Upload size={20} />
                                    <span className="text-xs font-medium">Add</span>
                                </button>
                            )}
                        </div>

                        <input
                            ref={galleryRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={handleGallery}
                        />
                    </div>

                    {/* ═══ Details ═════════════════════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Painting Details
                        </p>

                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                <Tag size={13} className="text-ink-muted" />
                                Title <span className="text-sienna">*</span>
                            </label>
                            <input
                                type="text"
                                className={inputCls}
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                required
                            />
                            <InputError message={errors.title} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                <FileText size={13} className="text-ink-muted" />
                                Description
                            </label>
                            <textarea
                                rows={5}
                                className={inputCls}
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                maxLength={5000}
                            />
                            <div className="mt-1 flex items-center justify-between">
                                <InputError message={errors.description} />
                                <p className="text-xs text-ink-subtle">
                                    {(data.description || '').length}/5000
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                    <Brush size={13} className="text-ink-muted" />
                                    Medium <span className="text-sienna">*</span>
                                </label>
                                <select
                                    className={inputCls}
                                    value={data.medium}
                                    onChange={e => setData('medium', e.target.value)}
                                    required
                                >
                                    <option value="">Select medium…</option>
                                    {MEDIUMS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <InputError message={errors.medium} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                    <Ruler size={13} className="text-ink-muted" />
                                    Dimensions
                                </label>
                                <input
                                    type="text"
                                    className={inputCls}
                                    value={data.dimensions}
                                    onChange={e => setData('dimensions', e.target.value)}
                                    placeholder="e.g. 24×36 in"
                                />
                                <InputError message={errors.dimensions} className="mt-1" />
                            </div>
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                <Weight size={13} className="text-ink-muted" />
                                Weight (kg)
                            </label>
                            <input
                                type="number"
                                className={inputCls}
                                value={data.weight}
                                onChange={e => setData('weight', e.target.value)}
                                placeholder="e.g. 2.5"
                                min="0"
                                step="0.1"
                            />
                            <InputError message={errors.weight} className="mt-1" />
                            <p className="mt-1 text-xs text-ink-subtle">Used for delivery logistics — helps drivers choose the right vehicle.</p>
                        </div>

                    </div>

                    {/* ═══ Pricing & Status ════════════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Pricing & Status
                        </p>

                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                <DollarSign size={13} className="text-ink-muted" />
                                Price (₱) <span className="text-sienna">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
                                    ₱
                                </span>
                                <input
                                    type="number"
                                    className={`${inputCls} pl-8`}
                                    value={data.price}
                                    onChange={e => setData('price', e.target.value)}
                                    min="1"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <InputError message={errors.price} className="mt-1" />
                        </div>

                        {/* Mark as sold toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => setData('is_sold', !data.is_sold)}
                                className={`relative h-6 w-11 rounded-full transition-colors ${
                                    data.is_sold ? 'bg-stone-600' : 'bg-emerald-500'
                                }`}
                            >
                                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                    data.is_sold ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-ink">
                                    {data.is_sold ? 'Marked as Sold' : 'Available for Sale'}
                                </p>
                                <p className="text-xs text-ink-muted">
                                    {data.is_sold
                                        ? 'This artwork is no longer available for purchase.'
                                        : 'This artwork is listed and visible to buyers.'}
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <motion.button
                            type="submit"
                            disabled={processing}
                            whileTap={{ scale: 0.98 }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save size={15} />
                                    Save Changes
                                </>
                            )}
                        </motion.button>
                        <Link
                            href={route('artist.listings')}
                            className="rounded-lg border border-border bg-canvas px-5 py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-linen"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
