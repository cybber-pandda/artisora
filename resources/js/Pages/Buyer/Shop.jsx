import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, SlidersHorizontal, Heart, ShoppingCart,
    Eye, ChevronDown, X, Flame, Sparkles,
    ChevronLeft, ChevronRight, Image as ImageIcon,
} from 'lucide-react';

// ── Seed-based hue for consistent gradients ────────────────────────
function titleHue(title) {
    let h = 0;
    for (let i = 0; i < (title || '').length; i++) h = (h + title.charCodeAt(i) * 37) % 360;
    return h;
}

// ── Art Placeholder (shown when image fails / no image) ────────────
function ArtPlaceholder({ title, className = '' }) {
    const hue = titleHue(title);
    return (
        <div
            className={`flex h-full w-full items-center justify-center ${className}`}
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 40%, 82%) 0%, hsl(${(hue + 40) % 360}, 35%, 72%) 100%)` }}
        >
            <div className="flex flex-col items-center gap-1.5 opacity-80">
                <span className="text-4xl">🎨</span>
                <span className="max-w-[80%] truncate text-center text-xs font-semibold text-white/90 drop-shadow">
                    {title}
                </span>
            </div>
        </div>
    );
}

// ── Safe Image (shows placeholder until loaded) ────────────────────
function SafeImage({ src, alt, className }) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    return (
        <>
            {(!loaded || failed) && <ArtPlaceholder title={alt} />}
            {src && !failed && (
                <img
                    src={src}
                    alt={alt}
                    className={`${className} ${loaded ? '' : 'absolute inset-0 opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            )}
        </>
    );
}

// ── Badge ──────────────────────────────────────────────────────────
function Badge({ sold }) {
    if (!sold) return null;
    return (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-stone-600 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-white">
            Sold
        </span>
    );
}

