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
  Overflow,
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
  test('RowReverse: first source child at the trailing edge (right), walking left', () => {
    // Upstream Yoga semantic for row-reverse: the FIRST source child
    // sits at the trailing edge of the main axis, the LAST source
    // child at the start edge. With width=100 and two 20-wide
    // children, a (first source) goes at left=80, b (second) at 60.
    // (The pre-fix behavior was "b at 0, a at 20" — placing from the
    // start edge instead of the trailing edge.)
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.RowReverse);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    expect(a.getComputedLeft()).toBe(80);
    expect(b.getComputedLeft()).toBe(60);
  });

  test('ColumnReverse: first source child at the bottom, walking up', () => {
    const root = Node.create()
      .setWidth(10)
      .setHeight(100)
      .setFlexDirection(FlexDirection.ColumnReverse);
    const a = Node.create().setWidth(10).setHeight(20);
    const b = Node.create().setWidth(10).setHeight(20);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(10, 100);
    expect(a.getComputedTop()).toBe(80);
    expect(b.getComputedTop()).toBe(60);
  });

  test('RowReverse respects paddingLeft on the start edge', () => {
    // Bug #1.4 regression: the old STEP 10 ignored padding/border on
    // the start edge, placing the leftmost child at left=0 even when
    // the parent had padding. After the fix, paddingLeft=10 shifts
    // the entire content box: a (first source) at left=80 (= 10 + 70)
    // and b (second source) at left=60 (= 10 + 50).
    const root = Node.create()
      .setWidth(100)
      .setHeight(10)
      .setFlexDirection(FlexDirection.RowReverse)
      .setPadding(PhysicalEdge.Left, 10);
    const a = Node.create().setWidth(20).setHeight(10);
    const b = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 10);
    // Content box: width = 100 - 10 (paddingLeft) - 0 (paddingRight) = 90.
    // a (first source) at trailing edge: childMainPos = 90 - 20 = 70,
    //   absolute left = paddingStart + 70 = 10 + 70 = 80.
    // b (second source) one width to the left: childMainPos = 50,
    //   absolute left = 10 + 50 = 60.
    expect(a.getComputedLeft()).toBe(80);
    expect(b.getComputedLeft()).toBe(60);
  });

  test('RowReverse preserves cross-axis alignment (does not wipe it)', () => {
    // Bug #1.4 regression: the old STEP 10 overwrote BOTH axes of
    // `position[0/1]`, which clobbered the cross-axis offset that
    // STEP 6c had computed. After the fix, only the main axis
    // changes; cross-axis placement (e.g., alignItems: Center) is
    // preserved.
    const root = Node.create()
      .setWidth(100)
      .setHeight(20)
      .setFlexDirection(FlexDirection.RowReverse)
      .setAlignItems(Align.Center);
    const a = Node.create().setWidth(20).setHeight(4);
    const b = Node.create().setWidth(20).setHeight(4);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(100, 20);
    // Cross axis is Y; alignItems Center → vertical center of 20-tall
    // box, child is 4 tall → top = (20-4)/2 = 8.
    expect(a.getComputedTop()).toBe(8);
    expect(b.getComputedTop()).toBe(8);
  });
});

// ─── Bug #2.1 / #2.2: layout cache hit/miss + output cache ──────────────

