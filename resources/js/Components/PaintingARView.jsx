/**
 * AR Launch Helpers for Artisora
 *
 * Reality check on mobile AR platforms:
 *
 *   Android → Google Scene Viewer (native app)
 *     ✓ Reliable surface detection (floors AND walls on newer devices)
 *     ✓ Native move/rotate/scale gestures (polished UX)
 *     ✓ resizable=false locks painting to physical dimensions
 *     ✗ No custom DOM overlay buttons (Scene Viewer controls its own UI)
 *     ✗ No programmatic wall-lock (user drags to wall manually)
 *
 *   iOS → Quick Look (requires USDZ — not supported without conversion)
 *
 *   Desktop → QR code to open on phone
 *
 * Approach: Direct intent URL to Scene Viewer. No model-viewer middleman,
 * no invisible preloading, no WebXR fallback. One tap → native AR.
 */

/**
 * Launch AR on the current device.
 *
 * @param {string} glbUrl      — absolute URL to /ar/{id} GLB
 * @param {string} title       — painting title shown in Scene Viewer
 * @param {string} fallbackUrl — where to redirect if Scene Viewer unavailable
 * @returns {boolean} true if AR was launched (mobile), false if desktop
 */
export function launchAR(glbUrl, title = '', fallbackUrl = '') {
    const ua = navigator.userAgent;

    // ── Android → Scene Viewer intent ────────────────────────────
    if (/Android/i.test(ua)) {
        const params = new URLSearchParams({
            file:                        glbUrl,
            mode:                        'ar_preferred',
            resizable:                   'false',
            enable_vertical_placement:   'true',   // ← enables WALL placement
            title:                       title,
        });

        const fallback = encodeURIComponent(fallbackUrl || window.location.href);

        window.location.href =
            `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}` +
            `#Intent;scheme=https;` +
            `package=com.google.android.googlequicksearchbox;` +
            `action=android.intent.action.VIEW;` +
            `S.browser_fallback_url=${fallback};` +
            `end;`;

        return true;
    }

    // ── iOS → attempt Quick Look (best effort) ───────────────────
    if (/iPhone|iPad|iPod/i.test(ua)) {
        // Quick Look needs .usdz — our .glb won't work natively,
        // but model-viewer's <a rel="ar"> might handle conversion.
        // For now, we'll try opening the GLB directly.
        const a = document.createElement('a');
        a.setAttribute('rel', 'ar');
        a.href = glbUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 500);
        return true;
    }

    // ── Desktop → caller should show QR modal ────────────────────
    return false;
}
