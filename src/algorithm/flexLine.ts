/**
 * FlexLine — ported from `yoga/algorithm/FlexLine.h`.
 *
 * A FlexLine is the unit of layout for a single row (when flexDirection
 * is Row) or column (when flexDirection is Column) inside a flex
 * container. With flex-wrap = NoWrap (the only mode we implement), the
 * entire container is exactly one FlexLine.
 *
 * Upstream Yoga also has `FlexLineRunningLayout` — a stateful builder
 * used while collecting items into a line. We don't need it: with
 * wrap = NoWrap, the whole tree is one line so the "collection" is just
 * "all visible children".
 */

import { Display } from '../enums.js';
import type { Node } from '../node/node.js';

export interface FlexLine {
  /** Items in this line, in source order (NOT visual order — visual order
   * is applied by `setTrailingPositions` based on FlexDirection reverse). */
  items: Node[];

  /** Sum of item computed-flex-bases + gaps along main axis. Set in STEP 4. */
  mainSize: number;

  /** Cross-axis size of the line. Set in STEP 6 (after each item is laid out). */
  crossSize: number;

  /** Number of items that have flexGrow > 0. STEP 5 reads this to distribute free space. */
  growCount: number;

  /** Number of items that have flexShrink > 0. STEP 5 reads this to absorb overflow. */
  shrinkCount: number;
}

/**
 * Build the single FlexLine for a no-wrap container — a list of all
 * non-display:none children, with the counters zeroed.
 *
 * The display:none filter here is a safety net; the algorithm's main
 * loop already skips these. If a display:none child shows up, we drop it
 * rather than blowing up.
 */
export function buildSingleFlexLine(children: Node[]): FlexLine {
  const visible = children.filter((c) => c.style.display !== Display.None);
  return {
    items: visible,
    mainSize: 0,
    crossSize: 0,
    growCount: 0,
    shrinkCount: 0,
  };
}