describe('layout cache', () => {
  test('second pass with same inputs is a cache hit (no _hasNewLayout on root)', () => {
    // Bug #2.1 regression: before the fix, the algorithm always re-ran
    // every node on every calculateLayout call. After the fix, a clean
    // root with the same inputs hits the cache and skips recomputation.
    // We detect the hit by `_hasNewLayout` being false (a real compute
    // sets it to true; a hit sets it to false).
    const root = Node.create().setWidth(80).setHeight(24);
    const a = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);

    root.calculateLayout(80, 24);
    expect(root.getHasNewLayout()).toBe(true); // first pass = compute
    root.markLayoutSeen();
    expect(root.getHasNewLayout()).toBe(false);

    // Second pass with same inputs — should be a cache hit (root).
    root.calculateLayout(80, 24);
    expect(root.getHasNewLayout()).toBe(false); // hit = no new layout
    // Dimensions are still correct (read from `layout.width` which
    // was set by the first pass and not modified on a hit).
    expect(root.getComputedWidth()).toBe(80);
    expect(a.getComputedWidth()).toBe(20);
  });

  test('cache miss when inputs change (different availableWidth/Height)', () => {
    const root = Node.create().setWidth(80).setHeight(24);
    const a = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);

    root.calculateLayout(80, 24);
    root.markLayoutSeen();
    root.calculateLayout(80, 24);
    expect(root.getHasNewLayout()).toBe(false); // cache hit

    // Different size → miss.
    root.calculateLayout(100, 30);
    expect(root.getHasNewLayout()).toBe(true);
    expect(root.getComputedWidth()).toBe(100);
    expect(root.getComputedHeight()).toBe(30);
  });

  test('cache miss when a descendant is dirtied via the proper markDirty API', () => {
    // Bug #1.3 + #2.1 interaction: markDirty propagates UP, so a
    // descendant change invalidates the parent's cache. Direct
    // assignment `a._isDirty = true` bypasses the up-propagation and
    // would only dirty the child (the cache check at the parent would
    // still hit, leaving the dirty child unprocessed). The proper
    // public API call goes through markDirty.
    const root = Node.create().setWidth(80).setHeight(24);
    const a = Node.create().setWidth(20).setHeight(10);
    root.insertChild(a, 0);

    root.calculateLayout(80, 24);
    root.markLayoutSeen();
    root.calculateLayout(80, 24);
    expect(root.getHasNewLayout()).toBe(false); // cache hit

    // Use the public markDirty API — propagates UP to the root.
    a.markDirty();
    expect(root._isDirty).toBe(true); // ancestor marked dirty
    root.calculateLayout(80, 24);
    expect(root.getHasNewLayout()).toBe(true); // cache miss
  });

  test('output cache restores correct dimensions on hit (Bug #2.2)', () => {
    // Bug #2.2: without storing the OUTPUT cache, a hit would return
    // whatever layout.width/height happened to be left by a previous
    // pass (the scrollbox vpH=33→2624 bug). To exercise the inner
    // cache hit, we set up a tree where a clean inner node gets
    // recursively re-laid-out and the output cache kicks in.
    const root = Node.create().setWidth(80).setHeight(24);
    const a = Node.create().setWidth(30).setHeight(10);
    root.insertChild(a, 0);

    root.calculateLayout(80, 24);
    // After first pass, cachedLayoutOutputs.hasLayout = true for both
    // root and a.
    expect(a._layoutResults.cachedLayoutOutputs.hasLayout).toBe(true);
    expect(a._layoutResults.cachedLayoutOutputs.width).toBe(30);
    expect(a._layoutResults.cachedLayoutOutputs.height).toBe(10);
  });
});

// ─── Bug #2.3: Overflow.Scroll clamping ───────────────────────────────────
//
// The Scroll clamp only fires when the parent tells the node "at most
// this big" via `mainMode === MeasureMode.AtMost`. In our public
// `Node.calculateLayout(w, h)` API the modes default to Exactly/Undefined,
// so the clamp is normally silent — the public API is for terminal-viewport
// sizing. The tests below invoke `calculateLayoutImpl` directly with AtMost
// to simulate a flex parent passing an at-most constraint to a Scroll
// child, which is the real-world usage (e.g. a ScrollBox inside a
// flex container that says "you have at most 10 rows").

import { calculateLayoutImpl } from '../../../src/algorithm/calculateLayoutImpl.js';
import { Direction } from '../../../src/enums.js';

