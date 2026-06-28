import { describe, expect, test } from 'bun:test';
import { Config } from '../../../src/config/config.js';
import {
  Align,
  Direction,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  MeasureMode,
  Overflow,
  PhysicalEdge,
  PositionType,
  Unit,
} from '../../../src/enums.js';
import { Node } from '../../../src/node/node.js';
import { isUndefinedValue, rawValue } from '../../../src/value.js';

// ─── Factory ──────────────────────────────────────────────────────────────

describe('Node factory', () => {
  test('create() returns a dirty node with default config', () => {
    const n = Node.create();
    expect(n).toBeInstanceOf(Node);
    expect(n._isDirty).toBe(true);
    expect(n.config).toBeInstanceOf(Config);
  });

  test('createDefault() = create() with no args', () => {
    expect(Node.createDefault()).toBeInstanceOf(Node);
  });

  test('createWithConfig(c) shares the config object', () => {
    const c = Config.create();
    const n = Node.createWithConfig(c);
    expect(n.config).toBe(c);
  });

  test('children start empty and parent is null', () => {
    const n = Node.create();
    expect(n.children).toEqual([]);
    expect(n.parent).toBeNull();
  });
});

// ─── Dimension setters ─────────────────────────────────────────────────────

describe('Node dimension setters', () => {
  test('setWidth accepts number / percent / auto', () => {
    const n = Node.create();
    n.setWidth(100);
    expect(rawValue(n.style.width)).toBe(100);
    expect(n.style.width.unit).toBe(Unit.Point);

    n.setWidth('50%');
    expect(rawValue(n.style.width)).toBe(50);
    expect(n.style.width.unit).toBe(Unit.Percent);

    n.setWidth('auto');
    expect(n.style.width.unit).toBe(Unit.Auto);
  });

  test('setters return this for chaining', () => {
    const n = Node.create();
    expect(n.setWidth(10)).toBe(n);
    expect(n.setHeight(20)).toBe(n);
    expect(n.setMinWidth(0)).toBe(n);
    expect(n.setMaxHeight(100)).toBe(n);
  });

  test('chaining multiple setters works', () => {
    const n = Node.create()
      .setWidth(80)
      .setHeight(24)
      .setFlexDirection(FlexDirection.Row)
      .setPaddingAll(1);
    expect(rawValue(n.style.width)).toBe(80);
    expect(rawValue(n.style.height)).toBe(24);
    expect(n.style.flexDirection).toBe(FlexDirection.Row);
    expect(isUndefinedValue(n.style.padding[0]!)).toBe(false);
  });

  test('setter marks the node dirty', () => {
    const n = Node.create();
    n._isDirty = false;
    n.setWidth(100);
    expect(n._isDirty).toBe(true);
  });

  test('invalid dimension string → Undefined (does not throw)', () => {
    // Bug #3.4 (parseDimensionInput 放宽): v0.2 used to throw on
    // non-numeric strings; v0.4 returns Undefined to match upstream
    // Yoga JS WASM + claude-code TS port behavior. Consumers like Ink
    // pass `Infinity` / unparseable strings and expect graceful
    // fallback, not an exception.
    const n = Node.create();
    expect(() => n.setWidth('not-a-number%')).not.toThrow();
    expect(n.style.width.unit).toBe(Unit.Undefined);
  });

  test('non-finite numbers (Infinity / NaN) → Undefined', () => {
    const n = Node.create();
    n.setWidth(Number.POSITIVE_INFINITY);
    expect(n.style.width.unit).toBe(Unit.Undefined);
    n.setWidth(Number.NaN);
    expect(n.style.width.unit).toBe(Unit.Undefined);
  });

  test('numeric string (no `%`) → Point (not Percent)', () => {
    // Pre-v0.4 the function treated all strings as Percent, so
    // setWidth("5") would create a Percent(5) Value. v0.4 matches
    // the claude-code TS port: bare numeric strings are Point.
    const n = Node.create();
    n.setWidth('5');
    expect(n.style.width.unit).toBe(Unit.Point);
    expect(rawValue(n.style.width)).toBe(5);
  });
});

