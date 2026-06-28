/**
 * Pin numeric enum values to upstream Yoga C++ (YGEnums.h).
 *
 * If this file fails after a rebase, upstream Yoga renumbered an enum.
 * Either pull the new value intentionally (and update this test) or treat
 * it as a wire-compat regression. See `.claude/90-yoga-cpp-exploration.md`
 * for the upstream reference path.
 */

import { describe, expect, test } from 'bun:test';
import {
  Align,
  Dimension,
  Direction,
  Display,
  FlexDirection,
  Gutter,
  Justify,
  MeasureMode,
  Overflow,
  PhysicalEdge,
  PositionType,
  Unit,
} from '../../src/enums.js';

describe('Direction', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Direction.Inherit).toBe(0);
    expect(Direction.LTR).toBe(1);
    expect(Direction.RTL).toBe(2);
  });
});

describe('FlexDirection', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(FlexDirection.Column).toBe(0);
    expect(FlexDirection.ColumnReverse).toBe(1);
    expect(FlexDirection.Row).toBe(2);
    expect(FlexDirection.RowReverse).toBe(3);
  });
});

describe('Justify', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Justify.Auto).toBe(0);
    expect(Justify.FlexStart).toBe(1);
    expect(Justify.Center).toBe(2);
    expect(Justify.FlexEnd).toBe(3);
    expect(Justify.SpaceBetween).toBe(4);
    expect(Justify.SpaceAround).toBe(5);
    expect(Justify.SpaceEvenly).toBe(6);
    expect(Justify.Stretch).toBe(7);
    expect(Justify.Start).toBe(8);
    expect(Justify.End).toBe(9);
  });
});

describe('Align', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Align.Auto).toBe(0);
    expect(Align.FlexStart).toBe(1);
    expect(Align.Center).toBe(2);
    expect(Align.FlexEnd).toBe(3);
    expect(Align.Stretch).toBe(4);
    expect(Align.Baseline).toBe(5);
    expect(Align.SpaceBetween).toBe(6);
    expect(Align.SpaceAround).toBe(7);
    expect(Align.SpaceEvenly).toBe(8);
    expect(Align.Start).toBe(9);
    expect(Align.End).toBe(10);
  });
});

describe('PositionType', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(PositionType.Static).toBe(0);
    expect(PositionType.Relative).toBe(1);
    expect(PositionType.Absolute).toBe(2);
  });
});

describe('Overflow', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Overflow.Visible).toBe(0);
    expect(Overflow.Hidden).toBe(1);
    expect(Overflow.Scroll).toBe(2);
  });
});

describe('Display', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Display.Flex).toBe(0);
    expect(Display.None).toBe(1);
    expect(Display.Contents).toBe(2);
    expect(Display.Grid).toBe(3);
  });
});

describe('Dimension', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Dimension.Width).toBe(0);
    expect(Dimension.Height).toBe(1);
  });
});

describe('Unit', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Unit.Undefined).toBe(0);
    expect(Unit.Point).toBe(1);
    expect(Unit.Percent).toBe(2);
    expect(Unit.Auto).toBe(3);
    expect(Unit.MaxContent).toBe(4);
    expect(Unit.FitContent).toBe(5);
    expect(Unit.Stretch).toBe(6);
  });
});

describe('MeasureMode', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(MeasureMode.Undefined).toBe(0);
    expect(MeasureMode.Exactly).toBe(1);
    expect(MeasureMode.AtMost).toBe(2);
  });
});

describe('PhysicalEdge', () => {
  test('values match upstream Yoga YGEdge.h (Left/Top/Right/Bottom)', () => {
    expect(PhysicalEdge.Left).toBe(0);
    expect(PhysicalEdge.Top).toBe(1);
    expect(PhysicalEdge.Right).toBe(2);
    expect(PhysicalEdge.Bottom).toBe(3);
  });
});

describe('Gutter', () => {
  test('values match upstream Yoga YGEnums.h', () => {
    expect(Gutter.Column).toBe(0);
    expect(Gutter.Row).toBe(1);
    expect(Gutter.All).toBe(2);
  });
});

/**
 * Sanity check on the const-object derivation pattern. The derived union
 * type should narrow to the literal numeric type of each value.
 */
describe('derived union types', () => {
  test('typeof import returns the value type at the call site', () => {
    const flexDir: FlexDirection = FlexDirection.Row;
    expect(typeof flexDir).toBe('number');
    expect(flexDir).toBe(2);

    const justify: Justify = Justify.SpaceBetween;
    expect(justify).toBe(4);

    const unit: Unit = Unit.Percent;
    expect(unit).toBe(2);
  });
});
