/**
 * Flex direction helpers — ported from `yoga/algorithm/FlexDirection.h`.
 *
 * Yoga models "main axis" and "cross axis" as a combination of
 * flexDirection (Row / RowReverse / Column / ColumnReverse) and direction
 * (LTR / RTL). For the TUI subset we only support LTR, so the RTL
 * branches degenerate to no-ops — kept in the API for parity with
 * upstream, but never triggered.
 */

import { Dimension, Direction, FlexDirection } from '../enums.js';

export function isRow(flexDirection: FlexDirection): boolean {
  return flexDirection === FlexDirection.Row || flexDirection === FlexDirection.RowReverse;
}

export function isColumn(flexDirection: FlexDirection): boolean {
  return flexDirection === FlexDirection.Column || flexDirection === FlexDirection.ColumnReverse;
}

export function isReverse(flexDirection: FlexDirection): boolean {
  return (
    flexDirection === FlexDirection.RowReverse || flexDirection === FlexDirection.ColumnReverse
  );
}

/**
 * Main-axis direction, accounting for text direction. In RTL, Row ↔ RowReverse
 * (columns are unaffected). TUI subset: direction is always LTR, so this
 * is an identity function — but keep the API surface for parity.
 */
export function resolveDirection(
  flexDirection: FlexDirection,
  direction: Direction,
): FlexDirection {
  if (direction === Direction.RTL) {
    if (flexDirection === FlexDirection.Row) return FlexDirection.RowReverse;
    if (flexDirection === FlexDirection.RowReverse) return FlexDirection.Row;
  }
  return flexDirection;
}

/**
 * Cross-axis direction. Row → Column, Column → Row. In RTL, only the
 * Row axis (horizontal) flips to RowReverse — the Column axis
 * (vertical) is unaffected by text direction.
 * TUI subset: direction is always LTR.
 */
export function resolveCrossDirection(
  flexDirection: FlexDirection,
  direction: Direction,
): FlexDirection {
  const resolved = isColumn(flexDirection) ? FlexDirection.Row : FlexDirection.Column;
  if (direction === Direction.RTL && resolved === FlexDirection.Row) {
    return FlexDirection.RowReverse;
  }
  return resolved;
}

/**
 * Which axis (Width or Height) is the main axis for this flexDirection.
 */
export function mainAxis(flexDirection: FlexDirection): Dimension {
  return isRow(flexDirection) ? Dimension.Width : Dimension.Height;
}

/** Which axis (Width or Height) is the cross axis. */
export function crossAxis(flexDirection: FlexDirection): Dimension {
  return isRow(flexDirection) ? Dimension.Height : Dimension.Width;
}
