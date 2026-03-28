import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    ShoppingCart, Heart, Eye, Search, ChevronDown,
    Star, Shield, Zap, Brush, ArrowRight, Menu, X,
    Instagram, Facebook, Twitter, Mail, SlidersHorizontal,
} from 'lucide-react';

// ── Animation variants ─────────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};
const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};

// ── Placeholder product data (replace with DB later) ───────────────
const PRODUCTS = [
    { id: 1, title: 'Golden Hour', artist: 'Elena Vasquez', price: 4200, originalPrice: null, hue: 35, sat: 55, light: 68, medium: 'Oil on Canvas', size: '24×36 in', rating: 4.9, reviews: 12, badge: 'Featured' },
    { id: 2, title: 'Coastal Reverie', artist: 'Marco Reyes', price: 7800, originalPrice: 9500, hue: 205, sat: 45, light: 65, medium: 'Acrylic', size: '30×40 in', rating: 5.0, reviews: 8, badge: 'Sale' },
    { id: 3, title: 'Urban Dusk', artist: 'Anya Cruz', price: 3500, originalPrice: null, hue: 340, sat: 35, light: 72, medium: 'Watercolor', size: '18×24 in', rating: 4.7, reviews: 15, badge: null },
    { id: 4, title: 'Morning Mist', artist: 'Juan Alano', price: 5600, originalPrice: null, hue: 185, sat: 30, light: 75, medium: 'Oil on Canvas', size: '20×28 in', rating: 4.8, reviews: 6, badge: 'New' },
    { id: 5, title: 'Harvest Fields', artist: 'Rico Tan', price: 2900, originalPrice: null, hue: 48, sat: 50, light: 70, medium: 'Acrylic', size: '16×20 in', rating: 4.6, reviews: 9, badge: null },
    { id: 6, title: 'Still Waters', artist: 'Lena Perez', price: 6400, originalPrice: 7200, hue: 220, sat: 35, light: 70, medium: 'Oil on Linen', size: '24×30 in', rating: 5.0, reviews: 4, badge: 'Sale' },
    { id: 7, title: 'Fiesta de Colores', artist: 'Carmen Diaz', price: 8900, originalPrice: null, hue: 15, sat: 60, light: 65, medium: 'Mixed Media', size: '36×48 in', rating: 4.9, reviews: 21, badge: 'Featured' },
    { id: 8, title: 'Quiet Village', artist: 'Ben Soriano', price: 3100, originalPrice: null, hue: 100, sat: 30, light: 68, medium: 'Watercolor', size: '12×16 in', rating: 4.5, reviews: 7, badge: null },
    { id: 9, title: 'Labas ng Lunsod', artist: 'Mia Santos', price: 4700, originalPrice: null, hue: 160, sat: 35, light: 67, medium: 'Charcoal & Ink', size: '18×24 in', rating: 4.8, reviews: 11, badge: 'New' },
    { id: 10, title: 'Bukid sa Umaga', artist: 'Ray Flores', price: 5100, originalPrice: null, hue: 80, sat: 40, light: 72, medium: 'Oil on Canvas', size: '20×24 in', rating: 4.7, reviews: 5, badge: null },
    { id: 11, title: 'Purple Mountains', artist: 'Lia Gomez', price: 6200, originalPrice: 7000, hue: 270, sat: 30, light: 72, medium: 'Acrylic', size: '24×32 in', rating: 4.9, reviews: 14, badge: 'Sale' },
    { id: 12, title: 'Ang Dagat', artist: 'Dante Bautista', price: 9500, originalPrice: null, hue: 195, sat: 50, light: 60, medium: 'Oil on Canvas', size: '40×50 in', rating: 5.0, reviews: 18, badge: 'Featured' },
];

const CATEGORIES = [
    { label: 'All', value: 'all' },
    { label: 'Oil Painting', value: 'Oil on Canvas' },
    { label: 'Watercolor', value: 'Watercolor' },
    { label: 'Acrylic', value: 'Acrylic' },
    { label: 'Mixed Media', value: 'Mixed Media' },
    { label: 'Charcoal', value: 'Charcoal & Ink' },
    { label: 'Digital', value: 'Digital Art' },
];

const SORT_OPTIONS = [
    { label: 'Featured', value: 'featured' },
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low–High', value: 'price_asc' },
    { label: 'Price: High–Low', value: 'price_desc' },
    { label: 'Top Rated', value: 'rating' },
];