describe('Overflow.Scroll clamping', () => {
  test('column ScrollBox clamps to viewport when content overflows (AtMost mode)', () => {
    // Without the Scroll clamp, the container would grow to fit content
    // (15+15=30). With the clamp in AtMost mode, it stays at the viewport
    // (10) and the children overflow.
    const root = Node.create().setFlexDirection(FlexDirection.Column).setOverflow(Overflow.Scroll);
    const a = Node.create().setWidth(20).setHeight(15);
    const b = Node.create().setWidth(20).setHeight(15);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    // AtMost mode: parent says "you have AT MOST 10 rows".
    calculateLayoutImpl(root, 20, 10, Direction.LTR, MeasureMode.Exactly, MeasureMode.AtMost, 1);
    expect(root.getComputedHeight()).toBe(10);
  });

  test('column ScrollBox with content smaller than viewport shrinks to fit (AtMost mode)', () => {
    // When content (4+4=8) is less than viewport (10), the clamp picks
    // min(viewport, content) = 8 — the container shrinks to fit.
    const root = Node.create().setFlexDirection(FlexDirection.Column).setOverflow(Overflow.Scroll);
    const a = Node.create().setWidth(20).setHeight(4);
    const b = Node.create().setWidth(20).setHeight(4);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    calculateLayoutImpl(root, 20, 10, Direction.LTR, MeasureMode.Exactly, MeasureMode.AtMost, 1);
    expect(root.getComputedHeight()).toBe(8);
  });

  test('ScrollBox respects padding ring floor (AtMost mode, zero content)', () => {
    // Edge case: zero-height content with padding. Without the
    // `Math.max(..., paddingMain)` floor, the container would collapse
    // to 0 and lose the padding ring.
    const root = Node.create()
      .setFlexDirection(FlexDirection.Column)
      .setOverflow(Overflow.Scroll)
      .setPaddingAll(2);
    const child = Node.create().setWidth(16).setHeight(0);
    root.insertChild(child, 0);
    // availableInnerMain = 5 - 2*2 = 1; paddingMain = 4; clamp:
    // min(viewport=5, content=4+0=4) = 4; max(4, paddingMain=4) = 4.
    calculateLayoutImpl(root, 20, 5, Direction.LTR, MeasureMode.Exactly, MeasureMode.AtMost, 1);
    expect(root.getComputedHeight()).toBe(4);
  });

  test('Overflow.Hidden in AtMost mode does NOT shrink-to-fit like Scroll (with smaller content)', () => {
    // Hidden vs Scroll: Scroll clamps to min(viewport, content) in AtMost
    // (shrink-to-fit when content is smaller); Hidden stays at the
    // available size regardless. Here content (4) is smaller than
    // viewport (10), so Scroll would shrink to 4 but Hidden stays at 10.
    const root = Node.create().setFlexDirection(FlexDirection.Column).setOverflow(Overflow.Hidden);
    const a = Node.create().setWidth(20).setHeight(4);
    root.insertChild(a, 0);
    calculateLayoutImpl(root, 20, 10, Direction.LTR, MeasureMode.Exactly, MeasureMode.AtMost, 1);
    // No Scroll clamp — container stays at availableInnerMain (10).
    expect(root.getComputedHeight()).toBe(10);
  });

  test('Scroll clamp is silent in Exactly mode (public API path)', () => {
    // The public `Node.calculateLayout(w, h)` uses Exactly mode — the
    // viewport is the container's exact size, no clamping. This is by
    // design: the public API treats the root as a hard viewport.
    const root = Node.create().setFlexDirection(FlexDirection.Column).setOverflow(Overflow.Scroll);
    const a = Node.create().setWidth(20).setHeight(15);
    root.insertChild(a, 0);
    root.calculateLayout(20, 10); // Exactly mode
    expect(root.getComputedHeight()).toBe(10);
    expect(a.getComputedHeight()).toBe(15); // child overflows viewport
  });

  test('Scroll child inside flex parent: child gets AtMost and clamp fires (v0.5 fix)', () => {
    // Bug #v0.4-known-limitation-1 fix: pre-v0.5, calculateLayoutImpl
    // always passed `MeasureMode.Exactly, Exactly` to children, so the
    // v0.4 Scroll clamp (`mainMode === AtMost` branch) was never
    // reachable from real usage. After the fix, a flex parent that
    // gives a Scroll child an exact slot passes AtMost downstream, so
    // the child's own Scroll clamp fires and shrinks it to its slot.
    const parent = Node.create().setWidth(20).setHeight(10).setFlexDirection(FlexDirection.Column);
    const scrollChild = Node.create()
      .setFlexDirection(FlexDirection.Column)
      .setFlexGrow(1)
      .setOverflow(Overflow.Scroll);
    const a = Node.create().setWidth(20).setHeight(15);
    const b = Node.create().setWidth(20).setHeight(15);
    scrollChild.insertChild(a, 0);
    scrollChild.insertChild(b, 1);
    parent.insertChild(scrollChild, 0);
    parent.calculateLayout(20, 10);
    // Parent gives scrollChild a 20×10 slot (full height via flexGrow).
    // Without AtMost, scrollChild would grow to fit 30 of content.
    // With AtMost + Scroll clamp, scrollChild stays at 10 (the
    // parent-given slot, since content > viewport).
    expect(scrollChild.getComputedHeight()).toBe(10);
  });
});

