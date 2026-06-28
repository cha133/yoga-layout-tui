/**
 * End-to-end tests for the 11-STEP algorithm (TUI subset).
 *
 * Each test builds a small Node tree and verifies the computed layout
 * matches the expected left/top/width/height of each node. These cover
 * the common TUI patterns: header/body/footer, sidebars, modals, gap,
 * padding, justify, align, flex-grow.
 */

import { describe, expect, test } from 'bun:test';
import {
  Align,
  Display,
  FlexDirection,
  Justify,
  MeasureMode,
  PhysicalEdge,
  PositionType,
} from '../../../src/enums.js';
import { Node } from '../../../src/node/node.js';

// Helper: read computed layout as a tuple for stable comparisons.
function geom(n: Node): { left: number; top: number; width: number; height: number } {
  return {
    left: n.getComputedLeft(),
    top: n.getComputedTop(),
    width: n.getComputedWidth(),
    height: n.getComputedHeight(),
  };
}

// ─── STEP 1+2: inner dimensions after padding ─────────────────────────────

describe('STEP 1+2: available inner dimensions', () => {
  test('padding reduces inner size on both axes', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(50)
      .setPadding(0 /* Left */, 2)
      .setPadding(1 /* Right */, 4)
      .setPadding(2 /* Top */, 1)
      .setPadding(3 /* Bottom */, 3);
    root.calculateLayout(100, 50);
    expect(root.getComputedWidth()).toBe(100); // container respects input
    expect(root.getComputedHeight()).toBe(50);
  });

  test('inner child gets padded space when sized manually', () => {
    const root = Node.create().setWidth(100).setHeight(50).setPaddingAll(2);
    const child = Node.create().setWidth(96).setHeight(46);
    root.insertChild(child, 0);
    root.calculateLayout(100, 50);
    expect(child.getComputedWidth()).toBe(96);
    expect(child.getComputedHeight()).toBe(46);
  });
});

// ─── STEP 3: flex basis ───────────────────────────────────────────────────

describe('STEP 3: flex basis resolution', () => {
  test('flexBasis: Point → uses that value', () => {
    const root = Node.create().setWidth(100).setHeight(50).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setFlexBasis(30).setHeight(10);
    root.insertChild(a, 0);
    root.calculateLayout(100, 50);
    expect(a.getComputedWidth()).toBe(30);
  });

  test('flexBasis: Percent → resolves against parent main axis', () => {
    const root = Node.create().setWidth(100).setHeight(50).setFlexDirection(FlexDirection.Row);
    const a = Node.create()
      .setFlexBasis('50%' as `${number}%`)
      .setHeight(10);
    root.insertChild(a, 0);
    root.calculateLayout(100, 50);
    expect(a.getComputedWidth()).toBe(50);
  });

  test('width on column-axis child used as basis', () => {
    const root = Node.create().setWidth(50).setHeight(100).setFlexDirection(FlexDirection.Column);
    const a = Node.create().setWidth(20).setHeight(40);
    root.insertChild(a, 0);
    root.calculateLayout(50, 100);
    expect(a.getComputedHeight()).toBe(40);
  });
});

// ─── STEP 5: flex grow/shrink distribution ───────────────────────────────

describe('STEP 5: flex-grow distribution', () => {
  test('single flexGrow:1 child fills remaining main axis', () => {
    const root = Node.create().setWidth(100).setHeight(50).setFlexDirection(FlexDirection.Column);
    const header = Node.create().setWidth(100).setHeight(1);
    const body = Node.create().setWidth(100).setFlexGrow(1);
    const footer = Node.create().setWidth(100).setHeight(1);
    root.insertChild(header, 0);
    root.insertChild(body, 1);
    root.insertChild(footer, 2);
    root.calculateLayout(100, 50);
    expect(body.getComputedHeight()).toBe(48); // 50 - 1 - 1
    expect(header.getComputedHeight()).toBe(1);
    expect(footer.getComputedHeight()).toBe(1);
  });

  test('two flexGrow children share remaining space proportionally', () => {
    const root = Node.create().setWidth(100).setHeight(50).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(10).setFlexGrow(1).setHeight(50);
    const b = Node.create().setWidth(10).setFlexGrow(3).setHeight(50);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 50);
    // a gets 1/4 of remaining = (100-20)/4 = 20; b gets 3/4 = 60
    expect(a.getComputedWidth()).toBe(30); // 10 + 20
    expect(b.getComputedWidth()).toBe(70); // 10 + 60
  });

  test('flexShrink shrinks items when total basis exceeds container', () => {
    const root = Node.create().setWidth(50).setHeight(50).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(40).setFlexShrink(1).setHeight(50);
    const b = Node.create().setWidth(40).setFlexShrink(1).setHeight(50);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(50, 50);
    // total basis = 80, available = 50, deficit = 30
    // a and b equal weight → each shrinks by 15
    expect(a.getComputedWidth()).toBe(25);
    expect(b.getComputedWidth()).toBe(25);
  });
});