// ─── Container setters ────────────────────────────────────────────────────

describe('Node container setters', () => {
  test('setFlexDirection / setJustifyContent / setAlignItems / setAlignSelf', () => {
    const n = Node.create();
    n.setFlexDirection(FlexDirection.Row);
    n.setJustifyContent(Justify.Center);
    n.setAlignItems(Align.Stretch);
    n.setAlignSelf(Align.Center);
    expect(n.style.flexDirection).toBe(FlexDirection.Row);
    expect(n.style.justifyContent).toBe(Justify.Center);
    expect(n.style.alignItems).toBe(Align.Stretch);
    expect(n.style.alignSelf).toBe(Align.Center);
  });

  test('setDisplay switches between Flex and None', () => {
    const n = Node.create();
    expect(n.style.display).toBe(Display.Flex);
    n.setDisplay(Display.None);
    expect(n.style.display).toBe(Display.None);
  });

  test('setPositionType switches between Relative and Absolute', () => {
    const n = Node.create();
    n.setPositionType(PositionType.Absolute);
    expect(n.style.positionType).toBe(PositionType.Absolute);
  });

  test('setOverflow', () => {
    const n = Node.create().setOverflow(Overflow.Hidden);
    expect(n.style.overflow).toBe(Overflow.Hidden);
  });
});

// ─── Flex item setters ────────────────────────────────────────────────────

describe('Node flex item setters', () => {
  test('setFlexGrow / setFlexShrink store numeric values', () => {
    const n = Node.create();
    n.setFlexGrow(2).setFlexShrink(1);
    expect(n.style.flexGrow).toBe(2);
    expect(n.style.flexShrink).toBe(1);
  });

  test('setFlexBasis accepts point / percent / auto', () => {
    const n = Node.create();
    n.setFlexBasis(50);
    expect(rawValue(n.style.flexBasis)).toBe(50);

    n.setFlexBasis('25%');
    expect(rawValue(n.style.flexBasis)).toBe(25);

    n.setFlexBasis('auto');
    expect(n.style.flexBasis.unit).toBe(Unit.Auto);
  });

  test('setFlex(n) shorthand (Bug #5.1)', () => {
    // n > 0: grow = n, shrink = 1, basis = 0
    const a = Node.create().setFlex(2);
    expect(a.style.flexGrow).toBe(2);
    expect(a.style.flexShrink).toBe(1);
    expect(a.style.flexBasis.unit).toBe(Unit.Undefined);
    // n < 0: grow = 0, shrink = -n
    const b = Node.create().setFlex(-1);
    expect(b.style.flexGrow).toBe(0);
    expect(b.style.flexShrink).toBe(1);
    // n === 0: reset
    const c = Node.create().setFlex(2).setFlex(0);
    expect(c.style.flexGrow).toBe(0);
    expect(c.style.flexShrink).toBe(0);
    expect(c.style.flexBasis.unit).toBe(Unit.Undefined);
  });
});

// ─── Edge insets ──────────────────────────────────────────────────────────

