import { useState, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, X, Image, Video, Tag, DollarSign,
    Ruler, Brush, ArrowLeft, ShoppingBag, AlertCircle, FileText, Star, Weight,
} from 'lucide-react';

import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const MEDIUMS = [
    'Oil on Canvas', 'Acrylic', 'Watercolor', 'Oil on Linen',
    'Mixed Media', 'Charcoal & Ink', 'Digital Art', 'Pastel', 'Other',
];

export default function CreateListing() {
    const coverRef = useRef();
    const galleryRef = useRef();
    const [coverPreview, setCoverPreview] = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([]);

    const { data, setData, post, processing, errors } = useForm({
        title:       '',
        description: '',
        medium:      '',
        dimensions:  '',
        weight:      '',
        price:       '',
        cover_image: null,
        media:       [],
    });


    // ── Cover image handler ──────────────────────────────────
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

    // ── Gallery media handler ────────────────────────────────
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
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('artist.listings.store'), { forceFormData: true });
    };

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
                                Gallery Photos & Videos
                            </p>
                            <p className="text-sm text-ink-muted">
                                Additional photos and videos shown on the product detail page. These help buyers see every angle and detail.
                            </p>
                        </div>

                        {/* Preview grid */}
                        {galleryPreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                <AnimatePresence>
                                    {galleryPreviews.map((preview, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-canvas"
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
                                            <button
                                                type="button"
                                                onClick={() => removeGallery(i)}
                                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                        </motion.div>
                                    ))}
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
                                        Add gallery photos & videos
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

                        <div className="grid grid-cols-2 gap-4">
                            {/* Medium */}
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

                            {/* Dimensions */}
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
