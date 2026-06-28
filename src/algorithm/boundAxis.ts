/**
 * boundAxis — ported from `yoga/algorithm/BoundAxis.h`.
 *
 * Single-source-of-truth for "clamp a value between min and max where any
 * of the three may be NaN (undefined)". Used everywhere the algorithm
 * computes dimensions / positions and needs to apply user-specified
 * min/max constraints.
 */

import { isDefined } from '../numeric/comparison.js';

/**
 * Returns `min(max, value)` if max is defined; else `value`.
 * Then returns `max(min, result)` if min is defined; else `result`.
 *
 * Treats NaN (undefined) on either bound as "no constraint".
 * `value` itself is never treated as NaN-as-undefined — by the time we
 * get here, the caller has resolved Auto / Undefined to a concrete
 * pixel count (or the caller wants the raw undefined to propagate).
 */
export function boundAxis(min: number, value: number, max: number): number {
  let result = value;
  if (isDefined(max)) {
    result = Math.min(max, value);
  }
  if (isDefined(min)) {
    result = Math.max(min, result);
  }
  return result;
}

/**
 * Variant used when the caller has already computed min-content and
 * max-content sizes (via measure). Behavior:
 *
 *   If `max` is defined AND max ≥ min AND the content range fits
 *   within the bounds → clamp `value` to [min, max].
 *
 *   Otherwise → clamp `value` to [minContent, maxContent] (i.e., the
 *   intrinsic content size takes precedence over the user's min/max
 *   when the content overflows).
 */
export function boundAxisWithinMinAndMax(
  min: number,
  value: number,
  minContent: number,
  maxContent: number,
  max: number,
): number {
  if (isDefined(max) && max >= min && maxContent - min <= max - min) {
    return Math.min(max, Math.max(min, value));
  }
  return Math.max(minContent, Math.min(maxContent, value));
}