describe('Node edge insets', () => {
  test('setMargin(edge, v) sets the specific edge and flips _hasMargin', () => {
    const n = Node.create();
    expect(n._hasMargin).toBe(false);
    n.setMargin(PhysicalEdge.Left, 5);
    expect(rawValue(n.style.margin[PhysicalEdge.Left]!)).toBe(5);
    expect(n._hasMargin).toBe(true);
  });

  test('setMarginAll sets all 4 edges', () => {
    const n = Node.create().setMarginAll(2);
    for (const edge of [0, 1, 2, 3] as const) {
      expect(rawValue(n.style.margin[edge]!)).toBe(2);
    }
  });

  test('setPadding / setPaddingAll', () => {
    const n = Node.create().setPadding(PhysicalEdge.Top, 1);
    expect(rawValue(n.style.padding[PhysicalEdge.Top]!)).toBe(1);
    expect(n._hasPadding).toBe(true);

    const n2 = Node.create().setPaddingAll(3);
    expect(n2._hasPadding).toBe(true);
    for (const edge of [0, 1, 2, 3] as const) {
      expect(rawValue(n2.style.padding[edge]!)).toBe(3);
    }
  });

  test('setBorder / setBorderAll', () => {
    const n = Node.create().setBorder(PhysicalEdge.Right, 1);
    expect(rawValue(n.style.border[PhysicalEdge.Right]!)).toBe(1);
    expect(n._hasBorder).toBe(true);
  });

  test('setPosition for absolute children sets style.position and flips _hasPosition', () => {
    const n = Node.create()
      .setPositionType(PositionType.Absolute)
      .setPosition(PhysicalEdge.Left, 10)
      .setPosition(PhysicalEdge.Top, 5);
    expect(rawValue(n.style.position[PhysicalEdge.Left]!)).toBe(10);
    expect(rawValue(n.style.position[PhysicalEdge.Top]!)).toBe(5);
    expect(n._hasPosition).toBe(true);
  });

  test('Edge.Horizontal expands to Left + Right (Bug #4.1)', () => {
    // Ink `<Box paddingX={1} paddingY={2}>` reconciler translates
    // paddingX → setPadding(Edge.Horizontal, 1), paddingY →
    // setPadding(Edge.Vertical, 2). Without the convenience-edge
    // expansion, padding would silently stay Undefined.
    const n = Node.create().setPadding(Edge.Horizontal, 3);
    expect(rawValue(n.style.padding[PhysicalEdge.Left]!)).toBe(3);
    expect(rawValue(n.style.padding[PhysicalEdge.Right]!)).toBe(3);
    // Vertical stays Undefined — Horizontal didn't touch it.
    expect(isUndefinedValue(n.style.padding[PhysicalEdge.Top]!)).toBe(true);
    expect(isUndefinedValue(n.style.padding[PhysicalEdge.Bottom]!)).toBe(true);
  });

  test('Edge.Vertical expands to Top + Bottom', () => {
    const n = Node.create().setMargin(Edge.Vertical, 4);
    expect(rawValue(n.style.margin[PhysicalEdge.Top]!)).toBe(4);
    expect(rawValue(n.style.margin[PhysicalEdge.Bottom]!)).toBe(4);
    expect(isUndefinedValue(n.style.margin[PhysicalEdge.Left]!)).toBe(true);
    expect(isUndefinedValue(n.style.margin[PhysicalEdge.Right]!)).toBe(true);
  });

  test('Edge.All expands to all 4 physical edges', () => {
    const n = Node.create().setBorder(Edge.All, 2);
    expect(rawValue(n.style.border[PhysicalEdge.Left]!)).toBe(2);
    expect(rawValue(n.style.border[PhysicalEdge.Right]!)).toBe(2);
    expect(rawValue(n.style.border[PhysicalEdge.Top]!)).toBe(2);
    expect(rawValue(n.style.border[PhysicalEdge.Bottom]!)).toBe(2);
  });

  test('Edge.Start / Edge.End alias Left / Right (LTR-only)', () => {
    // LTR: Start = Left, End = Right. The algorithm reads the
    // physical slots, so setPadding(Edge.Start, 5) makes paddingLeft
    // = 5 just like setPadding(Edge.Left, 5) would.
    const n = Node.create().setPadding(Edge.Start, 7).setPadding(Edge.End, 9);
    expect(rawValue(n.style.padding[PhysicalEdge.Left]!)).toBe(7);
    expect(rawValue(n.style.padding[PhysicalEdge.Right]!)).toBe(9);
  });
});

// ─── Gap ──────────────────────────────────────────────────────────────────

