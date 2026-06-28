/**
 * Package entry point — the `yoga-layout-tui` public surface.
 *
 * Re-exports the ergonomic TS API: enum constants + types, the Value
 * helpers (for advanced users who want to construct values directly),
 * the Config / Node classes, and the Yoga namespace.
 *
 * What is NOT exported (intentionally):
 *   - `Style`, `LayoutResults`, `CachedMeasurement` — internal types
 *     that mutate behind the algorithm's back. Reach for the Node
 *     setters / getters instead.
 *   - Algorithm helpers (`calculateLayoutImpl`, `boundAxis`, `flexLine`,
 *     `cache`, `pixelGrid`, `flexDirection`, `absoluteLayout`, `align`)
 *     — implementation detail.
 *   - The `_layoutResults`, `_hasNewLayout`, `_isDirty` private-ish
 *     fields on Node — they start with `_` for a reason.
 *
 * If you find yourself wanting to import something that's missing here,
 * that's a signal the API has a gap — open an issue rather than
 * reaching for the internal module.
 */

// ─── Enums (consts + types) ───────────────────────────────────────────────

export type {
  Align as AlignType,
  Direction as DirectionType,
  Display as DisplayType,
  FlexDirection as FlexDirectionType,
  Gutter as GutterType,
  Justify as JustifyType,
  MeasureMode as MeasureModeType,
  Overflow as OverflowType,
  PhysicalEdge as PhysicalEdgeType,
  PositionType as PositionTypeType,
  Unit as UnitType,
} from './enums.js';
export {
  Align,
  Direction,
  Display,
  FlexDirection,
  Gutter,
  Justify,
  MeasureMode,
  Overflow,
  PhysicalEdge,
  PositionType,
  Unit,
} from './enums.js';

// ─── Value types + helpers ─────────────────────────────────────────────────

export type { DimensionInput, Value } from './value.js';
export {
  AUTO_VALUE,
  isAuto,
  isDefinedValue,
  isUndefinedValue,
  parseDimensionInput,
  percentValue,
  pointValue,
  rawValue,
  resolveValue,
  UNDEFINED_VALUE,
} from './value.js';

// ─── Config + Node ────────────────────────────────────────────────────────

export { Config } from './config/config.js';
export type { MeasureFunction, PublicLayout } from './node/node.js';
export { Node } from './node/node.js';

// ─── Yoga namespace + async loader ────────────────────────────────────────

export type { Yoga as YogaNamespace } from './public/yoga.js';
export { default, loadYoga, Yoga } from './public/yoga.js';
