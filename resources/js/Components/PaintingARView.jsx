import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * PaintingARView — Production AR Component for Artisora
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  <model-viewer>        (invisible, loading="eager")     │
 *   │    ├─ src={arModelUrl}  ← server-generated GLB with:   │
 *   │    │    ├─ is_ar_primary HD texture baked in buffer     │
 *   │    │    └─ physical cm → m vertex positions             │
 *   │    ├─ ar-placement="wall"                               │
 *   │    ├─ ar-scale="fixed"   ← prevents pinch-resize       │
 *   │    └─ <div slot="ar-dom-overlay">                       │
 *   │         ├─ size badge (W × H cm)                        │
 *   │         ├─ placement hint ("point at wall")             │
 *   │         ├─ Lock Position button                         │
 *   │         └─ touch-shield (blocks hit-test when locked)   │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Scaling math (no `scale` attribute needed):
 *   The GLB mesh vertices from ArModelController are already at:
 *     x = ±(widthCm / 200) m,  y = ±(heightCm / 200) m
 *   e.g. 61×107 cm → vertices at ±0.305 × ±0.535 → mesh = 0.61m × 1.07m
 *   Combined with ar-scale="fixed", the painting renders at true 1:1 scale.
 *
 * Ghost-movement fix:
 *   When "Lock Position" is tapped, a full-screen transparent <div> with
 *   pointerEvents:'auto' is inserted into the DOM overlay. This captures
 *   ALL touch events before they reach model-viewer's hit-test handler,
 *   physically preventing the object from being repositioned. Additionally,
 *   camera-controls is removed and touch-action set to 'none' on the element.
 *
 * Props:
 *   arModelUrl   {string}  — absolute URL to /ar/{id} endpoint
 *   widthCm      {number}  — physical width in cm (display + validation)
 *   heightCm     {number}  — physical height in cm (display + validation)
 *   productTitle {string}  — alt text
 *   onReady      {fn}      — called with { activate(), canAR } when GLB loaded
 */
