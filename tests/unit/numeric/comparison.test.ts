import { describe, expect, test } from 'bun:test';
import {
  inexactEquals,
  isDefined,
  isUndefined,
  maxOrDefined,
  minOrDefined,
} from '../../../src/numeric/comparison.js';

describe('isUndefined / isDefined', () => {
  test('NaN is undefined', () => {
    expect(isUndefined(Number.NaN)).toBe(true);
    expect(isDefined(Number.NaN)).toBe(false);
  });

  test('finite numbers are defined', () => {
    expect(isUndefined(0)).toBe(false);
    expect(isDefined(0)).toBe(true);
    expect(isUndefined(1.5)).toBe(false);
    expect(isDefined(1.5)).toBe(true);
    expect(isUndefined(-100)).toBe(false);
    expect(isDefined(-100)).toBe(true);
  });

  test('Infinity is defined (not undefined)', () => {
    // Yoga distinguishes "undefined" (NaN) from "infinite available space"
    // (Infinity). clamp passes Infinity through unchanged.
    expect(isUndefined(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isDefined(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isUndefined(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isDefined(Number.NEGATIVE_INFINITY)).toBe(true);
  });

  test('isDefined and isUndefined are exact opposites', () => {
    for (const v of [NaN, 0, 1, -1, 1e9, Infinity, -Infinity, 0.0001]) {
      expect(isDefined(v)).toBe(!isUndefined(v));
    }
  });
});

describe('maxOrDefined', () => {
  test('returns the larger when both defined', () => {
    expect(maxOrDefined(3, 7)).toBe(7);
    expect(maxOrDefined(7, 3)).toBe(7);
    expect(maxOrDefined(-5, -2)).toBe(-2);
  });

  test('returns the defined one when the other is NaN', () => {
    expect(maxOrDefined(NaN, 5)).toBe(5);
    expect(maxOrDefined(5, NaN)).toBe(5);
    expect(maxOrDefined(NaN, -1)).toBe(-1);
    expect(maxOrDefined(-1, NaN)).toBe(-1);
  });

  test('returns NaN when both are NaN', () => {
    expect(Number.isNaN(maxOrDefined(NaN, NaN))).toBe(true);
  });

  test('works with Infinity', () => {
    expect(maxOrDefined(Infinity, 100)).toBe(Infinity);
    expect(maxOrDefined(100, Infinity)).toBe(Infinity);
    expect(maxOrDefined(-Infinity, 100)).toBe(100);
  });
});

describe('minOrDefined', () => {
  test('returns the smaller when both defined', () => {
    expect(minOrDefined(3, 7)).toBe(3);
    expect(minOrDefined(7, 3)).toBe(3);
    expect(minOrDefined(-5, -2)).toBe(-5);
  });

  test('returns the defined one when the other is NaN', () => {
    expect(minOrDefined(NaN, 5)).toBe(5);
    expect(minOrDefined(5, NaN)).toBe(5);
    expect(minOrDefined(NaN, -1)).toBe(-1);
    expect(minOrDefined(-1, NaN)).toBe(-1);
  });

  test('returns NaN when both are NaN', () => {
    expect(Number.isNaN(minOrDefined(NaN, NaN))).toBe(true);
  });

  test('works with Infinity', () => {
    expect(minOrDefined(Infinity, 100)).toBe(100);
    expect(minOrDefined(100, -Infinity)).toBe(-Infinity);
  });
});

describe('inexactEquals', () => {
  test('exact equality returns true', () => {
    expect(inexactEquals(0, 0)).toBe(true);
    expect(inexactEquals(1.5, 1.5)).toBe(true);
    expect(inexactEquals(-100, -100)).toBe(true);
  });

  test('values within epsilon (0.0001) are equal', () => {
    expect(inexactEquals(1.0, 1.00005)).toBe(true);
    expect(inexactEquals(100, 100.00009)).toBe(true);
    expect(inexactEquals(0, 0.00009)).toBe(true);
  });

  test('values outside epsilon are not equal', () => {
    expect(inexactEquals(1.0, 1.001)).toBe(false);
    expect(inexactEquals(0, 0.001)).toBe(false);
    expect(inexactEquals(100, 99)).toBe(false);
  });

  test('NaN equals NaN', () => {
    expect(inexactEquals(NaN, NaN)).toBe(true);
  });

  test('one-sided NaN is not equal', () => {
    expect(inexactEquals(NaN, 0)).toBe(false);
    expect(inexactEquals(0, NaN)).toBe(false);
    expect(inexactEquals(NaN, 1.5)).toBe(false);
    expect(inexactEquals(1.5, NaN)).toBe(false);
  });

  test('Infinity cases: Infinity - Infinity is NaN, so two Infinities are NOT approx-equal', () => {
    // JS quirk: `Infinity - Infinity === NaN`, and `NaN < EPSILON` is false.
    // Upstream Yoga C++ behaves identically (std::abs(Inf-Inf) is NaN).
    // The cache layer in CalculateLayout.cpp handles Infinity separately
    // via `std::isfinite` checks before inexactEquals is consulted.
    expect(inexactEquals(Infinity, Infinity)).toBe(false);
    expect(inexactEquals(-Infinity, -Infinity)).toBe(false);
    expect(inexactEquals(Infinity, 1e9)).toBe(false);
    expect(inexactEquals(-Infinity, -1e9)).toBe(false);
  });

  test('boundary: epsilon is strictly less-than (not <=)', () => {
    // Exactly at 0.0001 should be NOT equal (Math.abs < EPSILON is strict).
    expect(inexactEquals(0, 0.0001)).toBe(false);
    // Just under should be equal.
    expect(inexactEquals(0, 0.00009)).toBe(true);
  });
});
