/**
 * Yoga enums — ported from upstream C++ Yoga (https://github.com/facebook/yoga).
 *
 * Values match the upstream `YGEnums.h` macro definitions exactly so the
 * library is wire-compatible with consumers that pass numeric enum values
 * from the official Yoga bindings (e.g., `yoga-layout` JS package).
 *
 * Each enum is a `const` object (`as const`) with a derived union type — the
 * convention shared by the reference TS port in
 * `claude-code/packages/@ant/ink/src/core/yoga-layout/enums.ts`.
 *
 * TUI subset note: this file defines every value present in upstream Yoga so
 * numeric compat is preserved across the whole enum surface. The algorithm
 * itself only consumes the TUI subset (FlexStart / Center / FlexEnd / Stretch
 * for Align; FlexStart / Center / FlexEnd / SpaceBetween for Justify; etc.).
 * Values outside the algorithm's working set are dead constants — included
 * for enum-wire compatibility only, never wired into layout logic.
 */

// ─── Text direction ─────────────────────────────────────────────────────────

export const Direction = {
  Inherit: 0,
  LTR: 1,
  RTL: 2,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

// ─── Flex container direction ───────────────────────────────────────────────

export const FlexDirection = {
  Column: 0,
  ColumnReverse: 1,
  Row: 2,
  RowReverse: 3,
} as const;
export type FlexDirection = (typeof FlexDirection)[keyof typeof FlexDirection];

// ─── Main-axis content distribution ─────────────────────────────────────────

export const Justify = {
  Auto: 0,
  FlexStart: 1,
  Center: 2,
  FlexEnd: 3,
  SpaceBetween: 4,
  SpaceAround: 5,
  SpaceEvenly: 6,
  Stretch: 7,
  Start: 8,
  End: 9,
} as const;
export type Justify = (typeof Justify)[keyof typeof Justify];

// ─── Cross-axis alignment ───────────────────────────────────────────────────

export const Align = {
  Auto: 0,
  FlexStart: 1,
  Center: 2,
  FlexEnd: 3,
  Stretch: 4,
  Baseline: 5,
  SpaceBetween: 6,
  SpaceAround: 7,
  SpaceEvenly: 8,
  Start: 9,
  End: 10,
} as const;
export type Align = (typeof Align)[keyof typeof Align];

// ─── Position mode (in-flow vs out-of-flow) ─────────────────────────────────

export const PositionType = {
  Static: 0,
  Relative: 1,
  Absolute: 2,
} as const;
export type PositionType = (typeof PositionType)[keyof typeof PositionType];

// ─── Overflow clipping ──────────────────────────────────────────────────────

export const Overflow = {
  Visible: 0,
  Hidden: 1,
  Scroll: 2,
} as const;
export type Overflow = (typeof Overflow)[keyof typeof Overflow];

// ─── Display mode ───────────────────────────────────────────────────────────

export const Display = {
  Flex: 0,
  None: 1,
  Contents: 2,
  Grid: 3,
} as const;
export type Display = (typeof Display)[keyof typeof Display];

// ─── Numeric axis (used by layout helpers, not by end users) ────────────────

export const Dimension = {
  Width: 0,
  Height: 1,
} as const;
export type Dimension = (typeof Dimension)[keyof typeof Dimension];

// ─── Value units (per-side, per-axis, dimensions) ───────────────────────────

export const Unit = {
  Undefined: 0,
  Point: 1,
  Percent: 2,
  Auto: 3,
  MaxContent: 4,
  FitContent: 5,
  Stretch: 6,
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

// ─── Measure-function input mode ────────────────────────────────────────────

export const MeasureMode = {
  Undefined: 0,
  Exactly: 1,
  AtMost: 2,
} as const;
export type MeasureMode = (typeof MeasureMode)[keyof typeof MeasureMode];

// ─── Edge model (9 elements, matches upstream YGEnums.h) ─────────────────
//
// 9-element edge array (indexed by `Edge` enum below):
//   0 Left    — physical left edge
//   1 Top     — physical top edge
//   2 Right   — physical right edge
//   3 Bottom  — physical bottom edge
//   4 Start   — logical start (= Left in LTR, = Right in RTL)
//   5 End     — logical end   (= Right in LTR, = Left in RTL)
//   6 Horizontal — both L + R (set same value on both)
//   7 Vertical   — both T + B
//   8 All        — all 4 edges
//
// TUI subset note: Start/End are defined for wire compat with upstream
// Yoga + Ink reconciler (which pass `Edge.Start` etc. into the
// `YGNodeStyleSetPadding(YGEdge, value)` API), but the `resolveEdge`
// fallback chain treats them as Left/Right in LTR mode. We never
// project them via RTL — TUI is LTR-only per `.claude/01-state.md`.
// Horizontal/Vertical/All are the actively-used convenience values;
// they're the whole reason v0.5 exists (Ink `<Box paddingX paddingY>`).

export const PhysicalEdge = {
  Left: 0,
  Top: 1,
  Right: 2,
  Bottom: 3,
} as const;
export type PhysicalEdge = (typeof PhysicalEdge)[keyof typeof PhysicalEdge];

export const Edge = {
  ...PhysicalEdge,
  Start: 4,
  End: 5,
  Horizontal: 6,
  Vertical: 7,
  All: 8,
} as const;
export type Edge = (typeof Edge)[keyof typeof Edge];

// ─── Gap selector ───────────────────────────────────────────────────────────

export const Gutter = {
  Column: 0,
  Row: 1,
  All: 2,
} as const;
export type Gutter = (typeof Gutter)[keyof typeof Gutter];
