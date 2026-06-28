import { describe, expect, test } from 'bun:test';
import { boundAxis, boundAxisWithinMinAndMax } from '../../../src/algorithm/boundAxis.js';

describe('boundAxis (min, value, max)', () => {
  test('no constraints: returns value unchanged', () => {
    expect(boundAxis(NaN, 5, NaN)).toBe(5);
    expect(boundAxis(NaN, -3, NaN)).toBe(-3);
    expect(boundAxis(NaN, 0, NaN)).toBe(0);
  });

  test('min only: clamps below', () => {
    expect(boundAxis(0, 5, NaN)).toBe(5);
    expect(boundAxis(0, -5, NaN)).toBe(0);
    expect(boundAxis(10, 5, NaN)).toBe(10);
  });

  test('max only: clamps above', () => {
    expect(boundAxis(NaN, 5, 10)).toBe(5);
    expect(boundAxis(NaN, 15, 10)).toBe(10);
    expect(boundAxis(NaN, 0, 10)).toBe(0);
  });

  test('both min and max: clamps to range', () => {
    expect(boundAxis(0, 5, 10)).toBe(5);
    expect(boundAxis(0, -3, 10)).toBe(0);
    expect(boundAxis(0, 15, 10)).toBe(10);
    expect(boundAxis(5, 100, 10)).toBe(10);
  });

  test('NaN value propagates: Math.min/max with NaN yields NaN (matches upstream C++)', () => {
    // Upstream Yoga C++ uses std::min/std::max which propagate NaN too.
    // Callers must resolve Auto/Undefined → concrete pixel BEFORE boundAxis.
    expect(Number.isNaN(boundAxis(5, NaN, 10))).toBe(true);
    expect(Number.isNaN(boundAxis(0, NaN, 10))).toBe(true);
  });
});

describe('boundAxisWithinMinAndMax (content-aware clamping)', () => {
  test('content fits within [min, max]: clamp value to [min, max]', () => {
    // content range = maxContent - minContent = 8 - 2 = 6
    // available range = max - min = 10 - 0 = 10 → fits
    expect(boundAxisWithinMinAndMax(0, 5, 2, 8, 10)).toBe(5);
    expect(boundAxisWithinMinAndMax(0, -3, 2, 8, 10)).toBe(0);
    expect(boundAxisWithinMinAndMax(0, 15, 2, 8, 10)).toBe(10);
  });

  test('content overflows bounds: clamp value to [minContent, maxContent]', () => {
    // content range = 20 - 0 = 20
    // available range = 10 - 0 = 10 → does not fit
    expect(boundAxisWithinMinAndMax(0, 5, 0, 20, 10)).toBe(5);
    expect(boundAxisWithinMinAndMax(0, -3, 0, 20, 10)).toBe(0);
    expect(boundAxisWithinMinAndMax(0, 25, 0, 20, 10)).toBe(20);
  });

  test('undefined max: always use content range', () => {
    expect(boundAxisWithinMinAndMax(0, 5, 2, 8, NaN)).toBe(5);
    expect(boundAxisWithinMinAndMax(0, 1, 2, 8, NaN)).toBe(2);
    expect(boundAxisWithinMinAndMax(0, 100, 2, 8, NaN)).toBe(8);
  });

  test('max < min: degenerate, use content range', () => {
    // max < min violates the precondition; fall through to content.
    expect(boundAxisWithinMinAndMax(10, 5, 2, 8, 5)).toBe(5);
    expect(boundAxisWithinMinAndMax(10, 1, 2, 8, 5)).toBe(2);
  });
});
