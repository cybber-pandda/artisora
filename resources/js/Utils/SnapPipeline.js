/**
 * ══════════════════════════════════════════════════════════════════════
 *  SnapPipeline — hybrid GPS snapping pipeline
 * ══════════════════════════════════════════════════════════════════════
 *
 * Pure-function pipeline that processes every incoming GPS tick:
 *
 *  Step 1 — Accuracy Guard       (drop noisy fixes > 50m)
 *  Step 2 — Snap Candidate       (nearestPointOnLine)
 *  Step 3 — 20m Hybrid Decision  (snapped vs off-road)
 *  Step 4 — Bearing Resolver     (snapped bearing vs heading fallback)
 *  Step 5 — Dynamic Route Tail   (off-road tail geometry)
 *  Step 6 — Output               (data for the frame contract)
 *
 * No React state, no side-effects. Takes input → returns output.
 */

import nearestPointOnLine from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';
import { resolveSnappedBearing, resolveOffroadBearing } from './BearingResolver';
import { buildTail, mergeWithRoute, pruneOnReentry } from './TailBuilder';

/** Maximum GPS accuracy (meters) to accept. Anything worse is dropped. */
const ACCURACY_THRESHOLD = 50;

/** Snap distance threshold (meters). Below = snapped, above = off-road. */
const SNAP_DISTANCE_THRESHOLD = 20;

/**
 * @typedef {Object} PipelineInput
 * @property {{ latitude: number, longitude: number, accuracy: number, heading: number|null }} coords
 * @property {[number, number][]|null} routeCoords        — current route LineString coordinates
 * @property {'snapped'|'offroad'}     prevSnapMode       — previous snap mode
 * @property {[number, number]|null}   lastSnappedPoint   — last coord where snap was < 20m
 * @property {[number, number][]}      accumulatedOffroad — accumulated off-road positions
 * @property {[number, number][]}      recentRawPositions — last few raw GPS positions (for bearing fallback)
 * @property {[number, number][]|null} originalRouteCoords — the canonical route (without any tail)
 */

/**
 * @typedef {Object} PipelineOutput
 * @property {'snapped'|'offroad'}    snapMode
 * @property {[number, number]}       targetPosition      — [lng, lat] for the icon lerp target
 * @property {number}                 bearing             — degrees
 * @property {[number, number][]}     routeGeometry       — full route coords (may include tail)
 * @property {[number, number]|null}  lastSnappedPoint    — updated last snapped coord
 * @property {[number, number][]}     accumulatedOffroad  — updated offroad points array
 * @property {[number, number][]}     recentRawPositions  — updated recent raw array (capped at 5)
 * @property {number}                 snapDistance        — distance from raw to snapped point (m)
 * @property {[number, number]}       rawPosition          — the raw GPS position [lng, lat]
 */

/**
 * Process a single GPS tick through the full pipeline.
 *
 * @param {PipelineInput} input
 * @returns {PipelineOutput|null} — null means the fix was dropped (accuracy guard)
 */
export function processGpsTick(input) {
    const {
        coords,
        routeCoords,
        prevSnapMode,
        lastSnappedPoint,
        accumulatedOffroad,
        recentRawPositions,
        originalRouteCoords,
    } = input;

    // ═══════════════════════════════════════════════════════════════
    //  Step 1 — Accuracy Guard (Early Exit)
    // ═══════════════════════════════════════════════════════════════
    if (coords.accuracy > ACCURACY_THRESHOLD) {
        console.debug(
            `[SnapPipeline] Dropping fix — accuracy ${coords.accuracy.toFixed(1)}m > ${ACCURACY_THRESHOLD}m threshold`
        );
        return null; // Drop entirely. Do not mutate any state.
    }

    const rawLng = coords.longitude;
    const rawLat = coords.latitude;
    const rawPosition = [rawLng, rawLat];

    // Update recent positions buffer (capped at 5)
    const updatedRecentRaw = [...(recentRawPositions || []), rawPosition].slice(-5);

    // If we don't have a route to snap to, return raw position (pure off-road)
    if (!routeCoords || routeCoords.length < 2) {
        return {
            snapMode: 'offroad',
            targetPosition: rawPosition,
            bearing: resolveOffroadBearing(coords.heading, updatedRecentRaw),
            routeGeometry: originalRouteCoords || [],
            lastSnappedPoint: lastSnappedPoint,
            accumulatedOffroad: [...(accumulatedOffroad || []), rawPosition],
            recentRawPositions: updatedRecentRaw,
            snapDistance: Infinity,
            rawPosition,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //  Step 2 — Snap Candidate Calculation
    // ═══════════════════════════════════════════════════════════════
    const routeLine   = lineString(routeCoords);
    const rawGpsPoint = point(rawPosition);
    const snapped     = nearestPointOnLine(routeLine, rawGpsPoint, { units: 'meters' });

    const snapDistance  = snapped.properties.dist;       // meters from raw → snapped
    const snappedCoord  = snapped.geometry.coordinates;  // [lng, lat]
    const snappedIndex  = snapped.properties.index;      // index on the route

    // ═══════════════════════════════════════════════════════════════
    //  Step 3 — The 20-Meter Hybrid Decision
    // ═══════════════════════════════════════════════════════════════
    const isSnapped = snapDistance < SNAP_DISTANCE_THRESHOLD;

    if (isSnapped) {
        // ── SNAPPED MODE ──────────────────────────────────────────

        // Step 4a — Bearing: toward next waypoint on the route
        const bearingDeg = resolveSnappedBearing(snappedCoord, snappedIndex, routeCoords);

        // If we were previously offroad, prune the tail on re-entry
        let routeGeometry;
        if (prevSnapMode === 'offroad' && originalRouteCoords) {
            // Re-entering the route — prune tail, resume canonical route from reentry point
            routeGeometry = pruneOnReentry(originalRouteCoords, snappedIndex);
        } else {
            // Normal snapped operation — use canonical route from snapped point onward
            routeGeometry = originalRouteCoords
                ? originalRouteCoords.slice(snappedIndex)
                : routeCoords.slice(snappedIndex);
        }

        return {
            snapMode: 'snapped',
            targetPosition: snappedCoord,
            bearing: bearingDeg,
            routeGeometry,
            lastSnappedPoint: snappedCoord,       // update: this IS the snapped point
            accumulatedOffroad: [],                 // clear offroad buffer
            recentRawPositions: updatedRecentRaw,
            snapDistance,
            rawPosition,
        };
    } else {
        // ── OFF-ROAD MODE ─────────────────────────────────────────

        // Step 4b — Bearing: heading from Geolocation API or last-two-points
        const bearingDeg = resolveOffroadBearing(coords.heading, updatedRecentRaw);

        // Step 5 — Dynamic Route Tail
        const updatedOffroad = [...(accumulatedOffroad || []), rawPosition];
        const anchor = lastSnappedPoint || (routeCoords.length > 0 ? routeCoords[0] : rawPosition);

        const tail = buildTail(anchor, updatedOffroad.slice(0, -1), rawPosition);
        const routeGeometry = mergeWithRoute(
            originalRouteCoords || routeCoords,
            anchor,
            tail
        );

        return {
            snapMode: 'offroad',
            targetPosition: rawPosition,
            bearing: bearingDeg,
            routeGeometry,
            lastSnappedPoint: lastSnappedPoint || anchor,
            accumulatedOffroad: updatedOffroad,
            recentRawPositions: updatedRecentRaw,
            snapDistance,
            rawPosition,
        };
    }
}

export default processGpsTick;
