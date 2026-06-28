import { describe, expect, test } from 'bun:test';
import type { FloatOptional } from '../../../src/numeric/floatOptional.js';
import {
  inexactEquals,
  isDefined,
  isUndefined,
  maxOrDefined,
  minOrDefined,
} from '../../../src/numeric/floatOptional.js';

describe('FloatOptional type alias', () => {
  test('FloatOptional is assignable from a regular number', () => {
    const v: FloatOptional = 42;
    expect(v).toBe(42);
  });

  test('FloatOptional is assignable from NaN', () => {
    const v: FloatOptional = Number.NaN;
    expect(Number.isNaN(v)).toBe(true);
  });

  test('FloatOptional accepts the upstream "undefined" sentinel (NaN)', () => {
    // The whole point: NaN encodes "not yet set / not applicable".
    const computedFlexBasis: FloatOptional = Number.NaN;
    expect(isUndefined(computedFlexBasis)).toBe(true);
    expect(isDefined(computedFlexBasis)).toBe(false);
  });

  test('FloatOptional predicate helpers work on a defined value', () => {
    const inner: FloatOptional = 100;
    expect(isDefined(inner)).toBe(true);
    expect(isUndefined(inner)).toBe(false);
  });
});

describe('re-exported numeric helpers', () => {
  test('all five comparison helpers are reachable from floatOptional.js', () => {
    // Smoke test the re-export surface.
    expect(maxOrDefined(1, 2)).toBe(2);
    expect(minOrDefined(1, 2)).toBe(1);
    expect(inexactEquals(0, 0)).toBe(true);
    expect(inexactEquals(NaN, NaN)).toBe(true);
  });
});
