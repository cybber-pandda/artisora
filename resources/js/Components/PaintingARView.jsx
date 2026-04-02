/**
 * AR helpers — no model-viewer dependency for mobile activation.
 *
 * On Android: opens Google Scene Viewer directly via intent URL.
 * On iOS:     opens model-viewer Quick Look (if available).
 * On desktop: caller should open the QR modal instead.
 */

/**
 * Returns true if the user-agent looks like Android.
 */
export function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

/**
 * Returns true if the user-agent looks like iOS (iPhone/iPad/iPod).
 */
export function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Returns true if mobile (Android or iOS).
 */
export function isMobileDevice() {
    return isAndroid() || isIOS();
}

/**
 * Launch Google Scene Viewer (Android) with the given GLB URL.
 *
 * @param {string} glbUrl  — absolute URL to the GLB model
 * @param {string} title   — painting title (shown in Scene Viewer UI)
 * @param {string} fallbackUrl — where to go if Scene Viewer isn't available
 */
export function openSceneViewer(glbUrl, title = '', fallbackUrl = '') {
    const params = new URLSearchParams({
        file:      glbUrl,
        mode:      'ar_preferred',
        resizable: 'false',       // Lock to real-world size
        title:     title,
    });

    const fallback = encodeURIComponent(fallbackUrl || window.location.href);

    // Android intent URL — opens Scene Viewer directly, no model-viewer needed
    const intentUrl =
        `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}` +
        `#Intent;scheme=https;` +
        `package=com.google.android.googlequicksearchbox;` +
        `action=android.intent.action.VIEW;` +
        `S.browser_fallback_url=${fallback};` +
        `end;`;

    window.location.href = intentUrl;
}

/**
 * Attempt iOS Quick Look via a temporary <a rel="ar"> link.
 * Quick Look requires a USDZ file, which we don't generate —
 * so this will gracefully fail on most devices. We include it
 * as a best-effort attempt.
 *
 * @param {string} glbUrl
 */
export function openQuickLook(glbUrl) {
    const anchor = document.createElement('a');
    anchor.setAttribute('rel', 'ar');
    anchor.setAttribute('href', glbUrl);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 1000);
}

/**
 * One-call function: detects platform and opens the right AR viewer.
 * Returns true if AR was triggered, false if desktop (caller should show QR).
 */
export function launchAR(glbUrl, title = '', fallbackUrl = '') {
    if (isAndroid()) {
        openSceneViewer(glbUrl, title, fallbackUrl);
        return true;
    }

    if (isIOS()) {
        openQuickLook(glbUrl);
        return true;
    }

    return false; // desktop — caller shows QR modal
}
