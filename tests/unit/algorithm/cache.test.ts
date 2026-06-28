import { describe, expect, test } from 'bun:test';
import { canUseCachedMeasurement, layoutPassRequired } from '../../../src/algorithm/cache.js';
import { MeasureMode } from '../../../src/enums.js';
import {
  type CachedMeasurement,
  emptyCachedMeasurement,
} from '../../../src/node/cachedMeasurement.js';

function makeCached(overrides: Partial<CachedMeasurement> = {}): CachedMeasurement {
  return { ...emptyCachedMeasurement(), ...overrides };
}

describe('canUseCachedMeasurement', () => {
  test('cache hits on identical (mode, size) inputs', () => {
    const cached = makeCached({
      availableWidth: 100,
      availableHeight: 50,
      widthSizingMode: MeasureMode.Exactly,
      heightSizingMode: MeasureMode.AtMost,
    });
    expect(
      canUseCachedMeasurement(MeasureMode.Exactly, 100, MeasureMode.AtMost, 50, cached, 0),
    ).toBe(true);
  });

  test('cache misses when width mode differs', () => {
    const cached = makeCached({
      availableWidth: 100,
      widthSizingMode: MeasureMode.Exactly,
    });
    expect(
      canUseCachedMeasurement(MeasureMode.AtMost, 100, MeasureMode.Undefined, NaN, cached, 0),
    ).toBe(false);
  });

  test('cache misses when availableWidth differs by more than epsilon', () => {
    const cached = makeCached({
      availableWidth: 100,
      widthSizingMode: MeasureMode.Exactly,
    });
    expect(
      canUseCachedMeasurement(MeasureMode.Exactly, 105, MeasureMode.Undefined, NaN, cached, 0),
    ).toBe(false);
  });

  test('cache hits on within-epsilon width change', () => {
    const cached = makeCached({
      availableWidth: 100,
      widthSizingMode: MeasureMode.Exactly,
    });
    expect(
      canUseCachedMeasurement(
        MeasureMode.Exactly,
        100.00005,
        MeasureMode.Undefined,
        NaN,
        cached,
        0,
      ),
    ).toBe(true);
  });

  test('cache misses when availableHeight mode differs', () => {
    const cached = makeCached({
      availableWidth: 100,
      availableHeight: 50,
      widthSizingMode: MeasureMode.Exactly,
      heightSizingMode: MeasureMode.AtMost,
    });
    expect(
      canUseCachedMeasurement(MeasureMode.Exactly, 100, MeasureMode.Exactly, 50, cached, 0),
    ).toBe(false);
  });
});

describe('layoutPassRequired', () => {
  test('first layout (generation 0) always requires a pass', () => {
    expect(layoutPassRequired(0, 1, 0, 0)).toBe(true);
  });

  test('cache hits when generation and config version are unchanged', () => {
    expect(layoutPassRequired(5, 5, 3, 3)).toBe(false);
  });

  test('cache misses when generation changed (subtree was mutated)', () => {
    expect(layoutPassRequired(5, 6, 3, 3)).toBe(true);
  });

  test('cache misses when config version changed (errata flag toggled)', () => {
    expect(layoutPassRequired(5, 5, 3, 4)).toBe(true);
  });
});
