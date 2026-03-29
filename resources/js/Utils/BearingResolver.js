/**
 * ══════════════════════════════════════════════════════════════════════
 *  BearingResolver — direction calculation for snapped & off-road modes
 * ══════════════════════════════════════════════════════════════════════
 *
 * Snapped mode:  bearing from current snapped position → next waypoint
 * Off-road mode: coords.heading if available, else last-two-points bearing
 */

import bearing from '@turf/bearing';
import { point } from '@turf/helpers';

/**
 * Calculate bearing in snapped mode.
 *
 * Uses the snapped index to find the next coordinate on the route
 * LineString and computes bearing toward it.
 *
 * @param {[number, number]} snappedCoord  — [lng, lat] of snapped position
 * @param {number}           snappedIndex  — index on the route LineString
 * @param {[number, number][]} routeCoords — route LineString coordinates
 * @returns {number} — bearing in degrees [−180, 180]
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
 *  2. Bearing between the last two recorded raw positions
 *  3. Fallback: 0 (north)
 *
 * @param {number|null}       heading       — position.coords.heading (may be null)
 * @param {[number, number][]} lastPositions — array of recent [lng, lat] positions (newest last)
 * @returns {number} — bearing in degrees
 */
export function resolveOffroadBearing(heading, lastPositions) {
    // 1. Native heading from the Geolocation API
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
        return heading;
    }

    // 2. Compute from last two recorded raw positions
    if (lastPositions && lastPositions.length >= 2) {
        const prev = lastPositions[lastPositions.length - 2];
        const curr = lastPositions[lastPositions.length - 1];

        const from = point(prev);
        const to   = point(curr);

        return bearing(from, to);
    }

    // 3. Fallback
    return 0;
}