// ─── Justify / Align ──────────────────────────────────────────────────────

describe('Justify content (main axis)', () => {
  test('FlexStart (default): items packed at start', () => {
    const root = Node.create().setWidth(100).setHeight(10).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    expect(a.getComputedLeft()).toBe(0);
    expect(b.getComputedLeft()).toBe(20);
  });

  test('Center: items packed with leading half-free-space', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.Center);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    // free space = 60, leading = 30
    expect(a.getComputedLeft()).toBe(30);
    expect(b.getComputedLeft()).toBe(50);
  });

  test('FlexEnd: items packed at end', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.FlexEnd);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    expect(a.getComputedLeft()).toBe(60);
    expect(b.getComputedLeft()).toBe(80);
  });

  test('SpaceBetween: equal gaps between items, no leading/trailing gap', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.SpaceBetween);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    const c = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.insertChild(c, 2);
    root.calculateLayout(100, 10);
    expect(a.getComputedLeft()).toBe(0);
    expect(b.getComputedLeft()).toBe(40);
    expect(c.getComputedLeft()).toBe(80);
  });
});

describe('Align items (cross axis)', () => {
  test('Center on row container: items vertically centered', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setAlignItems(Align.Center);
    const short = Node.create().setWidth(20).setHeight(4);
    root.insertChild(short, 0);
    root.calculateLayout(100, 10);
    // free = 6, centered → top offset 3
    expect(short.getComputedTop()).toBe(3);
  });

  test('FlexEnd on row container: items at bottom', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setAlignItems(Align.FlexEnd);
    const short = Node.create().setWidth(20).setHeight(4);
    root.insertChild(short, 0);
    root.calculateLayout(100, 10);
    expect(short.getComputedTop()).toBe(6);
  });
});

// ─── STEP 10: reverse direction ──────────────────────────────────────────

describe('STEP 10: reverse flex direction', () => {
  test('RowReverse: items placed right-to-left', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.RowReverse);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    // Source order: a, b. Visual: b at 0, a at 20.
    expect(b.getComputedLeft()).toBe(0);
    expect(a.getComputedLeft()).toBe(20);
  });

  test('ColumnReverse: items placed bottom-to-top', () => {
    const root = Node.create()
      .setWidth(10)
      .setHeight(100)
      .setFlexDirection(FlexDirection.ColumnReverse);
    const a = Node.create().setWidth(10).setHeight(20);
    const b = Node.create().setWidth(10).setHeight(20);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(10, 100);
    expect(b.getComputedTop()).toBe(0);
    expect(a.getComputedTop()).toBe(20);
  });
});

// ─── STEP 11: absolute positioning ──────────────────────────────────────

