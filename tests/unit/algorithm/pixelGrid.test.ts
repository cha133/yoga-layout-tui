import { describe, expect, test } from 'bun:test';
import { roundValueToPixelGrid } from '../../../src/algorithm/pixelGrid.js';

describe('roundValueToPixelGrid', () => {
  test('TUI default: pointScaleFactor=1 is a no-op for integer values', () => {
    expect(roundValueToPixelGrid(0, 1)).toBe(0);
    expect(roundValueToPixelGrid(1, 1)).toBe(1);
    expect(roundValueToPixelGrid(100, 1)).toBe(100);
    expect(roundValueToPixelGrid(-5, 1)).toBe(-5);
  });

  test('rounds to nearest integer when pointScaleFactor=1', () => {
    expect(roundValueToPixelGrid(0.4, 1)).toBe(0);
    expect(roundValueToPixelGrid(0.5, 1)).toBe(1);
    expect(roundValueToPixelGrid(0.6, 1)).toBe(1);
    expect(roundValueToPixelGrid(1.5, 1)).toBe(2);
    // JS quirk: Math.round(-0.4) preserves the sign, returning -0 (not 0).
    // Numerically -0 === 0 but Object.is distinguishes them.
    expect(roundValueToPixelGrid(-0.4, 1)).toBe(-0);
    expect(roundValueToPixelGrid(-0.5, 1)).toBe(-0); // Math.round(-0.5) === -0
    expect(roundValueToPixelGrid(-1.5, 1)).toBe(-1); // Math.round(-1.5) === -1
  });

  test('passes through NaN and Infinity', () => {
    expect(Number.isNaN(roundValueToPixelGrid(NaN, 1))).toBe(true);
    expect(roundValueToPixelGrid(Infinity, 1)).toBe(Infinity);
    expect(roundValueToPixelGrid(-Infinity, 1)).toBe(-Infinity);
  });

  test('pointScaleFactor=0 is a defensive no-op (returns value)', () => {
    expect(roundValueToPixelGrid(3.14, 0)).toBe(3.14);
    expect(roundValueToPixelGrid(0, 0)).toBe(0);
  });

  test('pointScaleFactor=0.5 rounds to half-pixel', () => {
    expect(roundValueToPixelGrid(0.3, 0.5)).toBe(0.5);
    expect(roundValueToPixelGrid(0.2, 0.5)).toBe(0);
    expect(roundValueToPixelGrid(1.4, 0.5)).toBe(1.5);
  });

  test('pointScaleFactor=2 rounds to even pixels', () => {
    expect(roundValueToPixelGrid(3, 2)).toBe(4);
    expect(roundValueToPixelGrid(4, 2)).toBe(4);
    expect(roundValueToPixelGrid(5, 2)).toBe(6);
  });
});
