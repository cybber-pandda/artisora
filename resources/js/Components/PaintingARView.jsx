import { useState, useEffect, useRef, useCallback } from 'react';
import { Scan, Smartphone, Loader2, AlertTriangle } from 'lucide-react';

/**
 * PaintingARPreview
 *
 * A VISIBLE model-viewer preview that doubles as the AR launcher.
 *
 * Why visible? model-viewer needs actual dimensions to initialize WebXR.
 * Hidden/off-screen elements fail silently. By showing a 3D preview,
 * the user gets a nice interactive view AND one-tap wall AR.
 *
 * ar-placement="wall" only works via WebXR — NOT via Scene Viewer.
 * ar-modes is set to "webxr scene-viewer" so WebXR (with wall support)
 * is tried first, Scene Viewer is the fallback.
 */
export default function PaintingARPreview({
    arModelUrl,
    widthCm,
    heightCm,
    productTitle,
}) {
    const viewerRef = useRef(null);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [canAR, setCanAR]   = useState(false);

    const handleLoad = useCallback(() => {
        setStatus('ready');
        if (viewerRef.current?.canActivateAR) {
            setCanAR(true);
        }
    }, []);

    useEffect(() => {
        const mv = viewerRef.current;
        if (!mv) return;

        mv.addEventListener('load',  handleLoad);
        mv.addEventListener('error', () => setStatus('error'));

        // Check if already loaded (race condition guard)
        if (mv.loaded) handleLoad();

        return () => {
            mv.removeEventListener('load', handleLoad);
        };
    }, [handleLoad]);

    const handleActivateAR = () => {
        viewerRef.current?.activateAR();
    };

    if (!arModelUrl) return null;

    return (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            {/* ── 3D Preview (model-viewer must have real dimensions) ── */}
            <div className="relative" style={{ height: '320px' }}>
                {/* eslint-disable-next-line */}
                <model-viewer
                    ref={viewerRef}
                    src={arModelUrl}
                    loading="eager"
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    ar-scale="fixed"
                    ar-placement="wall"
                    camera-controls
                    touch-action="pan-y"
                    shadow-intensity="1"
                    shadow-softness="0.8"
                    environment-image="neutral"
                    exposure="1.1"
                    auto-rotate
                    auto-rotate-delay="2000"
                    rotation-per-second="8deg"
                    alt={`3D preview of ${productTitle}`}
                    style={{
                        width:  '100%',
                        height: '100%',
                        '--poster-color': 'transparent',
                    }}
                >
                    {/* Hide default progress bar */}
                    <div slot="progress-bar" style={{ display: 'none' }} />
                </model-viewer>

                {/* Loading overlay */}
                {status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/80 backdrop-blur-sm">
                        <Loader2 size={28} className="animate-spin text-sienna" />
                        <p className="text-xs font-medium text-ink-muted">Loading 3D preview…</p>
                    </div>
                )}

                {/* Error state */}
                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/90 p-4 text-center">
                        <AlertTriangle size={24} className="text-amber-500" />
                        <p className="text-xs text-ink-muted">3D preview unavailable</p>
                    </div>
                )}
            </div>

            {/* ── Bottom bar: dimensions + AR button ────────────── */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-canvas/50">
                <div>
                    <p className="text-xs text-ink-muted">
                        Real size: <span className="font-semibold text-ink">{widthCm} × {heightCm} cm</span>
                    </p>
                </div>

                {canAR ? (
                    <button
                        onClick={handleActivateAR}
                        className="flex items-center gap-1.5 rounded-lg bg-sienna px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-sienna/90 active:scale-95"
                    >
                        <Scan size={14} />
                        Place on Wall
                    </button>
                ) : status === 'ready' ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">
                        <Smartphone size={12} />
                        AR on mobile
                    </div>
                ) : null}
            </div>
        </div>
    );
}
