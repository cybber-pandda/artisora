import { useState, useCallback, useRef, useEffect } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Grid3X3, Heart, Users, UserPlus, UserMinus,
    Palette, ExternalLink, Instagram, MapPin,
    MessageCircle, ChevronDown, Camera, X, Edit3,
    Settings, Brush, ShoppingBag,
} from 'lucide-react';

// ── Avatar with real photo support ─────────────────────────────
function Avatar({ name, photoUrl, size = 'lg', className = '' }) {
    const sizeMap = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-16 h-16 text-xl',
        lg: 'w-24 h-24 text-3xl',
        xl: 'w-28 h-28 text-4xl',
    };

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`${sizeMap[size]} rounded-full object-cover ring-4 ring-surface shadow-lg flex-shrink-0 ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeMap[size]} rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white select-none ring-4 ring-surface shadow-lg ${className}`}
            style={{ background: 'linear-gradient(135deg, #C2541A, #7C5C3E)' }}
        >
            {name?.charAt(0).toUpperCase() ?? '?'}
        </div>
    );
}

// ── Stat pill ──────────────────────────────────────────────────
function StatPill({ label, value, onClick }) {
    const Component = onClick ? 'button' : 'div';
    return (
        <Component onClick={onClick} className={`text-center ${onClick ? 'hover:opacity-70' : ''}`}>
            <p className="text-xl font-bold text-ink">{value}</p>
            <p className="text-xs text-ink-muted">{label}</p>
        </Component>
    );
}

