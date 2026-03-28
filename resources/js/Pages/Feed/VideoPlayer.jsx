import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

/**
 * VideoPlayer — handles autoplay via IntersectionObserver.
 *
 * Props:
 *  - src          : video URL
 *  - postId       : unique identifier for this post
 *  - onPlay       : (postId) => void — called when this video starts playing,
 *                    so the parent can pause other videos
 *  - activePostId : the currently-active video post id (from parent)
 */
export default function VideoPlayer({ src, postId, onPlay, activePostId }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [userPaused, setUserPaused] = useState(false);

    // ── Pause this video when another becomes active ────────────
    useEffect(() => {
        if (activePostId && activePostId !== postId && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [activePostId, postId]);

    // ── IntersectionObserver: auto-play at 60% visibility ───────
    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    // Only auto-play if user hasn't manually paused
                    if (!userPaused) {
                        video.play().then(() => {
                            setIsPlaying(true);
                            onPlay?.(postId);
                        }).catch(() => {
                            // Browser blocked autoplay — silently fail
                        });
                    }
                } else {
                    video.pause();
                    setIsPlaying(false);
                }
            },
            { threshold: [0, 0.6] }
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, [postId, onPlay, userPaused]);

    // ── Toggle play/pause manually ──────────────────────────────
    const togglePlayPause = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().then(() => {
                setIsPlaying(true);
                setUserPaused(false);
                onPlay?.(postId);
            }).catch(() => {});
        } else {
            video.pause();
            setIsPlaying(false);
            setUserPaused(true);
        }
    }, [postId, onPlay]);

    // ── Toggle mute ─────────────────────────────────────────────
    const toggleMute = useCallback((e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
        }
    }, [muted]);

    return (
        <div
            ref={containerRef}
            className="relative bg-black group cursor-pointer"
            onClick={togglePlayPause}
        >
            <video
                ref={videoRef}
                src={src}
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="max-h-[560px] w-full object-contain"
            />

            {/* Play/Pause overlay — shows on hover or when paused */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
            >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                    {isPlaying ? (
                        <Pause size={24} className="text-white" fill="white" />
                    ) : (
                        <Play size={24} className="ml-0.5 text-white" fill="white" />
                    )}
                </div>
            </div>

            {/* Mute toggle — bottom-right */}
            <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110"
                aria-label={muted ? 'Unmute' : 'Mute'}
            >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
        </div>
    );
}
