import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link2, Repeat2 } from 'lucide-react';
import { useToast } from '@/Components/Toast';

/**
 * ShareSheet — popover with Copy Link + Repost options.
 *
 * Props:
 *  - post     : the post object (needs .id, .title, .user)
 *  - onClose  : () => void
 *  - userRole : 'artist' | 'buyer' | 'admin' | 'driver'
 */
export default function ShareSheet({ post, onClose, userRole }) {
    const [copied, setCopied] = useState(false);
    const [reposting, setReposting] = useState(false);
    const addToast = useToast();

    const url = `${window.location.origin}/posts/${post.id}`;

    // ── Copy link to clipboard ──────────────────────────────────
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            addToast('Link copied!', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Failed to copy link', 'error');
        }
    };

    // ── Repost ──────────────────────────────────────────────────
    const handleRepost = async () => {
        setReposting(true);
        try {
            const response = await fetch(route('feed.repost', post.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                addToast('Reposted!', 'success');
                onClose();
            } else {
                addToast('Failed to repost', 'error');
            }
        } catch {
            addToast('Failed to repost', 'error');
        } finally {
            setReposting(false);
        }
    };

    const displayName = post.user?.artist_profile?.display_name ?? post.user?.name;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h3 className="font-display text-lg font-semibold text-ink">
                            Share Post
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded-md p-1 text-ink-muted hover:bg-canvas hover:text-ink"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Post preview */}
                    <div className="border-b border-border px-5 py-3">
                        <p className="text-sm font-semibold text-ink line-clamp-1">{post.title}</p>
                        <p className="text-xs text-ink-muted">by {displayName}</p>
                    </div>

                    {/* Share options */}
                    <div className="p-3 space-y-1">
                        {/* Copy Link */}
                        <button
                            onClick={copyLink}
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                                copied
                                    ? 'text-emerald-600 bg-emerald-50'
                                    : 'text-ink-soft hover:bg-canvas'
                            }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>

                        {/* Repost — artists only */}
                        {userRole === 'artist' && (
                            <button
                                onClick={handleRepost}
                                disabled={reposting}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas disabled:opacity-50"
                            >
                                <Repeat2 size={18} className={reposting ? 'animate-spin' : ''} />
                                {reposting ? 'Reposting…' : 'Repost'}
                            </button>
                        )}
                    </div>

                    {/* URL bar */}
                    <div className="border-t border-border px-5 py-4">
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2">
                            <Link2 size={13} className="flex-shrink-0 text-ink-muted" />
                            <p className="flex-1 truncate text-xs text-ink-muted">{url}</p>
                            <button
                                onClick={copyLink}
                                className="flex-shrink-0 rounded-md bg-sienna px-2.5 py-1 text-xs font-semibold text-white hover:bg-sienna-600"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
