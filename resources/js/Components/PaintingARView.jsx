import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Scan, AlertCircle, Smartphone } from 'lucide-react';

/**
 * PaintingARView
 *
 * Uses a server-generated GLB (via /ar/{id}) that has:
 *   - The painting image baked in as a texture (no CORS issues)
 *   - Physical dimensions set as actual mesh vertex positions (no scale guesswork)
 *
 * ar-scale="fixed" ensures 1:1 real-world size on both Android and iOS.
 *
 * Props:
 *   arModelUrl   {string}  — URL to the /ar/{id} GLB endpoint
 *   widthCm      {number}  — Physical width in cm  (display only)
 *   heightCm     {number}  — Physical height in cm (display only)
 *   productTitle {string}
 */
export default function PaintingARView({ arModelUrl, widthCm, heightCm, productTitle }) {
    const viewerRef = useRef(null);
    const [status,  setStatus]  = useState('loading'); // loading | ready | error | ar-active
    const [canAR,   setCanAR]   = useState(false);

    const handleLoad = useCallback(() => {
        const mv = viewerRef.current;
        setStatus('ready');
        setCanAR(!!mv?.canActivateAR);
    }, []);

    const handleARStatus = useCallback((e) => {
        const s = e.detail?.status;
        if (s === 'session-started') setStatus('ar-active');
        if (s === 'not-presenting')  setStatus('ready');
        if (s === 'failed')          setStatus('error');
    }, []);

    useEffect(() => {
        const mv = viewerRef.current;
        if (!mv) return;

        mv.addEventListener('load',      handleLoad);
        mv.addEventListener('ar-status', handleARStatus);
        mv.addEventListener('error',     () => setStatus('error'));

        return () => {
            mv.removeEventListener('load',      handleLoad);
            mv.removeEventListener('ar-status', handleARStatus);
        };
    }, [handleLoad, handleARStatus]);

    if (!arModelUrl) return null;

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface">

            {/* model-viewer — src points to server-generated textured GLB */}
            {/* eslint-disable-next-line jsx-a11y/no-unknown-role */}
            <model-viewer
                ref={viewerRef}
                src={arModelUrl}
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                ar-placement="wall"
                camera-controls
                shadow-intensity="0.6"
                environment-image="neutral"
                exposure="1.1"
                alt={`AR preview of ${productTitle}`}
                style={{
                    width: '100%',
                    height: '380px',
                    '--poster-color': 'transparent',
                }}
            >
                <div slot="progress-bar" style={{ display: 'none' }} />
            </model-viewer>

            {/* Loading overlay */}
            {status === 'loading' && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/90 backdrop-blur-sm">
                    <Loader2 size={32} className="animate-spin text-sienna" />
                    <p className="text-sm font-medium text-ink-muted">Preparing AR preview…</p>
                </div>
            )}

            {/* Error state */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/95 p-6 text-center">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-sm font-semibold text-ink">AR unavailable</p>
                    <p className="text-xs text-ink-muted">
                        Your browser may not support WebAR. Try Chrome on Android or Safari on iOS 12+.
                    </p>
                </div>
            )}

            {/* AR active badge */}
            {status === 'ar-active' && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-sienna px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                    AR active — point at your wall
                </div>
            )}

            {/* Bottom bar */}
            {status === 'ready' && (
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 bg-gradient-to-t from-surface via-surface/90 to-transparent p-4 pt-8">
                    <p className="text-xs text-ink-muted">
                        Real size: <span className="font-semibold text-ink">{widthCm} × {heightCm} cm</span>
                    </p>

                    {canAR ? (
                        <button
                            onClick={() => viewerRef.current?.activateAR()}
                            id="ar-activate-btn"
                            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-sienna/90 active:scale-95"
                        >
                            <Scan size={16} />
                            Place on Wall
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-canvas px-4 py-2.5 text-xs text-ink-muted">
                            <Smartphone size={14} />
                            AR placement available on iOS &amp; Android
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
