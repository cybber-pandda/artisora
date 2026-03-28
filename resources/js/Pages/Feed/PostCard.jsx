import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@inertiajs/react';
import {
    Heart, MessageCircle, Share2, MoreHorizontal,
    Brush, Eye,
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import CommentSection from './CommentSection';
import ShareSheet from './ShareSheet';

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }) {
    const sizeMap = {
        xs: 'w-6 h-6 text-2xs',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };
    return (
        <div
            className={`${sizeMap[size]} rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white select-none`}
            style={{ background: 'linear-gradient(135deg, #C2541A, #7C5C3E)' }}
        >
            {name?.charAt(0).toUpperCase() ?? '?'}
        </div>
    );
}

// ── Media rendering (image or video) ────────────────────────────
function MediaItem({ media, postId, onVideoPlay, activeVideoId }) {
    if (media.type === 'video') {
        return (
            <VideoPlayer
                src={media.url}
                postId={postId}
                onPlay={onVideoPlay}
                activePostId={activeVideoId}
            />
        );
    }

    return (
        <img
            src={media.url}
            alt="Artwork"
            className="max-h-[560px] w-full object-cover bg-stone-50"
            loading="lazy"
        />
    );
}

// ── Media carousel (dots navigation) ────────────────────────────
function MediaCarousel({ mediaItems, postId, onVideoPlay, activeVideoId }) {
    const [current, setCurrent] = useState(0);
    if (mediaItems.length === 0) return null;

    return (
        <div>
            <MediaItem
                media={mediaItems[current]}
                postId={postId}
                onVideoPlay={onVideoPlay}
                activeVideoId={activeVideoId}
            />
            {mediaItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 border-t border-border py-2.5">
                    {mediaItems.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`h-1.5 rounded-full transition-all ${
                                i === current ? 'w-6 bg-sienna' : 'w-1.5 bg-stone-300'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── PostCard ────────────────────────────────────────────────────
/**
 * Props:
 *  - post           : the post data object from Inertia
 *  - onVideoPlay    : (postId) => void — for single-active-video coordination
 *  - activeVideoId  : currently playing video's post id
 *  - userRole       : the current user's role (for conditional share options)
 */
export default function PostCard({ post, onVideoPlay, activeVideoId, userRole }) {
    const [liked, setLiked]               = useState(post.liked_by_me);
    const [likesCount, setLikesCount]     = useState(post.likes_count);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare]       = useState(false);
    const [viewCount, setViewCount]       = useState(post.views_count);
    const [viewTracked, setViewTracked]   = useState(false);
    const cardRef                         = useRef(null);

    // ── View tracking via IntersectionObserver ──────────────────
    const viewObserverRef = useRef(null);
    if (!viewObserverRef.current && typeof IntersectionObserver !== 'undefined') {
        viewObserverRef.current = 'pending';
    }

    const cardCallbackRef = useCallback((node) => {
        if (!node || viewTracked) return;
        cardRef.current = node;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    setViewTracked(true);
                    setViewCount(c => c + 1);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(node);
    }, [viewTracked]);

    // ── Like handler (optimistic + rollback) ────────────────────
    const handleLike = async () => {
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(c => wasLiked ? c - 1 : c + 1);

        try {
            const response = await fetch(route('feed.like', post.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                // Rollback
                setLiked(wasLiked);
                setLikesCount(c => wasLiked ? c + 1 : c - 1);
                return;
            }

            const json = await response.json();
            setLiked(json.liked);
            setLikesCount(json.likes_count);
        } catch {
            // Rollback on network error
            setLiked(wasLiked);
            setLikesCount(c => wasLiked ? c + 1 : c - 1);
        }
    };

    const displayName = post.user?.artist_profile?.display_name ?? post.user?.name;
    const timeAgo     = new Date(post.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
        <>
            {showShare && (
                <ShareSheet post={post} onClose={() => setShowShare(false)} userRole={userRole} />
            )}

            <motion.article
                ref={cardCallbackRef}
                id={`post-${post.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
            >
                {/* ── Header ────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                        <Link href={route('profile.show', post.user?.id)} className="flex-shrink-0">
                            <Avatar name={displayName} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Link href={route('profile.show', post.user?.id)} className="text-sm font-semibold text-ink hover:underline">
                                    {displayName}
                                </Link>
                                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-2xs font-semibold text-blue-700">
                                    <Brush size={9} /> Artist
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                                <span>{timeAgo}</span>
                                {post.medium && (
                                    <>
                                        <span>·</span>
                                        <span>{post.medium}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink">
                        <MoreHorizontal size={16} />
                    </button>
                </div>

                {/* ── Caption ───────────────────────────────────────── */}
                {(post.title || post.description) && (
                    <div className="px-4 pb-3">
                        <p className="font-display text-xl font-semibold text-ink">{post.title}</p>
                        {post.description && (
                            <p className="mt-1 text-sm leading-relaxed text-ink-soft line-clamp-3">
                                {post.description}
                            </p>
                        )}
                        {post.dimensions && (
                            <p className="mt-1 text-xs text-ink-muted">{post.dimensions}</p>
                        )}
                    </div>
                )}

                {/* ── Media ─────────────────────────────────────────── */}
                {post.media?.length > 0 && (
                    <MediaCarousel
                        mediaItems={post.media}
                        postId={post.id}
                        onVideoPlay={onVideoPlay}
                        activeVideoId={activeVideoId}
                    />
                )}

                {/* ── For Sale badge ────────────────────────────────── */}
                {post.is_for_sale && !post.is_sold && post.price && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <div>
                            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                                Available for Purchase
                            </p>
                            <p className="font-display text-2xl font-bold text-sienna">
                                ₱{Number(post.price).toLocaleString()}
                            </p>
                        </div>
                        <Link
                            href={route('buyer.shop.show', post.id)}
                            className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sienna"
                        >
                            <Eye size={14} />
                            View Product
                        </Link>
                    </div>
                )}

                {post.is_sold && (
                    <div className="border-t border-border px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-600">
                            ✓ Sold
                        </span>
                    </div>
                )}

                {/* ── Stats row ─────────────────────────────────────── */}
                {(likesCount > 0 || post.comments_count > 0 || viewCount > 0) && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-2">
                        <div className="flex items-center gap-1">
                            {likesCount > 0 && (
                                <span className="flex items-center gap-1 text-xs text-ink-muted">
                                    <span>❤️</span>
                                    <span>{likesCount}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ink-muted">
                            {post.comments_count > 0 && (
                                <button
                                    onClick={() => setShowComments(v => !v)}
                                    className="hover:underline"
                                >
                                    {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                                </button>
                            )}
                            <span className="flex items-center gap-1">
                                <Eye size={11} /> {viewCount} views
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Actions bar ───────────────────────────────────── */}
                <div className="flex items-center border-t border-border">
                    {/* Like */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLike}
                        className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors hover:bg-canvas ${
                            liked ? 'text-red-500' : 'text-ink-muted'
                        }`}
                    >
                        <Heart size={17} className={liked ? 'fill-red-500' : ''} />
                        Like
                    </motion.button>

                    <div className="h-8 w-px bg-border" />

                    {/* Comment */}
                    <button
                        onClick={() => setShowComments(v => !v)}
                        className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas"
                    >
                        <MessageCircle size={17} />
                        Comment
                    </button>

                    <div className="h-8 w-px bg-border" />

                    {/* Share */}
                    <button
                        onClick={() => setShowShare(true)}
                        className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas"
                    >
                        <Share2 size={17} />
                        Share
                    </button>
                </div>

                {/* ── Comments section ──────────────────────────────── */}
                <AnimatePresence>
                    {showComments && <CommentSection post={post} />}
                </AnimatePresence>
            </motion.article>
        </>
    );
}
