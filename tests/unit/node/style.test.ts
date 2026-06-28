import { describe, expect, test } from 'bun:test';
import {
  Align,
  Direction,
  Display,
  FlexDirection,
  Justify,
  Overflow,
  PositionType,
  Unit,
} from '../../../src/enums.js';
import { createDefaultStyle, type Style } from '../../../src/node/style.js';
import { isAuto, isUndefinedValue } from '../../../src/value.js';

describe('createDefaultStyle', () => {
  test('returns the upstream Yoga / claude-code defaults', () => {
    const s = createDefaultStyle();

    // Container / alignment defaults.
    expect(s.direction).toBe(Direction.LTR);
    expect(s.flexDirection).toBe(FlexDirection.Column);
    expect(s.justifyContent).toBe(Justify.FlexStart);
    expect(s.alignItems).toBe(Align.Stretch);
    expect(s.alignSelf).toBe(Align.Auto);

    // Visibility defaults.
    expect(s.overflow).toBe(Overflow.Visible);
    expect(s.display).toBe(Display.Flex);
    expect(s.positionType).toBe(PositionType.Relative);

    // Flex item defaults.
    expect(s.flexGrow).toBe(0);
    expect(s.flexShrink).toBe(0);
    expect(isUndefinedValue(s.flexBasis)).toBe(true);
  });

  test('9-edge arrays start all-Undefined (Bug #4.1)', () => {
    // v0.5 expansion: 4-element edge arrays → 9-element (see Edge
    // enum in src/enums.ts). All 9 slots default to Undefined.
    const s = createDefaultStyle();
    for (const arr of [s.margin, s.padding, s.border, s.position]) {
      expect(arr).toHaveLength(9);
      for (const v of arr) {
        expect(isUndefinedValue(v)).toBe(true);
      }
    }
  });

  test('gap starts all-Undefined (2 axes)', () => {
    const s = createDefaultStyle();
    expect(s.gap).toHaveLength(2);
    expect(isUndefinedValue(s.gap[0]!)).toBe(true);
    expect(isUndefinedValue(s.gap[1]!)).toBe(true);
  });

  test('width / height default to Auto (CSS default)', () => {
    const s = createDefaultStyle();
    expect(isAuto(s.width)).toBe(true);
    expect(isAuto(s.height)).toBe(true);
  });

  test('min* / max* default to Undefined (Yoga differs from CSS 0/none)', () => {
    const s = createDefaultStyle();
    for (const v of [s.minWidth, s.minHeight, s.maxWidth, s.maxHeight]) {
      expect(isUndefinedValue(v)).toBe(true);
    }
  });

  test('returned object is independent on each call (factory pattern)', () => {
    const a = createDefaultStyle();
    const b = createDefaultStyle();
    expect(a).not.toBe(b);
    expect(a.margin).not.toBe(b.margin);
    expect(a.gap).not.toBe(b.gap);
    // Mutating a's margin must not affect b's margin.
    a.margin[0] = { unit: Unit.Point, value: 5 };
    expect(isUndefinedValue(b.margin[0]!)).toBe(true);
  });
});

describe('Style field shape', () => {
  test('matches the TUI subset defined in 12-types-and-state.md', () => {
    const s: Style = createDefaultStyle();
    // Quick field-presence audit — covers that we don't accidentally
    // drop a field from the interface.
    const expectedFields: Array<keyof Style> = [
      'direction',
      'flexDirection',
      'justifyContent',
      'alignItems',
      'alignSelf',
      'overflow',
      'display',
      'positionType',
      'flexGrow',
      'flexShrink',
      'flexBasis',
      'margin',
      'padding',
      'border',
      'position',
      'gap',
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxWidth',
      'maxHeight',
    ];
    for (const f of expectedFields) {
      expect(f in s).toBe(true);
    }
  });
});