// ── Post grid thumbnail ────────────────────────────────────────
function PostThumbnail({ post }) {
    const firstMedia = post.media?.[0];
    const isVideo = firstMedia?.type === 'video';

    return (
        <Link
            href={`/feed#post-${post.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100"
        >
            {firstMedia?.url ? (
                isVideo ? (
                    <video
                        src={firstMedia.url}
                        muted
                        preload="metadata"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <img
                        src={firstMedia.url}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                )
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-stone-50 text-4xl">
                    🎨
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Heart size={16} fill="white" /> {post.likes_count ?? 0}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <MessageCircle size={16} fill="white" /> {post.comments_count ?? 0}
                </span>
            </div>
        </Link>
    );
}

// ── Artist card (for followed artists list) ────────────────────
function ArtistCard({ artist }) {
    return (
        <Link
            href={route('profile.show', artist.id)}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition-all hover:bg-canvas hover:shadow-sm"
        >
            <Avatar name={artist.display_name} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{artist.display_name}</p>
                {artist.specialty && (
                    <p className="truncate text-xs text-ink-muted">{artist.specialty}</p>
                )}
            </div>
            <span className="rounded-lg bg-canvas px-2.5 py-1 text-xs font-medium text-ink-muted">
                {artist.posts_count} posts
            </span>
        </Link>
    );
}

// ── Art specialty options ───────────────────────────────────────
const ART_SPECIALTIES = [
    'Oil Painting', 'Acrylic Painting', 'Watercolor', 'Gouache', 'Pastel',
    'Charcoal Drawing', 'Pencil Drawing', 'Ink Drawing', 'Digital Art',
    'Mixed Media', 'Sculpture', 'Printmaking', 'Ceramics', 'Photography',
    'Calligraphy', 'Textile Art', 'Collage', 'Encaustic', 'Fresco', 'Mosaic',
    'Wood Carving', 'Metal Work', 'Glass Art', 'Street Art / Murals',
    'Illustration', 'Concept Art', 'Pixel Art', 'Resin Art',
];

// ── LinkedIn-style Multi-Tag Skill Selector ────────────────────
function SkillTagInput({ value, onChange }) {
    const [query, setQuery]   = useState('');
    const [open, setOpen]     = useState(false);
    const wrapperRef          = useRef(null);
    const inputRef            = useRef(null);

    // Parse comma-separated string into array
    const skills = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

    const filtered = query
        ? ART_SPECIALTIES.filter(s =>
            s.toLowerCase().includes(query.toLowerCase()) && !skills.includes(s)
          )
        : ART_SPECIALTIES.filter(s => !skills.includes(s));

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addSkill = (skill) => {
        const trimmed = skill.trim();
        if (!trimmed || skills.includes(trimmed)) return;
        const updated = [...skills, trimmed].join(', ');
        onChange(updated);
        setQuery('');
        inputRef.current?.focus();
    };

    const removeSkill = (skillToRemove) => {
        const updated = skills.filter(s => s !== skillToRemove).join(', ');
        onChange(updated);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (query.trim()) {
                addSkill(query);
                setOpen(false);
            }
        } else if (e.key === 'Backspace' && !query && skills.length > 0) {
            removeSkill(skills[skills.length - 1]);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                Art Skills
            </label>

            {/* Tag chips + input */}
            <div
                className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-canvas px-3 py-2 shadow-xs transition-colors focus-within:border-sienna focus-within:ring-2 focus-within:ring-sienna/20 cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {skills.map((skill) => (
                    <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-lg bg-sienna/10 px-2.5 py-1 text-xs font-medium text-sienna"
                    >
                        {skill}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
                            className="ml-0.5 rounded-full p-0.5 text-sienna/60 transition-colors hover:bg-sienna/20 hover:text-sienna"
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder={skills.length === 0 ? 'Search or type a skill…' : 'Add more…'}
                    className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-ink placeholder-ink-subtle outline-none"
                />
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
                Pick from suggestions or type your own and press Enter
            </p>

            {/* Dropdown suggestions */}
            {open && filtered.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-lg"
                >
                    {filtered.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => { addSkill(item); setOpen(true); }}
                            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-canvas"
                        >
                            <Palette size={13} className="mr-2 flex-shrink-0 text-ink-muted" />
                            {item}
                        </button>
                    ))}
                </motion.div>
            )}

            {/* Show hint when query doesn't match anything */}
            {open && query && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
                >
                    <p className="text-center text-xs text-ink-muted">
                        Press <kbd className="rounded bg-canvas px-1.5 py-0.5 font-mono text-2xs font-semibold text-ink">Enter</kbd> to add "<span className="font-semibold text-sienna">{query}</span>" as a custom skill
                    </p>
                </motion.div>
            )}
        </div>
    );
}

// ── Image Preview with zoom + reposition ───────────────────────
function ImagePreview({ src, onRemove, shape = 'rect', label }) {
    const [zoom, setZoom]         = useState(1);
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const draggingRef             = useRef(false);
    const containerRef            = useRef(null);

    const handleMouseDown = (e) => {
        e.preventDefault();
        draggingRef.current = true;
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!draggingRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            setPosition({ x, y });
        };

        const onUp = () => { draggingRef.current = false; };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const isCircle = shape === 'circle';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-ink-muted">{label}</p>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                >
                    <X size={11} /> Remove
                </button>
            </div>

            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                className={`relative overflow-hidden border-2 border-dashed border-border bg-stone-50 ${
                    isCircle ? 'mx-auto w-32 h-32 rounded-full' : 'h-32 w-full rounded-xl'
                } cursor-grab active:cursor-grabbing`}
            >
                <img
                    src={src}
                    alt="Preview"
                    draggable={false}
                    className="h-full w-full select-none object-cover"
                    style={{
                        transform: `scale(${zoom})`,
                        objectPosition: `${position.x}% ${position.y}%`,
                    }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity hover:opacity-100">
                    <span className="rounded-md bg-black/50 px-2 py-1 text-2xs font-medium text-white">
                        Drag to reposition
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-2xs text-ink-muted">Zoom</span>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 appearance-none rounded-full bg-stone-200 accent-sienna [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sienna [&::-webkit-slider-thumb]:shadow-sm"
                />
                <span className="w-8 text-right text-2xs text-ink-muted">{Math.round(zoom * 100)}%</span>
            </div>
        </div>
    );
}

// ── Edit Profile Modal ─────────────────────────────────────────
function EditProfileModal({ profileData, isArtist, onClose }) {
    const profilePhotoRef = useRef(null);
    const coverPhotoRef   = useRef(null);

    const { data, setData, post, processing, errors } = useForm({
        bio:           profileData?.bio ?? '',
        specialty:     profileData?.specialty ?? '',
        profile_photo: null,
        cover_photo:   null,
    });

    const [profilePreview, setProfilePreview] = useState(profileData?.profile_photo_url);
    const [coverPreview, setCoverPreview]     = useState(profileData?.cover_photo_url);

    const handleProfilePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('profile_photo', file);
        setProfilePreview(URL.createObjectURL(file));
    };

    const handleCoverPhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('cover_photo', file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const removeProfilePhoto = () => {
        setData('profile_photo', null);
        setProfilePreview(null);
        if (profilePhotoRef.current) profilePhotoRef.current.value = '';
    };

    const removeCoverPhoto = () => {
        setData('cover_photo', null);
        setCoverPreview(null);
        if (coverPhotoRef.current) coverPhotoRef.current.value = '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('profile.social.update'), {
            forceFormData: true,
            onSuccess: () => onClose(),
            preserveScroll: true,
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
                        <h3 className="font-display text-lg font-semibold text-ink">Edit Profile</h3>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {/* Profile Photo */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-ink-soft">Profile Photo</label>
                                {profilePreview ? (
                                    <ImagePreview
                                        src={profilePreview}
                                        onRemove={removeProfilePhoto}
                                        shape="circle"
                                        label="Drag to adjust, or use the zoom slider"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => profilePhotoRef.current.click()}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm font-medium text-ink-muted transition-colors hover:border-sienna hover:text-sienna"
                                    >
                                        <Camera size={18} />
                                        Choose a profile photo
                                    </button>
                                )}
                                <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                                {errors.profile_photo && <p className="mt-1 text-xs text-red-500">{errors.profile_photo}</p>}
                            </div>

                            {/* Cover Photo */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-ink-soft">Cover Photo</label>
                                {coverPreview ? (
                                    <ImagePreview
                                        src={coverPreview}
                                        onRemove={removeCoverPhoto}
                                        shape="rect"
                                        label="Drag to adjust, or use the zoom slider"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => coverPhotoRef.current.click()}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm font-medium text-ink-muted transition-colors hover:border-sienna hover:text-sienna"
                                    >
                                        <Camera size={18} />
                                        Choose a cover photo
                                    </button>
                                )}
                                <input ref={coverPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhoto} />
                                {errors.cover_photo && <p className="mt-1 text-xs text-red-500">{errors.cover_photo}</p>}
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-ink-soft">Bio</label>
                                <textarea
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    placeholder="Tell people about yourself…"
                                    rows={3}
                                    maxLength={500}
                                    className="block w-full resize-none rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                                />
                                <p className="mt-1 text-right text-xs text-ink-subtle">{data.bio?.length || 0}/500</p>
                                {errors.bio && <p className="mt-1 text-xs text-red-500">{errors.bio}</p>}
                            </div>

                            {/* Art Skills (artists only) */}
                            {isArtist && (
                                <SkillTagInput
                                    value={data.specialty}
                                    onChange={(val) => setData('specialty', val)}
                                />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-sienna px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sienna-600 disabled:opacity-50"
                            >
                                {processing ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// ── Main Profile Page ──────────────────────────────────────────
export default function ProfileShow({
    profileUser,
    profileData,
    posts,
    likedPosts,
    followedArtists,
    followersCount: initialFollowers,
    followingCount,
    postsCount,
    isFollowing: initialFollowing,
    isOwnProfile,
}) {
    const [isFollowing, setIsFollowing]       = useState(initialFollowing);
    const [followersCount, setFollowersCount] = useState(initialFollowers);
    const [activeTab, setActiveTab]           = useState(profileUser.role === 'artist' ? 'posts' : 'liked');
    const [showEditModal, setShowEditModal]   = useState(false);

    const isArtist    = profileUser.role === 'artist';
    const displayName = profileData?.display_name ?? profileUser.name;

    // ── Follow toggle (optimistic) ──────────────────────────────
    const handleFollow = useCallback(async () => {
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setFollowersCount(c => wasFollowing ? c - 1 : c + 1);

        try {
            const response = await fetch(route('profile.follow', profileUser.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const json = await response.json();
                setIsFollowing(json.following);
                setFollowersCount(json.followers_count);
            } else {
                setIsFollowing(wasFollowing);
                setFollowersCount(c => wasFollowing ? c + 1 : c - 1);
            }
        } catch {
            setIsFollowing(wasFollowing);
            setFollowersCount(c => wasFollowing ? c + 1 : c - 1);
        }
    }, [isFollowing, profileUser.id]);

    const tabs = [];
    if (isArtist) {
        tabs.push({ key: 'posts', label: 'Posts', icon: Grid3X3, count: postsCount });
    }
    tabs.push({ key: 'liked', label: 'Liked', icon: Heart });
    if (isOwnProfile) {
        tabs.push({ key: 'following', label: 'Following', icon: Users, count: followingCount });
    }

    return (
        <AppLayout title={displayName}>
            <Head title={`${displayName} — Artisora`} />

            {showEditModal && (
                <EditProfileModal
                    profileData={profileData}
                    isArtist={isArtist}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            <div className="mx-auto max-w-[600px]">
                {/* ── Profile Header ────────────────────────────── */}
                {/*
                    overflow-hidden is intentionally NOT on this card wrapper.
                    It would clip the avatar which overlaps upward via -mt-14.
                    The cover photo is clipped by its own inner div instead.
                */}
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">

                    {/* Cover photo */}
                    <div className="relative h-44">
                        {profileData?.cover_photo_url ? (
                            <img
                                src={profileData.cover_photo_url}
                                alt="Cover"
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-sienna/30 via-amber-500/20 to-purple-500/20" />
                        )}

                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                        {/* Edit cover button */}
                        {isOwnProfile && (
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                            >
                                <Camera size={12} /> Edit Cover
                            </button>
                        )}
                    </div>

                    {/* Avatar + info — relative + bg-surface to sit above cover, avatar ring overlaps upward */}
                    <div className="relative bg-surface px-6 pb-6">
                        <div className="flex items-end gap-4 -mt-14">
                            <Avatar
                                name={displayName}
                                photoUrl={profileData?.profile_photo_url}
                                size="xl"
                            />
                            <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-bold text-ink truncate">{displayName}</h1>
                                    {isArtist && (
                                        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-2xs font-bold text-blue-700">
                                            <Brush size={9} /> Artist
                                        </span>
                                    )}
                                    {!isArtist && (
                                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                                            <ShoppingBag size={9} /> Collector
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-ink-muted">
                                    @{profileUser.name.toLowerCase().replace(/\s/g, '')}
                                </p>
                            </div>
                        </div>

                        {/* Bio */}
                        {profileData?.bio && (
                            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{profileData.bio}</p>
                        )}

                        {/* Location + meta */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                            {(profileData?.city || profileData?.province) && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {[profileData.city, profileData.province].filter(Boolean).join(', ')}
                                </span>
                            )}
                            {profileData?.specialty && (
                                <>
                                    {profileData.specialty.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                                        <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-sienna/10 px-2 py-0.5 text-xs font-medium text-sienna">
                                            <Palette size={10} /> {skill}
                                        </span>
                                    ))}
                                </>
                            )}
                            {profileData?.instagram_handle && (
                                <a
                                    href={`https://instagram.com/${profileData.instagram_handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-sienna transition-colors"
                                >
                                    <Instagram size={12} /> {profileData.instagram_handle}
                                </a>
                            )}
                            {profileData?.portfolio_url && (
                                <a
                                    href={profileData.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-sienna transition-colors"
                                >
                                    <ExternalLink size={12} /> Portfolio
                                </a>
                            )}
                        </div>

                        {/* Stats + action */}
                        <div className="mt-5 flex items-center justify-between">
                            <div className="flex gap-6">
                                {isArtist && <StatPill label="Posts" value={postsCount} />}
                                <StatPill label="Followers" value={followersCount} />
                                <StatPill label="Following" value={followingCount} />
                            </div>

                            <div className="flex items-center gap-2">
                                {!isOwnProfile && isArtist && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleFollow}
                                        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                                            isFollowing
                                                ? 'border border-border bg-canvas text-ink-soft hover:border-red-300 hover:text-red-500'
                                                : 'bg-sienna text-white shadow-sm hover:bg-sienna-600'
                                        }`}
                                    >
                                        {isFollowing ? (
                                            <><UserMinus size={15} /> Following</>
                                        ) : (
                                            <><UserPlus size={15} /> Follow</>
                                        )}
                                    </motion.button>
                                )}

                                {isOwnProfile && (
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="flex items-center gap-2 rounded-xl border border-border bg-canvas px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                                    >
                                        <Edit3 size={14} /> Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ───────────────────────────────────────── */}
                {tabs.length > 0 && (
                    <div className="mt-4 flex rounded-xl border border-border bg-surface overflow-hidden">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-b-2 border-sienna text-sienna'
                                            : 'text-ink-muted hover:text-ink'
                                    }`}
                                >
                                    <Icon size={15} />
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className="text-xs text-ink-subtle">({tab.count})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Tab content ────────────────────────────────── */}
                <div className="mt-4 pb-8">
                    {/* Posts grid (artists) */}
                    {activeTab === 'posts' && isArtist && (
                        <div>
                            {posts?.data?.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1.5">
                                    {posts.data.map(post => (
                                        <PostThumbnail key={post.id} post={post} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    emoji="🎨"
                                    title="No posts yet"
                                    subtitle={isOwnProfile
                                        ? 'Share your first artwork with the community!'
                                        : "This artist hasn't posted anything yet."}
                                />
                            )}
                            {posts?.next_page_url && <LoadMore url={posts.next_page_url} />}
                        </div>
                    )}

                    {/* Liked posts */}
                    {activeTab === 'liked' && (
                        <div>
                            {likedPosts?.data?.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1.5">
                                    {likedPosts.data.map(post => (
                                        <PostThumbnail key={post.id} post={post} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    emoji="❤️"
                                    title="No liked posts"
                                    subtitle="Posts you like will appear here."
                                />
                            )}
                        </div>
                    )}

                    {/* Following list */}
                    {activeTab === 'following' && isOwnProfile && (
                        <div>
                            {followedArtists?.length > 0 ? (
                                <div className="space-y-2">
                                    {followedArtists.map(artist => (
                                        <ArtistCard key={artist.id} artist={artist} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    emoji="👤"
                                    title="Not following anyone"
                                    subtitle="Follow artists to see their work in your feed!"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// ── Shared small components ────────────────────────────────────
function EmptyState({ emoji, title, subtitle }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <span className="mb-3 text-4xl">{emoji}</span>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>
    );
}

function LoadMore({ url }) {
    return (
        <div className="mt-4 text-center">
            <Link
                href={url}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-ink-soft shadow-xs transition-colors hover:bg-canvas hover:text-ink"
            >
                <ChevronDown size={15} />
                Load more
            </Link>
        </div>
    );
}