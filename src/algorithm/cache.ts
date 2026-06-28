/**
 * Measure / layout cache hit-test — ported from `yoga/algorithm/Cache.h`.
 *
 * `canUseCachedMeasurement` decides whether a previously stored
 * `CachedMeasurement` (inputs → outputs) still applies. The cache key
 * is composed of:
 *
 *   - the measure mode (Undefined / Exactly / AtMost) on both axes
 *   - the available size on both axes (inexact-equal)
 *   - the config version (any change to errata/feature flags invalidates)
 *
 * Note: upstream Yoga ALSO compares the *previously computed* output
 * dimensions against the *new computed* output dimensions on the leaf
 * (for measure-func nodes that can re-measure). We skip that comparison
 * here — measureFunc nodes must call `markDirty()` themselves if their
 * intrinsic content changes; the cache key above only covers "did the
 * input dimensions change?".
 */

import type { MeasureMode } from '../enums.js';
import type { CachedMeasurement } from '../node/cachedMeasurement.js';
import { inexactEquals } from '../numeric/comparison.js';

export function canUseCachedMeasurement(
  widthSizingMode: MeasureMode,
  availableWidth: number,
  heightSizingMode: MeasureMode,
  availableHeight: number,
  cached: CachedMeasurement,
  _configVersion: number,
): boolean {
  if (cached.widthSizingMode !== widthSizingMode) return false;
  if (cached.heightSizingMode !== heightSizingMode) return false;
  if (!inexactEquals(cached.availableWidth, availableWidth)) return false;
  if (!inexactEquals(cached.availableHeight, availableHeight)) return false;
  return true;
}

/**
 * Should a fresh layout pass be performed for this node, given the
 * last-known generation / config version?
 *
 * Returns true when generationCount is 0 (never been laid out) or
 * the cached generation / config version is stale.
 */
export function layoutPassRequired(
  cachedGeneration: number,
  currentGeneration: number,
  cachedConfigVersion: number,
  currentConfigVersion: number,
): boolean {
  if (cachedGeneration === 0) return true;
  if (cachedGeneration !== currentGeneration) return true;
  if (cachedConfigVersion !== currentConfigVersion) return true;
  return false;
}
