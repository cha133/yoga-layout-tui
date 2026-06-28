import { describe, expect, test } from 'bun:test';
import { Direction } from '../../../src/enums.js';
import { emptyCachedMeasurement } from '../../../src/node/cachedMeasurement.js';
import { LayoutResults } from '../../../src/node/layoutResults.js';

describe('LayoutResults', () => {
  test('new instance has sensible default field values', () => {
    const r = new LayoutResults();

    // Computed flex basis is NaN until STEP 3 fills it in.
    expect(Number.isNaN(r.computedFlexBasis)).toBe(true);
    expect(r.computedFlexBasisGeneration).toBe(0);

    // Cache keys default to 0 / LTR.
    expect(r.generationCount).toBe(0);
    expect(r.configVersion).toBe(0);
    expect(r.lastOwnerDirection).toBe(Direction.LTR);

    // Ring buffer is empty + reset.
    expect(r.nextCachedMeasurementsIndex).toBe(0);
    expect(r.cachedMeasurements).toHaveLength(8);
    for (const slot of r.cachedMeasurements) {
      expect(Number.isNaN(slot.computedWidth)).toBe(true);
      expect(Number.isNaN(slot.computedHeight)).toBe(true);
    }

    // 4-edge arrays are zero.
    expect(r.position).toEqual([0, 0, 0, 0]);
    expect(r.margin).toEqual([0, 0, 0, 0]);
    expect(r.border).toEqual([0, 0, 0, 0]);
    expect(r.padding).toEqual([0, 0, 0, 0]);

    // Measured dimensions are 0×0.
    expect(r.measuredDimensions).toEqual([0, 0]);

    expect(r.direction).toBe(Direction.LTR);
    expect(r.hadOverflow).toBe(false);
  });

  test('getNextCachedMeasurementSlot cycles through 8 slots', () => {
    const r = new LayoutResults();
    const seen: number[] = [];
    for (let i = 0; i < 9; i++) {
      const slot = r.getNextCachedMeasurementSlot();
      // Mutate the slot so we can verify we get the same object back on cycle.
      slot.computedWidth = i + 1;
      seen.push(i + 1);
    }
    // After 9 allocations, slot 0 was last written on iteration 9 → value 9.
    expect(r.cachedMeasurements[0]?.computedWidth).toBe(9);
    expect(r.nextCachedMeasurementsIndex).toBe(1);
  });

  test('reset() clears per-pass state but preserves cache keys', () => {
    const r = new LayoutResults();
    // Simulate a populated layout.
    r.computedFlexBasis = 50;
    r.computedFlexBasisGeneration = 7;
    r.position = [10, 20, 30, 40];
    r.measuredDimensions = [100, 200];
    r.hadOverflow = true;
    r.nextCachedMeasurementsIndex = 3;
    r.generationCount = 99;
    r.configVersion = 42;
    r.lastOwnerDirection = Direction.LTR;

    r.reset();

    // Per-pass state cleared.
    expect(Number.isNaN(r.computedFlexBasis)).toBe(true);
    expect(r.computedFlexBasisGeneration).toBe(0);
    expect(r.position).toEqual([0, 0, 0, 0]);
    expect(r.measuredDimensions).toEqual([0, 0]);
    expect(r.hadOverflow).toBe(false);
    expect(r.nextCachedMeasurementsIndex).toBe(0);

    // Cache slots are empty again.
    expect(r.cachedMeasurements[0]).toEqual(emptyCachedMeasurement());

    // Cache keys preserved (managed by calculateLayout, not by reset()).
    expect(r.generationCount).toBe(99);
    expect(r.configVersion).toBe(42);
  });
});
