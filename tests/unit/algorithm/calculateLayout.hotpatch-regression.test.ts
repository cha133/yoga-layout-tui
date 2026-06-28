/**
 * Regression tests for the 4 hot-patches applied by retty-ui v0.3 integration
 * (see `C:\Dev\yoga-layout-tui\.claude\95-retty-ui-v0.3-integration.md`).
 *
 * Why these tests exist: each hot-patch was applied to fix a real bug, but
 * none of the original 12 e2e fixtures exercised the patched code path.
 * These tests pin down the behavior so any future refactor that accidentally
 * drops the helper / accumulator / fallback condition will fail loudly.
 *
 * Patch index (matches 95 doc §2.1):
 *   1. `safeResolve` — Undefined→0 in padding/border accumulator
 *   2. `lineMainSize` accumulator — sum of children main-axis bases + gaps
 *   3. STEP 9 fallback `> 0` instead of `Number.isFinite()` — treat literal 0
 *      height/width like NaN for auto-sized containers
 *   4. `childAbsX/Y` padding direction — main-axis padding start for X-axis,
 *      cross-axis padding start for Y-axis (regardless of flex direction)
 *
 * Strategy: one test per patch. Tests are minimal — they only assert the
 * property the patch protects, not the full layout.
 *
 * Note: `Node.create()` defaults flexDirection to Column. Tests that need
 * row direction MUST call `setFlexDirection(FlexDirection.Row)` explicitly.
 *
 * Note: `PhysicalEdge` enum order is Left=0, Top=1, Right=2, Bottom=3
 * (column-major, matching CSS writing-mode logic). This test file uses the
 * `PhysicalEdge.X` constants for clarity.
 */

import { describe, expect, test } from 'bun:test';
import { FlexDirection, PhysicalEdge } from '../../../src/enums.js';
import { Node } from '../../../src/node/node.js';

describe('hot-patch #1: safeResolve padding/border accumulator', () => {
  test('row container with paddingX only (Top/Bottom Undefined) plus border[Top] keeps both axes computable', () => {
    // Row container: padding Left + Right set, padding Top + Bottom stay Undefined.
    // border[Top] = 2 means cross-axis sum needs 0 + 0 + 2 + 0 = 2.
    // Without `safeResolve`, padding[Top]/[Bottom] resolve to NaN, the running
    // total becomes NaN, and the entire container's cross axis collapses to NaN.
    const root = Node.create()
      .setWidth(20)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setPadding(PhysicalEdge.Left, 1)
      .setPadding(PhysicalEdge.Right, 1)
      .setBorder(PhysicalEdge.Top, 2);
    const child = Node.create().setWidth(5).setHeight(4);
    root.insertChild(child, 0);
    root.calculateLayout(20, 10);
    // Container respects explicit size — both axes finite (no NaN poisoning).
    expect(root.getComputedWidth()).toBe(20);
    expect(root.getComputedHeight()).toBe(10);
    // Child position must be finite too.
    expect(Number.isFinite(child.getComputedLeft())).toBe(true);
    expect(Number.isFinite(child.getComputedTop())).toBe(true);
  });

  test('paddingBorderStart for cross axis does not poison when main-axis padding only is set', () => {
    // Only Left padding set (3). Row container.
    const root = Node.create()
      .setWidth(10)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setPadding(PhysicalEdge.Left, 3);
    const child = Node.create().setWidth(4).setHeight(4);
    root.insertChild(child, 0);
    root.calculateLayout(10, 10);
    // Without safeResolve, child position would be NaN. With it: at (3, 0).
    expect(child.getComputedLeft()).toBe(3);
    expect(child.getComputedTop()).toBe(0);
  });
});

describe('hot-patch #2: lineMainSize accumulator + STEP 9 fallback', () => {
  test('column container without explicit height shrinks to children main-axis sum, not cross-axis max', () => {
    // No `setHeight` → availableMain = NaN. STEP 9 fallback must use
    // lineMainSize (sum of children main-axis bases + gaps), NOT the previous
    // buggy fallback that used `effectiveLineCross` (max child cross).
    //
    // Setup: column root (default direction), one child 10 wide × 5 tall.
    // Without patch #2, root height would collapse to `lineCrossSize = 10`
    // (= child's width), making the container taller than its content along
    // the wrong axis.
    const root = Node.create().setWidth(20); // no setHeight, default Column
    const child = Node.create().setWidth(10).setHeight(5);
    root.insertChild(child, 0);
    root.calculateLayout(20, Number.NaN);
    expect(root.getComputedHeight()).toBe(5); // child main-axis basis
    expect(root.getComputedWidth()).toBe(20); // explicit
    expect(child.getComputedHeight()).toBe(5);
  });

  test('row container without explicit width uses lineMainSize sum', () => {
    // Symmetric case: row root, no width, two children with widths 3 and 4.
    const root = Node.create().setHeight(10).setFlexDirection(FlexDirection.Row); // no setWidth
    const a = Node.create().setWidth(3).setHeight(10);
    const b = Node.create().setWidth(4).setHeight(10);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(Number.NaN, 10);
    expect(root.getComputedWidth()).toBe(7); // 3 + 4 (no gap)
  });

  test('column gaps are included in lineMainSize sum', () => {
    // 3 column children 5-tall with 1-gap → lineMainSize = 5+1+5+1+5 = 17
    const root = Node.create().setWidth(10).setGap(1); // no setHeight, default Column
    const a = Node.create().setWidth(10).setHeight(5);
    const b = Node.create().setWidth(10).setHeight(5);
    const c = Node.create().setWidth(10).setHeight(5);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.insertChild(c, 2);
    root.calculateLayout(10, Number.NaN);
    expect(root.getComputedHeight()).toBe(17);
  });
});