export default function PaintingARView({
    arModelUrl,
    widthCm,
    heightCm,
    productTitle,
    onReady,
}) {
    const mvRef      = useRef(null);
    const readyFired = useRef(false);

    // ── AR session state ─────────────────────────────────────────
    const [arActive, setArActive] = useState(false);
    const [placed,   setPlaced]   = useState(false);
    const [locked,   setLocked]   = useState(false);

    // ── Ref callback — fires onReady when GLB is loaded ─────────
    const handleRef = useCallback((node) => {
        mvRef.current = node;
        if (!node) return;

        const fire = () => {
            if (readyFired.current) return;
            readyFired.current = true;
            onReady?.({
                activate: () => node.activateAR(),
                canAR:    !!node.canActivateAR,
            });
        };

        // model-viewer may already be loaded
        if (node.loaded) fire();
        else node.addEventListener('load', fire, { once: true });
    }, [onReady]);

    // ── AR session lifecycle ─────────────────────────────────────
    useEffect(() => {
        const mv = mvRef.current;
        if (!mv) return;

        const onStatus = (e) => {
            switch (e.detail?.status) {
                case 'session-started':
                    setArActive(true);
                    setPlaced(false);
                    setLocked(false);
                    break;
                case 'object-placed':
                    setPlaced(true);
                    break;
                case 'not-presenting':
                case 'failed':
                    setArActive(false);
                    setPlaced(false);
                    setLocked(false);
                    break;
            }
        };

        mv.addEventListener('ar-status', onStatus);
        return () => mv.removeEventListener('ar-status', onStatus);
    }, []);

    // ── Lock / Unlock — disable hit-testing & camera-controls ───
    useEffect(() => {
        const mv = mvRef.current;
        if (!mv || !arActive) return;

        if (locked) {
            // Freeze: remove model interaction attributes
            mv.removeAttribute('camera-controls');
            mv.style.touchAction = 'none';
        } else {
            // Unfreeze: restore interaction
            mv.setAttribute('camera-controls', '');
            mv.style.touchAction = '';
        }
    }, [locked, arActive]);

    if (!arModelUrl) return null;

    // ── Inline styles (AR overlay — outside app CSS context) ────
    const pill = {
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        color: '#fff',
        borderRadius: '14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        pointerEvents: 'auto',
    };

    return (
        <model-viewer
            ref={handleRef}
            src={arModelUrl}
            loading="eager"

            // ── AR engine configuration ──────────────────────────
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="wall"

            // ── Environmental realism ────────────────────────────
            shadow-intensity="1.5"
            shadow-softness="1"
            environment-image="neutral"
            exposure="1.2"

            // ── Interaction defaults (toggled via lock effect) ───
            camera-controls
            touch-action="pan-y"

            alt={`AR preview: ${productTitle} — ${widthCm} × ${heightCm} cm`}

            // ── Physical dimensions as data attrs (debugging) ────
            data-width-m={(widthCm / 100).toFixed(4)}
            data-height-m={(heightCm / 100).toFixed(4)}

            style={{
                // In-viewport but invisible. loading="eager" forces
                // immediate GLB fetch regardless of visibility.
                // NOT off-screen (top: -9999px breaks IntersectionObserver).
                position: 'fixed',
                bottom:   0,
                right:    0,
                width:    '10px',
                height:   '10px',
                opacity:  0,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex:   -1,
            }}
        >
            {/* ═══════════════════════════════════════════════════════
                AR DOM Overlay
                Rendered on top of the live camera during WebXR sessions.
                Touch events on this overlay do NOT pass to the 3D scene
                unless the element has pointerEvents:'none'.
               ═══════════════════════════════════════════════════════ */}
            <div
                id="ar-overlay"
                slot="ar-dom-overlay"
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',          // ← pass-through by default
                    fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                {/* ── Touch Shield ─────────────────────────────────
                    When LOCKED: full-screen barrier captures ALL touches,
                    preventing model-viewer's hit-test from firing.
                    This is the primary fix for the "ghost movement" bug.
                   ──────────────────────────────────────────────── */}
                {locked && (
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 5,
                            pointerEvents: 'auto',
                            touchAction: 'none',
                        }}
                    />
                )}

                {/* ── Top Bar ──────────────────────────────────── */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '16px',
                    pointerEvents: 'none',
                    zIndex: 20,
                }}>
                    {/* Size badge */}
                    <div style={{
                        ...pill,
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                    }}>
                        📐 {widthCm} × {heightCm} cm
                    </div>

                    {/* Locked indicator */}
                    {locked && (
                        <div style={{
                            ...pill,
                            background: 'rgba(34, 197, 94, 0.85)',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                        }}>
                            🔒 Locked
                        </div>
                    )}
                </div>

                {/* ── Bottom Controls ─────────────────────────── */}
                <div style={{
                    padding: '0 16px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 20,
                }}>
                    {/* Placement hint — before first tap */}
                    {!placed && (
                        <div style={{
                            ...pill,
                            padding: '12px 24px',
                            borderRadius: '24px',
                            fontSize: '14px',
                            fontWeight: 500,
                            textAlign: 'center',
                            animation: 'arPulse 2s ease-in-out infinite',
                        }}>
                            👆 Point at your wall, then tap to place
                        </div>
                    )}

                    {/* Lock / Unlock button — after placement */}
                    {placed && (
                        <button
                            onClick={() => setLocked(prev => !prev)}
                            style={{
                                ...pill,
                                background: locked
                                    ? 'rgba(34, 197, 94, 0.9)'
                                    : 'rgba(0, 0, 0, 0.7)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                borderRadius: '16px',
                                padding: '14px 32px',
                                fontSize: '15px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                letterSpacing: '0.01em',
                            }}
                        >
                            {locked ? '🔓 Unlock Position' : '📌 Lock Position'}
                        </button>
                    )}

                    {/* Walk-closer tip when locked */}
                    {locked && (
                        <div style={{
                            ...pill,
                            background: 'rgba(0,0,0,0.45)',
                            padding: '8px 16px',
                            fontSize: '12px',
                            textAlign: 'center',
                        }}>
                            Walk closer to inspect details ✨
                        </div>
                    )}
                </div>
            </div>

            {/* Keyframe for placement hint pulse */}
            <style>{`
                @keyframes arPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.75; transform: scale(0.97); }
                }
            `}</style>
        </model-viewer>
    );
}
