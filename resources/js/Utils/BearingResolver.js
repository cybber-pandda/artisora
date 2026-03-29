/**
 * ══════════════════════════════════════════════════════════════════════
 *  BearingResolver — direction calculation for snapped & off-road modes
 * ══════════════════════════════════════════════════════════════════════
 *
 * Snapped mode:  bearing from current snapped position → next waypoint
 * Off-road mode: coords.heading if available, else last-two-points bearing
 *
 * The van emoji (🚐) faces RIGHT by default, so we apply a -90° offset
 * to align it with the direction of travel (north = 0° on the map).
 */

import bearing from '@turf/bearing';
import { point } from '@turf/helpers';

/**
 * Rotation offset to align the icon's natural orientation with map north.
 * The 🚐 emoji faces RIGHT (east), so -90° rotates it to face UP (north).
 * Adjust this if you swap to a different icon asset.
 */
export const ICON_ROTATION_OFFSET = -90;

/**
 * Calculate bearing in snapped mode.
 *
 * Uses the snapped index to find the next coordinate on the route
 * LineString and computes bearing toward it.
 *
 * @param {[number, number]} snappedCoord  — [lng, lat] of snapped position
 * @param {number}           snappedIndex  — index on the route LineString
 * @param {[number, number][]} routeCoords — route LineString coordinates
 * @returns {number} — bearing in degrees [−180, 180] (WITHOUT offset — raw geographic bearing)
 */
export function resolveSnappedBearing(snappedCoord, snappedIndex, routeCoords) {
    if (!routeCoords || routeCoords.length < 2) return 0;

    // Next waypoint is index + 1 (the snapped point sits between index and index+1)
    const nextIdx = Math.min(snappedIndex + 1, routeCoords.length - 1);

    // Guard: if we're at the very last segment, use the last two coords
    const from = point(snappedCoord);
    const to   = point(routeCoords[nextIdx]);

    return bearing(from, to);
}

/**
 * Calculate bearing in off-road mode.
 *
 * Priority chain:
 *  1. coords.heading (from Geolocation API) — most accurate when moving
 *  2. Bearing between the last two recorded raw positions (movement delta)
 *  3. Fallback: lastKnownBearing (keeps facing last direction instead of snapping to north)
 *
 * @param {number|null}        heading          — position.coords.heading (may be null)
 * @param {[number, number][]} lastPositions    — array of recent [lng, lat] positions (newest last)
 * @param {number}             lastKnownBearing — previous bearing to hold if no new data (default 0)
 * @returns {number} — bearing in degrees (WITHOUT offset — raw geographic bearing)
 */
export function resolveOffroadBearing(heading, lastPositions, lastKnownBearing = 0) {
    // 1. Native heading from the Geolocation API
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
        return heading;
    }

    // 2. Compute from last two recorded raw positions (movement delta)
    if (lastPositions && lastPositions.length >= 2) {
        const prev = lastPositions[lastPositions.length - 2];
        const curr = lastPositions[lastPositions.length - 1];

        // Only compute if there's meaningful distance (avoid jitter-bearing)
        const dlng = curr[0] - prev[0];
        const dlat = curr[1] - prev[1];
        const dist = Math.sqrt(dlng * dlng + dlat * dlat);

        if (dist > 0.000005) { // ~0.5m threshold to avoid noise
            const from = point(prev);
            const to   = point(curr);
            return bearing(from, to);
        }
    }

    // 3. Hold last known bearing — prevents snapping to north
    return lastKnownBearing;
}

/**
 * Apply the icon rotation offset to a raw geographic bearing.
 * Call this as the LAST step before setting the CSS transform.
 *
 * @param {number} rawBearing — geographic bearing in degrees
 * @returns {number} — display-ready bearing with offset applied
 */
export function applyRotationOffset(rawBearing) {
    return rawBearing + ICON_ROTATION_OFFSET;
}
