import { describe, expect, test } from 'bun:test';
import {
  crossAxis,
  isColumn,
  isReverse,
  isRow,
  mainAxis,
  resolveCrossDirection,
  resolveDirection,
} from '../../../src/algorithm/flexDirection.js';
import { Dimension, Direction, FlexDirection } from '../../../src/enums.js';

describe('isRow / isColumn / isReverse', () => {
  test('isRow is true for Row and RowReverse only', () => {
    expect(isRow(FlexDirection.Row)).toBe(true);
    expect(isRow(FlexDirection.RowReverse)).toBe(true);
    expect(isRow(FlexDirection.Column)).toBe(false);
    expect(isRow(FlexDirection.ColumnReverse)).toBe(false);
  });

  test('isColumn is true for Column and ColumnReverse only', () => {
    expect(isColumn(FlexDirection.Column)).toBe(true);
    expect(isColumn(FlexDirection.ColumnReverse)).toBe(true);
    expect(isColumn(FlexDirection.Row)).toBe(false);
    expect(isColumn(FlexDirection.RowReverse)).toBe(false);
  });

  test('isReverse is true for RowReverse and ColumnReverse only', () => {
    expect(isReverse(FlexDirection.RowReverse)).toBe(true);
    expect(isReverse(FlexDirection.ColumnReverse)).toBe(true);
    expect(isReverse(FlexDirection.Row)).toBe(false);
    expect(isReverse(FlexDirection.Column)).toBe(false);
  });

  test('every FlexDirection is in exactly one of isRow/isColumn', () => {
    for (const fd of [
      FlexDirection.Row,
      FlexDirection.RowReverse,
      FlexDirection.Column,
      FlexDirection.ColumnReverse,
    ]) {
      expect(isRow(fd) !== isColumn(fd)).toBe(true);
    }
  });
});

describe('mainAxis / crossAxis', () => {
  test('Row → main = Width, cross = Height', () => {
    expect(mainAxis(FlexDirection.Row)).toBe(Dimension.Width);
    expect(crossAxis(FlexDirection.Row)).toBe(Dimension.Height);
  });

  test('Column → main = Height, cross = Width', () => {
    expect(mainAxis(FlexDirection.Column)).toBe(Dimension.Height);
    expect(crossAxis(FlexDirection.Column)).toBe(Dimension.Width);
  });

  test('Reverse variants share main axis with their forward counterpart', () => {
    expect(mainAxis(FlexDirection.RowReverse)).toBe(mainAxis(FlexDirection.Row));
    expect(mainAxis(FlexDirection.ColumnReverse)).toBe(mainAxis(FlexDirection.Column));
    expect(crossAxis(FlexDirection.RowReverse)).toBe(crossAxis(FlexDirection.Row));
    expect(crossAxis(FlexDirection.ColumnReverse)).toBe(crossAxis(FlexDirection.Column));
  });
});

describe('resolveDirection (main-axis text-direction projection)', () => {
  test('LTR is identity (TUI subset default)', () => {
    expect(resolveDirection(FlexDirection.Row, Direction.LTR)).toBe(FlexDirection.Row);
    expect(resolveDirection(FlexDirection.RowReverse, Direction.LTR)).toBe(
      FlexDirection.RowReverse,
    );
    expect(resolveDirection(FlexDirection.Column, Direction.LTR)).toBe(FlexDirection.Column);
    expect(resolveDirection(FlexDirection.ColumnReverse, Direction.LTR)).toBe(
      FlexDirection.ColumnReverse,
    );
  });

  test('RTL flips Row ↔ RowReverse; columns unaffected', () => {
    expect(resolveDirection(FlexDirection.Row, Direction.RTL)).toBe(FlexDirection.RowReverse);
    expect(resolveDirection(FlexDirection.RowReverse, Direction.RTL)).toBe(FlexDirection.Row);
    expect(resolveDirection(FlexDirection.Column, Direction.RTL)).toBe(FlexDirection.Column);
    expect(resolveDirection(FlexDirection.ColumnReverse, Direction.RTL)).toBe(
      FlexDirection.ColumnReverse,
    );
  });
});

describe('resolveCrossDirection (cross-axis text-direction projection)', () => {
  test('LTR: Row → Column, Column → Row', () => {
    expect(resolveCrossDirection(FlexDirection.Row, Direction.LTR)).toBe(FlexDirection.Column);
    expect(resolveCrossDirection(FlexDirection.Column, Direction.LTR)).toBe(FlexDirection.Row);
  });

  test('RTL: cross Column → RowReverse (cross Row unaffected in RTL)', () => {
    // When the container is Row-direction, cross axis is Column (vertical) —
    // RTL does NOT flip vertical axes.
    // When the container is Column-direction, cross axis is Row (horizontal) —
    // RTL DOES flip horizontal axes, so cross becomes RowReverse.
    expect(resolveCrossDirection(FlexDirection.Row, Direction.RTL)).toBe(FlexDirection.Column);
    expect(resolveCrossDirection(FlexDirection.Column, Direction.RTL)).toBe(
      FlexDirection.RowReverse,
    );
  });

  test('reverse variants cross to the same axis as their forward counterpart', () => {
    expect(resolveCrossDirection(FlexDirection.RowReverse, Direction.LTR)).toBe(
      FlexDirection.Column,
    );
    expect(resolveCrossDirection(FlexDirection.ColumnReverse, Direction.LTR)).toBe(
      FlexDirection.Row,
    );
  });
});