describe('Node gap', () => {
  test('setGap(value) sets both axes to value', () => {
    const n = Node.create().setGap(1);
    expect(rawValue(n.style.gap[0]!)).toBe(1);
    expect(rawValue(n.style.gap[1]!)).toBe(1);
  });

  test('setGap(row, column) sets distinct axes', () => {
    const n = Node.create().setGap(2, 3);
    // Index 0 = column gap, Index 1 = row gap (matches Gutter enum ordering).
    expect(rawValue(n.style.gap[0]!)).toBe(3);
    expect(rawValue(n.style.gap[1]!)).toBe(2);
  });

  test('setGapByGutter (Bug #5.2)', () => {
    // Matches upstream Yoga's YGNodeStyleSetGap(Gutter, value) API.
    // gap[0] = column (cross-axis when flexDirection=Row), gap[1] = row.
    const a = Node.create().setGapByGutter(Gutter.Column, 5);
    expect(rawValue(a.style.gap[0]!)).toBe(5);
    expect(rawValue(a.style.gap[1]!)).toBeNaN();
    const b = Node.create().setGapByGutter(Gutter.Row, 7);
    expect(rawValue(b.style.gap[0]!)).toBeNaN();
    expect(rawValue(b.style.gap[1]!)).toBe(7);
    const c = Node.create().setGapByGutter(Gutter.All, 3);
    expect(rawValue(c.style.gap[0]!)).toBe(3);
    expect(rawValue(c.style.gap[1]!)).toBe(3);
  });
});

// ─── Tree operations ──────────────────────────────────────────────────────

