/**
 * Value type — discriminated union of CSS-style length/auto/undefined.
 *
 * Mirrors upstream Yoga's `StyleValueHandle` family but without the
 * `StyleValuePool` interner (TUI trees are small; the pool is a C++
 * memory-density trick that buys nothing in TS).
 *
 * Each variant is a separate object so we can switch on `unit` and
 * let TS narrow `.value` correctly. `Unit.Auto` and `Unit.Undefined`
 * deliberately omit `.value` — touching `.value` on those is a TS error.
 *
 * Implementation note: we write the union arms as
 * `{ unit: typeof Unit.Point; ... }` (not `unit: Unit.Point; ...`) so
 * TS keeps `Unit` in value position. If we wrote `unit: Unit.Point`,
 * TS would resolve `Unit` as a *type* (because that's how the const
 * + same-name type alias is ambiguous under `verbatimModuleSyntax`),
 * and then `case Unit.Point:` in `rawValue` would fail to type-narrow.
 */

import { Unit } from './enums.js';

export type Value =
  | { unit: typeof Unit.Point; value: number }
  | { unit: typeof Unit.Percent; value: number }
  | { unit: typeof Unit.Auto }
  | { unit: typeof Unit.Undefined };

export const UNDEFINED_VALUE: Value = { unit: Unit.Undefined };
export const AUTO_VALUE: Value = { unit: Unit.Auto };

/** Wrap an absolute pixel count. */
export function pointValue(v: number): Value {
  return { unit: Unit.Point, value: v };
}

/** Wrap a percentage (0-100). */
export function percentValue(v: number): Value {
  return { unit: Unit.Percent, value: v };
}

export function isAuto(v: Value): boolean {
  return v.unit === Unit.Auto;
}

export function isUndefinedValue(v: Value): boolean {
  return v.unit === Unit.Undefined;
}

export function isDefinedValue(v: Value): boolean {
  return v.unit !== Unit.Undefined;
}

/**
 * Extract the raw numeric component. Returns NaN for Auto and Undefined.
 * Used by arithmetic helpers (e.g., `boundAxis`) that treat Auto as
 * "no value yet" — matching the FloatOptional contract from
 * `numeric/comparison.ts`.
 */
export function rawValue(v: Value): number {
  switch (v.unit) {
    case Unit.Point:
    case Unit.Percent:
      return v.value;
    case Unit.Auto:
    case Unit.Undefined:
      return Number.NaN;
  }
}

/**
 * Resolve a Value against an axis size to produce a concrete pixel count.
 * - Point → the value
 * - Percent → `value / 100 * axisSize` (NaN if axisSize is NaN)
 * - Auto / Undefined → NaN (caller decides what "no value" means)
 */
export function resolveValue(v: Value, axisSize: number): number {
  switch (v.unit) {
    case Unit.Point:
      return v.value;
    case Unit.Percent:
      return (v.value / 100) * axisSize;
    case Unit.Auto:
    case Unit.Undefined:
      return Number.NaN;
  }
}

/**
 * The user-facing input format for dimension / margin / padding / etc.
 * Accepts:
 *   - a plain number → Point
 *   - a string ending in `%` (e.g., `"50%"`) → Percent
 *   - the literal `"auto"` → Auto
 *
 * Anything else throws — invalid inputs should fail loudly at the
 * call site, not silently turn into a default.
 */
export type DimensionInput = number | `${number}%` | 'auto';

export function parseDimensionInput(input: DimensionInput): Value {
  if (input === 'auto') return AUTO_VALUE;
  if (typeof input === 'number') return pointValue(input);
  if (typeof input === 'string') {
    const pct = parseFloat(input);
    if (!Number.isFinite(pct)) {
      throw new Error(`Invalid dimension input: ${input}`);
    }
    return percentValue(pct);
  }
  throw new Error(`Invalid dimension input: ${String(input)}`);
}
