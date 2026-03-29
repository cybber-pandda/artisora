/**
 * ══════════════════════════════════════════════════════════════════════
 *  LerpAnimator — smooth coordinate transitions via requestAnimationFrame
 * ══════════════════════════════════════════════════════════════════════
 *
 * Instead of the driver icon "jumping" every 10 seconds, this utility
 * smoothly slides it (and the route line's leading edge) to the new
 * position over a configurable duration using an ease-out curve.
 *
 * v2 additions:
 *  - onFrameSync callback receives interpolated position + route geometry
 *    on every animation frame, enabling the synchronization contract
 *    (icon + route updated on the same rAF frame).
 *  - setBearing() to update the current bearing mid-animation.
 *  - setRouteGeometry() to update the route coords that the sync
 *    callback interpolates the leading edge onto.
 *
 * Usage:
 *   const lerp = new LerpAnimator({
 *       duration: 2500,
 *       onFrame: ({ lat, lng, progress }) => { ... },
 *       onFrameSync: ({ lat, lng, bearing, routeGeometry }) => { ... },
 *       onComplete: ({ lat, lng }) => { ... },
 *   });
 *   lerp.animateTo({ lat: 14.5, lng: 121.0 });
 */

// ── Tunable Constants ────────────────────────────────────────────────

/** Animation duration in milliseconds. Longer = more fluid, shorter = snappier.
 *  2.5s with ease-out gives a "deceleration" feel — fast start, gentle stop. */
export const DEFAULT_LERP_DURATION_MS = 2500;

// ── Easing Function ──────────────────────────────────────────────────

/**
 * Ease-out cubic: fast start → decelerate to stop.
 * @param {number} t — normalized progress [0..1]
 * @returns {number} — eased value [0..1]
 */
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// ── Angle Interpolation ──────────────────────────────────────────────

/**
 * Lerp between two angles using shortest-arc rotation.
 * Prevents the van from spinning 350° to go from 5° to 355°;
 * instead it rotates −10°.
 *
 * @param {number} fromDeg — starting angle in degrees
 * @param {number} toDeg   — target angle in degrees
 * @param {number} t       — progress [0..1]
 * @returns {number} — interpolated angle in degrees
 */
function lerpAngle(fromDeg, toDeg, t) {
    let diff = ((toDeg - fromDeg + 540) % 360) - 180; // shortest arc
    return fromDeg + diff * t;
}

// ── LerpAnimator ─────────────────────────────────────────────────────

export class LerpAnimator {
    /**
     * @param {object}   opts
     * @param {number}   opts.duration      — animation length in ms (default 2500)
     * @param {function} opts.onFrame       — called every frame: ({ lat, lng, progress })
     * @param {function} opts.onFrameSync   — called every frame with full sync data:
     *                                        ({ lat, lng, bearing, routeGeometry, progress })
     * @param {function} opts.onComplete    — called once when animation finishes: ({ lat, lng })
     */
    constructor({ duration = DEFAULT_LERP_DURATION_MS, onFrame, onFrameSync, onComplete } = {}) {
        this.duration = duration;
        this.onFrame = onFrame || (() => {});
        this.onFrameSync = onFrameSync || null;
        this.onComplete = onComplete || (() => {});

        this._from = null;           // { lat, lng }
        this._to = null;             // { lat, lng }
        this._startTime = null;
        this._rafId = null;
        this._currentPos = null;     // last interpolated position
        this._bearing = 0;           // current display bearing (degrees)
        this._bearingFrom = 0;       // bearing at animation start
        this._bearingTo = 0;         // target bearing
        this._routeGeometry = null;  // current route coords for sync
    }

    /**
     * Start (or restart) an animation toward a new target position.
     * If an animation is already running, it seamlessly transitions
     * from the current interpolated position to the new target.
     *
     * @param {{ lat: number, lng: number }} target
     */
    animateTo(target) {
        // Cancel any running animation
        this._cancelRaf();

        // Start from current interpolated position (if mid-animation)
        // or from the last known position, or from the target itself
        this._from = this._currentPos || this._to || target;
        this._to = target;
        this._startTime = performance.now();

        this._tick();
    }

    /**
     * Immediately jump to a position without animation.
     * Useful for the initial position set.
     *
     * @param {{ lat: number, lng: number }} pos
     */
    jumpTo(pos) {
        this._cancelRaf();
        this._from = pos;
        this._to = pos;
        this._currentPos = pos;
        this.onFrame({ ...pos, progress: 1 });
        this._emitSync(pos, 1);
    }

    /**
     * Update the target bearing. The display bearing will smoothly
     * interpolate toward this value over the animation duration
     * using shortest-arc rotation.
     *
     * @param {number} deg — target bearing in degrees
     */
    setBearing(deg) {
        this._bearingFrom = this._bearing;  // start from current display bearing
        this._bearingTo = deg;
    }

    /**
     * Update the route geometry for the sync callback.
     * The leading edge of this geometry will be updated to the
     * interpolated icon position on every animation frame.
     *
     * @param {[number, number][]} coords — route LineString coordinates
     */
    setRouteGeometry(coords) {
        this._routeGeometry = coords;
    }

    /** Stop any running animation. */
    stop() {
        this._cancelRaf();
    }

    /** Destroy the animator and clean up. */
    destroy() {
        this._cancelRaf();
        this._from = null;
        this._to = null;
        this._currentPos = null;
        this._routeGeometry = null;
    }

    /** Get the current interpolated position. */
    get position() {
        return this._currentPos;
    }

    /** Get the current bearing. */
    get currentBearing() {
        return this._bearing;
    }

    // ── Internal ─────────────────────────────────────────────────────

    _emitSync(pos, progress) {
        if (!this.onFrameSync) return;
        this.onFrameSync({
            lat: pos.lat,
            lng: pos.lng,
            bearing: this._bearing,
            routeGeometry: this._routeGeometry,
            progress,
        });
    }

    _tick() {
        this._rafId = requestAnimationFrame((now) => {
            const elapsed = now - this._startTime;
            const rawProgress = Math.min(elapsed / this.duration, 1);
            const easedProgress = easeOutCubic(rawProgress);

            const lat = this._from.lat + (this._to.lat - this._from.lat) * easedProgress;
            const lng = this._from.lng + (this._to.lng - this._from.lng) * easedProgress;

            // ── Smooth bearing interpolation (shortest arc) ──
            this._bearing = lerpAngle(this._bearingFrom, this._bearingTo, easedProgress);

            this._currentPos = { lat, lng };

            this.onFrame({ lat, lng, progress: easedProgress });
            this._emitSync({ lat, lng }, easedProgress);

            if (rawProgress < 1) {
                // Continue animating
                this._tick();
            } else {
                // Animation complete
                this._bearing = this._bearingTo; // snap to exact target
                this._rafId = null;
                this.onComplete({ lat: this._to.lat, lng: this._to.lng });
            }
        });
    }

    _cancelRaf() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }
}

export default LerpAnimator;