describe('hot-patch #3: STEP 9 fallback `> 0` (treats literal 0 like NaN)', () => {
  test('column container with height=0 still gives flex children visible space', () => {
    // Explicit `setHeight(0)` would, without patch #3, pass
    // `Number.isFinite(0) === true` check, and ownMainBound would compute
    // 0 + padding = padding, collapsing the container. Flex children would
    // be hidden.
    const root = Node.create().setWidth(20).setHeight(0); // default Column
    const child = Node.create().setWidth(20).setHeight(3);
    root.insertChild(child, 0);
    root.calculateLayout(20, 0);
    // lineMainSize fallback engages → container fits child height (3).
    expect(root.getComputedHeight()).toBeGreaterThan(0);
    expect(child.getComputedHeight()).toBeGreaterThan(0);
  });

  test('row container with width=0 still gives flex children visible space', () => {
    // Symmetric: row root with explicit width=0.
    const root = Node.create().setWidth(0).setHeight(10).setFlexDirection(FlexDirection.Row);
    const child = Node.create().setWidth(4).setHeight(10);
    root.insertChild(child, 0);
    root.calculateLayout(0, 10);
    expect(root.getComputedWidth()).toBeGreaterThan(0);
    expect(child.getComputedWidth()).toBeGreaterThan(0);
  });
});

describe('hot-patch #4: childAbsX/Y padding direction', () => {
  test('row container: child X uses paddingLeft (main-axis start), Y uses paddingTop (cross-axis start)', () => {
    // paddingLeft=2, paddingTop=3 — child should land at (2, 3).
    const root = Node.create()
      .setWidth(10)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setPadding(PhysicalEdge.Left, 2)
      .setPadding(PhysicalEdge.Top, 3);
    const child = Node.create().setWidth(4).setHeight(4);
    root.insertChild(child, 0);
    root.calculateLayout(10, 10);
    expect(child.getComputedLeft()).toBe(2); // paddingLeft
    expect(child.getComputedTop()).toBe(3); // paddingTop
  });

  test('column container: child Y uses paddingTop (main-axis start), X uses paddingLeft (cross-axis start)', () => {
    // For column (default), main axis = Y (Top/Bottom). Cross axis = X (Left/Right).
    // paddingTop=2 (main), paddingLeft=3 (cross). Child should land at (3, 2).
    const root = Node.create()
      .setWidth(10)
      .setHeight(10)
      .setPadding(PhysicalEdge.Top, 2)
      .setPadding(PhysicalEdge.Left, 3);
    const child = Node.create().setWidth(4).setHeight(4);
    root.insertChild(child, 0);
    root.calculateLayout(10, 10);
    expect(child.getComputedLeft()).toBe(3); // paddingLeft (cross-axis start for X)
    expect(child.getComputedTop()).toBe(2); // paddingTop (main-axis start for Y)
  });

  test('row container: second sibling lands at paddingLeft + firstSiblingWidth', () => {
    // Distinguishes the patch from the alternative reading where X-offset
    // would use cross-axis padding start (wrong: that would pick paddingTop).
    const root = Node.create()
      .setWidth(20)
      .setHeight(10)
      .setFlexDirection(FlexDirection.Row)
      .setPadding(PhysicalEdge.Left, 5)
      .setPadding(PhysicalEdge.Top, 7); // paddingTop unrelated to X positioning
    const a = Node.create().setWidth(4).setHeight(4);
    const b = Node.create().setWidth(4).setHeight(4);
    root.insertChild(a, 0);
    root.insertChild(b, 1);
    root.calculateLayout(20, 10);
    expect(a.getComputedLeft()).toBe(5); // paddingLeft
    expect(a.getComputedTop()).toBe(7); // paddingTop
    expect(b.getComputedLeft()).toBe(9); // paddingLeft + a.width = 5 + 4
    expect(b.getComputedTop()).toBe(7); // paddingTop
  });
});
