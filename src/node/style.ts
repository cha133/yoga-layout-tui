/**
 * Style — the input side of a Node. Read-only from the algorithm's
 * perspective; mutated only through `Node.setX(...)` setters.
 *
 * Mirrors `yoga/style/Style.h` but simplified for the TUI subset:
 *   - 4-edge insets (margin / padding / border / position) indexed by
 *     PhysicalEdge (no 9-edge LTR/RTL projection — we don't have RTL)
 *   - no `aspectRatio`, no `boxSizing` enum, no `flexWrap` enum,
 *     no `alignContent` field (TUI-only hard constraints)
 *   - plain object (no bit-packed enums; V8 inline caches are fast enough
 *     for TUI-scale trees)
 *
 * Defaults match upstream Yoga's `Style::Style()` constructor — same as
 * claude-code's `Node` constructor (the reference TS port).
 */

import {
  Align,
  Direction,
  Display,
  FlexDirection,
  Justify,
  Overflow,
  PositionType,
} from '../enums.js';
import { AUTO_VALUE, UNDEFINED_VALUE, type Value } from '../value.js';

export interface Style {
  direction: Direction;
  flexDirection: FlexDirection;
  justifyContent: Justify;
  alignItems: Align;
  alignSelf: Align;
  overflow: Overflow;
  display: Display;
  positionType: PositionType;

  flexGrow: number;
  flexShrink: number;
  flexBasis: Value;

  // 4-edge insets, indexed by PhysicalEdge (Left=0, Right=1, Top=2, Bottom=3).
  margin: Value[];
  padding: Value[];
  border: Value[];
  position: Value[];

  // 2-axis gap. Index 0 = column gap (cross axis when flexDirection=Row),
  // Index 1 = row gap (main axis when flexDirection=Row). Matches upstream.
  // See `Gutter.Column` (0) / `Gutter.Row` (1).
  gap: Value[];

  width: Value;
  height: Value;
  minWidth: Value;
  minHeight: Value;
  maxWidth: Value;
  maxHeight: Value;
}

/**
 * Default Style — matches upstream Yoga's `Style::Style()` and the
 * reference claude-code Node constructor defaults.
 *
 * Key choices:
 *   - flexDirection: Column (CSS `display: flex` defaults to row, but
 *     Yoga and most UI frameworks default to column for vertical layout)
 *   - width / height: Auto (CSS default — let intrinsic size win)
 *   - min* / max*: Undefined (no constraint — Yoga differs from CSS
 *     which uses 0 / none; Undefined lets the algorithm pass the value
 *     through unchanged via `maxOrDefined` / `minOrDefined`)
 *   - flexBasis: Undefined (CSS default; resolves to `auto` for items)
 */
export function createDefaultStyle(): Style {
  const fourZeros: Value[] = [UNDEFINED_VALUE, UNDEFINED_VALUE, UNDEFINED_VALUE, UNDEFINED_VALUE];
  const twoZeros: Value[] = [UNDEFINED_VALUE, UNDEFINED_VALUE];

  return {
    direction: Direction.LTR,
    flexDirection: FlexDirection.Column,
    justifyContent: Justify.FlexStart,
    alignItems: Align.Stretch,
    alignSelf: Align.Auto,
    overflow: Overflow.Visible,
    display: Display.Flex,
    positionType: PositionType.Relative,

    flexGrow: 0,
    flexShrink: 0,
    flexBasis: UNDEFINED_VALUE,

    margin: [...fourZeros],
    padding: [...fourZeros],
    border: [...fourZeros],
    position: [...fourZeros],

    gap: [...twoZeros],

    width: AUTO_VALUE,
    height: AUTO_VALUE,
    minWidth: UNDEFINED_VALUE,
    minHeight: UNDEFINED_VALUE,
    maxWidth: UNDEFINED_VALUE,
    maxHeight: UNDEFINED_VALUE,
  };
}
