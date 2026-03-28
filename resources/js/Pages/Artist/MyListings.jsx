import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Eye, Heart, Pencil, Trash2, Package,
    CheckCircle, AlertCircle, TrendingUp, Image as ImageIcon,
} from 'lucide-react';

export default function MyListings({ listings, stats }) {
    const [deleteId, setDeleteId] = useState(null);

    const handleDelete = (id) => {
        router.delete(route('artist.listings.destroy', id), {
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <AppLayout title="My Listings">
            <Head title="My Listings — Artisora" />

            <div className="mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="font-display text-4xl font-semibold text-ink">
                            My Listings
                        </h2>
                        <p className="mt-1 text-base text-ink-muted">
                            Manage your paintings listed for sale in the marketplace.
                        </p>
                    </div>
                    <Link
                        href={route('artist.listings.create')}
                        className="flex items-center gap-2 self-start rounded-xl bg-sienna px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-sienna-600 hover:shadow-lg sm:self-auto"
                    >
                        <Plus size={16} />
                        New Listing
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Listings', value: stats.total,  icon: Package,     color: 'text-blue-600 bg-blue-50' },
                        { label: 'Active',         value: stats.active, icon: CheckCircle,  color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'Sold',           value: stats.sold,   icon: TrendingUp,   color: 'text-amber-600 bg-amber-50' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                                    <s.icon size={18} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-ink">{s.value}</p>
                                    <p className="text-xs font-medium text-ink-muted">{s.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Listings grid */}
                {listings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence>
                            {listings.map(listing => (
                                <motion.div
                                    key={listing.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-md"
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
                                        {listing.thumbnail ? (
                                            <img
                                                src={listing.thumbnail}
                                                alt={listing.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className={`h-full w-full flex-col items-center justify-center gap-1.5 ${listing.thumbnail ? 'hidden' : 'flex'}`}
                                            style={{
                                                background: `linear-gradient(135deg, hsl(${[...listing.title].reduce((h,c) => (h + c.charCodeAt(0) * 37) % 360, 0)}, 40%, 82%) 0%, hsl(${([...listing.title].reduce((h,c) => (h + c.charCodeAt(0) * 37) % 360, 0) + 40) % 360}, 35%, 72%) 100%)`
                                            }}
                                        >
                                            <span className="text-4xl">🎨</span>
                                            <span className="max-w-[80%] truncate text-xs font-semibold text-white/90 drop-shadow">
                                                {listing.title}
                                            </span>
                                        </div>

                                        {/* Status badge */}
                                        <span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider ${
                                            listing.is_sold
                                                ? 'bg-stone-600 text-white'
                                                : 'bg-emerald-500 text-white'
                                        }`}>
                                            {listing.is_sold ? 'Sold' : 'Active'}
                                        </span>

                                        {/* Actions overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition-all group-hover:bg-black/20">
                                            <Link
                                                href={route('artist.listings.edit', listing.id)}
                                                className="flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white text-ink shadow-md opacity-0 transition-all hover:bg-sienna hover:text-white group-hover:translate-y-0 group-hover:opacity-100"
                                            >
                                                <Pencil size={14} />
                                            </Link>
                                            <button
                                                onClick={() => setDeleteId(listing.id)}
                                                className="flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white text-red-500 shadow-md opacity-0 transition-all delay-75 hover:bg-red-500 hover:text-white group-hover:translate-y-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex flex-1 flex-col p-4">
                                        <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                                            {listing.medium || 'No medium'}
                                        </p>
                                        <h3 className="mt-1 font-display text-lg font-semibold text-ink line-clamp-1">
                                            {listing.title}
                                        </h3>
                                        {listing.dimensions && (
                                            <p className="mt-0.5 text-xs text-ink-subtle">{listing.dimensions}</p>
                                        )}
                                        <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                                            <span className="flex items-center gap-1">
                                                <Eye size={11} /> {listing.views_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart size={11} /> {listing.likes_count}
                                            </span>
                                        </div>
                                        <div className="my-3 h-px bg-border" />
                                        <div className="flex items-center justify-between">
                                            <span className="font-display text-xl font-bold text-sienna">
                                                ₱{parseFloat(listing.price).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-ink-subtle">
                                                {listing.created_at}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
                        <span className="mb-4 text-5xl">🖼️</span>
                        <h3 className="font-display text-2xl font-semibold text-ink">
                            No listings yet
                        </h3>
                        <p className="mt-2 text-sm text-ink-muted">
                            Upload your first painting to start selling.
                        </p>
                        <Link
                            href={route('artist.listings.create')}
                            className="mt-5 flex items-center gap-2 rounded-lg bg-sienna px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                        >
                            <Plus size={15} />
                            Create Your First Listing
                        </Link>
                    </div>
                )}

                {/* Delete confirmation modal */}
                <AnimatePresence>
                    {deleteId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            onClick={() => setDeleteId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="mx-4 w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl"
                            >
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                                    <AlertCircle size={22} className="text-red-500" />
                                </div>
                                <h3 className="font-display text-lg font-semibold text-ink">
                                    Delete Listing?
                                </h3>
                                <p className="mt-1 text-sm text-ink-muted">
                                    This will permanently remove the listing and its images. This action cannot be undone.
                                </p>
                                <div className="mt-5 flex gap-3">
                                    <button
                                        onClick={() => handleDelete(deleteId)}
                                        className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setDeleteId(null)}
                                        className="flex-1 rounded-lg border border-border bg-canvas py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-linen"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    );
}