// ── Product Card ───────────────────────────────────────────────────
function ProductCard({ product }) {
    const [wishlisted, setWishlisted] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-md"
        >
            {/* Image */}
            <div className="relative overflow-hidden">
                <Badge sold={product.is_sold} />

                {/* Wishlist */}
                <button
                    onClick={(e) => { e.stopPropagation(); setWishlisted(v => !v); }}
                    className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all hover:scale-110 ${
                        wishlisted ? 'bg-red-50' : 'bg-white/90 hover:bg-white'
                    }`}
                >
                    <Heart
                        size={14}
                        className={wishlisted ? 'fill-red-500 text-red-500' : 'text-ink-muted'}
                    />
                </button>

                {/* Artwork thumbnail */}
                <Link href={route('buyer.shop.show', product.id)}>
                    <div className={`relative h-52 w-full transition-transform duration-500 ${product.is_sold ? 'opacity-60' : 'group-hover:scale-105'}`}>
                        <SafeImage
                            src={product.thumbnail}
                            alt={product.title}
                            className="h-full w-full object-cover"
                        />
                    </div>
                </Link>

                {/* Quick-view overlay */}
                {!product.is_sold && (
                    <Link
                        href={route('buyer.shop.show', product.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/15"
                    >
                        <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <Eye size={12} /> View Details
                        </span>
                    </Link>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-4">
                {/* Medium tag */}
                <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                    {product.medium || 'Original Work'}
                </p>

                {/* Title */}
                <Link href={route('buyer.shop.show', product.id)}>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-ink line-clamp-1 hover:text-sienna transition-colors">
                        {product.title}
                    </h3>
                </Link>

                {/* Artist */}
                <p className="mt-0.5 text-sm text-ink-muted">
                    by{' '}
                    <Link
                        href={`/profile/${product.artist.id}`}
                        className="font-medium text-ink-soft hover:text-sienna transition-colors"
                    >
                        {product.artist.display_name}
                    </Link>
                </p>

                {/* Stats */}
                <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                        <Eye size={11} /> {product.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart size={11} /> {product.likes_count}
                    </span>
                    {product.media_count > 1 && (
                        <span className="flex items-center gap-1">
                            <ImageIcon size={11} /> {product.media_count}
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="my-3 h-px bg-border" />

                {/* Price + CTA */}
                <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-bold text-sienna">
                        ₱{product.price.toLocaleString()}
                    </span>

                    {product.is_sold ? (
                        <span className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-subtle">
                            Sold Out
                        </span>
                    ) : (
                        <Link
                            href={route('buyer.shop.show', product.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sienna"
                        >
                            <ShoppingCart size={12} />
                            View
                        </Link>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Sort Options ───────────────────────────────────────────────────
const SORT_OPTIONS = [
    { label: 'Newest',          value: 'newest' },
    { label: 'Price: Low–High', value: 'price_asc' },
    { label: 'Price: High–Low', value: 'price_desc' },
    { label: 'Most Popular',    value: 'popular' },
    { label: 'Most Liked',      value: 'rating' },
];

const PRICE_RANGES = [
    { label: 'All Prices',     min: '',    max: '' },
    { label: 'Under ₱3,000',   min: '',    max: '3000' },
    { label: '₱3,000–₱6,000',  min: '3000', max: '6000' },
    { label: '₱6,000–₱9,000',  min: '6000', max: '9000' },
    { label: 'Above ₱9,000',   min: '9000', max: '' },
];

// ── Main Shop Page ─────────────────────────────────────────────────
export default function Shop({ products, mediums, filters }) {
    const [search, setSearch]           = useState(filters.search || '');
    const [showSort, setShowSort]       = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                applyFilters({ search });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const applyFilters = useCallback((overrides = {}) => {
        const params = {
            search:    overrides.search ?? filters.search,
            medium:    overrides.medium ?? filters.medium,
            price_min: overrides.price_min ?? filters.price_min,
            price_max: overrides.price_max ?? filters.price_max,
            sort:      overrides.sort ?? filters.sort,
        };

        // Remove empty params
        Object.keys(params).forEach(k => {
            if (!params[k]) delete params[k];
        });

        router.get(route('buyer.shop'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [filters]);

    const clearFilters = () => {
        setSearch('');
        router.get(route('buyer.shop'), {}, {
            preserveState: true,
        });
    };

    const activeFiltersCount =
        (filters.medium ? 1 : 0) +
        (filters.price_min || filters.price_max ? 1 : 0);

    const currentPriceRange = PRICE_RANGES.findIndex(
        r => r.min === (filters.price_min || '') && r.max === (filters.price_max || '')
    );

    return (
        <AppLayout title="Shop">
            <Head title="Discover Paintings — Artisora" />

            <div className="mx-auto max-w-7xl space-y-6">

                {/* ── Page header ───────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-display text-4xl font-semibold text-ink">
                                Discover Paintings
                            </h2>
                            <span className="flex items-center gap-1 rounded-full bg-sienna/10 px-2.5 py-1 text-xs font-semibold text-sienna">
                                <Flame size={11} />
                                {products.total} artworks
                            </span>
                        </div>
                        <p className="mt-1 text-base text-ink-muted">
                            Original works from verified Filipino artists — ready to ship nationwide.
                        </p>
                    </div>
                </div>

                {/* ── Search + controls bar ─────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                            type="text"
                            placeholder="Search artworks or artists…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-canvas py-2.5 pl-9 pr-10 text-sm text-ink placeholder-ink-subtle transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); applyFilters({ search: '' }); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                            showFilters || activeFiltersCount > 0
                                ? 'border-sienna bg-sienna/5 text-sienna'
                                : 'border-border bg-surface text-ink-soft hover:border-sienna/40 hover:text-ink'
                        }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sienna text-2xs font-bold text-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    {/* Sort */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSort(v => !v)}
                            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-sienna/40 hover:text-ink"
                        >
                            {SORT_OPTIONS.find(o => o.value === filters.sort)?.label || 'Newest'}
                            <ChevronDown size={13} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showSort && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                                >
                                    {SORT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { applyFilters({ sort: opt.value }); setShowSort(false); }}
                                            className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-canvas ${
                                                filters.sort === opt.value ? 'font-semibold text-sienna' : 'text-ink-soft'
                                            }`}
                                        >
                                            {opt.label}
                                            {filters.sort === opt.value && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-sienna" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Filter panel ──────────────────────────────── */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                                    {/* Medium */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                            Medium
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => applyFilters({ medium: '' })}
                                                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                                                    !filters.medium
                                                        ? 'bg-ink text-white shadow-xs'
                                                        : 'border border-border bg-canvas text-ink-soft hover:border-sienna/40 hover:text-ink'
                                                }`}
                                            >
                                                All
                                            </button>
                                            {mediums.map(med => (
                                                <button
                                                    key={med}
                                                    onClick={() => applyFilters({ medium: med })}
                                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                                                        filters.medium === med
                                                            ? 'bg-ink text-white shadow-xs'
                                                            : 'border border-border bg-canvas text-ink-soft hover:border-sienna/40 hover:text-ink'
                                                    }`}
                                                >
                                                    {med}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price range */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                            Price Range
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {PRICE_RANGES.map((range, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => applyFilters({ price_min: range.min, price_max: range.max })}
                                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                                                        currentPriceRange === i
                                                            ? 'bg-ink text-white shadow-xs'
                                                            : 'border border-border bg-canvas text-ink-soft hover:border-sienna/40 hover:text-ink'
                                                    }`}
                                                >
                                                    {range.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Clear filters */}
                                {activeFiltersCount > 0 && (
                                    <div className="mt-4 border-t border-border pt-4">
                                        <button
                                            onClick={clearFilters}
                                            className="flex items-center gap-1.5 text-sm font-medium text-sienna hover:text-sienna-600"
                                        >
                                            <X size={13} /> Clear all filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Category pills (quick access) ─────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => applyFilters({ medium: '' })}
                        className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                            !filters.medium
                                ? 'bg-ink text-white shadow-sm'
                                : 'border border-border bg-surface text-ink-soft hover:border-sienna/40 hover:text-ink'
                        }`}
                    >
                        All
                    </button>
                    {mediums.map(med => (
                        <button
                            key={med}
                            onClick={() => applyFilters({ medium: med })}
                            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                filters.medium === med
                                    ? 'bg-ink text-white shadow-sm'
                                    : 'border border-border bg-surface text-ink-soft hover:border-sienna/40 hover:text-ink'
                            }`}
                        >
                            {med}
                        </button>
                    ))}
                </div>

                {/* ── Results info bar ──────────────────────────── */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-muted">
                        Showing{' '}
                        <span className="font-semibold text-ink">{products.data.length}</span>
                        {' '}of{' '}
                        <span className="font-semibold text-ink">{products.total}</span>
                        {' '}artworks
                        {filters.search && (
                            <> for <span className="font-semibold text-ink">"{filters.search}"</span></>
                        )}
                    </p>
                    {(activeFiltersCount > 0 || filters.search) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs font-medium text-sienna hover:text-sienna-600"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>

                {/* ── Product grid ──────────────────────────────── */}
                {products.data.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        <AnimatePresence mode="popLayout">
                            {products.data.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"
                    >
                        <span className="mb-4 text-5xl">🖼️</span>
                        <h3 className="font-display text-2xl font-semibold text-ink">
                            No artworks found
                        </h3>
                        <p className="mt-2 text-sm text-ink-muted">
                            Try adjusting your filters or search term.
                        </p>
                        <button
                            onClick={clearFilters}
                            className="mt-5 rounded-lg bg-sienna px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                        >
                            Clear Filters
                        </button>
                    </motion.div>
                )}

                {/* ── Pagination ────────────────────────────────── */}
                {products.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {products.links.map((link, i) => {
                            if (!link.url) return null;

                            // Previous / Next
                            const isPrev = i === 0;
                            const isNext = i === products.links.length - 1;
                            const isCurrent = link.active;

                            return (
                                <Link
                                    key={i}
                                    href={link.url}
                                    preserveState
                                    preserveScroll
                                    className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition-all ${
                                        isCurrent
                                            ? 'bg-sienna text-white shadow-sm'
                                            : 'border border-border bg-surface text-ink-soft hover:border-sienna/40 hover:text-ink'
                                    }`}
                                >
                                    {isPrev ? <ChevronLeft size={14} /> : isNext ? <ChevronRight size={14} /> : link.label}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* ── Promotional banner ────────────────────────── */}
                {products.data.length > 0 && (
                    <div
                        className="relative overflow-hidden rounded-2xl p-8 text-white"
                        style={{ background: 'linear-gradient(135deg, #1C1917 0%, #2C2420 100%)' }}
                    >
                        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20"
                             style={{ background: 'radial-gradient(circle, #C2541A, transparent)' }} />
                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <Sparkles size={16} className="text-sienna" />
                                    <span className="text-xs font-semibold uppercase tracking-widest text-sienna">
                                        Commission an Artist
                                    </span>
                                </div>
                                <h3 className="font-display text-2xl font-semibold">
                                    Want something truly unique?
                                </h3>
                                <p className="mt-1 text-sm text-stone-400">
                                    Request a custom painting made just for you by any of our verified artists.
                                </p>
                            </div>
                            <button className="flex-shrink-0 rounded-lg bg-sienna px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600">
                                Request Commission
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}