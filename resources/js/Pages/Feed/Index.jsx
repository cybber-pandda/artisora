import { useState, useRef, useCallback } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, PlusCircle, Users, Sparkles } from 'lucide-react';
import { ToastProvider } from '@/Components/Toast';
import PostCard from './PostCard';

// ── Main Feed page ─────────────────────────────────────────────
export default function FeedIndex({ posts, canPost, isArtist, activeTab, userRole }) {
    // Track the currently playing video post id — only one at a time
    const activeVideoRef = useRef(null);
    const [activeVideoId, setActiveVideoId] = useState(null);

    const handleVideoPlay = useCallback((postId) => {
        activeVideoRef.current = postId;
        setActiveVideoId(postId);
    }, []);

    // Tab switching — navigate with Inertia to preserve server-side filtering
    const switchTab = (tab) => {
        router.get(route('feed'), { tab }, {
            preserveState: true,
            preserveScroll: false,
            only: ['posts', 'activeTab'],
        });
    };

    return (
        <AppLayout title="Art Feed">
            <Head title="Art Feed — Artisora" />

            <ToastProvider>
                <div className="mx-auto max-w-[600px] space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-4xl font-semibold text-ink">
                                Art Feed
                            </h2>
                            <p className="mt-1 text-base text-ink-muted">
                                Latest work from Filipino artists.
                            </p>
                        </div>
                        {canPost && (
                            <Link
                                href={route('artist.posts.create')}
                                className="flex items-center gap-2 rounded-xl bg-sienna px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-sienna-600"
                            >
                                <PlusCircle size={15} />
                                New Post
                            </Link>
                        )}
                    </div>

                    {/* ── Following / For You tabs ──────────────────── */}
                    <div className="flex rounded-xl border border-border bg-surface overflow-hidden">
                        <button
                            onClick={() => switchTab('foryou')}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                                activeTab === 'foryou'
                                    ? 'border-b-2 border-sienna text-sienna bg-canvas/50'
                                    : 'text-ink-muted hover:text-ink hover:bg-canvas/30'
                            }`}
                        >
                            <Sparkles size={15} />
                            For You
                        </button>
                        <button
                            onClick={() => switchTab('following')}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                                activeTab === 'following'
                                    ? 'border-b-2 border-sienna text-sienna bg-canvas/50'
                                    : 'text-ink-muted hover:text-ink hover:bg-canvas/30'
                            }`}
                        >
                            <Users size={15} />
                            Following
                        </button>
                    </div>

                    {/* Post list */}
                    {posts.data.length > 0 ? (
                        <>
                            {posts.data.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onVideoPlay={handleVideoPlay}
                                    activeVideoId={activeVideoId}
                                    userRole={userRole}
                                />
                            ))}

                            {posts.next_page_url && (
                                <div className="pb-8 text-center">
                                    <Link
                                        href={posts.next_page_url}
                                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-ink-soft shadow-xs transition-colors hover:bg-linen hover:text-ink"
                                    >
                                        <ChevronDown size={15} />
                                        Load more posts
                                    </Link>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
                            <span className="mb-4 text-5xl">
                                {activeTab === 'following' ? '👤' : '🎨'}
                            </span>
                            <h3 className="font-display text-2xl font-semibold text-ink">
                                {activeTab === 'following'
                                    ? 'No posts from followed artists'
                                    : 'No posts yet'}
                            </h3>
                            <p className="mt-2 text-sm text-ink-muted">
                                {activeTab === 'following'
                                    ? 'Follow some artists to see their work here!'
                                    : 'Artists will start sharing their work here soon.'}
                            </p>
                            {canPost && activeTab !== 'following' && (
                                <Link
                                    href={route('artist.posts.create')}
                                    className="mt-5 flex items-center gap-2 rounded-lg bg-sienna px-5 py-2.5 text-sm font-semibold text-white"
                                >
                                    <PlusCircle size={14} /> Be the first to post
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </ToastProvider>
        </AppLayout>
    );
}