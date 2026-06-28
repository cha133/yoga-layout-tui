import { describe, expect, test } from 'bun:test';
import { Config } from '../../../src/config/config.js';
import {
  Align,
  Direction,
  Display,
  FlexDirection,
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

  test('invalid percent string throws', () => {
    const n = Node.create();
    expect(() => n.setWidth('not-a-number%' as `${number}%`)).toThrow();
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

  test('markDirty cascades to descendants but skips already-dirty ones', () => {
    const root = Node.create();
    const a = Node.create();
    const b = Node.create();
    root.insertChild(a, 0);
    a.insertChild(b, 0);
    root._isDirty = false;
    a._isDirty = false;
    b._isDirty = false;
    root.markDirty();
    expect(root._isDirty).toBe(true);
    expect(a._isDirty).toBe(true);
    expect(b._isDirty).toBe(true);
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
    expect(n.getComputedRight()).toBe(80);
    expect(n.getComputedBottom()).toBe(24);
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
