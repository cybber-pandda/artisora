/**
 * ══════════════════════════════════════════════════════════════════════
 *  LerpAnimator — smooth coordinate transitions via requestAnimationFrame
 * ══════════════════════════════════════════════════════════════════════
 *
 * Instead of the driver icon "jumping" every 10 seconds, this utility
 * smoothly slides it (and the route line's leading edge) to the new
 * position over a configurable duration using an ease-out curve.
 *
 * Usage:
 *   const lerp = new LerpAnimator({
 *       duration: 2500,
 *       onFrame: ({ lat, lng, progress }) => { ... },
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

// ── LerpAnimator ─────────────────────────────────────────────────────

export class LerpAnimator {
    /**
     * @param {object}   opts
     * @param {number}   opts.duration   — animation length in ms (default 2500)
     * @param {function} opts.onFrame    — called every frame: ({ lat, lng, progress })
     * @param {function} opts.onComplete — called once when animation finishes: ({ lat, lng })
     */
    constructor({ duration = DEFAULT_LERP_DURATION_MS, onFrame, onComplete } = {}) {
        this.duration = duration;
        this.onFrame = onFrame || (() => {});
        this.onComplete = onComplete || (() => {});

        this._from = null;       // { lat, lng }
        this._to = null;         // { lat, lng }
        this._startTime = null;
        this._rafId = null;
        this._currentPos = null; // last interpolated position
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
    }

    /** Get the current interpolated position. */
    get position() {
        return this._currentPos;
    }

    // ── Internal ─────────────────────────────────────────────────────

    _tick() {
        this._rafId = requestAnimationFrame((now) => {
            const elapsed = now - this._startTime;
            const rawProgress = Math.min(elapsed / this.duration, 1);
            const easedProgress = easeOutCubic(rawProgress);

            const lat = this._from.lat + (this._to.lat - this._from.lat) * easedProgress;
            const lng = this._from.lng + (this._to.lng - this._from.lng) * easedProgress;

            this._currentPos = { lat, lng };

            this.onFrame({ lat, lng, progress: easedProgress });

            if (rawProgress < 1) {
                // Continue animating
                this._tick();
            } else {
                // Animation complete
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
