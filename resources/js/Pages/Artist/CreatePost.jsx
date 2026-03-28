import { useState, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, X, Image, Video, Tag, DollarSign,
    Ruler, Brush, ArrowLeft, Eye, AlertCircle,
} from 'lucide-react';
import InputError from '@/Components/InputError';

const inputCls = 'block w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

const MEDIUMS = [
    'Oil on Canvas', 'Acrylic', 'Watercolor', 'Oil on Linen',
    'Mixed Media', 'Charcoal & Ink', 'Digital Art', 'Pastel', 'Other',
];

export default function CreatePost() {
    const fileRef = useRef();
    const [previews, setPreviews] = useState([]);

    const { data, setData, post, processing, errors, reset } = useForm({
        title:       '',
        description: '',
        medium:      '',
        dimensions:  '',
        price:       '',
        is_for_sale: false,
        media:       [],
    });

    const handleFiles = (e) => {
        const files = Array.from(e.target.files);
        const newPreviews = files.map(file => ({
            file,
            url:  URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(1),
        }));
        setPreviews(prev => [...prev, ...newPreviews].slice(0, 10));
        setData('media', [...data.media, ...files].slice(0, 10));
    };

    const removeFile = (index) => {
        const newPreviews = previews.filter((_, i) => i !== index);
        const newMedia    = data.media.filter((_, i) => i !== index);
        setPreviews(newPreviews);
        setData('media', newMedia);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('artist.posts.store'), { forceFormData: true });
    };

    return (
        <AppLayout title="Create Post">
            <Head title="New Art Post — Artisora" />

            <div className="mx-auto max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/feed"
                        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
                    >
                        <ArrowLeft size={14} /> Back to Feed
                    </Link>
                </div>

                <div>
                    <h2 className="font-display text-4xl font-semibold text-ink">
                        Share Your Work
                    </h2>
                    <p className="mt-1 text-base text-ink-muted">
                        Post your artwork or timelapse video to the community feed.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* ── Media upload ───────────────────────────── */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">
                                Artwork / Video
                            </p>
                            <p className="text-sm text-ink-muted">
                                Upload up to 10 files — images (JPG, PNG, WEBP) up to 10MB each,
                                or timelapse videos (MP4, MOV) up to 100MB each.
                            </p>
                        </div>

                        {/* Preview grid */}
                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                <AnimatePresence>
                                    {previews.map((preview, i) => (
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

                                            {/* Remove button */}
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>

                                            {/* Type badge */}
                                            <div className="absolute bottom-1.5 left-1.5">
                                                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold text-white ${
                                                    preview.type === 'video' ? 'bg-blue-500' : 'bg-sienna'
                                                }`}>
                                                    {preview.type === 'video'
                                                        ? <><Video size={9} /> Video</>
                                                        : <><Image size={9} /> Photo</>
                                                    }
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Add more */}
                                {previews.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current.click()}
                                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-ink-subtle transition-colors hover:border-sienna/40 hover:text-sienna"
                                    >
                                        <Upload size={20} />
                                        <span className="text-xs font-medium">Add more</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Drop zone */}
                        {previews.length === 0 && (
                            <button
                                type="button"
                                onClick={() => fileRef.current.click()}
                                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-sienna/40 hover:bg-sienna/5"
                            >
                                <div className="flex gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sienna/10">
                                        <Image size={22} className="text-sienna" />
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                                        <Video size={22} className="text-blue-600" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-ink">
                                        Click to upload photos or videos
                                    </p>
                                    <p className="mt-1 text-xs text-ink-muted">
                                        JPG, PNG, WEBP up to 10MB · MP4, MOV up to 100MB · Max 10 files
                                    </p>
                                </div>
                            </button>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={handleFiles}
                        />
                        <InputError message={errors.media} className="mt-1" />
                        {errors['media.0'] && (
                            <p className="text-sm text-red-600 flex items-center gap-1.5">
                                <AlertCircle size={13} /> {errors['media.0']}
                            </p>
                        )}
                    </div>

                    {/* ── Post details ───────────────────────────── */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Post Details
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
                            <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                                Description
                            </label>
                            <textarea
                                rows={4}
                                className={inputCls}
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder="Share the story behind this piece — your inspiration, technique, or process…"
                                maxLength={2000}
                            />
                            <div className="mt-1 flex items-center justify-between">
                                <InputError message={errors.description} />
                                <p className="text-xs text-ink-subtle">
                                    {data.description.length}/2000
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Medium */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                    <Brush size={13} className="text-ink-muted" />
                                    Medium
                                </label>
                                <select
                                    className={inputCls}
                                    value={data.medium}
                                    onChange={e => setData('medium', e.target.value)}
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
                    </div>

                    {/* ── Pricing ────────────────────────────────── */}
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Pricing
                        </p>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => setData('is_for_sale', !data.is_for_sale)}
                                className={`relative h-6 w-11 rounded-full transition-colors ${
                                    data.is_for_sale ? 'bg-sienna' : 'bg-stone-200'
                                }`}
                            >
                                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                    data.is_for_sale ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-ink">List for Sale</p>
                                <p className="text-xs text-ink-muted">
                                    This artwork is available for purchase
                                </p>
                            </div>
                        </label>

                        <AnimatePresence>
                            {data.is_for_sale && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                                        <DollarSign size={13} className="text-ink-muted" />
                                        Price (₱)
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
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <InputError message={errors.price} className="mt-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <motion.button
                            type="submit"
                            disabled={processing || previews.length === 0}
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
                                    <Eye size={15} />
                                    Publish Post
                                </>
                            )}
                        </motion.button>
                        <Link
                            href="/feed"
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