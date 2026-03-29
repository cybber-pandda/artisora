/**
 * ══════════════════════════════════════════════════════════════════════
 *  useCompassHeading — Device Orientation API hook with iOS permission
 * ══════════════════════════════════════════════════════════════════════
 *
 * Abstracts compass/magnetometer heading from the Device Orientation API.
 *
 *  - Primary:  `deviceorientationabsolute`  (Android/Chrome)
 *  - Fallback: `deviceorientation` + `webkitCompassHeading` (iOS Safari)
 *
 * Applies an exponential low-pass smoothing filter (α = 0.2) with
 * wraparound-safe modular arithmetic to prevent jitter.
 *
 * Returns:
 *   compassHeading        — smoothed heading in degrees [0, 360), 0 = North
 *   compassAvailable      — true if the device provides orientation data
 *   needsPermission       — true if iOS requestPermission() is required
 *   requestCompassPermission — async function to call on user gesture
 *   permissionState       — 'prompt' | 'granted' | 'denied' | 'not-required'
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Tunable Constants ────────────────────────────────────────────────

/** Smoothing factor. Lower = smoother but more lag. 0.2 is a good default. */
const SMOOTHING_ALPHA = 0.2;

// ── Wraparound-safe smoothing ────────────────────────────────────────

/**
 * Apply exponential low-pass filter to a heading value.
 * Handles 360°↔0° wraparound correctly.
 *
 * @param {number} raw      — raw heading [0, 360)
 * @param {number} smoothed — previous smoothed value [0, 360)
 * @param {number} alpha    — smoothing factor (0..1)
 * @returns {number} — new smoothed heading [0, 360)
 */
function smoothHeading(raw, smoothed, alpha = SMOOTHING_ALPHA) {
    const delta = ((raw - smoothed + 540) % 360) - 180; // shortest arc
    return ((smoothed + alpha * delta) + 360) % 360;
}

// ── Normalize heading ────────────────────────────────────────────────

/**
 * Extract a north-referenced heading in [0, 360) from a DeviceOrientationEvent.
 *
 * @param {DeviceOrientationEvent} event
 * @returns {number|null} — heading in degrees, or null if unavailable
 */
function extractHeading(event) {
    // iOS Safari: webkitCompassHeading is already north-referenced [0, 360)
    if (typeof event.webkitCompassHeading === 'number' && !isNaN(event.webkitCompassHeading)) {
        return event.webkitCompassHeading;
    }

    // Android / Chrome: alpha is the z-axis rotation.
    // When absolute === true, heading = (360 - alpha) % 360
    if (event.absolute === true && typeof event.alpha === 'number' && !isNaN(event.alpha)) {
        return (360 - event.alpha) % 360;
    }

    // Non-absolute fallback (less reliable, but better than nothing)
    if (typeof event.alpha === 'number' && !isNaN(event.alpha)) {
        return (360 - event.alpha) % 360;
    }

    return null;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useCompassHeading() {
    const [compassHeading, setCompassHeading]       = useState(0);
    const [compassAvailable, setCompassAvailable]   = useState(false);
    const [needsPermission, setNeedsPermission]     = useState(false);
    const [permissionState, setPermissionState]      = useState('not-required');

    const smoothedRef    = useRef(0);
    const rafIdRef       = useRef(null);
    const latestRawRef   = useRef(null);  // latest raw heading from event
    const listenerAttached = useRef(false);

    // ── rAF loop: throttles updates to 60fps ─────────────────────
    const startRafLoop = useCallback(() => {
        if (rafIdRef.current !== null) return; // already running

        const tick = () => {
            const raw = latestRawRef.current;
            if (raw !== null) {
                smoothedRef.current = smoothHeading(raw, smoothedRef.current);
                setCompassHeading(smoothedRef.current);
            }
            rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
    }, []);

    const stopRafLoop = useCallback(() => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    }, []);

    // ── Event handler ────────────────────────────────────────────
    const handleOrientation = useCallback((event) => {
        const heading = extractHeading(event);
        if (heading === null) return;

        if (!compassAvailable) {
            setCompassAvailable(true);
        }

        latestRawRef.current = heading;
    }, [compassAvailable]);

    // ── Attach the orientation listener ──────────────────────────
    const attachListener = useCallback(() => {
        if (listenerAttached.current) return;

        // Try absolute first (Android/Chrome — more accurate)
        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            listenerAttached.current = true;
        } else {
            // Fallback: standard deviceorientation (iOS uses this + webkitCompassHeading)
            window.addEventListener('deviceorientation', handleOrientation, true);
            listenerAttached.current = true;
        }

        startRafLoop();
    }, [handleOrientation, startRafLoop]);

    // ── iOS 13+ permission request ───────────────────────────────
    const requestCompassPermission = useCallback(async () => {
        if (typeof DeviceOrientationEvent === 'undefined') {
            setPermissionState('denied');
            return false;
        }

        if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
            // Not iOS — attach immediately
            setPermissionState('not-required');
            attachListener();
            return true;
        }

        try {
            const result = await DeviceOrientationEvent.requestPermission();
            if (result === 'granted') {
                setPermissionState('granted');
                setNeedsPermission(false);
                attachListener();
                return true;
            } else {
                setPermissionState('denied');
                console.warn('[Compass] Permission denied by user');
                return false;
            }
        } catch (err) {
            console.error('[Compass] Permission request failed:', err);
            setPermissionState('denied');
            return false;
        }
    }, [attachListener]);

    // ── Auto-attach on mount ─────────────────────────────────────
    useEffect(() => {
        // Check if iOS permission is needed
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ — need user gesture to request permission
            setNeedsPermission(true);
            setPermissionState('prompt');
        } else {
            // Android / desktop — attach immediately
            setPermissionState('not-required');
            attachListener();
        }

        return () => {
            // Cleanup
            window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
            window.removeEventListener('deviceorientation', handleOrientation, true);
            listenerAttached.current = false;
            stopRafLoop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        compassHeading,
        compassAvailable,
        needsPermission,
        requestCompassPermission,
        permissionState,
    };
}

export default useCompassHeading;