describe('STEP 11: absolute positioning', () => {
  test('absolute child with setPosition(Left, Top) places it there', () => {
    const root = Node.create().setWidth(80).setHeight(24).setFlexDirection(FlexDirection.Column);
    const modal = Node.create()
      .setWidth(20)
      .setHeight(5)
      .setPositionType(PositionType.Absolute)
      .setPosition(0 /* Left */, 30)
      .setPosition(1 /* Top */, 10);
    root.insertChild(modal, 0);
    root.calculateLayout(80, 24);
    expect(modal.getComputedLeft()).toBe(30);
    expect(modal.getComputedTop()).toBe(10);
    expect(modal.getComputedWidth()).toBe(20);
    expect(modal.getComputedHeight()).toBe(5);
  });

  test('absolute child does not contribute to parent flex layout', () => {
    const root = Node.create().setWidth(80).setHeight(24).setFlexDirection(FlexDirection.Column);
    const normal = Node.create().setWidth(80).setHeight(5);
    const modal = Node.create()
      .setWidth(20)
      .setHeight(5)
      .setPositionType(PositionType.Absolute)
      .setPosition(0 /* Left */, 0)
      .setPosition(2 /* Top */, 0);
    root.insertChild(normal, 0);
    root.insertChild(modal, 1);
    root.calculateLayout(80, 24);
    expect(normal.getComputedHeight()).toBe(5);
    expect(normal.getComputedTop()).toBe(0);
    expect(modal.getComputedTop()).toBe(0); // absolute, doesn't push normal down
  });
});

// ─── display:none ─────────────────────────────────────────────────────────

describe('display: None', () => {
  test('hidden children are skipped in layout', () => {
    const root = Node.create().setWidth(50).setHeight(50).setFlexDirection(FlexDirection.Column);
    const a = Node.create().setWidth(50).setHeight(10);
    const b = Node.create().setWidth(50).setHeight(10).setDisplay(Display.None);
    const c = Node.create().setWidth(50).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.insertChild(c, 2);
    root.calculateLayout(50, 50);
    expect(a.getComputedTop()).toBe(0);
    expect(c.getComputedTop()).toBe(10); // b is hidden, c follows a
    expect(b.getHasNewLayout()).toBe(false);
  });
});

// ─── Gap ──────────────────────────────────────────────────────────────────

describe('Gap', () => {
  test('setGap on row container spaces children horizontally', () => {
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setGap(5);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    expect(a.getComputedLeft()).toBe(0);
    expect(b.getComputedLeft()).toBe(25); // 20 + 5
  });

  test('setGap on column container spaces children vertically', () => {
    const root = Node.create()
      .setWidth(10)
      .setHeight(100)
      .setFlexDirection(FlexDirection.Column)
      .setGap(3);
    const a = Node.create().setWidth(10).setHeight(20);
    const b = Node.create().setWidth(10).setHeight(20);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(10, 100);
    expect(a.getComputedTop()).toBe(0);
    expect(b.getComputedTop()).toBe(23); // 20 + 3
  });
});

// ─── Measure func (text leaf nodes) ─────────────────────────────────────

describe('Measure function for text leaves', () => {
  test('text leaf with measureFunc returns intrinsic size as basis', () => {
    const root = Node.create().setWidth(80).setHeight(24).setFlexDirection(FlexDirection.Column);
    const text = Node.create().setMeasureFunc((w, _wm, _h, _hm) => ({
      width: Number.isNaN(w) ? 10 : w, // intrinsic width when unconstrained
      height: 3, // 3 lines tall
    }));
    root.insertChild(text, 0);
    root.calculateLayout(80, 24);
    expect(text.getComputedWidth()).toBe(80); // fills parent width
    expect(text.getComputedHeight()).toBe(3); // intrinsic from measure func
  });
});

// ─── TUI scenario: status bar + footer + body ────────────────────────────

describe('TUI scenario: classic 3-zone layout', () => {
  test('header (1) + body (flex) + footer (1) on a 24-line viewport', () => {
    const root = Node.create().setWidth(80).setHeight(24).setFlexDirection(FlexDirection.Column);

    const header = Node.create().setWidth(80).setHeight(1);
    const body = Node.create().setWidth(80).setFlexGrow(1);
    const footer = Node.create().setWidth(80).setHeight(1);

    root.insertChild(header, 0);
    root.insertChild(body, 1);
    root.insertChild(footer, 2);

    root.calculateLayout(80, 24);

    expect(geom(header)).toEqual({ left: 0, top: 0, width: 80, height: 1 });
    expect(geom(body)).toEqual({ left: 0, top: 1, width: 80, height: 22 });
    expect(geom(footer)).toEqual({ left: 0, top: 23, width: 80, height: 1 });
  });

  test('header with SpaceBetween (title left, status right)', () => {
    const root = Node.create()
      .setWidth(80)
      .setHeight(1)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.SpaceBetween);

    const title = Node.create().setWidth(20).setHeight(1);
    const status = Node.create().setWidth(15).setHeight(1);

    root.insertChild(title, 0);
    root.insertChild(status, 1);

    root.calculateLayout(80, 1);

    expect(title.getComputedLeft()).toBe(0);
    expect(status.getComputedLeft()).toBe(65);
  });
});

