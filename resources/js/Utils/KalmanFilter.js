/**
 * ══════════════════════════════════════════════════════════════════════
 *  GPS Kalman Filter — smooths noisy GPS readings
 * ══════════════════════════════════════════════════════════════════════
 *
 * Uses a simple 1D Kalman filter applied independently to lat and lng.
 * An "innovation threshold" (in meters) suppresses micro-jitter when
 * the device is basically stationary.
 *
 * Usage:
 *   const gps = new GpsFilter();
 *   const smoothed = gps.filter(rawLat, rawLng);
 *   // smoothed = { lat, lng, didMove }
 */

// ── Tunable Constants ────────────────────────────────────────────────
// Keep these at the top so QA can easily tweak during testing.

/** Minimum movement (in meters) to accept as real motion. Below this,
 *  the filter treats the reading as noise and returns the last position. */
export const JITTER_THRESHOLD_METERS = 5;

/** Process noise — how quickly we allow the estimate to drift toward
 *  new measurements. Lower = smoother but slower to react. */
export const DEFAULT_PROCESS_NOISE = 0.00001;

/** Measurement noise — how much we distrust GPS readings.
 *  Higher = more filtering / slower convergence. */
export const DEFAULT_MEASUREMENT_NOISE = 0.0001;

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Approximate distance in meters between two {lat,lng} points.
 * Uses the Equirectangular approximation (perfectly accurate under 10 km).
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6_371_000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}

// ── 1D Kalman Filter ─────────────────────────────────────────────────

class Kalman1D {
    /**
     * @param {number} Q — process noise
     * @param {number} R — measurement noise
     */
    constructor(Q = DEFAULT_PROCESS_NOISE, R = DEFAULT_MEASUREMENT_NOISE) {
        this.Q = Q;
        this.R = R;
        this.x = null;  // state estimate
        this.P = 1;     // error covariance
    }

    /**
     * Feed one measurement and return the filtered value.
     * @param {number} z — raw measurement
     * @returns {number} — filtered value
     */
    filter(z) {
        if (this.x === null) {
            // First reading — just accept it
            this.x = z;
            return z;
        }

        // ── Predict ──
        // State prediction: x_k|k-1 = x_k-1  (no motion model)
        // Covariance prediction: P_k|k-1 = P_k-1 + Q
        this.P += this.Q;

        // ── Update ──
        // Kalman gain
        const K = this.P / (this.P + this.R);

        // State update
        this.x += K * (z - this.x);

        // Covariance update
        this.P *= (1 - K);

        return this.x;
    }

    /** Peek the current estimate without feeding a measurement */
    get estimate() {
        return this.x;
    }
}

// ── Combined GPS Filter (lat + lng) ─────────────────────────────────

export class GpsFilter {
    /**
     * @param {object}  opts
     * @param {number}  opts.processNoise        — Q for Kalman (default 0.00001)
     * @param {number}  opts.measurementNoise     — R for Kalman (default 0.0001)
     * @param {number}  opts.jitterThresholdMeters — innovation cutoff in meters (default 5)
     */
    constructor({
        processNoise = DEFAULT_PROCESS_NOISE,
        measurementNoise = DEFAULT_MEASUREMENT_NOISE,
        jitterThresholdMeters = JITTER_THRESHOLD_METERS,
    } = {}) {
        this.latFilter = new Kalman1D(processNoise, measurementNoise);
        this.lngFilter = new Kalman1D(processNoise, measurementNoise);
        this.threshold = jitterThresholdMeters;
        this._lastLat = null;
        this._lastLng = null;
    }

    /**
     * Filter a raw GPS coordinate pair.
     *
     * @param {number} rawLat
     * @param {number} rawLng
     * @returns {{ lat: number, lng: number, didMove: boolean }}
     *   lat/lng are the filtered (smoothed) coordinates.
     *   didMove is true only if the innovation exceeded the jitter threshold.
     */
    filter(rawLat, rawLng) {
        // First reading — accept as-is
        if (this._lastLat === null) {
            this._lastLat = this.latFilter.filter(rawLat);
            this._lastLng = this.lngFilter.filter(rawLng);
            return { lat: this._lastLat, lng: this._lastLng, didMove: true };
        }

        // ── Innovation check (distance from current estimate to raw reading) ──
        const dist = distanceMeters(this._lastLat, this._lastLng, rawLat, rawLng);

        if (dist < this.threshold) {
            // Movement is below the jitter threshold — treat as noise.
            // Do NOT update the Kalman state. Return the existing estimate.
            return { lat: this._lastLat, lng: this._lastLng, didMove: false };
        }

        // ── Meaningful movement — run through the Kalman filter ──
        this._lastLat = this.latFilter.filter(rawLat);
        this._lastLng = this.lngFilter.filter(rawLng);

        return { lat: this._lastLat, lng: this._lastLng, didMove: true };
    }

    /** Get the current filtered position without feeding new data. */
    get position() {
        if (this._lastLat === null) return null;
        return { lat: this._lastLat, lng: this._lastLng };
    }

    /** Reset the filter state (e.g., when delivery changes). */
    reset() {
        this.latFilter = new Kalman1D(this.latFilter.Q, this.latFilter.R);
        this.lngFilter = new Kalman1D(this.lngFilter.Q, this.lngFilter.R);
        this._lastLat = null;
        this._lastLng = null;
    }
}

export default GpsFilter;
