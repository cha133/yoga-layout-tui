import { describe, expect, test } from 'bun:test';
import { MeasureMode } from '../../../src/enums.js';
import { emptyCachedMeasurement } from '../../../src/node/cachedMeasurement.js';

describe('emptyCachedMeasurement', () => {
  test('returns an object with all-NaN scalars', () => {
    const c = emptyCachedMeasurement();
    expect(Number.isNaN(c.availableWidth)).toBe(true);
    expect(Number.isNaN(c.availableHeight)).toBe(true);
    expect(Number.isNaN(c.computedWidth)).toBe(true);
    expect(Number.isNaN(c.computedHeight)).toBe(true);
  });

  test('returns an object with MeasureMode.Undefined for both axes', () => {
    const c = emptyCachedMeasurement();
    expect(c.widthSizingMode).toBe(MeasureMode.Undefined);
    expect(c.heightSizingMode).toBe(MeasureMode.Undefined);
  });

  test('returns distinct objects on each call (no shared state)', () => {
    const a = emptyCachedMeasurement();
    const b = emptyCachedMeasurement();
    expect(a).not.toBe(b);
    // Mutating one should not affect the other.
    a.computedWidth = 100;
    expect(Number.isNaN(b.computedWidth)).toBe(true);
  });
});
