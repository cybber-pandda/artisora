import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Scan, AlertCircle, Smartphone } from 'lucide-react';

/**
 * PaintingARView
 *
 * Renders a <model-viewer> web component that lets mobile users place the painting
 * on their physical wall at true 1:1 scale using WebXR / Scene Viewer / Quick Look.
 *
 * Props:
 *   arImageUrl   {string}   — S3 signed URL of the painting image (used as base colour texture)
 *   widthCm      {number}   — Physical width in centimetres
 *   heightCm     {number}   — Physical height in centimetres
 *   productTitle {string}   — Used for the AR poster alt text
 */
export default function PaintingARView({ arImageUrl, widthCm, heightCm, productTitle }) {
    const viewerRef  = useRef(null);
    const [status, setStatus]     = useState('idle');   // idle | loading | ready | error | ar-active
    const [canAR,  setCanAR]      = useState(false);

    // Convert cm → metres (1:1 real-world scale)
    const widthM  = (widthCm  / 100).toFixed(4);
    const heightM = (heightCm / 100).toFixed(4);
    // Depth: 2cm — gives the painting realistic thickness on the wall
    const depthM  = '0.02';

    // Detect AR capability after model-viewer initialises
    const handleLoad = useCallback(() => {
        const mv = viewerRef.current;
        if (!mv) return;
        setStatus('ready');
        // model-viewer exposes canActivateAR after the model loads
        setCanAR(!!mv.canActivateAR);
    }, []);

    const handleARStatus = useCallback((e) => {
        const { status: arStatus } = e.detail;
        if (arStatus === 'session-started') setStatus('ar-active');
        if (arStatus === 'not-presenting')  setStatus('ready');
        if (arStatus === 'failed')          setStatus('error');
    }, []);

    const handleError = useCallback(() => {
        setStatus('error');
    }, []);

    useEffect(() => {
        const mv = viewerRef.current;
        if (!mv) return;

        setStatus('loading');
        mv.addEventListener('load',      handleLoad);
        mv.addEventListener('ar-status', handleARStatus);
        mv.addEventListener('error',     handleError);

        return () => {
            mv.removeEventListener('load',      handleLoad);
            mv.removeEventListener('ar-status', handleARStatus);
            mv.removeEventListener('error',     handleError);
        };
    }, [handleLoad, handleARStatus, handleError]);

    const activateAR = () => {
        viewerRef.current?.activateAR();
    };

    // Build a data-URI material override so the painting texture shows on the plane
    // We set the base-color texture via the model-viewer `src` approach:
    // The GLB provides UVs; model-viewer applies arImageUrl as baseColorTexture via CSS env map trick.
    // The cleanest cross-device approach is a scene-graph edit via model-viewer's material API.
    const applyTexture = useCallback(async () => {
        const mv = viewerRef.current;
        if (!mv || !arImageUrl) return;
        try {
            await mv.model; // wait for model to parse
            const material = mv.model?.materials?.[0];
            if (!material) return;
            const pbr = material.pbrMetallicRoughness;
            // Load the painting image as the base colour texture
            const tex = await mv.createTexture(arImageUrl);
            pbr.baseColorTexture.setTexture(tex);
        } catch {
            // Texture API may not be universally supported — fail silently
        }
    }, [arImageUrl]);

    useEffect(() => {
        if (status === 'ready') applyTexture();
    }, [status, applyTexture]);

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface">

            {/* ── model-viewer element ──────────────────────────── */}
            {/* eslint-disable-next-line jsx-a11y/no-unknown-role */}
            <model-viewer
                ref={viewerRef}
                src="/models/canvas_plane.glb"
                // Scale the 1×1m plane to the painting's physical dimensions
                // scale="widthM depthM heightM" (X = width, Y = depth/thickness, Z = height)
                scale={`${widthM} ${depthM} ${heightM}`}
                // AR attributes
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                ar-placement="wall"
                // Visual settings
                camera-controls
                shadow-intensity="0.8"
                environment-image="neutral"
                exposure="1"
                // Poster shown while loading
                poster={arImageUrl || undefined}
                alt={`AR preview of ${productTitle}`}
                style={{
                    width: '100%',
                    height: '380px',
                    background: 'transparent',
                    '--poster-color': 'transparent',
                }}
            >
                {/* Loading indicator inside model-viewer's slot */}
                <div slot="progress-bar" style={{ display: 'none' }} />
            </model-viewer>

            {/* ── Loading overlay ───────────────────────────────── */}
            {status === 'loading' && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/90 backdrop-blur-sm">
                    <Loader2 size={32} className="animate-spin text-sienna" />
                    <p className="text-sm font-medium text-ink-muted">Loading AR engine…</p>
                </div>
            )}

            {/* ── Error state ───────────────────────────────────── */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/95 p-6 text-center">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-sm font-semibold text-ink">AR unavailable</p>
                    <p className="text-xs text-ink-muted">Your device or browser doesn't support WebAR. Try opening this page on an iOS or Android device.</p>
                </div>
            )}

            {/* ── AR active badge ───────────────────────────────── */}
            {status === 'ar-active' && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-sienna px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                    AR active — point at your wall
                </div>
            )}

            {/* ── Bottom action bar ─────────────────────────────── */}
            {(status === 'ready' || status === 'idle') && (
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 bg-gradient-to-t from-surface via-surface/90 to-transparent p-4 pt-8">
                    {/* Dimensions label */}
                    <p className="text-xs text-ink-muted">
                        Real size: <span className="font-semibold text-ink">{widthCm} × {heightCm} cm</span>
                    </p>

                    {canAR ? (
                        <button
                            onClick={activateAR}
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
