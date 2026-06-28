/**
 * Phase 5 — `src/index.ts` is the single entry the package exports.
 *
 * We import everything users are expected to reach for (enums, helpers,
 * Config, Node, Yoga namespace, types) and assert the import is shaped
 * correctly. If the index re-exports break in the future, this test
 * surfaces it before the bundlers / consumers notice.
 */

import { describe, expect, test } from 'bun:test';

import * as Lib from '../../../src/index.js';
import {
  type Align,
  Align as AlignConst,
  AUTO_VALUE,
  Config,
  type Direction,
  Direction as DirectionConst,
  type Display,
  Display as DisplayConst,
  type FlexDirection,
  FlexDirection as FlexDirectionConst,
  type Gutter,
  Gutter as GutterConst,
  type Justify,
  Justify as JustifyConst,
  loadYoga,
  type MeasureFunction,
  type MeasureMode,
  MeasureMode as MeasureModeConst,
  type Node,
  type Overflow,
  Overflow as OverflowConst,
  type PhysicalEdge,
  PhysicalEdge as PhysicalEdgeConst,
  type PositionType,
  PositionType as PositionTypeConst,
  type PublicLayout,
  parseDimensionInput,
  percentValue,
  pointValue,
  rawValue,
  resolveValue,
  UNDEFINED_VALUE,
  type Unit,
  Unit as UnitConst,
  type Value,
  Yoga,
  default as YogaDefault,
} from '../../../src/index.js';

describe('index.ts — enum consts', () => {
  test('all 11 enum consts are exported and have numeric values', () => {
    // Each enum const object should be a non-empty plain object.
    for (const e of [
      AlignConst,
      DirectionConst,
      DisplayConst,
      FlexDirectionConst,
      GutterConst,
      JustifyConst,
      MeasureModeConst,
      OverflowConst,
      PhysicalEdgeConst,
      PositionTypeConst,
      UnitConst,
    ]) {
      expect(typeof e).toBe('object');
      expect(Object.keys(e).length).toBeGreaterThan(0);
    }
  });

  test('upstream-wire enum values are preserved (FlexDirection.Column = 0)', () => {
    expect(FlexDirectionConst.Column).toBe(0);
    expect(FlexDirectionConst.Row).toBe(2);
    expect(DirectionConst.LTR).toBe(1);
    expect(JustifyConst.FlexStart).toBe(1);
    expect(AlignConst.Stretch).toBe(4);
    expect(DisplayConst.Flex).toBe(0);
    expect(UnitConst.Undefined).toBe(0);
    expect(MeasureModeConst.Exactly).toBe(1);
  });
});

describe('index.ts — types compile (type-only assertions)', () => {
  // These functions only need to exist and be callable with the right
  // shape; if a type disappears from the public surface the
  // compiler / tsc test step will fail loudly.
  test('Value helpers accept and return the right shapes', () => {
    const v: Value = pointValue(5);
    expect(rawValue(v)).toBe(5);
    expect(resolveValue(v, 100)).toBe(5);

    const pct: Value = percentValue(50);
    expect(rawValue(pct)).toBe(50);
    expect(resolveValue(pct, 100)).toBe(50);

    expect(rawValue(AUTO_VALUE)).toBeNaN();
    expect(rawValue(UNDEFINED_VALUE)).toBeNaN();

    expect(parseDimensionInput(10)).toEqual(pointValue(10));
    expect(parseDimensionInput('25%')).toEqual(percentValue(25));
    expect(parseDimensionInput('auto')).toEqual(AUTO_VALUE);
  });

  test('Config class is exported and instantiable', () => {
    const c = new Config();
    expect(c.version).toBe(0);
    c.bumpVersion();
    expect(c.version).toBe(1);
  });

  test('MeasureFunction, PublicLayout, Node types are exported (compile-time)', () => {
    // Touch the types so TS doesn't strip them via --noEmit typechecking.
    const fn: MeasureFunction = (w, _wm, h, _hm) => ({ width: w, height: h });
    expect(fn(80, 1, 24, 1)).toEqual({ width: 80, height: 24 });

    const layout: PublicLayout = {
      left: 0,
      top: 0,
      right: 80,
      bottom: 24,
      width: 80,
      height: 24,
    };
    expect(layout.width).toBe(80);

    // Node is referenced as a value (importable) — also a type.
    const n: Node = Yoga.Node.createDefault();
    expect(n).toBeInstanceOf(Lib.Node);
  });

  test('all enum union types are exported as types', () => {
    // These assignments only typecheck if the type alias resolves.
    const a: Align = AlignConst.FlexStart;
    const d: Direction = DirectionConst.LTR;
    const dis: Display = DisplayConst.Flex;
    const fd: FlexDirection = FlexDirectionConst.Column;
    const g: Gutter = GutterConst.All;
    const j: Justify = JustifyConst.Center;
    const mm: MeasureMode = MeasureModeConst.Exactly;
    const o: Overflow = OverflowConst.Visible;
    const pe: PhysicalEdge = PhysicalEdgeConst.Left;
    const pt: PositionType = PositionTypeConst.Absolute;
    const u: Unit = UnitConst.Point;

    // If any of these `as` fails, the corresponding const isn't
    // a member of the union type — which means we shipped the wrong
    // shape to the public API.
    expect([a, d, dis, fd, g, j, mm, o, pe, pt, u].length).toBe(11);
  });
});

describe('index.ts — Yoga + loadYoga + default', () => {
  test('Yoga + loadYoga + default are all exported', () => {
    expect(typeof Yoga).toBe('object');
    expect(typeof loadYoga).toBe('function');
    expect(YogaDefault).toBe(Yoga);
  });

  test('end-to-end import-and-use works through the package root', () => {
    const root = Yoga.Node.createDefault().setWidth(40).setHeight(10);
    const header = Yoga.Node.createDefault().setFlexGrow(1);
    const body = Yoga.Node.createDefault().setFlexGrow(2);
    root.insertChild(header, 0);
    root.insertChild(body, 1);

    root.calculateLayout(40, 10);

    // flexGrow:1 vs 2 splits the 10-row height into 10/3 and 20/3,
    // rounded to pixels by the algorithm.
    const headerH = header.getComputedHeight();
    const bodyH = body.getComputedHeight();
    expect(headerH + bodyH).toBe(10);

    root.freeRecursive();
  });
});
