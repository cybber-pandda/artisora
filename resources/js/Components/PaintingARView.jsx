import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * HiddenARViewer
 *
 * A zero-UI <model-viewer> that pre-loads the GLB in the background.
 * The parent calls activateAR() on the exposed ref to jump straight
 * into the AR session — no intermediate preview panel, no second tap.
 *
 * Props:
 *   arModelUrl   {string}  — URL to /ar/{id} GLB endpoint
 *   productTitle {string}  — Alt text
 *   onReady      {fn}      — Called when model is loaded and AR is available
 *   onError      {fn}      — Called if model fails to load
 */
const HiddenARViewer = ({ arModelUrl, productTitle, onReady, onError }) => {
    const viewerRef = useRef(null);

    const handleLoad = useCallback(() => {
        const mv = viewerRef.current;
        if (mv?.canActivateAR) {
            onReady?.(mv);
        }
    }, [onReady]);

    useEffect(() => {
        const mv = viewerRef.current;
        if (!mv) return;

        mv.addEventListener('load', handleLoad);
        mv.addEventListener('error', () => onError?.());

        return () => {
            mv.removeEventListener('load', handleLoad);
        };
    }, [handleLoad, onError]);

    if (!arModelUrl) return null;

    return (
        <model-viewer
            ref={viewerRef}
            src={arModelUrl}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="wall"
            // Prevent any user scaling in Scene Viewer
            data-ar-scale="fixed"
            alt={`AR preview of ${productTitle}`}
            style={{
                // Completely hidden — zero size, off-screen
                position: 'fixed',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
                zIndex: -1,
                top: '-9999px',
                left: '-9999px',
            }}
        />
    );
};

export default HiddenARViewer;
