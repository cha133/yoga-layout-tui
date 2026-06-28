/**
 * Pixel-grid rounding — ported from `yoga/algorithm/PixelGrid.h`.
 *
 * TUI subset: we work in whole cells, not fractional pixels. The
 * `roundValueToPixelGrid` helper is exposed for algorithm correctness
 * parity (upstream Yoga applies it to every computed dimension /
 * position before exposing layout results). For TUI we pass
 * `pointScaleFactor = 1` so the rounding is a no-op.
 *
 * If a future consumer needs sub-cell layout (e.g., for a terminal
 * that supports half-blocks), bump `pointScaleFactor` and this
 * function will start rounding.
 */

/**
 * Round `value` to the nearest multiple of `pointScaleFactor`.
 *
 * With `pointScaleFactor = 1` this is a no-op (returns `value` unchanged
 * for any finite input, NaN for NaN input).
 */
export function roundValueToPixelGrid(value: number, pointScaleFactor: number): number {
  if (!Number.isFinite(value)) return value;
  if (pointScaleFactor <= 0) return value;
  const scaled = value / pointScaleFactor;
  return Math.round(scaled) * pointScaleFactor;
}