describe('Node tree operations', () => {
  test('insertChild adds at the specified index', () => {
    const parent = Node.create();
    const a = Node.create();
    const b = Node.create();
    const c = Node.create();
    parent.insertChild(a, 0);
    parent.insertChild(c, 1);
    parent.insertChild(b, 1);
    expect(parent.children).toEqual([a, b, c]);
    expect(a.parent).toBe(parent);
    expect(b.parent).toBe(parent);
    expect(c.parent).toBe(parent);
  });

  test('insertChild detaches the child from its previous parent', () => {
    const oldParent = Node.create();
    const newParent = Node.create();
    const child = Node.create();
    oldParent.insertChild(child, 0);
    expect(oldParent.children).toHaveLength(1);

    newParent.insertChild(child, 0);
    expect(oldParent.children).toHaveLength(0);
    expect(newParent.children).toEqual([child]);
    expect(child.parent).toBe(newParent);
  });

  test('insertChild marks the parent and child dirty', () => {
    const parent = Node.create();
    const child = Node.create();
    parent._isDirty = false;
    child._isDirty = false;
    parent.insertChild(child, 0);
    expect(parent._isDirty).toBe(true);
    expect(child._isDirty).toBe(true);
  });

  test('removeChild detaches and clears parent pointer', () => {
    const parent = Node.create();
    const child = Node.create();
    parent.insertChild(child, 0);
    parent.removeChild(child);
    expect(parent.children).toEqual([]);
    expect(child.parent).toBeNull();
  });

  test('removeChild is a no-op for non-children', () => {
    const parent = Node.create();
    const stranger = Node.create();
    expect(() => parent.removeChild(stranger)).not.toThrow();
    expect(parent.children).toEqual([]);
  });

  test('getChild / getChildCount', () => {
    const parent = Node.create();
    const a = Node.create();
    const b = Node.create();
    parent.insertChild(a, 0);
    parent.insertChild(b, 1);
    expect(parent.getChildCount()).toBe(2);
    expect(parent.getChild(0)).toBe(a);
    expect(parent.getChild(1)).toBe(b);
  });

  test('getChild throws on out-of-range index', () => {
    const parent = Node.create();
    expect(() => parent.getChild(0)).toThrow();
    const a = Node.create();
    parent.insertChild(a, 0);
    expect(() => parent.getChild(5)).toThrow();
  });

  test('getParent returns the parent or null', () => {
    const parent = Node.create();
    const child = Node.create();
    expect(child.getParent()).toBeNull();
    parent.insertChild(child, 0);
    expect(child.getParent()).toBe(parent);
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────

describe('Node lifecycle', () => {
  test('free() detaches from parent and clears children', () => {
    const parent = Node.create();
    const child = Node.create();
    parent.insertChild(child, 0);
    child.free();
    expect(parent.children).toEqual([]);
    expect(child.parent).toBeNull();
    expect(child.children).toEqual([]);
  });

  test('freeRecursive() frees the entire subtree', () => {
    const root = Node.create();
    const a = Node.create();
    const b = Node.create();
    const c = Node.create();
    root.insertChild(a, 0);
    a.insertChild(b, 0);
    b.insertChild(c, 0);
    root.freeRecursive();
    expect(root.children).toEqual([]);
    expect(a.children).toEqual([]);
    expect(b.children).toEqual([]);
    expect(c.parent).toBeNull();
  });

  test('reset() clears layout results and dirty flag', () => {
    const n = Node.create();
    n._hasNewLayout = true;
    n._isDirty = false;
    n._layoutResults.position = [10, 20, 30, 40];
    n.reset();
    expect(n._hasNewLayout).toBe(false);
    expect(n._isDirty).toBe(true);
    expect(n._layoutResults.position).toEqual([0, 0, 0, 0]);
  });

  test('reset() cascades to descendants', () => {
    const root = Node.create();
    const child = Node.create();
    root.insertChild(child, 0);
    child._isDirty = false;
    child._hasNewLayout = true;
    root.reset();
    expect(child._isDirty).toBe(true);
    expect(child._hasNewLayout).toBe(false);
  });

  test('free() resets style and hot-path flags (bug #3.3)', () => {
    // Bug #3.3 regression: free() used to leave `style` and the
    // `_hasX` hot-path flags at their last-set values. After the fix,
    // they're restored to a fresh default-style state, so a freed
    // node is safe to reuse without leaking stale state.
    const n = Node.create()
      .setWidth(80)
      .setHeight(20)
      .setMargin(PhysicalEdge.Left, 5)
      .setPadding(PhysicalEdge.Right, 2);
    expect(n._hasMargin).toBe(true);
    expect(n._hasPadding).toBe(true);
    n.free();
    expect(n._hasMargin).toBe(false);
    expect(n._hasPadding).toBe(false);
    expect(n._hasBorder).toBe(false);
    expect(n._hasPosition).toBe(false);
    expect(n._hasAutoMargin).toBe(false);
    // style should now be the default — width/height Auto.
    expect(n.style.width.unit).toBe(Unit.Auto);
    expect(n.style.height.unit).toBe(Unit.Auto);
  });

  test('reset() also clears style and hot-path flags (bug #3.3)', () => {
    const n = Node.create().setWidth(80).setHeight(20).setBorder(PhysicalEdge.Top, 3);
    expect(n._hasBorder).toBe(true);
    n.reset();
    expect(n._hasBorder).toBe(false);
    expect(n.style.width.unit).toBe(Unit.Auto);
  });

  test('markDirty on root does NOT cascade to descendants', () => {
    // Bug #1.3 regression: markDirty used to propagate DOWN to
    // children. After the fix, dirtying the root must NOT touch any
    // descendants — children stay clean because the cache contract is
    // "dirty child ⇒ re-layout subtree", and the root's cached layout
    // is independent of its (still-clean) children's state.
    //
    // For insert/remove-style mutations that DO need down-propagation,
    // use `_markDirtyRecursive` (private; called by insertChild etc.).
    const root = Node.create();
    const a = Node.create();
    const b = Node.create();
    root.insertChild(a, 0);
    a.insertChild(b, 0);
    root.calculateLayout(10, 10);
    expect(root._isDirty).toBe(false);
    expect(a._isDirty).toBe(false);
    expect(b._isDirty).toBe(false);
    root.markDirty();
    expect(root._isDirty).toBe(true);
    // Descendants stay clean (no down-propagation from public markDirty).
    expect(a._isDirty).toBe(false);
    expect(b._isDirty).toBe(false);
  });
});

// ─── Measure function ────────────────────────────────────────────────────

describe('Node measure function', () => {
  test('setMeasureFunc stores the callback', () => {
    const n = Node.create();
    const fn: Parameters<typeof n.setMeasureFunc>[0] = (w, _wm, h, _hm) => ({
      width: w,
      height: h,
    });
    n.setMeasureFunc(fn);
    expect(n.measureFunc).toBe(fn);
  });

  test('setMeasureFunc(null) clears the callback', () => {
    const n = Node.create().setMeasureFunc(() => ({ width: 0, height: 0 }));
    n.setMeasureFunc(null);
    expect(n.measureFunc).toBeNull();
  });
});

// ─── calculateLayout (Phase 3b stub) ──────────────────────────────────────

describe('Node.calculateLayout stub', () => {
  test('fills layout with input dimensions', () => {
    const n = Node.create();
    n.calculateLayout(80, 24);
    expect(n.getComputedWidth()).toBe(80);
    expect(n.getComputedHeight()).toBe(24);
    expect(n.getComputedLeft()).toBe(0);
    expect(n.getComputedTop()).toBe(0);
    // Root has no parent — upstream Yoga semantic returns 0 for the
    // "distance from parent's edge" inset on a root node.
    expect(n.getComputedRight()).toBe(0);
    expect(n.getComputedBottom()).toBe(0);
    // The PublicLayout object still carries the right/bottom edge
    // (= left + width), per Yoga C++ spec.
    const layout = n.getComputedLayout();
    expect(layout.right).toBe(80);
    expect(layout.bottom).toBe(24);
  });

  test('getComputedRight/Bottom return parent-relative inset for children', () => {
    // Bug #1.2 regression: getComputedRight used to return
    // `position[2]` (= `ownW` = the right edge in parent coords) which
    // doesn't match upstream Yoga's "distance from parent's right
    // edge" semantic. After the fix, the inset for a child that
    // starts at left=0 with width=20 in a parent of width=100 should
    // be 100 - 0 - 20 = 80.
    const root = Node.create().setWidth(100).setHeight(50);
    const child = Node.create().setWidth(20).setHeight(10);
    root.insertChild(child, 0);
    root.calculateLayout(100, 50);
    // Column default flexDirection: child sits at top=0, left=0.
    expect(child.getComputedLeft()).toBe(0);
    expect(child.getComputedTop()).toBe(0);
    expect(child.getComputedWidth()).toBe(20);
    expect(child.getComputedHeight()).toBe(10);
    // Inset from right edge of parent = 100 - 0 - 20 = 80.
    expect(child.getComputedRight()).toBe(80);
    // Inset from bottom edge of parent = 50 - 0 - 10 = 40.
    expect(child.getComputedBottom()).toBe(40);
    // The PublicLayout object still carries the right/bottom edge
    // (= left + width / top + height) per Yoga C++ spec.
    const layout = child.getComputedLayout();
    expect(layout.right).toBe(20);
    expect(layout.bottom).toBe(10);
  });

  test('sets _hasNewLayout and clears _isDirty', () => {
    const n = Node.create();
    expect(n._hasNewLayout).toBe(false);
    n.calculateLayout(100, 50);
    expect(n._hasNewLayout).toBe(true);
    expect(n._isDirty).toBe(false);
  });

  test('getHasNewLayout reflects the most recent calculate', () => {
    const n = Node.create();
    expect(n.getHasNewLayout()).toBe(false);
    n.calculateLayout(100, 50);
    expect(n.getHasNewLayout()).toBe(true);
  });

  test('recurse: child layouts also get marked new', () => {
    const root = Node.create();
    const a = Node.create().setWidth(100).setHeight(50);
    root.insertChild(a, 0);
    root.calculateLayout(100, 50);
    expect(a.getHasNewLayout()).toBe(true);
    expect(a.getComputedWidth()).toBe(100);
    expect(a.getComputedHeight()).toBe(50);
  });

  test('markLayoutSeen resets _hasNewLayout to false', () => {
    // Bug #3.2: before adding markLayoutSeen, _hasNewLayout was
    // write-only-once-per-pass — the consumer had no way to clear
    // it, so a React reconciler would treat every node as perpetually
    // dirty. After the fix, markLayoutSeen resets the flag.
    const n = Node.create();
    n.calculateLayout(50, 20);
    expect(n.getHasNewLayout()).toBe(true);
    const ret = n.markLayoutSeen();
    expect(ret).toBe(n); // returns this for chaining
    expect(n.getHasNewLayout()).toBe(false);
    expect(n._hasNewLayout).toBe(false);
  });

  test('markLayoutSeen on a child only clears that child (not the whole tree)', () => {
    const root = Node.create();
    const a = Node.create();
    root.insertChild(a, 0);
    root.calculateLayout(50, 20);
    expect(root.getHasNewLayout()).toBe(true);
    expect(a.getHasNewLayout()).toBe(true);
    a.markLayoutSeen();
    expect(a.getHasNewLayout()).toBe(false);
    expect(root.getHasNewLayout()).toBe(true); // root unaffected
  });

  test('style getters (Bug #4.5)', () => {
    // Mechanical getters that read directly from `style`. The set →
    // get round-trip should be a no-op for any field that has a
    // getter.
    const n = Node.create()
      .setWidth(80)
      .setHeight(24)
      .setFlexDirection(FlexDirection.Row)
      .setJustifyContent(Justify.Center)
      .setAlignItems(Align.Stretch)
      .setAlignSelf(Align.Auto)
      .setPositionType(PositionType.Relative)
      .setOverflow(Overflow.Hidden)
      .setFlexGrow(2)
      .setFlexShrink(1)
      .setFlexBasis(30)
      .setMargin(PhysicalEdge.Left, 5)
      .setPadding(PhysicalEdge.Right, 2)
      .setBorder(PhysicalEdge.Top, 1)
      .setPosition(PhysicalEdge.Left, 10);
    expect(rawValue(n.getWidth())).toBe(80);
    expect(rawValue(n.getHeight())).toBe(24);
    expect(n.getFlexDirection()).toBe(FlexDirection.Row);
    expect(n.getJustifyContent()).toBe(Justify.Center);
    expect(n.getAlignItems()).toBe(Align.Stretch);
    expect(n.getAlignSelf()).toBe(Align.Auto);
    expect(n.getPositionType()).toBe(PositionType.Relative);
    expect(n.getOverflow()).toBe(Overflow.Hidden);
    expect(n.getFlexGrow()).toBe(2);
    expect(n.getFlexShrink()).toBe(1);
    expect(rawValue(n.getFlexBasis())).toBe(30);
    expect(rawValue(n.getMargin(PhysicalEdge.Left))).toBe(5);
    expect(rawValue(n.getPadding(PhysicalEdge.Right))).toBe(2);
    expect(rawValue(n.getBorder(PhysicalEdge.Top))).toBe(1);
    expect(rawValue(n.getPosition(PhysicalEdge.Left))).toBe(10);
    expect(n.getDirection()).toBe(Direction.LTR);
  });

  test('display:none children are skipped', () => {
    const root = Node.create();
    const visible = Node.create();
    const hidden = Node.create().setDisplay(Display.None);
    root.insertChild(visible, 0);
    root.insertChild(hidden, 1);

    root.calculateLayout(100, 50);

    expect(visible.getHasNewLayout()).toBe(true);
    expect(hidden.getHasNewLayout()).toBe(false);
  });

  test('calculateLayout accepts the (optional) direction arg', () => {
    const n = Node.create();
    n.calculateLayout(100, 50, Direction.RTL);
    expect(n.getComputedWidth()).toBe(100);
  });
});

// ─── markDirty direction (bug #1.3) ──────────────────────────────────────

describe('Node.markDirty direction', () => {
  test('markDirty propagates UP, not down', () => {
    // Bug #1.3 regression: markDirty used to propagate DOWN to
    // children. After the fix, a single setWidth on a child should
    // dirty the child AND every ancestor — and must NOT dirty
    // unrelated siblings of the ancestor.
    const root = Node.create().setWidth(100).setHeight(50);
    const a = Node.create().setWidth(10).setHeight(10);
    const b = Node.create().setWidth(10).setHeight(10);
    const grandchild = Node.create().setWidth(5).setHeight(5);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    a.insertChild(grandchild, 0);

    // Clear all dirty bits.
    root.calculateLayout(100, 50);
    expect(root._isDirty).toBe(false);
    expect(a._isDirty).toBe(false);
    expect(b._isDirty).toBe(false);
    expect(grandchild._isDirty).toBe(false);

    // Dirty a leaf (grandchild) — should propagate UP to parent (a)
    // and grandparent (root), but NOT to b (unrelated sibling of a).
    grandchild._isDirty = false;
    grandchild.markDirty();
    expect(grandchild._isDirty).toBe(true);
    expect(a._isDirty).toBe(true);
    expect(root._isDirty).toBe(true);
    expect(b._isDirty).toBe(false);
  });

  test('markDirty on a deep node walks the full ancestor chain', () => {
    const root = Node.create().setWidth(100);
    const a = Node.create().setWidth(50);
    const b = Node.create().setWidth(30);
    const c = Node.create().setWidth(10);
    root.insertChild(a, 0);
    a.insertChild(b, 0);
    b.insertChild(c, 0);

    root.calculateLayout(100, 50);
    c.markDirty();
    expect(c._isDirty).toBe(true);
    expect(b._isDirty).toBe(true);
    expect(a._isDirty).toBe(true);
    expect(root._isDirty).toBe(true);
  });

  test('markDirty on a leaf still walks up even when leaf was dirtied externally', () => {
    // Invariant: "dirty node ⇒ all ancestors dirty." If some other
    // code path dirtied the leaf without walking up (e.g., direct
    // assignment `node._isDirty = true`), calling markDirty on the
    // leaf must still mark the ancestors — it can't assume they're
    // already dirty.
    const root = Node.create();
    const child = Node.create();
    root.insertChild(child, 0);
    root.calculateLayout(10, 10);

    // Simulate external code that dirtied child but not root.
    child._isDirty = true;
    root._isDirty = false;

    child.markDirty(); // must walk up and mark root
    expect(root._isDirty).toBe(true);
  });

  test('markDirty is O(depth) not O(1) — no infinite recursion on cycle-free trees', () => {
    // Sanity: 1000-deep tree, mark dirty at the bottom, ancestors all
    // become dirty, no stack overflow.
    const root = Node.create();
    let leaf = root;
    for (let i = 0; i < 1000; i++) {
      const next = Node.create();
      leaf.insertChild(next, 0);
      leaf = next;
    }
    root.calculateLayout(10, 10);
    leaf.markDirty();
    expect(leaf._isDirty).toBe(true);
    expect(root._isDirty).toBe(true);
  });
});

// ─── getComputedLayout ───────────────────────────────────────────────────

describe('Node.getComputedLayout', () => {
  test('returns a snapshot of the public layout', () => {
    const n = Node.create();
    n.calculateLayout(40, 10);
    const layout = n.getComputedLayout();
    expect(layout).toEqual({
      left: 0,
      top: 0,
      right: 40,
      bottom: 10,
      width: 40,
      height: 10,
    });
  });
});

// Suppress unused-import noise from biome (Direction/MeasureMode are re-exported for callers).
const _reExports = { Direction, MeasureMode };
void _reExports;
