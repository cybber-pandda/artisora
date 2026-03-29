/**
 * ══════════════════════════════════════════════════════════════════════
 *  DriverIconState — dual-state icon logic with hysteresis
 * ══════════════════════════════════════════════════════════════════════
 *
 * State A: 'puck'    — stationary compass puck (speed < 1.5 m/s to enter)
 * State B: 'vehicle' — moving van icon (speed >= 2.0 m/s to enter)
 *
 * Hysteresis prevents rapid toggling at the speed threshold:
 *   - Up:   must exceed 2.0 m/s to switch to vehicle
 *   - Down: must drop below 1.5 m/s to switch back to puck
 *   - Between 1.5–2.0: retains previous state
 */

// ── Hysteresis thresholds (m/s) ──────────────────────────────────────

/** Speed above which we switch to vehicle icon */
export const SPEED_THRESHOLD_UP = 2.0;

/** Speed below which we switch back to puck icon */
export const SPEED_THRESHOLD_DOWN = 1.5;

// ── State computation ────────────────────────────────────────────────

/**
 * Compute the icon display state based on speed with hysteresis.
 *
 * @param {number|null} speed     — GPS speed in m/s (may be null)
 * @param {'puck'|'vehicle'} prevState — previous icon state
 * @returns {'puck'|'vehicle'}
 */
export function computeIconState(speed, prevState = 'puck') {
    // If speed is null/undefined (GPS hasn't reported yet), stay in previous state
    if (speed === null || speed === undefined || isNaN(speed)) {
        return prevState;
    }

    if (speed >= SPEED_THRESHOLD_UP) {
        return 'vehicle';
    }

    if (speed < SPEED_THRESHOLD_DOWN) {
        return 'puck';
    }

    // In the hysteresis zone (1.5–2.0 m/s): retain previous state
    return prevState;
}

// ── Heading resolution ───────────────────────────────────────────────

/**
 * Resolve which heading value to use for display based on icon state.
 *
 * - Puck state → compass heading (real-time device orientation)
 * - Vehicle state → GPS/pipeline bearing (course over ground)
 *
 * @param {'puck'|'vehicle'} iconState
 * @param {number}           compassHeading    — from useCompassHeading (0–360, smoothed)
 * @param {number}           gpsBearing        — from SnapPipeline / BearingResolver
 * @param {boolean}          compassAvailable  — whether compass data exists
 * @param {number}           lastKnownBearing  — fallback if nothing else available
 * @returns {number} — heading in degrees
 */
export function resolveDisplayBearing(
    iconState,
    compassHeading,
    gpsBearing,
    compassAvailable = false,
    lastKnownBearing = 0
) {
    if (iconState === 'puck') {
        // Prefer compass heading when stationary
        if (compassAvailable && typeof compassHeading === 'number') {
            return compassHeading;
        }
        // Compass unavailable — fall back to last known rather than snapping to 0
        return lastKnownBearing;
    }

    // Vehicle state — use GPS/pipeline bearing
    if (typeof gpsBearing === 'number' && !isNaN(gpsBearing)) {
        return gpsBearing;
    }

    return lastKnownBearing;
}

/**
 * Determine the heading source label for the server payload.
 *
 * @param {'puck'|'vehicle'} iconState
 * @param {boolean}          compassAvailable
 * @returns {'compass'|'gps'}
 */
export function resolveHeadingSource(iconState, compassAvailable) {
    if (iconState === 'puck' && compassAvailable) {
        return 'compass';
    }
    return 'gps';
}
