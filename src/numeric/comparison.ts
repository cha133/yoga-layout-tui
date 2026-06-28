/**
 * Numeric comparison helpers — ported from upstream Yoga C++
 * (`yoga/numeric/Comparison.h`).
 *
 * Yoga uses NaN-as-undefined for any scalar "optional" value (computed
 * flex basis, available inner dimension, etc.). These helpers provide the
 * four primitives the algorithm needs:
 *
 *   - `isUndefined` / `isDefined`: NaN sentinel detection
 *   - `maxOrDefined` / `minOrDefined`: clamp-style helpers that skip NaN
 *   - `inexactEquals`: float compare with hardcoded epsilon 0.0001
 *     (matching upstream exactly — used for cache hit/miss decisions)
 *
 * Important: `inexactEquals(NaN, NaN)` returns **true** (matches upstream
 * behavior — two undefineds are considered "equal"). One-NaN returns false.
 */

const EPSILON = 0.0001;

/** True iff the value is NaN (i.e., upstream Yoga's "undefined" sentinel). */
export function isUndefined(value: number): boolean {
  return Number.isNaN(value);
}

/** Inverse of `isUndefined`. */
export function isDefined(value: number): boolean {
  return !Number.isNaN(value);
}

/**
 * Returns the larger of `a` and `b`, treating NaN as "no value".
 * If both are NaN, returns NaN. If exactly one is NaN, returns the other.
 */
export function maxOrDefined(a: number, b: number): number {
  if (isDefined(a) && isDefined(b)) {
    return Math.max(a, b);
  }
  return isUndefined(a) ? b : a;
}

/**
 * Returns the smaller of `a` and `b`, treating NaN as "no value".
 * If both are NaN, returns NaN. If exactly one is NaN, returns the other.
 */
export function minOrDefined(a: number, b: number): number {
  if (isDefined(a) && isDefined(b)) {
    return Math.min(a, b);
  }
  return isUndefined(a) ? b : a;
}

/**
 * Float equality with a hardcoded epsilon of 0.0001 (matches upstream).
 * NaN equals NaN; one-sided NaN is never equal.
 *
 * Used by `canUseCachedMeasurement` to decide whether a layout cache
 * entry is still valid — pixel-perfect equality is too strict, but
 * exact-strict inequality would churn the cache on sub-pixel noise.
 */
export function inexactEquals(a: number, b: number): boolean {
  if (isDefined(a) && isDefined(b)) {
    return Math.abs(a - b) < EPSILON;
  }
  return isUndefined(a) && isUndefined(b);
}
