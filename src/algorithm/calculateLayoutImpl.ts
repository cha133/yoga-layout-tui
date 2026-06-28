/**
 * Main layout algorithm — ported from upstream `yoga/algorithm/CalculateLayout.cpp`.
 *
 * Implements the 11-STEP Flexbox layout pass for the TUI subset:
 *   - hardcoded flex-wrap = NoWrap (single line, no wrap, no align-content)
 *   - hardcoded box-sizing = BorderBox (no content-box path)
 *   - single-pass flex-grow/shrink distribution (no multi-pass interface)
 *   - LTR only (RTL fallthrough is identity for TUI)
 *
 * Each STEP is its own helper function for clarity and testability.
 * The top-level `calculateLayoutImpl` orchestrates them in order.
 */

import {
  Dimension,
  type Direction,
  Display,
  Justify,
  MeasureMode,
  PhysicalEdge,
  PositionType,
} from '../enums.js';
import type { Node } from '../node/node.js';
import { isDefinedValue, isUndefinedValue, resolveValue, type Value } from '../value.js';
import { layoutAbsoluteChild } from './absoluteLayout.js';
import { alignChild } from './align.js';
import { boundAxis } from './boundAxis.js';
import { isReverse, isRow, resolveDirection } from './flexDirection.js';
import { roundValueToPixelGrid } from './pixelGrid.js';

// ─── STEP 1+2: available inner dimensions ─────────────────────────────────

function paddingBorderOnAxis(node: Node, axisMain: boolean, availableAxis: number): number {
  if (!node._hasPadding && !node._hasBorder) return 0;
  const startKey = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
  const endKey = axisMain ? PhysicalEdge.Right : PhysicalEdge.Bottom;
  let total = 0;
  if (node._hasPadding) {
    total += resolveValue(node.style.padding[startKey]!, availableAxis);
    total += resolveValue(node.style.padding[endKey]!, availableAxis);
  }
  // Border: TUI subset doesn't model a separate border enum, but the
  // Style has a border array — we honor it for completeness. TUI users
  // who want a "border" can put a 1-wide box outside.
  if (node._hasBorder) {
    total += resolveValue(node.style.border[startKey]!, availableAxis);
    total += resolveValue(node.style.border[endKey]!, availableAxis);
  }
  return Number.isFinite(total) ? total : 0;
}

// ─── STEP 3: compute flex basis for a single child ────────────────────────

/**
 * Resolve the main-axis size of a child given the parent's available
 * inner main-axis size.
 *
 * Priority:
 *   1. flexBasis (Point / Percent)
 *   2. width / height (whichever is the child's main axis), if defined
 *   3. 0
 *
 * Then clamped by the child's own min / max for the main axis.
 *
 * Note: this resolves the *basis*, not the final size. STEP 5 grows /
 * shrinks this basis via flex-grow / flex-shrink.
 */
function computeFlexBasisForChild(
  child: Node,
  availableInnerMain: number,
  axisMain: boolean,
): number {
  let basis = Number.NaN;

  // (1) flexBasis
  if (!isUndefinedValue(child.style.flexBasis)) {
    basis = resolveValue(child.style.flexBasis, availableInnerMain);
  }

  // (2) width/height fallback
  if (Number.isNaN(basis)) {
    const candidate: Value = axisMain ? child.style.width : child.style.height;
    if (!isUndefinedValue(candidate)) {
      basis = resolveValue(candidate, availableInnerMain);
    }
  }

  // (3) measure func — if leaf has a measureFunc, give it the available
  // inner main as the size hint. MeasureFunc returns its intrinsic size
  // for that axis; we use it as the basis.
  if (Number.isNaN(basis) && child.measureFunc) {
    const dim = axisMain ? Dimension.Width : Dimension.Height;
    // We don't know the cross axis size yet — pass NaN. MeasureFunc
    // should handle NaN by returning its unconstrained intrinsic size.
    const result = measureChild(child, availableInnerMain, axisMain, dim);
    basis = result;
  }

  if (Number.isNaN(basis)) basis = 0;

  // (4) Apply min/max clamp on the main axis
  const minMain = axisMain
    ? resolveValue(child.style.minWidth, availableInnerMain)
    : resolveValue(child.style.minHeight, availableInnerMain);
  const maxMain = axisMain
    ? resolveValue(child.style.maxWidth, availableInnerMain)
    : resolveValue(child.style.maxHeight, availableInnerMain);
  return boundAxis(minMain, basis, maxMain);
}

