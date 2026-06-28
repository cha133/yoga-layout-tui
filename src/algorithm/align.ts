/**
 * Cross-axis alignment — ported from `yoga/algorithm/Align.h`.
 *
 * Aligns a child along the cross axis of its container, given the
 * container's available cross size and the child's own cross size.
 * Supports the 4 TUI-subset values: FlexStart / Center / FlexEnd /
 * Stretch (align-items and align-self).
 *
 * Mutates `child._layoutResults.position`:
 *   - position[0] = Left (main=row → set by main loop; cross=row → set here)
 *   - position[1] = Top  (main=col → set by main loop; cross=col → set here)
 */

import { Align, type Align as AlignType } from '../enums.js';

/**
 * Position `child` along the cross axis inside a container whose cross
 * size is `containerCrossSize`.
 *
 *   `childCrossSize`  — the child's own cross size (already computed).
 *   `axisMain`        — true if the container's main axis is row.
 *   `alignItems`      — the container's alignItems value.
 *   `alignSelf`       — the child's alignSelf value (Auto = fall through).
 *
 * Effective alignment = alignSelf if it's not Auto, otherwise alignItems.
 */
export function alignChild(
  child: { _layoutResults: { position: [number, number, number, number] } },
  containerCrossSize: number,
  childCrossSize: number,
  axisMain: boolean,
  alignItems: AlignType,
  alignSelf: AlignType,
): void {
  const effectiveAlign = alignSelf === Align.Auto ? alignItems : alignSelf;

  let offset = 0;
  if (effectiveAlign === Align.Stretch) {
    // Don't change the child's size (it's already computed). Just position
    // at offset 0; the child should already be set to fill the cross axis
    // by the caller before this function is called.
    offset = 0;
  } else if (!Number.isFinite(containerCrossSize) || !Number.isFinite(childCrossSize)) {
    offset = 0;
  } else {
    const free = Math.max(0, containerCrossSize - childCrossSize);
    switch (effectiveAlign) {
      case Align.Center:
        offset = free / 2;
        break;
      case Align.FlexEnd:
        offset = free;
        break;
      default:
        offset = 0;
        break;
    }
  }

  // axisMain=true → main=row, cross=col → cross axis is Y (position[1])
  // axisMain=false → main=col, cross=row → cross axis is X (position[0])
  if (axisMain) {
    child._layoutResults.position[1] = offset;
  } else {
    child._layoutResults.position[0] = offset;
  }
}
