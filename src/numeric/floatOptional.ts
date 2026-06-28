/**
 * FloatOptional — a scalar float with NaN-as-undefined semantics.
 *
 * In upstream Yoga (`yoga/numeric/FloatOptional.h`), this is a struct that
 * wraps a `float` with NaN sentinel for the "undefined" state. In TS, we
 * don't introduce a wrapper type — we just use `number` directly with NaN
 * sentinel and rely on `isUndefined` / `isDefined` from `comparison.ts`.
 *
 * This type alias exists for documentation only: it tells readers "this
 * number is allowed to be NaN, meaning 'no value set yet'".
 *
 * Re-exports the common helpers so consumers can grab both the type and
 * its predicate in one import.
 */

export type FloatOptional = number;

export {
  inexactEquals,
  isDefined,
  isUndefined,
  maxOrDefined,
  minOrDefined,
} from './comparison.js';