/**
 * Call a leaf's measure function and return its main-axis size.
 * If no measure func, returns 0.
 */
function measureChild(
  child: Node,
  availableMain: number,
  axisMain: boolean,
  dim: Dimension,
): number {
  if (!child.measureFunc) return 0;
  // Cross-axis size isn't known yet; pass NaN to mean "any". Width/height
  // MeasureMode is AtMost — measureFunc must return <= available size.
  const widthMode =
    axisMain && Number.isFinite(availableMain) ? MeasureMode.AtMost : MeasureMode.Undefined;
  const heightMode =
    !axisMain && Number.isFinite(availableMain) ? MeasureMode.AtMost : MeasureMode.Undefined;
  const w = axisMain ? availableMain : Number.NaN;
  const h = !axisMain ? availableMain : Number.NaN;
  const result = child.measureFunc(w, widthMode, h, heightMode);
  return dim === Dimension.Width ? result.width : result.height;
}

// ─── STEP 5: resolve flexible lengths (single-pass grow/shrink) ───────────

/**
 * Distribute remaining main-axis space via flex-grow (positive free space)
 * or absorb via flex-shrink (negative free space). Single pass — matches
 * claude-code's simplified behavior. Upstream Yoga sometimes does two
 * passes for spec-conformance; we skip that.
 *
 * `gaps` is the per-item spacing to subtract from available space.
 */
function resolveFlexibleLengths(items: Node[], availableInnerMain: number, gaps: number[]): void {
  if (!Number.isFinite(availableInnerMain)) return;
  if (items.length === 0) return;

  // Total used by bases + gaps
  const totalGap = gaps.reduce((acc, g) => acc + g, 0);
  let usedSpace = totalGap;
  for (const item of items) {
    usedSpace += item._layoutResults.computedFlexBasis;
  }

  const freeSpace = availableInnerMain - usedSpace;

  if (freeSpace > 0) {
    // Grow: distribute proportional to flexGrow
    let totalGrow = 0;
    for (const item of items) {
      totalGrow += item.style.flexGrow;
    }
    if (totalGrow > 0) {
      for (const item of items) {
        const ratio = item.style.flexGrow / totalGrow;
        item._layoutResults.computedFlexBasis += freeSpace * ratio;
      }
    } else {
      // No grow defined; if container is wider than content, leave items
      // alone — they'll be positioned by justifyContent in STEP 7.
    }
  } else if (freeSpace < 0) {
    // Shrink: weighted by flexShrink * basis (matches CSS spec)
    let totalWeighted = 0;
    for (const item of items) {
      totalWeighted += item.style.flexShrink * item._layoutResults.computedFlexBasis;
    }
    if (totalWeighted > 0) {
      for (const item of items) {
        const weight = item.style.flexShrink * item._layoutResults.computedFlexBasis;
        const ratio = weight / totalWeighted;
        item._layoutResults.computedFlexBasis += freeSpace * ratio; // freeSpace is negative
      }
    }
    // Clamp each item to its min — if shrinking made it negative, set to 0
    for (const item of items) {
      if (item._layoutResults.computedFlexBasis < 0) {
        item._layoutResults.computedFlexBasis = 0;
      }
    }
  }
}

// ─── STEP 7 helpers: compute child cross-axis size ────────────────────────

/**
 * Determine the child's cross-axis size before recursion. If the child
 * has a fixed cross size (width for column, height for row), use it.
 * Otherwise, leave for the recursion (measure func / recursion will
 * fill it in).
 */
