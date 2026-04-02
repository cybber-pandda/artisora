import { useState, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, X, Image, Video, Tag, DollarSign,
    Ruler, Brush, ArrowLeft, ShoppingBag, FileText, Star, Weight, ScanLine,
} from 'lucide-react';

import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const MEDIUMS = [
    'Oil on Canvas', 'Acrylic', 'Watercolor', 'Oil on Linen',
    'Mixed Media', 'Charcoal & Ink', 'Digital Art', 'Pastel', 'Other',
];

export default function CreateListing() {
    const coverRef   = useRef();
    const galleryRef = useRef();

    const [coverPreview,    setCoverPreview]    = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([]);
    // Index into galleryPreviews of the image chosen as AR primary (-1 = none)
    const [arPrimaryIdx, setArPrimaryIdx] = useState(-1);

    const { data, setData, post, processing, errors } = useForm({
        title:              '',
        description:        '',
        medium:             '',
        dimensions:         '',        // human-readable "W × H cm"
        physical_width_cm:  '',
        physical_height_cm: '',
        weight:             '',
        price:              '',
        cover_image:        null,
        media:              [],
        // ar_primary_media_id is derived on submit — gallery images aren't uploaded yet at this point,
        // so we store the index and handle it via a hidden field name convention in the multipart data.
        // The backend currently accepts ar_primary_media_id for update(); for create() we set
        // sort_order=0 for the chosen one and use a separate flag field.
    });

    // ── Dimension helpers ────────────────────────────────────────
    const [widthCm,  setWidthCm]  = useState('');
    const [heightCm, setHeightCm] = useState('');

    const updateDimensions = (w, h) => {
        const parts = [];
        if (w) parts.push(`${w} cm`);
        if (h) parts.push(`${h} cm`);
        // Format: "W × H cm" when both present, else just the one
        const label = w && h ? `${w} × ${h} cm` : parts[0] || '';
        setData(prev => ({
            ...prev,
            dimensions:         label,
            physical_width_cm:  w,
            physical_height_cm: h,
        }));
    };

    const handleWidthChange = (e) => {
        const val = e.target.value.replace(/[^0-9.]/g, '');
        setWidthCm(val);
        updateDimensions(val, heightCm);
    };

    const handleHeightChange = (e) => {
        const val = e.target.value.replace(/[^0-9.]/g, '');
        setHeightCm(val);
        updateDimensions(widthCm, val);
    };

    // ── Cover image handler ──────────────────────────────────────
    const handleCover = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverPreview(URL.createObjectURL(file));
        setData('cover_image', file);
    };

    const removeCover = () => {
        setCoverPreview(null);
        setData('cover_image', null);
        if (coverRef.current) coverRef.current.value = '';
    };

    // ── Gallery media handler ────────────────────────────────────
    const handleGallery = (e) => {
        const files = Array.from(e.target.files);
        const newPreviews = files.map(file => ({
            file,
            url:  URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(1),
        }));
        setGalleryPreviews(prev => [...prev, ...newPreviews].slice(0, 10));
        setData('media', [...data.media, ...files].slice(0, 10));
    };

    const removeGallery = (index) => {
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
        setData('media', data.media.filter((_, i) => i !== index));
        // If the removed item was AR primary, reset
        if (arPrimaryIdx === index) setArPrimaryIdx(-1);
        else if (arPrimaryIdx > index) setArPrimaryIdx(i => i - 1);
    };

    const toggleArPrimary = (index) => {
        // Only images can be AR primary
        if (galleryPreviews[index]?.type !== 'image') return;
        setArPrimaryIdx(prev => (prev === index ? -1 : index));
    };

    // ── Submit ───────────────────────────────────────────────────
    const submit = (e) => {
        e.preventDefault();
        // We pass arPrimaryIdx so the backend knows which uploaded file to flag.
        // The ListingController store() ignores this for now (sets all to false),
        // but we can extend it later. For now the flag is set via EditListing after upload.
        post(route('artist.listings.store'), { forceFormData: true });
    };

    const imageGalleryItems = galleryPreviews.filter(p => p.type === 'image');
    const hasImages = imageGalleryItems.length > 0;

    return (
        <AppLayout title="Create Listing">
            <Head title="New Listing — Artisora" />

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
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sienna/10">
                            <ShoppingBag size={20} className="text-sienna" />
                        </div>
                        <div>
                            <h2 className="font-display text-3xl font-semibold text-ink">
                                List a Painting for Sale
                            </h2>
                            <p className="mt-0.5 text-sm text-ink-muted">
                                Your artwork will appear in the marketplace for buyers to discover.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* ═══ Cover Image (Shop Thumbnail) ═══════════════════ */}
                    <div className="rounded-xl border-2 border-sienna/20 bg-surface p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <Star size={14} className="text-sienna" />
                            <p className="text-xs font-semibold uppercase tracking-widest text-sienna">
                                Cover Photo <span className="text-sienna">*</span>
                            </p>
                        </div>
                        <p className="text-sm text-ink-muted">
                            This image will be displayed as the thumbnail in the shop. Choose a clear, high-quality photo of your artwork.
                        </p>

                        {coverPreview ? (
                            <div className="group relative inline-block">
                                <img
                                    src={coverPreview}
                                    alt="Cover preview"
                                    className="h-48 w-48 rounded-xl border-2 border-sienna/30 object-cover shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={removeCover}
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
                                <p className="text-2xs text-ink-muted">
                                    JPG, PNG, WEBP · Max 10MB
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

                    {/* ═══ Gallery Media (Detail Page) ═════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">
                                Gallery Photos &amp; Videos
                            </p>
                            <p className="text-sm text-ink-muted">
                                Additional photos and videos shown on the product detail page. These help buyers see every angle and detail.
                            </p>
                        </div>

                        {/* Preview grid */}
                        {galleryPreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                <AnimatePresence>
                                    {galleryPreviews.map((preview, i) => {
                                        const isARPrimary = arPrimaryIdx === i;
                                        const isImage     = preview.type === 'image';
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-canvas transition-all ${
                                                    isARPrimary
                                                        ? 'border-violet-500 shadow-md shadow-violet-200'
                                                        : 'border-border'
                                                }`}
                                            >
                                                {preview.type === 'video' ? (
                                                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                                                        <Video size={24} className="text-sienna" />
                                                        <p className="text-2xs font-medium text-ink-soft line-clamp-2">
                                                            {preview.name}
                                                        </p>
                                                        <p className="text-2xs text-ink-subtle">
                                                            {preview.size} MB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={preview.url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}

                                                {/* AR Primary badge */}
                                                {isARPrimary && (
                                                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-2xs font-bold text-white shadow">
                                                        <ScanLine size={10} />
                                                        AR
                                                    </span>
                                                )}

                                                {/* Action buttons — visible on hover */}
                                                <div className="absolute inset-0 flex items-start justify-between p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                    {/* AR star toggle (images only) */}
                                                    {isImage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleArPrimary(i)}
                                                            title={isARPrimary ? 'Remove as AR texture' : 'Use as AR texture'}
                                                            className={`flex h-6 w-6 items-center justify-center rounded-full shadow transition-all ${
                                                                isARPrimary
                                                                    ? 'bg-violet-600 text-white'
                                                                    : 'bg-white/90 text-ink-muted hover:text-violet-600'
                                                            }`}
                                                        >
                                                            <ScanLine size={12} />
                                                        </button>
                                                    )}
                                                    {!isImage && <span />}

                                                    {/* Remove */}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGallery(i)}
                                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {galleryPreviews.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={() => galleryRef.current.click()}
                                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-ink-subtle transition-colors hover:border-sienna/40 hover:text-sienna"
                                    >
                                        <Upload size={20} />
                                        <span className="text-xs font-medium">Add more</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Drop zone */}
                        {galleryPreviews.length === 0 && (
                            <button
                                type="button"
                                onClick={() => galleryRef.current.click()}
                                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 transition-colors hover:border-sienna/40 hover:bg-sienna/5"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
                                    <Upload size={20} className="text-stone-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-ink">
                                        Add gallery photos &amp; videos
                                    </p>
                                    <p className="mt-1 text-xs text-ink-muted">
                                        JPG, PNG, WEBP up to 10MB · MP4, MOV up to 100MB · Max 10 files
                                    </p>
                                </div>
                            </button>
                        )}

                        <input
                            ref={galleryRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={handleGallery}
                        />
                        <InputError message={errors.media} className="mt-1" />

                        {/* AR hint */}
                        {hasImages && arPrimaryIdx === -1 && (
                            <div className="flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3.5 py-2.5">
                                <ScanLine size={14} className="mt-0.5 flex-shrink-0 text-violet-500" />
                                <p className="text-xs text-violet-700">
                                    <span className="font-semibold">Tip:</span> Hover over a photo and tap the <ScanLine size={11} className="inline mb-0.5" /> icon to mark it as the AR texture — the image buyers will see projected on their wall.
                                </p>
                            </div>
                        )}
                        {arPrimaryIdx !== -1 && (
                            <div className="flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3.5 py-2.5">
                                <ScanLine size={14} className="flex-shrink-0 text-violet-600" />
                                <p className="text-xs text-violet-700 font-medium">
                                    "{galleryPreviews[arPrimaryIdx]?.name}" will be used as the AR wall texture.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ═══ Painting Details ════════════════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Painting Details
                        </p>

                        {/* Title */}
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
                                placeholder="e.g. Golden Hour Study"
                                required
                            />
                            <InputError message={errors.title} className="mt-1" />
                        </div>

                        {/* Description */}
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
                                placeholder="Tell buyers about this piece — your inspiration, technique, materials used, or the story behind it…"
                                maxLength={5000}
                            />
                            <div className="mt-1 flex items-center justify-between">
                                <InputError message={errors.description} />
                                <p className="text-xs text-ink-subtle">
                                    {data.description.length}/5000
                                </p>
                            </div>
                        </div>

                        {/* Medium */}
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
                            </div>
                        </div>

                        {/* Physical Dimensions (W × H in cm) */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                <Ruler size={13} className="text-ink-muted" />
                                Physical Dimensions (cm)
                                <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-2xs font-semibold text-violet-600">
                                    AR
                                </span>
                            </label>
                            <div className="flex items-center gap-2">
                                {/* Width */}
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={inputCls}
                                        value={widthCm}
                                        onChange={handleWidthChange}
                                        placeholder="Width"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-subtle">
                                        cm
                                    </span>
                                </div>

                                <span className="text-lg font-light text-ink-subtle">×</span>

                                {/* Height */}
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={inputCls}
                                        value={heightCm}
                                        onChange={handleHeightChange}
                                        placeholder="Height"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-subtle">
                                        cm
                                    </span>
                                </div>
                            </div>

                            {/* Live preview of what gets stored */}
                            {(widthCm || heightCm) && (
                                <p className="mt-1.5 text-xs text-ink-muted">
                                    Stored as: <span className="font-semibold text-ink">{data.dimensions}</span>
                                </p>
                            )}

                            <InputError message={errors.physical_width_cm  || errors.physical_height_cm} className="mt-1" />
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                                <ScanLine size={11} className="text-violet-500" />
                                Required for the "View on Your Wall" AR feature — used to scale the painting to its real-life size.
                            </p>
                        </div>

                    </div>

                    {/* ═══ Pricing ═════════════════════════════════════════ */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Pricing
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
                                    placeholder="0.00"
                                    min="1"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <InputError message={errors.price} className="mt-1" />
                            <p className="mt-1.5 text-xs text-ink-subtle">
                                Set the selling price for this original artwork.
                            </p>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <motion.button
                            type="submit"
                            disabled={processing || !data.cover_image}
                            whileTap={{ scale: 0.98 }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sienna py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Publishing…
                                </>
                            ) : (
                                <>
                                    <ShoppingBag size={15} />
                                    Publish Listing
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