// ─── Margin ─────────────────────────────────────────────────────────────

describe('Margin (point)', () => {
  test('marginLeft offsets the child from the parent edge', () => {
    const root = Node.create().setWidth(20).setHeight(1).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(5).setHeight(1).setMargin(PhysicalEdge.Left, 2);
    root.insertChild(a, 0);
    root.calculateLayout(20, 1);
    expect(a.getComputedLeft()).toBe(2); // margin pushes child right by 2
  });

  test('marginRight consumes inner main so siblings start after margin zone', () => {
    const root = Node.create().setWidth(20).setHeight(1).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(5).setHeight(1).setMargin(PhysicalEdge.Right, 3);
    const b = Node.create().setWidth(5).setHeight(1);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(20, 1);
    expect(a.getComputedLeft()).toBe(0);
    // a occupies 5 cols + 3 cols margin-right = 8 cols total → b starts at 8
    expect(b.getComputedLeft()).toBe(8);
  });

  test('vertical margin offsets in Column flex', () => {
    const root = Node.create().setWidth(10).setHeight(10).setFlexDirection(FlexDirection.Column);
    const a = Node.create().setWidth(10).setHeight(2).setMargin(PhysicalEdge.Top, 1);
    root.insertChild(a, 0);
    root.calculateLayout(10, 10);
    expect(a.getComputedTop()).toBe(1); // margin-top pushes down by 1
  });
});

describe('Margin: auto', () => {
  test('marginLeft: auto on a single child centers it on the main axis', () => {
    // Row 10 wide, one child 4 wide → free space 6 → split between
    // marginLeft:auto and marginRight:auto → 3 each → child centered
    const root = Node.create().setWidth(10).setHeight(1).setFlexDirection(FlexDirection.Row);
    const a = Node.create()
      .setWidth(4)
      .setHeight(1)
      .setMargin(PhysicalEdge.Left, 'auto')
      .setMargin(PhysicalEdge.Right, 'auto');
    root.insertChild(a, 0);
    root.calculateLayout(10, 1);
    expect(a.getComputedLeft()).toBe(3); // (10 - 4) / 2 = 3
  });

  test('marginLeft: auto pushes child to trailing edge (like FlexEnd)', () => {
    const root = Node.create().setWidth(10).setHeight(1).setFlexDirection(FlexDirection.Row);
    const a = Node.create().setWidth(4).setHeight(1).setMargin(PhysicalEdge.Left, 'auto'); // only one auto edge
    root.insertChild(a, 0);
    root.calculateLayout(10, 1);
    // Free space 6 → all 6 goes to marginLeft:auto → child at x=6
    expect(a.getComputedLeft()).toBe(6);
  });

  test('margin auto overrides justifyContent', () => {
    // Container says SpaceBetween, but a child has marginLeft:auto —
    // the free space goes to the auto margin instead of being distributed.
    const root = Node.create()
      .setWidth(20)
      .setHeight(1)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.SpaceBetween);
    const a = Node.create().setWidth(4).setHeight(1).setMargin(PhysicalEdge.Left, 'auto');
    const b = Node.create().setWidth(4).setHeight(1);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(20, 1);
    // a gets all free space (20-4-4=12) as marginLeft → at x=12
    // b starts right after a (with no margin) → at x=16
    expect(a.getComputedLeft()).toBe(12);
    expect(b.getComputedLeft()).toBe(16);
  });
});

// Suppress unused-import warnings from biome (used as type-only).
void MeasureMode;