function computeChildCrossSize(
  child: Node,
  availableInnerCross: number,
  axisMain: boolean,
): number {
  const crossValue: Value = axisMain ? child.style.height : child.style.width;
  if (!isUndefinedValue(crossValue)) {
    return resolveValue(crossValue, availableInnerCross);
  }
  return Number.NaN; // signal: defer to recursion
}

// ─── Main entry ───────────────────────────────────────────────────────────

export function calculateLayoutImpl(
  node: Node,
  availableWidth: number,
  availableHeight: number,
  ownerDirection: Direction,
  _widthSizingMode: MeasureMode,
  _heightSizingMode: MeasureMode,
  generationCount: number,
): void {
  // ── Cache-key setup (used by measure-func leaves too) ────────────
  const results = node._layoutResults;
  results.generationCount = generationCount;
  results.configVersion = node.config.version;
  results.lastOwnerDirection = ownerDirection;

  // ── Layout-pass cache check (single-slot, lazy) ───────────────────
  // Skip for simplicity: full Yoga has a sophisticated 8-slot measure
  // cache. For TUI trees (small), invalidation by generation counter
  // on every public call is sufficient.

  // ── Resolve effective flex direction (RTL is identity for TUI) ──
  const effectiveFd = resolveDirection(node.style.flexDirection, ownerDirection);
  const row = isRow(effectiveFd);
  const axisMain = row;

  // ── STEP 1+2: compute inner sizes (after padding + border) ──────
  const availableMain = axisMain ? availableWidth : availableHeight;
  const availableCross = axisMain ? availableHeight : availableWidth;
  const availableInnerMain = Number.isFinite(availableMain)
    ? Math.max(0, availableMain - paddingBorderOnAxis(node, axisMain, availableMain))
    : Number.NaN;
  const availableInnerCross = Number.isFinite(availableCross)
    ? Math.max(0, availableCross - paddingBorderOnAxis(node, !axisMain, availableCross))
    : Number.NaN;

  // ── Visible children (skip display:none) ─────────────────────────
  const visibleChildren: Node[] = [];
  for (const c of node.children) {
    if (c.style.display !== Display.None) visibleChildren.push(c);
  }

  // ── STEP 3: compute flex basis for each child ────────────────────
  for (const child of visibleChildren) {
    const basis = computeFlexBasisForChild(child, availableInnerMain, axisMain);
    child._layoutResults.computedFlexBasis = basis;
  }

  // ── STEP 5: resolve flex grow/shrink (single pass) ───────────────
  const gapMain = isDefinedValue(node.style.gap[axisMain ? 1 : 0]!)
    ? resolveValue(node.style.gap[axisMain ? 1 : 0]!, availableInnerMain)
    : 0;
  // Gap array: gaps BETWEEN items. For N items there are N-1 gaps. For N<=1
  // no gaps. We split gap into a per-gap accumulator.
  const gaps: number[] = [];
  for (let i = 0; i < Math.max(0, visibleChildren.length - 1); i++) {
    gaps.push(gapMain);
  }
  resolveFlexibleLengths(visibleChildren, availableInnerMain, gaps);

  // ── STEP 6: determine each child's cross size + STEP 11 entry ────
  // For each child, we know its main-axis size (from computedFlexBasis).
  // Cross-axis size: use child's own width/height if set, else pass
  // availableInnerCross and let recursion handle it.
  for (const child of visibleChildren) {
    const childMainSize = child._layoutResults.computedFlexBasis;

    // Measure-func leaf: ask it for its intrinsic size in one call.
    // We pass the cross-axis available size so the leaf can choose to
    // fill it (e.g., a text node that wraps).
    if (child.measureFunc) {
      const crossAxisAvailable = availableInnerCross;
      const w = axisMain ? childMainSize : crossAxisAvailable;
      const h = axisMain ? crossAxisAvailable : childMainSize;
      const wMode = axisMain ? MeasureMode.Exactly : MeasureMode.AtMost;
      const hMode = axisMain ? MeasureMode.AtMost : MeasureMode.Exactly;
      const result = child.measureFunc(w, wMode, h, hMode);
      // Use the leaf's measured size (it's the source of truth for text).
      child._layoutResults.measuredDimensions = [result.width, result.height];
      // Override the main-axis basis too in case measureFunc returned a different value.
      if (axisMain) {
        child._layoutResults.computedFlexBasis = result.width;
      } else {
        child._layoutResults.computedFlexBasis = result.height;
      }
      // Set the public layout view (normally done by the recursion,
      // which we skip for measure-func leaves).
      child.layout.left = 0;
      child.layout.top = 0;
      child.layout.width = result.width;
      child.layout.height = result.height;
      child.layout.right = result.width;
      child.layout.bottom = result.height;
      child._layoutResults.position[2] = result.width;
      child._layoutResults.position[3] = result.height;
      child._hasNewLayout = true;
      child._isDirty = false;
      continue;
    }

    let childCrossSize = computeChildCrossSize(child, availableInnerCross, axisMain);
    if (Number.isNaN(childCrossSize)) {
      // No fixed cross, no measure func. Fall back to availableInnerCross
      // so the child stretches if the container decides to stretch.
      childCrossSize = availableInnerCross;
    }

    const childWidth = axisMain ? childMainSize : childCrossSize;
    const childHeight = axisMain ? childCrossSize : childMainSize;
    calculateLayoutImpl(
      child,
      childWidth,
      childHeight,
      ownerDirection,
      MeasureMode.Exactly,
      MeasureMode.Exactly,
      generationCount,
    );
  }

  // ── STEP 7: align children along cross axis ────────────────────
  // Compute the line's cross size first (max of children).
  let lineCrossSize = 0;
  for (const child of visibleChildren) {
    const childCross = axisMain
      ? child._layoutResults.measuredDimensions[1]
      : child._layoutResults.measuredDimensions[0];
    lineCrossSize = Math.max(lineCrossSize, childCross);
  }

  // Container's effective cross size for alignment purposes:
  // - If availableInnerCross is finite, use it (the container IS that size
  //   when its input is finite, regardless of alignItems).
  // - Otherwise (auto), fall back to lineCrossSize.
  const containerCross = Number.isFinite(availableInnerCross) ? availableInnerCross : lineCrossSize;
  // Track effective line cross (after stretch / explicit container)
  const effectiveLineCross = containerCross;

  // Compute main-axis offsets from justifyContent + gaps.
  const mainAxisSize = availableInnerMain;
  let mainCursor = 0;
  let freeSpace = 0;
  if (Number.isFinite(mainAxisSize)) {
    let used = gaps.reduce((a, g) => a + g, 0);
    for (const child of visibleChildren) used += child._layoutResults.computedFlexBasis;
    freeSpace = mainAxisSize - used;
    if (freeSpace < 0) freeSpace = 0; // children overflow; align left
  }
  switch (node.style.justifyContent) {
    case Justify.Center:
      mainCursor = freeSpace / 2;
      break;
    case Justify.FlexEnd:
      mainCursor = freeSpace;
      break;
    case Justify.SpaceBetween:
      if (visibleChildren.length > 1 && freeSpace > 0) {
        const betweenGap = freeSpace / (visibleChildren.length - 1);
        const newGaps: number[] = [];
        for (let i = 0; i < Math.max(0, visibleChildren.length - 1); i++) {
          newGaps.push(gapMain + betweenGap);
        }
        gaps.length = 0;
        gaps.push(...newGaps);
      }
      break;
    default:
      mainCursor = 0;
      break;
  }

  // Now position each child and align cross-axis.
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]!;
    // Apply cross-axis align (this sets child._layoutResults.position[1] or [0])
    const childCross = axisMain
      ? child._layoutResults.measuredDimensions[1]
      : child._layoutResults.measuredDimensions[0];

    alignChild(
      child,
      effectiveLineCross,
      childCross,
      axisMain,
      node.style.alignItems,
      child.style.alignSelf,
    );

    // Add main-axis offset
    const mainOffset = mainCursor;
    if (axisMain) {
      child._layoutResults.position[0] += mainOffset; // Left
    } else {
      child._layoutResults.position[1] += mainOffset; // Top
    }
    mainCursor += child._layoutResults.computedFlexBasis;
    if (i < gaps.length) mainCursor += gaps[i]!;
  }

  // ── STEP 9: determine own final measured size ────────────────────
  // For axisMain (Row): main=X (width), cross=Y (height).
  // For !axisMain (Column): main=Y (height), cross=X (width).
  const paddingCross = paddingBorderOnAxis(node, !axisMain, effectiveLineCross);
  const paddingMain = paddingBorderOnAxis(node, axisMain, availableInnerMain);
  const ownMainBound = Number.isFinite(availableInnerMain)
    ? availableInnerMain + paddingMain
    : effectiveLineCross + paddingCross; // fallback when undefined
  const ownCrossBound = effectiveLineCross + paddingCross;

  let ownW: number;
  let ownH: number;
  if (axisMain) {
    ownW = ownMainBound;
    ownH = ownCrossBound;
  } else {
    ownW = ownCrossBound;
    ownH = ownMainBound;
  }

  const minW = resolveValue(node.style.minWidth, availableWidth);
  const maxW = resolveValue(node.style.maxWidth, availableWidth);
  const minH = resolveValue(node.style.minHeight, availableHeight);
  const maxH = resolveValue(node.style.maxHeight, availableHeight);

  ownW = boundAxis(minW, ownW, maxW);
  ownH = boundAxis(minH, ownH, maxH);

  results.measuredDimensions = [ownW, ownH];

  // ── STEP 10: reverse-direction placement ─────────────────────────
  // For RowReverse / ColumnReverse, walk children in reverse source order
  // and place them from the start edge. This matches CSS Flexbox semantics
  // where row-reverse lays out children in reverse source order from the
  // start edge.
  if (isReverse(effectiveFd)) {
    let pos = 0;
    for (let i = visibleChildren.length - 1; i >= 0; i--) {
      const child = visibleChildren[i]!;
      if (axisMain) {
        child._layoutResults.position[0] = pos;
      } else {
        child._layoutResults.position[1] = pos;
      }
      pos += child._layoutResults.computedFlexBasis;
    }
  }

  // ── Update public layout view ────────────────────────────────────
  node.layout.left = 0;
  node.layout.top = 0;
  node.layout.width = ownW;
  node.layout.height = ownH;
  node.layout.right = ownW;
  node.layout.bottom = ownH;
  // Set position[2] (Right edge) and position[3] (Bottom edge) so that
  // getComputedRight / getComputedBottom return correct values.
  node._layoutResults.position[2] = ownW;
  node._layoutResults.position[3] = ownH;
  node._hasNewLayout = true;
  node._isDirty = false;

  // ── STEP 11: layout absolute children ────────────────────────────
  for (const child of node.children) {
    if (child.style.positionType === PositionType.Absolute) {
      layoutAbsoluteChild(
        child,
        availableInnerMain,
        availableInnerCross,
        axisMain,
        ownerDirection,
        generationCount,
      );
    }
  }

  // Round final dimensions to pixel grid (no-op for TUI default).
  const psf = node.config.pointScaleFactor;
  node.layout.left = roundValueToPixelGrid(node.layout.left, psf);
  node.layout.top = roundValueToPixelGrid(node.layout.top, psf);
  node.layout.right = roundValueToPixelGrid(node.layout.right, psf);
  node.layout.bottom = roundValueToPixelGrid(node.layout.bottom, psf);
  node.layout.width = roundValueToPixelGrid(node.layout.width, psf);
  node.layout.height = roundValueToPixelGrid(node.layout.height, psf);
  results.measuredDimensions[0] = roundValueToPixelGrid(ownW, psf);
  results.measuredDimensions[1] = roundValueToPixelGrid(ownH, psf);
}
