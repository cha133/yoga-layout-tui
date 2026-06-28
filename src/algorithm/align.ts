/**
 * Cross-axis alignment — ported from `yoga/algorithm/Align.h`.
 *
 * Returns the cross-axis OFFSET (relative to the parent) for `child`,
 * computed from `containerCrossSize`, `childCrossSize`, and the
 * effective alignment (alignItems / alignSelf).
 *
 * Returns 0 for Stretch (the child's size is already set; we just
 * position it at the start edge) and for undefined / infinite inputs.
 * Center returns `freeSpace / 2`, FlexEnd returns the full freeSpace.
 *
 * Supports the 4 TUI-subset values: FlexStart / Center / FlexEnd /
 * Stretch (align-items and align-self).
 *
 * NOTE: this used to mutate `child._layoutResults.position` directly.
 * It now returns the offset so the caller (the main loop in
 * calculateLayoutImpl) can combine it with the parent's absolute
 * coords to produce an absolute child position. This avoids the
 * over-write bug where position from a previous call leaked through.
 */

import { Align, type Align as AlignType } from '../enums.js';

/**
 * Compute the cross-axis offset of `child` within a container whose
 * cross size is `containerCrossSize`.
 *
 *   `childCrossSize`  — the child's own cross size (already computed).
 *   `axisMain`        — true if the container's main axis is row.
 *   `alignItems`      — the container's alignItems value.
 *   `alignSelf`       — the child's alignSelf value (Auto = fall through).
 *
 * Effective alignment = alignSelf if it's not Auto, otherwise alignItems.
 *
 * Returns: the offset (>= 0) from the container's start edge.
 */
export function alignChild(
  _child: unknown,
  containerCrossSize: number,
  childCrossSize: number,
  _axisMain: boolean,
  alignItems: AlignType,
  alignSelf: AlignType,
): number {
  const effectiveAlign = alignSelf === Align.Auto ? alignItems : alignSelf;

  if (effectiveAlign === Align.Stretch) {
    // Don't change the child's size (it's already computed). Just position
    // at offset 0; the child should already be set to fill the cross axis
    // by the caller before this function is called.
    return 0;
  }
  if (!Number.isFinite(containerCrossSize) || !Number.isFinite(childCrossSize)) {
    return 0;
  }
  const free = Math.max(0, containerCrossSize - childCrossSize);
  switch (effectiveAlign) {
    case Align.Center:
      return free / 2;
    case Align.FlexEnd:
      return free;
    default:
      return 0;
  }
}
