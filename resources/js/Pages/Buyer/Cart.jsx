import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { ToastProvider, useToast } from '@/Components/Toast';

// ── Seed-based hue for consistent gradients ──────────────────────
function titleHue(title) {
    let h = 0;
    for (let i = 0; i < (title || '').length; i++) h = (h + title.charCodeAt(i) * 37) % 360;
    return h;
}

// ── Cart Item Row ────────────────────────────────────────────────
function CartItemRow({ item, onRemove }) {
    const [removing, setRemoving] = useState(false);
    const addToast = useToast();

    const handleRemove = async () => {
        if (removing) return;
        setRemoving(true);
        try {
            const res = await fetch(route('cart.remove', item.art_post_id), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    'Accept':       'application/json',
                },
            });
            if (res.ok) {
                addToast('Removed from cart.', 'success');
                onRemove(item.art_post_id);
            } else {
                addToast('Failed to remove item.', 'error');
                setRemoving(false);
            }
        } catch {
            addToast('Network error.', 'error');
            setRemoving(false);
        }
    };

    const hue = titleHue(item.title);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs"
        >
            {/* Thumbnail */}
            <Link
                href={route('buyer.shop.show', item.art_post_id)}
                className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border"
            >
                {item.thumbnail ? (
                    <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                ) : null}
                <div
                    className={`h-full w-full items-center justify-center text-2xl ${item.thumbnail ? 'hidden' : 'flex'}`}
                    style={{ background: `linear-gradient(135deg, hsl(${hue}, 40%, 82%) 0%, hsl(${(hue + 40) % 360}, 35%, 72%) 100%)` }}
                >
                    🎨
                </div>
            </Link>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <Link
                    href={route('buyer.shop.show', item.art_post_id)}
                    className="font-display text-base font-semibold text-ink line-clamp-1 hover:text-sienna transition-colors"
                >
                    {item.title}
                </Link>
                <p className="mt-0.5 text-sm text-ink-muted">{item.artist_name}</p>
                {item.medium && (
                    <p className="mt-0.5 text-xs text-ink-subtle">{item.medium}</p>
                )}
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0">
                <p className="font-display text-lg font-bold text-sienna">
                    ₱{Number(item.price).toLocaleString()}
                </p>
            </div>

            {/* Remove */}
            <button
                onClick={handleRemove}
                disabled={removing}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
                {removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
        </motion.div>
    );
}

// ── Cart Summary Card ────────────────────────────────────────────
function CartSummary({ items }) {
    const subtotal = items.reduce((s, i) => s + Number(i.price), 0);

    return (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4 sticky top-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Order Summary</p>

            <div className="space-y-2">
                <div className="flex justify-between text-sm text-ink-soft">
                    <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-ink-soft">
                    <span>Shipping</span>
                    <span className="text-green-600 font-medium">TBD</span>
                </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between font-display text-xl font-bold text-ink">
                <span>Total</span>
                <span className="text-sienna">₱{subtotal.toLocaleString()}</span>
            </div>

            <Link
                href={route('buyer.checkout')}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-sienna-600 hover:shadow-lg"
            >
                Proceed to Checkout
                <ArrowRight size={15} />
            </Link>

            <Link
                href={route('buyer.shop')}
                className="block text-center text-sm font-medium text-ink-muted hover:text-sienna transition-colors"
            >
                ← Continue Shopping
            </Link>
        </div>
    );
}

// ── Main Cart Page ───────────────────────────────────────────────
export default function CartPage({ cartItems: initialItems }) {
    return (
        <ToastProvider>
            <CartPageInner initialItems={initialItems} />
        </ToastProvider>
    );
}

function CartPageInner({ initialItems }) {
    const [items, setItems] = useState(initialItems);

    const handleRemove = (artPostId) => {
        setItems(prev => prev.filter(i => i.art_post_id !== artPostId));
    };

    return (
        <AppLayout title="My Cart">
            <Head title="My Cart — Artisora" />

            <div className="mx-auto max-w-5xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <ShoppingCart size={22} className="text-sienna" />
                    <h2 className="font-display text-3xl font-semibold text-ink">My Cart</h2>
                    {items.length > 0 && (
                        <span className="rounded-full bg-sienna/10 px-2.5 py-0.5 text-sm font-semibold text-sienna">
                            {items.length}
                        </span>
                    )}
                </div>

                {items.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
                        <ShoppingBag size={48} className="mb-4 text-ink-subtle" />
                        <h3 className="font-display text-2xl font-semibold text-ink">Your cart is empty</h3>
                        <p className="mt-2 text-sm text-ink-muted">Discover beautiful artworks and add them to your cart.</p>
                        <Link
                            href={route('buyer.shop')}
                            className="mt-5 flex items-center gap-2 rounded-xl bg-sienna px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sienna-600 transition-colors"
                        >
                            Browse the Shop
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Items list */}
                        <div className="lg:col-span-2 space-y-3">
                            <AnimatePresence mode="popLayout">
                                {items.map(item => (
                                    <CartItemRow
                                        key={item.art_post_id}
                                        item={item}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Summary sidebar */}
                        <div>
                            <CartSummary items={items} />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
