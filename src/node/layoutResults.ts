/**
 * LayoutResults — per-node mutable scratch + cached measurement slots.
 *
 * Kept separate from `Node` so the public Node shape stays small and
 * stable. The algorithm mutates these fields freely between layout
 * passes; callers should never reach into LayoutResults directly.
 *
 * Mirrors `yoga/node/LayoutResults.{h,cpp}` but simplified for the
 * TUI subset:
 *   - 8-slot measure cache as plain objects (not Float64Array — V8
 *     inline caches already optimize this for small TUI trees; the
 *     Float64Array trick in claude-code was for 1000-node benchmarks)
 *   - no `cachedMeasurements.size()` / capacity management — 8 is fixed
 *   - position / margin / border / padding as 4-tuples indexed by
 *     PhysicalEdge (not 9-element arrays like upstream)
 */

import { Direction } from '../enums.js';
import { type CachedMeasurement, emptyCachedMeasurement } from './cachedMeasurement.js';

const CACHE_SLOTS = 8;

export class LayoutResults {
  // STEP 3 product — the resolved flex basis for the current generation.
  computedFlexBasis: number = Number.NaN;
  computedFlexBasisGeneration: number = 0;

  // Cache keys (set by calculateLayout before each pass).
  generationCount: number = 0;
  configVersion: number = 0;
  lastOwnerDirection: Direction = Direction.LTR;

  // 8-slot ring buffer of measure-pass results.
  nextCachedMeasurementsIndex: number = 0;
  cachedMeasurements: CachedMeasurement[] = Array.from({ length: CACHE_SLOTS }, () =>
    emptyCachedMeasurement(),
  );

  // Single-slot layout-pass cache (for measure-func leaves that also need
  // a "did the layout of this subtree change?" check).
  cachedLayout: CachedMeasurement = emptyCachedMeasurement();

  // 4-edge insets and offsets [Left, Right, Top, Bottom].
  position: [number, number, number, number] = [0, 0, 0, 0];
  margin: [number, number, number, number] = [0, 0, 0, 0];
  border: [number, number, number, number] = [0, 0, 0, 0];
  padding: [number, number, number, number] = [0, 0, 0, 0];

  // Final measured size [width, height].
  measuredDimensions: [number, number] = [0, 0];

  direction: Direction = Direction.LTR;
  hadOverflow: boolean = false;

  /**
   * Reset per-pass state. Cache keys (generationCount, configVersion,
   * lastOwnerDirection) are NOT reset — those are managed by calculateLayout.
   */
  reset(): void {
    this.computedFlexBasis = Number.NaN;
    this.computedFlexBasisGeneration = 0;
    this.nextCachedMeasurementsIndex = 0;
    this.cachedMeasurements = Array.from({ length: CACHE_SLOTS }, () => emptyCachedMeasurement());
    this.cachedLayout = emptyCachedMeasurement();
    this.position = [0, 0, 0, 0];
    this.margin = [0, 0, 0, 0];
    this.border = [0, 0, 0, 0];
    this.padding = [0, 0, 0, 0];
    this.measuredDimensions = [0, 0];
    this.hadOverflow = false;
  }

  /**
   * Allocate the next slot in the measure-cache ring buffer and return it.
   * Matches upstream `LayoutResults::nextCachedMeasurement()`.
   */
  getNextCachedMeasurementSlot(): CachedMeasurement {
    const slot = this.cachedMeasurements[this.nextCachedMeasurementsIndex];
    if (slot === undefined) {
      // Should never happen — array is preallocated in constructor.
      // Fall back to an ephemeral empty slot.
      return emptyCachedMeasurement();
    }
    this.nextCachedMeasurementsIndex = (this.nextCachedMeasurementsIndex + 1) % CACHE_SLOTS;
    return slot;
  }
}