// ─── Bug #3.1 / #3.2: measure-func subtree recursion ─────────────────────

describe('measure-func subtree recursion', () => {
  test('wrapper Box without its own measureFunc derives basis from Text leaf in subtree', () => {
    // Bug #3.2 regression: before the fix, `computeFlexBasisForChild`
    // only checked `child.measureFunc` directly. A Box wrapping a
    // Text leaf (Text has the measureFunc) would get basis=0 instead
    // of Text's intrinsic size. After the fix, the helper walks the
    // subtree to find the measure-func leaf.
    const root = Node.create().setWidth(100).setHeight(50).setFlexDirection(FlexDirection.Row);
    const wrapper = Node.create(); // no measureFunc
    const text = Node.create().setMeasureFunc((w, _wm, _h, _hm) => ({
      width: w, // returns the available width as its intrinsic width
      height: 7,
    }));
    wrapper.insertChild(text, 0);
    root.insertChild(wrapper, 0);
    root.calculateLayout(100, 50);
    // Wrapper's flex basis is the Text's intrinsic width (= availableMain = 100).
    expect(wrapper.getComputedWidth()).toBe(100);
    expect(text.getComputedWidth()).toBe(100);
  });

  test('3-level nesting Box > Box > Text (Text has measureFunc) propagates basis up', () => {
    // Column direction → main axis is Y, so the measure func's height
    // is the main-axis intrinsic size. Both inner and outer Boxes
    // (which have no measure func of their own) should derive their
    // main-axis basis from Text's height via the subtree walk.
    const root = Node.create().setWidth(80).setHeight(20).setFlexDirection(FlexDirection.Column);
    const outer = Node.create();
    const inner = Node.create();
    const text = Node.create().setMeasureFunc(() => ({ width: 30, height: 5 }));
    root.insertChild(outer, 0);
    outer.insertChild(inner, 0);
    inner.insertChild(text, 0);
    root.calculateLayout(80, 20);
    // Text's height (= 5) is the main-axis intrinsic; both inner and
    // outer get it as their basis via subtree recursion.
    expect(text.getComputedHeight()).toBe(5);
    expect(inner.getComputedHeight()).toBe(5);
    expect(outer.getComputedHeight()).toBe(5);
  });

  test('pure layout subtree (no measureFunc anywhere) → basis = 0', () => {
    // Bug #3.1 regression: if neither this child nor any descendant
    // has a measureFunc, the basis should be 0 (not the availableMain
    // — flex-grow would inflate it).
    const root = Node.create().setWidth(100).setHeight(20).setFlexDirection(FlexDirection.Row);
    const wrapper = Node.create().setFlexGrow(1);
    const child = Node.create();
    wrapper.insertChild(child, 0);
    root.insertChild(wrapper, 0);
    root.calculateLayout(100, 20);
    // Wrapper has no measure func in subtree, so basis = 0. After
    // flex-grow resolution (1 of 1 grow), it gets the full 100.
    expect(wrapper.getComputedWidth()).toBe(100);
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
