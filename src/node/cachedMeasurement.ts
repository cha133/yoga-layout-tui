/**
 * CachedMeasurement — one slot of the per-node measure cache.
 *
 * A 6-field record: the (availableWidth, availableHeight, sizingMode*2)
 * inputs that produced a (computedWidth, computedHeight) result. The cache
 * hit test in `algorithm/cache.ts` compares these six fields with
 * `inexactEquals` to decide whether a leaf node's intrinsic-size result
 * is still valid.
 *
 * Mirrors `yoga/node/CachedMeasurement.h`.
 */

import { MeasureMode } from '../enums.js';

export interface CachedMeasurement {
  availableWidth: number;
  availableHeight: number;
  widthSizingMode: MeasureMode;
  heightSizingMode: MeasureMode;
  computedWidth: number;
  computedHeight: number;
}

/** The "no measurement yet" sentinel. All scalars NaN, modes Undefined. */
export function emptyCachedMeasurement(): CachedMeasurement {
  return {
    availableWidth: Number.NaN,
    availableHeight: Number.NaN,
    widthSizingMode: MeasureMode.Undefined,
    heightSizingMode: MeasureMode.Undefined,
    computedWidth: Number.NaN,
    computedHeight: Number.NaN,
  };
}