const STATS = [
    { value: '500+', label: 'Original Artworks' },
    { value: '120+', label: 'Verified Artists' },
    { value: '1,200+', label: 'Happy Collectors' },
    { value: '4.9★', label: 'Average Rating' },
];

// ── Guest action guard ─────────────────────────────────────────────
// Shows a modal nudging guests to log in / register before acting
function GuestModal({ action, onClose }) {
    return (
        <AnimatePresence>
            {action && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Centering wrapper — flex container handles centering, motion.div only handles scale/opacity */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                        >
                            {/* Top accent bar */}
                            <div className="h-1 w-full bg-gradient-to-r from-sienna via-umber to-sienna-600" />

                            <div className="p-7 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sienna/10">
                                    <span className="text-2xl">🎨</span>
                                </div>

                                <h3 className="font-display text-2xl font-semibold text-ink">
                                    {action === 'cart' && 'Add to Cart'}
                                    {action === 'wishlist' && 'Save to Wishlist'}
                                    {action === 'view' && 'View Artwork'}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                    {action === 'cart'
                                        ? 'Create a free buyer account to purchase original artworks from Filipino artists.'
                                        : action === 'wishlist'
                                            ? 'Sign in to save artworks to your wishlist and get notified on price drops.'
                                            : 'Sign in to view full artwork details, artist profile, and more.'}
                                </p>

                                <div className="mt-6 space-y-2.5">
                                    <Link
                                        href="/register/buyer"
                                        className="flex w-full items-center justify-center gap-2 rounded-md bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                                    >
                                        Create Free Account
                                        <ArrowRight size={14} />
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-canvas py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-linen hover:text-ink"
                                    >
                                        Sign In
                                    </Link>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="mt-4 text-xs text-ink-subtle underline underline-offset-2 hover:text-ink-muted"
                                >
                                    Continue browsing
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Badge chip ─────────────────────────────────────────────────────
function Badge({ type }) {
    const styles = {
        Featured: 'bg-sienna text-white',
        Sale: 'bg-red-500 text-white',
        New: 'bg-emerald-500 text-white',
    };
    if (!type) return null;
    return (
        <span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider ${styles[type]}`}>
            {type}
        </span>
    );
}

// ── Product card ───────────────────────────────────────────────────
function ProductCard({ product, onGuestAction }) {
    const [wishlisted, setWishlisted] = useState(false);

    const handleCart = () => onGuestAction('cart');
    const handleWishlist = () => onGuestAction('wishlist');
    const handleView = () => onGuestAction('view');

    return (
        <motion.div
            variants={fadeUp}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-md"
        >
            {/* Image area */}
            <div className="relative overflow-hidden">
                <Badge type={product.badge} />

                {/* Wishlist button */}
                <button
                    onClick={handleWishlist}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
                    aria-label="Save to wishlist"
                >
                    <Heart
                        size={15}
                        className={wishlisted ? 'fill-red-500 text-red-500' : 'text-ink-muted'}
                    />
                </button>

                {/* Artwork color block (replace with <img> when real photos exist) */}
                <div
                    className="h-52 w-full transition-transform duration-500 group-hover:scale-105"
                    style={{
                        background: `hsl(${product.hue}, ${product.sat}%, ${product.light}%)`,
                    }}
                />

                {/* Quick-view overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-all duration-300 group-hover:bg-ink/20">
                    <motion.button
                        initial={{ opacity: 0, scale: 0.85 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={handleView}
                        className="flex translate-y-2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                    >
                        <Eye size={13} />
                        Quick View
                    </motion.button>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-4">
                <div className="flex-1">
                    <p className="text-2xs font-medium uppercase tracking-widest text-ink-muted">
                        {product.medium}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-ink">
                        {product.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        by {product.artist}
                    </p>

                    {/* Rating */}
                    <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={11}
                                    className={i < Math.floor(product.rating)
                                        ? 'fill-sienna text-sienna'
                                        : 'fill-border text-border'}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-ink-muted">
                            {product.rating} ({product.reviews})
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-ink-subtle">{product.size}</p>
                </div>

                {/* Price + CTA */}
                <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-display text-xl font-semibold text-sienna">
                                ₱{product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && (
                                <span className="text-sm text-ink-subtle line-through">
                                    ₱{product.originalPrice.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCart}
                        className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sienna"
                        aria-label="Add to cart"
                    >
                        <ShoppingCart size={13} />
                        Add to Cart
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Main Welcome page ──────────────────────────────────────────────
export default function Welcome({ canLogin, canRegister }) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [sortBy, setSortBy] = useState('featured');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [guestAction, setGuestAction] = useState(null); // 'cart' | 'wishlist' | 'view' | null
    const [showSort, setShowSort] = useState(false);

    // Filter + sort products
    const filtered = PRODUCTS
        .filter((p) => {
            const matchCategory = activeCategory === 'all' || p.medium === activeCategory;
            const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
                || p.artist.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCategory && matchSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            if (sortBy === 'rating') return b.rating - a.rating;
            if (sortBy === 'newest') return b.id - a.id;
            return 0; // featured = original order
        });

    const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label;

    return (
        <div className="min-h-screen bg-canvas font-sans">
            <Head title="Artisora — Original Filipino Paintings" />

            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap"
            />

            {/* ── Guest action modal ───────────────────────────── */}
            <GuestModal
                action={guestAction}
                onClose={() => setGuestAction(null)}
            />

            {/* ── Sticky Navbar ────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">

                    {/* Logo */}
                    <Link href="/" className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xl leading-none">🎨</span>
                        <span className="font-display text-xl font-semibold tracking-tight text-ink">
                            Artisora
                        </span>
                    </Link>

                    {/* Search bar — desktop */}
                    <div className="relative hidden max-w-md flex-1 md:block">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                            type="text"
                            placeholder="Search artworks, artists…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-border bg-canvas py-2.5 pl-9 pr-4 text-sm text-ink placeholder-ink-subtle transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                        />
                    </div>

                    {/* Nav actions */}
                    <div className="flex items-center gap-2">
                        {/* Wishlist icon — guest guard */}
                        <button
                            onClick={() => setGuestAction('wishlist')}
                            className="hidden rounded-md p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-sienna md:flex"
                            aria-label="Wishlist"
                        >
                            <Heart size={18} />
                        </button>

                        {/* Cart icon — guest guard */}
                        <button
                            onClick={() => setGuestAction('cart')}
                            className="hidden rounded-md p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-sienna md:flex"
                            aria-label="Cart"
                        >
                            <ShoppingCart size={18} />
                        </button>

                        {canLogin && (
                            <Link
                                href="/login"
                                className="hidden rounded-md px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink md:block"
                            >
                                Sign In
                            </Link>
                        )}
                        {canRegister && (
                            <Link
                                href="/register"
                                className="flex items-center gap-1.5 rounded-md bg-sienna px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600"
                            >
                                Get Started
                                <ArrowRight size={13} />
                            </Link>
                        )}

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            className="rounded-md p-2 text-ink-muted md:hidden"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile search */}
                <div className="border-t border-border px-6 py-2.5 md:hidden">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                            type="text"
                            placeholder="Search artworks, artists…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-border bg-canvas py-2 pl-9 pr-4 text-sm text-ink placeholder-ink-subtle focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                        />
                    </div>
                </div>
            </header>

            {/* ── Hero Banner ──────────────────────────────────── */}
            <section
                className="relative overflow-hidden border-b border-border"
                style={{
                    background: 'linear-gradient(135deg, #1C1917 0%, #2C2420 50%, #1C1917 100%)',
                }}
            >
                {/* Decorative blobs */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-sienna/15 blur-3xl" />
                    <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cobalt/15 blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sienna/30 bg-sienna/10 px-4 py-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-sienna" />
                                <span className="text-xs font-semibold uppercase tracking-widest text-sienna">
                                    Philippine Art Marketplace
                                </span>
                            </div>
                            <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                                Discover Original
                                <br />
                                <span className="italic text-sienna">Filipino Art</span>
                            </h1>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
                                Browse hundreds of original paintings from verified local artists.
                                Own a piece of Filipino creativity — delivered to your door.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href="/register/buyer"
                                    className="flex items-center gap-2 rounded-md bg-sienna px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-sienna-600"
                                >
                                    Shop Now <ArrowRight size={14} />
                                </Link>
                                <Link
                                    href="/register/artist"
                                    className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                                >
                                    <Brush size={14} /> Sell Your Art
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    {/* Stats row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="mt-12 flex flex-wrap gap-8"
                    >
                        {STATS.map((s) => (
                            <div key={s.label}>
                                <p className="font-display text-2xl font-bold text-white">{s.value}</p>
                                <p className="text-xs text-stone-500">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Main shop area ───────────────────────────────── */}
            <main className="mx-auto max-w-7xl px-6 py-10">

                {/* Category tabs + sort bar */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Category pills */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setActiveCategory(cat.value)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeCategory === cat.value
                                    ? 'bg-ink text-white shadow-sm'
                                    : 'border border-border bg-surface text-ink-soft hover:border-sienna/40 hover:text-ink'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort dropdown */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setShowSort((v) => !v)}
                            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-sienna/40 hover:text-ink"
                        >
                            <SlidersHorizontal size={14} />
                            {activeSortLabel}
                            <ChevronDown size={13} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showSort && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                                            className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-canvas ${sortBy === opt.value ? 'font-semibold text-sienna' : 'text-ink-soft'
                                                }`}
                                        >
                                            {opt.label}
                                            {sortBy === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-sienna" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Results count */}
                <div className="mb-5 flex items-center justify-between">
                    <p className="text-sm text-ink-muted">
                        Showing <span className="font-semibold text-ink">{filtered.length}</span> artworks
                        {searchQuery && (
                            <> for <span className="font-semibold text-ink">"{searchQuery}"</span></>
                        )}
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs font-medium text-sienna underline underline-offset-2"
                        >
                            Clear search
                        </button>
                    )}
                </div>

                {/* Product grid */}
                {filtered.length > 0 ? (
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        {filtered.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onGuestAction={setGuestAction}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                    >
                        <span className="mb-4 text-5xl">🖼️</span>
                        <h3 className="font-display text-2xl font-semibold text-ink">
                            No artworks found
                        </h3>
                        <p className="mt-2 text-sm text-ink-muted">
                            Try a different category or search term.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                            className="mt-5 rounded-md bg-sienna px-5 py-2.5 text-sm font-semibold text-white hover:bg-sienna-600"
                        >
                            Clear Filters
                        </button>
                    </motion.div>
                )}

                {/* Load more CTA — redirects guests to register */}
                {filtered.length > 0 && (
                    <div className="mt-14 text-center">
                        <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8">
                            <p className="font-display text-2xl font-semibold text-ink">
                                Want to see more?
                            </p>
                            <p className="mt-2 text-sm text-ink-muted">
                                Create a free account to browse all 500+ artworks, save favourites, and place orders.
                            </p>
                            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                                <Link
                                    href="/register/buyer"
                                    className="flex items-center justify-center gap-2 rounded-md bg-sienna px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                                >
                                    Create Free Account <ArrowRight size={14} />
                                </Link>
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center gap-2 rounded-md border border-border bg-canvas px-6 py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-linen"
                                >
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Trust bar ────────────────────────────────────── */}
            <section className="border-y border-border bg-linen">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        {[
                            { icon: Shield, title: 'Buyer Protection', desc: 'Every purchase is fully covered by our money-back guarantee.' },
                            { icon: Zap, title: 'Nationwide Delivery', desc: 'Artwork delivered safely anywhere in the Philippines.' },
                            { icon: Star, title: 'Verified Artists', desc: 'Every artist and artwork is reviewed before listing.' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="flex items-start gap-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sienna/10">
                                    <Icon size={18} className="text-sienna" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-ink">{title}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="border-t border-border bg-ink">
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
                        <div className="col-span-2 md:col-span-1">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-xl">🎨</span>
                                <span className="font-display text-lg font-semibold text-white">Artisora</span>
                            </div>
                            <p className="text-sm leading-relaxed text-stone-500">
                                The Philippine marketplace for original paintings.
                            </p>
                            <div className="mt-4 flex gap-2">
                                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                                    <a key={i} href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-stone-500 transition-colors hover:border-sienna/50 hover:text-sienna">
                                        <Icon size={13} />
                                    </a>
                                ))}
                            </div>
                        </div>
                        {[
                            { heading: 'Marketplace', links: ['Browse Art', 'New Arrivals', 'Featured Artists', 'Categories'] },
                            { heading: 'For Artists', links: ['Start Selling', 'Pricing & Fees', 'GCash Payouts', 'Artist Guide'] },
                            { heading: 'Company', links: ['About Us', 'Blog', 'Contact', 'Privacy Policy'] },
                        ].map((col) => (
                            <div key={col.heading}>
                                <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-stone-600">
                                    {col.heading}
                                </p>
                                <ul className="space-y-2">
                                    {col.links.map((link) => (
                                        <li key={link}>
                                            <a href="#" className="text-sm text-stone-500 transition-colors hover:text-white">
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 md:flex-row">
                        <p className="text-xs text-stone-600">
                            © {new Date().getFullYear()} Artisora. All rights reserved.
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-stone-600">
                            <Mail size={11} /> support@artisora.com
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}