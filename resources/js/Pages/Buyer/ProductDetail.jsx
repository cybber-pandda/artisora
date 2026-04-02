import { useState, useCallback } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider, useToast } from '@/Components/Toast';
import PaintingARLauncher from '@/Components/PaintingARView';
import ARQRModal from '@/Components/ARQRModal';
import {
    ArrowLeft, Heart, ShoppingCart, Eye, X,
    Brush, Ruler, Maximize2, ChevronLeft, ChevronRight,
    User, ExternalLink, Image as ImageIcon, Loader2, CheckCircle, ScanLine,
} from 'lucide-react';

// ── Seed-based hue for consistent gradients ────────────────────────
function titleHue(title) {
    let h = 0;
    for (let i = 0; i < (title || '').length; i++) h = (h + title.charCodeAt(i) * 37) % 360;
    return h;
}

function ArtPlaceholder({ title, className = '' }) {
    const hue = titleHue(title);
    return (
        <div
            className={`flex h-full w-full items-center justify-center ${className}`}
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 40%, 82%) 0%, hsl(${(hue + 40) % 360}, 35%, 72%) 100%)` }}
        >
            <div className="flex flex-col items-center gap-2 opacity-80">
                <span className="text-5xl">🎨</span>
                <span className="max-w-[80%] truncate text-center text-sm font-semibold text-white/90 drop-shadow">
                    {title}
                </span>
            </div>
        </div>
    );
}

// ── Image Gallery ──────────────────────────────────────────────────
function ImageGallery({ media }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imgErrors, setImgErrors] = useState({});

    const activeMedia = media[activeIdx];
    const hasImgError = (idx) => imgErrors[idx];
    const markError = (idx) => setImgErrors(prev => ({ ...prev, [idx]: true }));

    if (!media || media.length === 0) {
        return (
            <div className="aspect-square overflow-hidden rounded-2xl border border-border">
                <ArtPlaceholder title="Artwork" />
            </div>
        );
    }

    return (
        <>
            {/* Main image */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-canvas">
                <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative aspect-square cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                >
                    {activeMedia.type === 'video' ? (
                        <video
                            src={activeMedia.url}
                            controls
                            className="h-full w-full object-contain"
                        />
                    ) : hasImgError(activeIdx) || !activeMedia.url ? (
                        <ArtPlaceholder title="Artwork" />
                    ) : (
                        <img
                            src={activeMedia.url}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={() => markError(activeIdx)}
                        />
                    )}
                </motion.div>

                {/* Expand button */}
                <button
                    onClick={() => setLightboxOpen(true)}
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
                >
                    <Maximize2 size={14} className="text-ink" />
                </button>

                {/* Nav arrows */}
                {media.length > 1 && (
                    <>
                        <button
                            onClick={() => setActiveIdx(i => (i === 0 ? media.length - 1 : i - 1))}
                            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setActiveIdx(i => (i === media.length - 1 ? 0 : i + 1))}
                            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}

                {/* Counter */}
                {media.length > 1 && (
                    <span className="absolute left-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {activeIdx + 1} / {media.length}
                    </span>
                )}
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {media.map((m, i) => (
                        <button
                            key={m.id}
                            onClick={() => setActiveIdx(i)}
                            className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                                i === activeIdx
                                    ? 'border-sienna shadow-md'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            {m.type === 'video' ? (
                                <div className="flex h-full items-center justify-center bg-stone-100">
                                    <span className="text-2xs font-bold text-ink-muted">VID</span>
                                </div>
                            ) : hasImgError(i) || !m.url ? (
                                <ArtPlaceholder title="" className="!gap-0" />
                            ) : (
                                <img
                                    src={m.url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    onError={() => markError(i)}
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                            onClick={() => setLightboxOpen(false)}
                        >
                            <X size={20} />
                        </button>

                        {media.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActiveIdx(i => (i === 0 ? media.length - 1 : i - 1)); }}
                                    className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActiveIdx(i => (i === media.length - 1 ? 0 : i + 1)); }}
                                    className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}

                        <motion.div
                            key={activeIdx}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-h-[85vh] max-w-[85vw]"
                            onClick={e => e.stopPropagation()}
                        >
                            {activeMedia.type === 'video' ? (
                                <video src={activeMedia.url} controls className="max-h-[85vh] rounded-lg" />
                            ) : (
                                <img src={activeMedia.url} alt="" className="max-h-[85vh] rounded-lg object-contain" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ── Main Product Detail Page ───────────────────────────────────────
export default function ProductDetail({ product, moreFromArtist, inCart: initialInCart = false, productUrl, arModelUrl }) {
    return (
        <ToastProvider>
            <ProductDetailInner
                product={product}
                moreFromArtist={moreFromArtist}
                initialInCart={initialInCart}
                productUrl={productUrl}
                arModelUrl={arModelUrl}
            />
        </ToastProvider>
    );
}

function ProductDetailInner({ product, moreFromArtist, initialInCart, productUrl, arModelUrl }) {
    const [wishlisted, setWishlisted]   = useState(false);
    const [inCart, setInCart]           = useState(initialInCart);
    const [cartLoading, setCartLoading] = useState(false);
    const [arModalOpen, setArModalOpen] = useState(false);
    const [arActivate, setArActivate]   = useState(null); // fn to call activateAR()
    const addToast                      = useToast();

    const hasARData = !!arModelUrl;

    const isMobile = typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const handleARReady = useCallback(({ activate }) => {
        setArActivate(() => activate);
    }, []);

    const handleARClick = () => {
        if (isMobile && arActivate) {
            arActivate();
        } else if (isMobile) {
            addToast('AR is loading, try again in a moment.', 'info');
        } else {
            setArModalOpen(true);
        }
    };

    const handleCartToggle = async () => {
        if (cartLoading) return;
        setCartLoading(true);

        const method  = inCart ? 'DELETE' : 'POST';
        const routeName = inCart ? 'cart.remove' : 'cart.add';

        try {
            const response = await fetch(route(routeName, product.id), {
                method,
                headers: {
                    'Content-Type':  'application/json',
                    'X-CSRF-TOKEN':  document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    'Accept':        'application/json',
                },
            });

            const json = await response.json();

            if (response.ok) {
                setInCart(json.in_cart);
                addToast(json.message, json.in_cart ? 'success' : 'info');
            } else {
                addToast(json.message ?? 'Something went wrong.', 'error');
            }
        } catch {
            addToast('Network error. Please try again.', 'error');
        } finally {
            setCartLoading(false);
        }
    };

    return (
        <>
        <AppLayout title={product.title}>
            <Head title={`${product.title} — Artisora`} />

            <div className="mx-auto max-w-6xl space-y-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Link
                        href={route('buyer.shop')}
                        className="flex items-center gap-1.5 hover:text-ink transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Shop
                    </Link>
                    <span className="text-ink-subtle">/</span>
                    <span className="text-ink-soft font-medium truncate">{product.title}</span>
                </div>

                {/* ── Main content grid ────────────────────────── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

                    {/* Left: Gallery */}
                    <div>
                        <ImageGallery media={product.media} />
                    </div>

                    {/* Right: Product info */}
                    <div className="space-y-6">

                        {/* Medium badge */}
                        {product.medium && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sienna/10 px-3 py-1 text-xs font-semibold text-sienna">
                                <Brush size={11} />
                                {product.medium}
                            </span>
                        )}

                        {/* Title */}
                        <h1 className="font-display text-4xl font-bold leading-tight text-ink">
                            {product.title}
                        </h1>

                        {/* Artist info inline */}
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/profile/${product.artist.id}`}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-semibold text-white"
                            >
                                {product.artist.display_name.charAt(0).toUpperCase()}
                            </Link>
                            <div>
                                <Link
                                    href={`/profile/${product.artist.id}`}
                                    className="text-sm font-semibold text-ink hover:text-sienna transition-colors"
                                >
                                    {product.artist.display_name}
                                </Link>
                                {product.artist.specialty && (
                                    <p className="text-xs text-ink-muted">{product.artist.specialty}</p>
                                )}
                            </div>
                        </div>

                        {/* Price section */}
                        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Price</p>
                                    <p className="mt-1 font-display text-4xl font-bold text-sienna">
                                        ₱{product.price.toLocaleString()}
                                    </p>
                                </div>
                                {product.is_sold && (
                                    <span className="rounded-full bg-stone-600 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white">
                                        Sold
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 flex gap-3">
                                {product.is_sold ? (
                                    <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-canvas py-3 text-sm font-medium text-ink-subtle">
                                        This artwork has been sold
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCartToggle}
                                            disabled={cartLoading}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold shadow-md transition-all ${
                                                inCart
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-sienna text-white hover:bg-sienna-600 hover:shadow-lg'
                                            } disabled:opacity-60`}
                                        >
                                            {cartLoading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : inCart ? (
                                                <CheckCircle size={16} />
                                            ) : (
                                                <ShoppingCart size={16} />
                                            )}
                                            {inCart ? 'In Cart' : 'Add to Cart'}
                                        </button>
                                        <button
                                            onClick={() => setWishlisted(v => !v)}
                                            className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-all ${
                                                wishlisted
                                                    ? 'border-red-200 bg-red-50'
                                                    : 'border-border bg-canvas hover:border-red-200'
                                            }`}
                                        >
                                            <Heart
                                                size={18}
                                                className={wishlisted ? 'fill-red-500 text-red-500' : 'text-ink-muted'}
                                            />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* ── AR Button ── */}
                            {hasARData && (
                                <button
                                    id="view-on-wall-btn"
                                    onClick={handleARClick}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sienna/30 bg-sienna/5 py-3 text-sm font-bold text-sienna transition-all hover:border-sienna/60 hover:bg-sienna/10 active:scale-[0.98]"
                                >
                                    <ScanLine size={16} />
                                    View on Your Wall
                                    <span className="ml-1 rounded-full bg-sienna/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sienna">
                                        AR
                                    </span>
                                </button>
                            )}
                            {hasARData && product.physical_width_cm && product.physical_height_cm && (
                                <p className="mt-1.5 text-center text-xs text-ink-muted">
                                    Real size: <span className="font-semibold">{product.physical_width_cm} × {product.physical_height_cm} cm</span>
                                </p>
                            )}
                        </div>

                        {/* Details grid */}
                        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                Artwork Details
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {product.medium && (
                                    <div className="flex items-start gap-2.5">
                                        <Brush size={14} className="mt-0.5 text-ink-muted" />
                                        <div>
                                            <p className="text-xs text-ink-subtle">Medium</p>
                                            <p className="text-sm font-medium text-ink">{product.medium}</p>
                                        </div>
                                    </div>
                                )}
                                {product.dimensions && (
                                    <div className="flex items-start gap-2.5">
                                        <Ruler size={14} className="mt-0.5 text-ink-muted" />
                                        <div>
                                            <p className="text-xs text-ink-subtle">Dimensions</p>
                                            <p className="text-sm font-medium text-ink">{product.dimensions}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-2.5">
                                    <Eye size={14} className="mt-0.5 text-ink-muted" />
                                    <div>
                                        <p className="text-xs text-ink-subtle">Views</p>
                                        <p className="text-sm font-medium text-ink">{product.views_count}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <Heart size={14} className="mt-0.5 text-ink-muted" />
                                    <div>
                                        <p className="text-xs text-ink-subtle">Likes</p>
                                        <p className="text-sm font-medium text-ink">{product.likes_count}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                    About this Piece
                                </p>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                                    {product.description}
                                </p>
                            </div>
                        )}

                        {/* Artist card */}
                        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                About the Artist
                            </p>
                            <div className="flex items-start gap-4">
                                <Link
                                    href={`/profile/${product.artist.id}`}
                                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-bold text-white"
                                >
                                    {product.artist.display_name.charAt(0).toUpperCase()}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/profile/${product.artist.id}`}
                                        className="text-base font-semibold text-ink hover:text-sienna transition-colors"
                                    >
                                        {product.artist.display_name}
                                    </Link>
                                    {product.artist.specialty && (
                                        <p className="text-sm text-ink-muted">{product.artist.specialty}</p>
                                    )}
                                    {product.artist.bio && (
                                        <p className="mt-2 text-sm text-ink-soft line-clamp-3">{product.artist.bio}</p>
                                    )}
                                    <Link
                                        href={`/profile/${product.artist.id}`}
                                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-sienna hover:text-sienna-600 transition-colors"
                                    >
                                        <ExternalLink size={13} />
                                        View Full Profile
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── More from this Artist ─────────────────────── */}
                {moreFromArtist.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-2xl font-semibold text-ink">
                                More from {product.artist.display_name}
                            </h2>
                            <Link
                                href={`/profile/${product.artist.id}`}
                                className="text-sm font-medium text-sienna hover:text-sienna-600 transition-colors"
                            >
                                View all →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            {moreFromArtist.map(item => (
                                <Link
                                    key={item.id}
                                    href={route('buyer.shop.show', item.id)}
                                    className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:shadow-md"
                                >
                                    <div className="relative aspect-square overflow-hidden">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className={`h-full w-full items-center justify-center ${item.thumbnail ? 'hidden' : 'flex'}`}
                                             style={{ background: `linear-gradient(135deg, hsl(${titleHue(item.title)}, 40%, 82%) 0%, hsl(${(titleHue(item.title) + 40) % 360}, 35%, 72%) 100%)` }}>
                                            <span className="text-2xl">🎨</span>
                                        </div>
                                        {item.is_sold && (
                                            <span className="absolute left-2 top-2 rounded-full bg-stone-600 px-2 py-0.5 text-2xs font-bold text-white">
                                                Sold
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-semibold text-ink line-clamp-1">{item.title}</p>
                                        <p className="mt-0.5 text-xs font-bold text-sienna">
                                            ₱{item.price.toLocaleString()}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>

        {/* ── AR Launcher (tiny, in-viewport, loading=eager) ───── */}
        {hasARData && (
            <PaintingARLauncher
                arModelUrl={arModelUrl}
                productTitle={product.title}
                onReady={handleARReady}
            />
        )}

        {/* ── Desktop QR Modal ──────────────────────────────────── */}
        <ARQRModal
            open={arModalOpen}
            onClose={() => setArModalOpen(false)}
            url={productUrl || window.location.href}
            productTitle={product.title}
        />
        </>
    );
}
