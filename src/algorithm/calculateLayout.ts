/**
 * Public entry for the layout algorithm.
 *
 * Mirrors upstream `YGNodeCalculateLayout`: callers pass an available
 * size (the parent container's inner size or the terminal's viewport),
 * we recurse into the whole subtree from `node` down.
 *
 * TUI subset: we don't expose MeasureMode in the public API (matches
 * Yoga's choice — finite sizes default to Exactly mode, NaN to
 * Undefined mode). Direction defaults to LTR (TUI never has RTL).
 *
 * A module-level generation counter increments on every public
 * `calculateLayout` call. Downstream caches (`cachedLayout`,
 * `cachedMeasurements[]`) key on it, so a fresh call invalidates all
 * stale per-node caches. Upstream Yoga's `gCurrentGenerationCount` is
 * the same trick.
 */

import { Direction, MeasureMode } from '../enums.js';
import type { Node } from '../node/node.js';
import { calculateLayoutImpl } from './calculateLayoutImpl.js';

let gGenerationCount = 0;

export function calculateLayout(
  node: Node,
  availableWidth: number,
  availableHeight: number,
  ownerDirection: Direction = Direction.LTR,
): void {
  gGenerationCount += 1;

  const widthSizingMode: MeasureMode = Number.isFinite(availableWidth)
    ? MeasureMode.Exactly
    : MeasureMode.Undefined;
  const heightSizingMode: MeasureMode = Number.isFinite(availableHeight)
    ? MeasureMode.Exactly
    : MeasureMode.Undefined;

  // Root has no parent, so its local origin is (0, 0). The recursion
  // entry (`calculateLayoutImpl`) does NOT reset `position[0/1]` —
  // non-root children inherit their local offset from the parent's
  // STEP 6c write, which would be clobbered by a top-of-recursion reset.
  node._layoutResults.position[0] = 0;
  node._layoutResults.position[1] = 0;

  calculateLayoutImpl(
    node,
    availableWidth,
    availableHeight,
    ownerDirection,
    widthSizingMode,
    heightSizingMode,
    gGenerationCount,
  );
}

/** Test-only — exposes the current generation count so tests can assert cache key state. */
export function getCurrentGenerationCount(): number {
  return gGenerationCount;
}
