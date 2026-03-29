/**
 * ══════════════════════════════════════════════════════════════════════
 *  TailBuilder — off-road route tail geometry manager
 * ══════════════════════════════════════════════════════════════════════
 *
 * When the driver goes off-road (> 20m from the route), we surgically
 * extend the route LineString with a "tail" segment that connects:
 *
 *   lastSnappedPoint → ...accumulatedOffroadPoints → currentPosition
 *
 * When the driver re-enters snapped mode, we prune the tail and resume
 * the canonical route geometry.
 */

/**
 * Build the off-road tail segment.
 *
 * @param {[number, number]}   lastSnappedPoint      — last coord where snapDistance < 20m
 * @param {[number, number][]} accumulatedOffroadPoints — intermediate off-road positions
 * @param {[number, number]}   currentPosition       — current raw GPS position [lng, lat]
 * @returns {[number, number][]} — tail coordinate array
 */
export function buildTail(lastSnappedPoint, accumulatedOffroadPoints, currentPosition) {
    const tail = [];

    if (lastSnappedPoint) {
        tail.push(lastSnappedPoint);
    }

    if (accumulatedOffroadPoints && accumulatedOffroadPoints.length > 0) {
        tail.push(...accumulatedOffroadPoints);
    }

    tail.push(currentPosition);

    return tail;
}

/**
 * Merge the off-road tail with the original route geometry.
 *
 * The tail extends from the last valid snapped point outward.
 * We find the index of the last snapped point on the route,
 * take everything up to and including that index, then append the tail.
 *
 * @param {[number, number][]} originalRouteCoords — canonical route coordinates
 * @param {[number, number]}   lastSnappedPoint    — the route coord where driver left
 * @param {[number, number][]} tail                — from buildTail()
 * @returns {[number, number][]} — merged coordinate array
 */
export function mergeWithRoute(originalRouteCoords, lastSnappedPoint, tail) {
    if (!originalRouteCoords || originalRouteCoords.length === 0) {
        return tail;
    }

    if (!lastSnappedPoint) {
        return [...originalRouteCoords, ...tail];
    }

    // Find the closest index on the route to the last snapped point
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < originalRouteCoords.length; i++) {
        const dx = originalRouteCoords[i][0] - lastSnappedPoint[0];
        const dy = originalRouteCoords[i][1] - lastSnappedPoint[1];
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
        }
    }

    // Take route up to the snapped point, then append just the offroad portion
    // (skip duplicate of lastSnappedPoint — it's already the tail's first coord)
    const routePrefix = originalRouteCoords.slice(0, bestIdx + 1);
    const tailSuffix  = tail.slice(1); // skip first element (= lastSnappedPoint)

    return [...routePrefix, ...tailSuffix];
}

/**
 * Prune the tail on snap re-entry.
 *
 * When the driver returns within 20m of the route, strip any off-road
 * coordinates and return to the canonical route geometry starting
 * from the re-entry point.
 *
 * @param {[number, number][]} routeCoords   — canonical route coordinates
 * @param {number}             reentryIndex  — index on the route where driver re-entered
 * @returns {[number, number][]} — pruned route from reentry onward
 */
export function pruneOnReentry(routeCoords, reentryIndex) {
    if (!routeCoords || routeCoords.length === 0) return [];
    const safeIdx = Math.max(0, Math.min(reentryIndex, routeCoords.length - 1));
    return routeCoords.slice(safeIdx);
}
