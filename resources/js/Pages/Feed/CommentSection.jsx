import { useState, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, X, ChevronDown, ChevronUp, CornerDownRight,
} from 'lucide-react';

// ── Reaction emojis (shared with PostCard) ──────────────────────
const REACTIONS = [
    { key: 'like',  emoji: '👍', label: 'Like',  color: 'text-blue-500' },
    { key: 'love',  emoji: '❤️', label: 'Love',  color: 'text-red-500' },
    { key: 'haha',  emoji: '😂', label: 'Haha',  color: 'text-yellow-500' },
    { key: 'wow',   emoji: '😮', label: 'Wow',   color: 'text-yellow-500' },
    { key: 'sad',   emoji: '😢', label: 'Sad',   color: 'text-blue-400' },
    { key: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

// ── Avatar (tiny local helper) ──────────────────────────────────
function MiniAvatar({ name, small }) {
    return (
        <div
            className={`${small ? 'w-6 h-6 text-2xs' : 'w-8 h-8 text-xs'} rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white select-none`}
            style={{ background: 'linear-gradient(135deg, #C2541A, #7C5C3E)' }}
        >
            {name?.charAt(0).toUpperCase() ?? '?'}
        </div>
    );
}

// ── Reaction picker (hover-to-open emoji bar) ───────────────────
function ReactionPicker({ onSelect }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-2 shadow-lg"
        >
            {REACTIONS.map(r => (
                <motion.button
                    key={r.key}
                    whileHover={{ scale: 1.4, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect(r)}
                    className="flex flex-col items-center"
                    title={r.label}
                >
                    <span className="text-xl leading-none">{r.emoji}</span>
                </motion.button>
            ))}
        </motion.div>
    );
}

// ── Single comment bubble ───────────────────────────────────────
function CommentItem({ comment, postId, depth = 0 }) {
    const [showReactions, setShowReactions] = useState(false);
    const [reaction, setReaction]           = useState(null);
    const [showReplyBox, setShowReplyBox]   = useState(false);
    const [showReplies, setShowReplies]     = useState(true);
    const reactionTimer                     = useRef(null);

    const { data, setData, post, processing, reset } = useForm({
        body: '', parent_id: comment.id,
    });

    const submitReply = (e) => {
        e.preventDefault();
        post(route('feed.comment', postId), {
            onSuccess: () => { reset(); setShowReplyBox(false); },
            preserveScroll: true,
        });
    };

    const handleReactionEnter = () => {
        reactionTimer.current = setTimeout(() => setShowReactions(true), 400);
    };
    const handleReactionLeave = () => {
        clearTimeout(reactionTimer.current);
        setShowReactions(false);
    };
    const selectReaction = (r) => {
        setReaction(prev => prev?.key === r.key ? null : r);
        setShowReactions(false);
    };

    const timeAgo = new Date(comment.created_at).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric',
    });

    return (
        <div className={`flex gap-2.5 ${depth > 0 ? 'ml-10 mt-2' : ''}`}>
            <MiniAvatar name={comment.user?.name} small={depth > 0} />

            <div className="flex-1 min-w-0">
                {/* Bubble */}
                <div className="inline-block max-w-full rounded-2xl bg-canvas px-3.5 py-2.5">
                    <p className="text-xs font-bold text-ink">{comment.user?.name}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{comment.body}</p>
                </div>

                {/* Reaction badge */}
                {reaction && (
                    <button
                        onClick={() => setReaction(null)}
                        className="ml-1 -mt-1 inline-flex items-center gap-0.5 rounded-full border border-border bg-surface px-1.5 py-0.5 text-xs shadow-sm"
                    >
                        <span>{reaction.emoji}</span>
                        <span className="text-ink-muted">1</span>
                    </button>
                )}

                {/* Action row */}
                <div className="mt-1 flex items-center gap-3 px-1">
                    <span className="text-2xs text-ink-subtle">{timeAgo}</span>

                    <div className="relative" onMouseEnter={handleReactionEnter} onMouseLeave={handleReactionLeave}>
                        <AnimatePresence>
                            {showReactions && <ReactionPicker onSelect={selectReaction} />}
                        </AnimatePresence>
                        <button
                            onClick={() => selectReaction(REACTIONS[0])}
                            className={`text-xs font-semibold transition-colors ${
                                reaction ? 'text-blue-500' : 'text-ink-muted hover:text-blue-500'
                            }`}
                        >
                            {reaction ? reaction.emoji + ' ' + reaction.label : 'Like'}
                        </button>
                    </div>

                    {depth === 0 && (
                        <button
                            onClick={() => setShowReplyBox(v => !v)}
                            className="text-xs font-semibold text-ink-muted transition-colors hover:text-sienna"
                        >
                            Reply
                        </button>
                    )}
                </div>

                {/* Reply input */}
                <AnimatePresence>
                    {showReplyBox && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={submitReply}
                            className="mt-2 flex items-center gap-2 overflow-hidden"
                        >
                            <input
                                type="text"
                                value={data.body}
                                onChange={e => setData('body', e.target.value)}
                                placeholder={`Reply to ${comment.user?.name}…`}
                                autoFocus
                                className="flex-1 rounded-full border border-border bg-canvas px-3.5 py-1.5 text-xs text-ink placeholder-ink-subtle focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                            />
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sienna text-white disabled:opacity-50"
                            >
                                <Send size={11} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowReplyBox(false)}
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-ink-muted hover:bg-canvas"
                            >
                                <X size={11} />
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Replies */}
                {comment.replies?.length > 0 && depth === 0 && (
                    <div className="mt-2">
                        <button
                            onClick={() => setShowReplies(v => !v)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-sienna hover:text-sienna-600"
                        >
                            <CornerDownRight size={12} />
                            {showReplies ? 'Hide' : 'View'} {comment.replies.length}{' '}
                            {comment.replies.length === 1 ? 'reply' : 'replies'}
                            {showReplies ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                        <AnimatePresence>
                            {showReplies && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 space-y-2 overflow-hidden"
                                >
                                    {comment.replies.map(reply => (
                                        <CommentItem key={reply.id} comment={reply} postId={postId} depth={1} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main CommentSection ─────────────────────────────────────────
/**
 * Props:
 *  - post : the full post object, including post.comments array
 *
 * Behavior:
 *  - Shows a preview of the latest 2 comments
 *  - "View all X comments" expands to show all + input
 *  - Optimistic comment append on submit
 */
export default function CommentSection({ post }) {
    const [expanded, setExpanded] = useState(false);
    const [optimisticComments, setOptimisticComments] = useState([]);

    const { data, setData, post: submitPost, processing, reset } = useForm({
        body: '',
        parent_id: null,
    });

    const allComments = [...(post.comments ?? []), ...optimisticComments];
    const previewComments = allComments.slice(0, 2);
    const totalCount = post.comments_count + optimisticComments.length;

    const submit = (e) => {
        e.preventDefault();
        if (!data.body.trim()) return;

        // Optimistic: add the comment immediately
        const tempComment = {
            id: `temp-${Date.now()}`,
            body: data.body,
            user: { name: 'You' }, // placeholder; Inertia will reload real data
            created_at: new Date().toISOString(),
            replies: [],
        };
        setOptimisticComments(prev => [...prev, tempComment]);

        submitPost(route('feed.comment', post.id), {
            onSuccess: () => {
                reset();
                // Clear optimistic — real data comes from server reload
                setOptimisticComments([]);
            },
            onError: () => {
                // Remove the optimistic comment on failure
                setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id));
            },
            preserveScroll: true,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border"
        >
            {/* Comment preview (always visible) */}
            {allComments.length > 0 && (
                <div className="space-y-3 px-4 py-3">
                    {(expanded ? allComments : previewComments).map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={post.id}
                            depth={0}
                        />
                    ))}
                </div>
            )}

            {/* "View all" toggle — only show if there are more than 2 comments */}
            {totalCount > 2 && (
                <div className="px-4 pb-2">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-xs font-semibold text-ink-muted hover:text-sienna transition-colors"
                    >
                        {expanded
                            ? 'Hide comments'
                            : `View all ${totalCount} comments`}
                    </button>
                </div>
            )}

            {/* New comment input */}
            <form
                onSubmit={submit}
                className="flex items-center gap-2.5 border-t border-border px-4 py-3"
            >
                <input
                    type="text"
                    value={data.body}
                    onChange={e => setData('body', e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-full border border-border bg-canvas px-4 py-2 text-sm text-ink placeholder-ink-subtle focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                />
                <button
                    type="submit"
                    disabled={processing || !data.body.trim()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sienna text-white transition-colors hover:bg-sienna-600 disabled:opacity-50"
                >
                    <Send size={14} />
                </button>
            </form>
        </motion.div>
    );
}
