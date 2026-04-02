import { useRef, useCallback } from 'react';

/**
 * PaintingARLauncher
 *
 * Renders a tiny, invisible-but-in-viewport <model-viewer> with loading="eager".
 * The parent calls the exposed `activate` callback to fire AR directly.
 *
 * Key attributes:
 *   - ar-placement="wall"  → WebXR places on walls, not floors
 *   - ar-scale="fixed"     → locks painting to real physical size (no pinch-resize)
 *   - loading="eager"      → loads GLB immediately even if element is tiny
 *   - ar-modes="webxr scene-viewer quick-look" → tries WebXR first (wall support),
 *     falls back to Scene Viewer (Android) then Quick Look (iOS)
 *
 * Props:
 *   arModelUrl   {string}  — URL to /ar/{id} GLB endpoint
 *   productTitle {string}  — alt text
 *   onReady      {fn}      — called with { activate() } when loaded
 */
export default function PaintingARLauncher({ arModelUrl, productTitle, onReady }) {
    const readyFired = useRef(false);

    const handleRef = useCallback((node) => {
        if (!node) return;

        const onLoad = () => {
            if (readyFired.current) return;
            readyFired.current = true;
            onReady?.({
                activate: () => node.activateAR(),
                canAR:    !!node.canActivateAR,
            });
        };

        // model-viewer may already be loaded by the time React attaches the ref
        if (node.loaded) {
            onLoad();
        } else {
            node.addEventListener('load', onLoad, { once: true });
        }
    }, [onReady]);

    if (!arModelUrl) return null;

    return (
        <model-viewer
            ref={handleRef}
            src={arModelUrl}
            loading="eager"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="wall"
            alt={`AR preview of ${productTitle}`}
            style={{
                // Tiny but WITHIN the viewport — not off-screen.
                // loading="eager" + in-viewport = guaranteed load.
                position: 'absolute',
                width:    '1px',
                height:   '1px',
                opacity:  0,
                overflow: 'hidden',
                pointerEvents: 'none',
            }}
        />
    );
}
