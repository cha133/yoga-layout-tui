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
  Overflow,
  PhysicalEdge,
  PositionType,
  Unit,
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
    total += safeResolve(node.style.padding[startKey]!, availableAxis);
    total += safeResolve(node.style.padding[endKey]!, availableAxis);
  }
  // Border: TUI subset doesn't model a separate border enum, but the
  // Style has a border array — we honor it for completeness. TUI users
  // who want a "border" can put a 1-wide box outside.
  if (node._hasBorder) {
    total += safeResolve(node.style.border[startKey]!, availableAxis);
    total += safeResolve(node.style.border[endKey]!, availableAxis);
  }
  return total;
}

/**
 * Start-edge padding+border for one axis (the inset from the parent's
 * edge to the content origin). Children inside the padded parent
 * are placed at `parent_origin + startInset` for their main/cross
 * axis start edge.
 */
function paddingBorderStart(node: Node, axisMain: boolean, availableAxis: number): number {
  if (!node._hasPadding && !node._hasBorder) return 0;
  const startKey = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
  let total = 0;
  if (node._hasPadding) {
    total += safeResolve(node.style.padding[startKey]!, availableAxis);
  }
  if (node._hasBorder) {
    total += safeResolve(node.style.border[startKey]!, availableAxis);
  }
  return total;
}

/**
 * Resolve a Value to a pixel count, treating Undefined / Auto as 0
 * (instead of NaN). NaN would poison the running `total +=` accumulator
 * and zero out the rest of the call.
 *
 * Bug history: a row container with `paddingX: 1` has only padding[Left]
 * and padding[Right] set; padding[Top] / padding[Bottom] stay Undefined.
 * The old `resolveValue()` returns NaN for those, which then propagated
 * through `total +=` and discarded the border contribution on the same
 * edge — leaving the child placed with neither padding nor border offset.
 */
function safeResolve(v: Value, axisSize: number): number {
  const r = resolveValue(v, axisSize);
  return Number.isFinite(r) ? r : 0;
}

// ─── Margin helpers ────────────────────────────────────────────────────────
//
// Margins behave differently from padding: they're INSIDE the parent's
// content box (between the padding ring and the children), so they:
//   - shrink the parent's effective inner size (child has less room)
//   - push the child AWAY from the parent's edge by the margin amount
//   - count toward the line's total main consumption (so siblings don't
//     overlap the margin zone)
//
// We resolve margin per-side (4 physical edges, no Horizontal/Vertical/All
// shortcuts — TUI users set explicit margins). `margin: auto` is resolved
// later by the algorithm itself once it knows the line's free space.

function marginOnEdge(node: Node, edge: PhysicalEdge, ownerSize: number): number {
  const v = node.style.margin[edge]!;
  // Undefined edges default to 0 (margin not set on this side). Auto is
  // also resolved to 0 here; the main loop substitutes autoMainMarginSize
  // (free space split evenly across auto edges) for actual positioning.
  if (v.unit === Unit.Undefined || v.unit === Unit.Auto) return 0;
  const r = resolveValue(v, ownerSize);
  return Number.isFinite(r) ? r : 0;
}

function marginOnAxis(node: Node, axisMain: boolean, ownerAxis: number): number {
  if (!node._hasMargin) return 0;
  const startKey = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
  const endKey = axisMain ? PhysicalEdge.Right : PhysicalEdge.Bottom;
  let total = 0;
  total += marginOnEdge(node, startKey, ownerAxis);
  total += marginOnEdge(node, endKey, ownerAxis);
  return Number.isFinite(total) ? total : 0;
}

function marginStart(node: Node, axisMain: boolean, ownerAxis: number): number {
  if (!node._hasMargin) return 0;
  const startKey = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
  return marginOnEdge(node, startKey, ownerAxis);
}

function marginEnd(node: Node, axisMain: boolean, ownerAxis: number): number {
  if (!node._hasMargin) return 0;
  const endKey = axisMain ? PhysicalEdge.Right : PhysicalEdge.Bottom;
  return marginOnEdge(node, endKey, ownerAxis);
}

function isMarginAutoOnEdge(node: Node, edge: PhysicalEdge): boolean {
  if (!node._hasAutoMargin) return false;
  return node.style.margin[edge]!.unit === Unit.Auto;
}

// ─── STEP 3: compute flex basis for a single child ────────────────────────

/**
 * Recursively check whether `node` or any descendant has a measure
 * function. Used by the basis computation to decide whether to walk
 * the subtree looking for the leaf that owns the intrinsic size, and
 * to gate the AtMost constraint so pure layout subtrees don't get
 * told "you have 100 available" and flex-grow into it.
 */
function hasMeasureFuncInSubtree(node: Node): boolean {
  if (node.measureFunc) return true;
  for (const c of node.children) {
    if (hasMeasureFuncInSubtree(c)) return true;
  }
  return false;
}

/**
 * Walk a subtree to find a measure-func node and return the main-axis
 * intrinsic size it reports. Used when `computeFlexBasisForChild` is
 * called on a non-leaf container that wraps a measure-func leaf
 * somewhere in its subtree — the container's flex basis should be
 * derived from the leaf's intrinsic size, not 0.
 *
 * Walks depth-first; the first measure-func node we hit is asked for
 * its size. If multiple measure-func leaves exist, only the first
 * (document order) contributes. (Multi-measure-func layouts are
 * unusual; this matches the simple behavior the rest of the codebase
 * uses.)
 */
function computeBasisFromMeasureSubtree(
  node: Node,
  availableInnerMain: number,
  axisMain: boolean,
): number {
  if (node.measureFunc) {
    const dim = axisMain ? Dimension.Width : Dimension.Height;
    return measureChild(node, availableInnerMain, axisMain, dim);
  }
  for (const c of node.children) {
    if (hasMeasureFuncInSubtree(c)) {
      const result = computeBasisFromMeasureSubtree(c, availableInnerMain, axisMain);
      if (Number.isFinite(result)) return result;
    }
  }
  return Number.NaN;
}

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

  // (3) measure func — direct on this node, or somewhere in its
  // subtree (recursively). For the direct case, ask the measure func
  // for its intrinsic size on the main axis. For the subtree case
  // (e.g. a Box wrapping a Text leaf), recurse into the subtree to
  // find the measure-func leaf and use its intrinsic size as the
  // wrapper's basis. The recursion matches upstream Yoga's
  // `YGNodeComputeFlexBasisForChild` which recurses through pure
  // layout containers until it reaches a measure-func node.
  if (Number.isNaN(basis)) {
    if (child.measureFunc) {
      const dim = axisMain ? Dimension.Width : Dimension.Height;
      const result = measureChild(child, availableInnerMain, axisMain, dim);
      basis = result;
    } else if (hasMeasureFuncInSubtree(child)) {
      // Find the measure-func leaf (or subtree root with the func)
      // and ask IT for the basis. Recurse so a 3-level
      // `Box > Box > Text` (Text has measureFunc) correctly derives
      // the wrapper box's basis from Text's intrinsic size.
      basis = computeBasisFromMeasureSubtree(child, availableInnerMain, axisMain);
    }
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

/**
 * Recursive layout entry.
 *
 * Positions written to `_layoutResults.position[]` are **local** (relative
 * to the node's immediate parent). This matches upstream Yoga's behavior
 * (`YGNodeLayoutGetLeft/Top` returns relative-to-parent). The root call
 * from `calculateLayout()` has no parent, so the root's local origin is
 * (0, 0). Each child's local position = parent content-origin + padding/
 * border start-inset + main/cross offset. The recursion does not pass
 * absolute coords; consumers that need screen-space positions walk the
 * parent chain (or accumulate offsets through their render walk, like
 * Ink does — see `render-node-to-output.ts:435-438`).
 *
 * `_layoutResults.position[]` is reset to (0, 0) at the top of each call
 * so a stale value from a previous call can never survive.
 */
export function calculateLayoutImpl(
  node: Node,
  availableWidth: number,
  availableHeight: number,
  ownerDirection: Direction,
  widthSizingMode: MeasureMode,
  heightSizingMode: MeasureMode,
  generationCount: number,
): void {
  // ── Cache-key setup (used by measure-func leaves too) ────────────
  const results = node._layoutResults;
  results.generationCount = generationCount;
  results.configVersion = node.config.version;
  results.lastOwnerDirection = ownerDirection;

  // ── Layout cache hit (Bug #2.1 / #2.2) ────────────────────────────
  // Skip the entire layout pass when:
  //   - the node is clean (no descendant changed since the last pass)
  //   - the inputs match what was used for the cached pass
  //     (avail size + sizing mode + generation + config version)
  //   - the cached pass actually produced output (hasLayout flag
  //     distinguishes "first call" from "cached pass with result")
  // On hit, restore the cached (width, height) and return — no
  // recursion, no child placement. Bug #2.2 (output cache): without
  // restoring the cached outputs, a hit would return whatever
  // layout.width/height happened to be left by the previous pass,
  // which can be the intrinsic content height from a measure pass
  // instead of the constrained viewport height (the scrollbox
  // vpH=33→2624 bug).
  if (
    !node._isDirty &&
    results.cachedLayoutOutputs.hasLayout &&
    results.generationCount === generationCount &&
    results.configVersion === node.config.version &&
    results.cachedLayout.availableWidth === availableWidth &&
    results.cachedLayout.availableHeight === availableHeight &&
    results.cachedLayout.widthSizingMode === widthSizingMode &&
    results.cachedLayout.heightSizingMode === heightSizingMode
  ) {
    node.layout.width = results.cachedLayoutOutputs.width;
    node.layout.height = results.cachedLayoutOutputs.height;
    node._hasNewLayout = false; // hit = no new layout to report
    return;
  }

  // NOTE: do NOT reset `results.position[0/1]` here. For the root call,
  // `calculateLayout()` (the public entry) sets them to (0, 0) before
  // invoking us. For non-root nodes, the parent's STEP 6c writes the
  // child's local offset before recursing into us — if we reset to 0
  // here we'd clobber the parent's just-written value.

  // ── Resolve effective flex direction (RTL is identity for TUI) ──
  const effectiveFd = resolveDirection(node.style.flexDirection, ownerDirection);
  const row = isRow(effectiveFd);
  const axisMain = row;

  // ── STEP 1+2: compute inner sizes (after padding + border) ──────
  const availableMain = axisMain ? availableWidth : availableHeight;
  const availableCross = axisMain ? availableHeight : availableWidth;
  const mainMode: MeasureMode = axisMain ? widthSizingMode : heightSizingMode;
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
  // Margins shrink the effective inner main/cross (children have less room
  // to fit). Compute per-child total margin so resolveFlexibleLengths in
  // STEP 5 sees the right available size.
  const childMainMargin: number[] = new Array(visibleChildren.length);
  const childCrossMargin: number[] = new Array(visibleChildren.length);
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]!;
    const mM = marginOnAxis(child, true, availableInnerMain);
    const mC = marginOnAxis(child, false, availableInnerCross);
    childMainMargin[i] = mM;
    childCrossMargin[i] = mC;
  }
  const totalMainMargin = childMainMargin.reduce((a, b) => a + b, 0);
  const totalCrossMargin = childCrossMargin.reduce((a, b) => a + b, 0);
  // Available inner sizes already account for padding/border; subtract
  // margin too so children don't try to fit in a region margins eat into.
  const availableInnerMainForBasis = Number.isFinite(availableInnerMain)
    ? Math.max(0, availableInnerMain - totalMainMargin)
    : Number.NaN;
  const availableInnerCrossForBasis = Number.isFinite(availableInnerCross)
    ? Math.max(0, availableInnerCross - totalCrossMargin)
    : Number.NaN;

  for (const child of visibleChildren) {
    const basis = computeFlexBasisForChild(child, availableInnerMainForBasis, axisMain);
    child._layoutResults.computedFlexBasis = basis;
  }

  // ── STEP 5: resolve flex grow/shrink (single pass) ───────────────
  const gapMain = isDefinedValue(node.style.gap[axisMain ? 1 : 0]!)
    ? resolveValue(node.style.gap[axisMain ? 1 : 0]!, availableInnerMainForBasis)
    : 0;
  // Gap array: gaps BETWEEN items. For N items there are N-1 gaps. For N<=1
  // no gaps. We split gap into a per-gap accumulator.
  const gaps: number[] = [];
  for (let i = 0; i < Math.max(0, visibleChildren.length - 1); i++) {
    gaps.push(gapMain);
  }
  resolveFlexibleLengths(visibleChildren, availableInnerMainForBasis, gaps);

  // ── STEP 6a: compute each child's cross-axis size ────────────────
  // Cross-axis size: use child's own width/height if set, else fall
  // back to availableInnerCross so the child stretches if the container
  // decides to stretch. Measure-func leaves compute their own size
  // later in STEP 6c when we recurse.
  const childCrossSizes: number[] = new Array(visibleChildren.length);
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]!;
    let childCrossSize = computeChildCrossSize(child, availableInnerCrossForBasis, axisMain);
    if (Number.isNaN(childCrossSize)) {
      childCrossSize = availableInnerCross;
    }
    childCrossSizes[i] = childCrossSize;
  }

  // ── STEP 6b: compute line cross size (max of children's cross) ──
  let lineCrossSize = 0;
  for (let i = 0; i < visibleChildren.length; i++) {
    const cross = childCrossSizes[i]!;
    if (Number.isFinite(cross)) lineCrossSize = Math.max(lineCrossSize, cross);
  }
  // Line main size = sum of children's main-axis bases (and gaps).
  // Used by STEP 9 when the parent gave us an undefined main size — the
  // container's own main size should then be "as tall (or wide) as the
  // children stacked along the main axis", not "as wide as the children's
  // cross size". Bug history: column containers with no explicit height
  // collapsed to the children's max width instead of summing their
  // heights, hiding nested content.
  let lineMainSize = 0;
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]!;
    const basis = child._layoutResults.computedFlexBasis;
    if (Number.isFinite(basis)) {
      lineMainSize += basis;
      if (i < gaps.length) lineMainSize += gaps[i]!;
    }
  }

  // Container's effective cross size for alignment purposes:
  // - If availableInnerCross is finite, use it (the container IS that size
  //   when its input is finite, regardless of alignItems).
  // - Otherwise (auto), fall back to lineCrossSize.
  const containerCross = Number.isFinite(availableInnerCross) ? availableInnerCross : lineCrossSize;
  // Track effective line cross (after stretch / explicit container)
  const effectiveLineCross = containerCross;

  // ── Compute main-axis offsets from justifyContent + gaps ─────────
  // `used` includes children's main-axis bases + gaps + their non-auto
  // main-axis margins. Margins are part of a child's consumed main
  // space — siblings must not overlap the margin zone (CSS flex §9.3).
  const mainAxisSize = availableInnerMain;
  let mainCursor = 0;
  let freeSpace = 0;
  if (Number.isFinite(mainAxisSize)) {
    let used = gaps.reduce((a, g) => a + g, 0);
    for (let i = 0; i < visibleChildren.length; i++) {
      const child = visibleChildren[i]!;
      used += child._layoutResults.computedFlexBasis;
      // Only count margins that resolve to a concrete number. Auto
      // margins are absorbed later as flex grow/shrink-like spacing.
      if (child._hasMargin && !child._hasAutoMargin) {
        used += childMainMargin[i]!;
      }
    }
    freeSpace = mainAxisSize - used;
    if (freeSpace < 0) freeSpace = 0; // children overflow; align left
  }

  // margin: auto OVERRIDES justify-content on the main axis — the free
  // space goes to the auto margins instead of being distributed per
  // justifyContent. Count how many auto margin edges exist across all
  // flow children so we can size each one evenly.
  let numAutoMainMargins = 0;
  if (Number.isFinite(mainAxisSize)) {
    for (let i = 0; i < visibleChildren.length; i++) {
      const child = visibleChildren[i]!;
      if (!child._hasAutoMargin) continue;
      const mainLead = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
      const mainTrail = axisMain ? PhysicalEdge.Right : PhysicalEdge.Bottom;
      if (isMarginAutoOnEdge(child, mainLead)) numAutoMainMargins++;
      if (isMarginAutoOnEdge(child, mainTrail)) numAutoMainMargins++;
    }
  }
  const autoMainMarginSize =
    numAutoMainMargins > 0 && freeSpace > 0 ? freeSpace / numAutoMainMargins : 0;

  if (numAutoMainMargins === 0) {
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
  }

  // ── STEP 6c + 7 + 8: position each child, then recurse ───────────
  // Position first (so the child has its correct absolute coords
  // visible when its own grandchildren are processed) and THEN recurse.
  // For measure-func leaves, no recursion — we ask the leaf for its
  // intrinsic size and write position/size directly.
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]!;
    const childMainSize = child._layoutResults.computedFlexBasis;
    const childCrossSize = childCrossSizes[i]!;

    // Resolve this child's margins. Auto margins override the concrete
    // margin value with autoMainMarginSize (the equally-split free space).
    const mainLeadEdge = axisMain ? PhysicalEdge.Left : PhysicalEdge.Top;
    const mainTrailEdge = axisMain ? PhysicalEdge.Right : PhysicalEdge.Bottom;
    const crossLeadEdge = axisMain ? PhysicalEdge.Top : PhysicalEdge.Left;
    const crossTrailEdge = axisMain ? PhysicalEdge.Bottom : PhysicalEdge.Right;
    const autoMainLead = isMarginAutoOnEdge(child, mainLeadEdge);
    const autoMainTrail = isMarginAutoOnEdge(child, mainTrailEdge);
    const autoCrossLead = isMarginAutoOnEdge(child, crossLeadEdge);
    const autoCrossTrail = isMarginAutoOnEdge(child, crossTrailEdge);
    const mMainLead = autoMainLead
      ? autoMainMarginSize
      : marginStart(child, axisMain, availableMain);
    const mMainTrail = autoMainTrail
      ? autoMainMarginSize
      : marginEnd(child, axisMain, availableMain);
    const mCrossLead = autoCrossLead ? 0 : marginStart(child, !axisMain, availableCross);
    const mCrossTrail = autoCrossTrail ? 0 : marginEnd(child, !axisMain, availableCross);

    // Compute cross-axis offset (relative to this node) for alignChild.
    // Cross auto margins override align-items: both → center, one →
    // push to the opposite edge.
    let crossOffset = alignChild(
      child,
      effectiveLineCross,
      Number.isFinite(childCrossSize) ? childCrossSize : 0,
      axisMain,
      node.style.alignItems,
      child.style.alignSelf,
    );
    if (autoCrossLead || autoCrossTrail) {
      const crossFree = Math.max(0, effectiveLineCross - childCrossSize - mCrossLead - mCrossTrail);
      if (autoCrossLead && autoCrossTrail) {
        crossOffset = mCrossLead + crossFree / 2;
      } else if (autoCrossLead) {
        crossOffset = mCrossLead + crossFree;
      }
      // autoCrossTrail only → crossOffset stays at mCrossLead (child pushes to trailing edge)
    }

    // Set the child's local position (relative to its parent) = parent
    // content-origin + start-inset (padding/border) + leading-margin + offset.
    // mainCursor is the pre-margin edge of this child (sibling starts
    // here), mainOffset = mainCursor + mMainLead is the child's actual
    // box edge (after its leading margin).
    const mainOffset = mainCursor + mMainLead;
    const paddingMainStart = paddingBorderStart(node, axisMain, availableMain);
    const paddingCrossStart = paddingBorderStart(node, !axisMain, availableCross);
    // The X-axis position uses the X-axis start inset (main when row,
    // cross when column). The Y-axis position uses the Y-axis start
    // inset (cross when row, main when column). Both axes add the
    // axis-specific offset (mainOffset is the X-axis offset when
    // flexDirection is row, crossOffset is the Y-axis offset).
    const childX =
      (axisMain ? paddingMainStart : paddingCrossStart) + (axisMain ? mainOffset : crossOffset);
    const childY =
      (axisMain ? paddingCrossStart : paddingMainStart) + (axisMain ? crossOffset : mainOffset);
    child._layoutResults.position[0] = childX;
    child._layoutResults.position[1] = childY;

    // Measure-func leaf — ask for intrinsic size, no recursion.
    if (child.measureFunc) {
      const crossAxisAvailable = availableInnerCross;
      const w = axisMain ? childMainSize : crossAxisAvailable;
      const h = axisMain ? crossAxisAvailable : childMainSize;
      const wMode = axisMain ? MeasureMode.Exactly : MeasureMode.AtMost;
      const hMode = axisMain ? MeasureMode.AtMost : MeasureMode.Exactly;
      const result = child.measureFunc(w, wMode, h, hMode);
      child._layoutResults.measuredDimensions = [result.width, result.height];
      if (axisMain) {
        child._layoutResults.computedFlexBasis = result.width;
      } else {
        child._layoutResults.computedFlexBasis = result.height;
      }
      child.layout.left = childX;
      child.layout.top = childY;
      child.layout.width = result.width;
      child.layout.height = result.height;
      child.layout.right = childX + result.width;
      child.layout.bottom = childY + result.height;
      child._layoutResults.position[2] = childX + result.width;
      child._layoutResults.position[3] = childY + result.height;
      child._hasNewLayout = true;
      child._isDirty = false;
      // Advance cursor past this child's trailing margin + next gap.
      mainCursor += mMainLead + child._layoutResults.computedFlexBasis + mMainTrail;
      if (i < gaps.length) mainCursor += gaps[i]!;
      continue;
    }

    const childWidth = axisMain ? childMainSize : childCrossSize;
    const childHeight = axisMain ? childCrossSize : childMainSize;
    // Scroll child gets AtMost on the main axis so the v0.4 Scroll
    // clamp (STEP 9 `isScroll` branch) actually fires inside the
    // child's own layout pass. Without this, Scroll containers only
    // got AtMost from the public `calculateLayoutImpl` root call,
    // which never happens in real usage (public API always passes
    // Exactly). Now a flex parent that gives its Scroll child an
    // exactly-sized slot passes AtMost downstream, letting the child
    // shrink its content to fit if it would otherwise overflow.
    const childMainMode =
      child.style.overflow === Overflow.Scroll ? MeasureMode.AtMost : MeasureMode.Exactly;
    const childCrossMode = MeasureMode.Exactly;
    const childWidthMode = axisMain ? childMainMode : childCrossMode;
    const childHeightMode = axisMain ? childCrossMode : childMainMode;
    calculateLayoutImpl(
      child,
      childWidth,
      childHeight,
      ownerDirection,
      childWidthMode,
      childHeightMode,
      generationCount,
    );

    mainCursor += mMainLead + child._layoutResults.computedFlexBasis + mMainTrail;
    if (i < gaps.length) mainCursor += gaps[i]!;
  }

  // ── STEP 9: determine own final measured size ────────────────────
  // For axisMain (Row): main=X (width), cross=Y (height).
  // For !axisMain (Column): main=Y (height), cross=X (width).
  const paddingCross = paddingBorderOnAxis(node, !axisMain, effectiveLineCross);
  const paddingMain = paddingBorderOnAxis(node, axisMain, availableInnerMain);
  // When the parent gave us a positive main size, the container is
  // exactly that size (with padding added back). When the parent gave
  // us 0 or undefined, the container shrinks to fit its content along
  // the main axis — use lineMainSize (sum of children's main bases +
  // gaps), not lineCrossSize.
  //
  // Bug history: column parents with explicit height were happy
  // (availableInnerMain was positive), but flex containers with no
  // explicit height handed their children 0, which then recursed with
  // 0 height and hid their descendants. The previous code used
  // `Number.isFinite(availableInnerMain) ? availableInnerMain : ...`
  // which accepted 0 as "finite" and left content containers empty.
  //
  // Overflow.Scroll clamping: when the parent asked us for an "at most
  // this big" main size (`mainMode === AtMost`) AND the node has
  // `overflow: scroll`, the main size is `min(viewport, content)` —
  // clamps to the viewport when content overflows, shrinks to fit
  // when content is smaller. The `max(..., paddingMain)` floor
  // preserves the padding ring even when content is 0.
  let ownMainBound =
    availableInnerMain > 0 ? availableInnerMain + paddingMain : lineMainSize + paddingMain;
  if (
    mainMode === MeasureMode.AtMost &&
    node.style.overflow === Overflow.Scroll &&
    Number.isFinite(availableInnerMain)
  ) {
    const viewport = availableInnerMain + paddingMain;
    const content = lineMainSize + paddingMain;
    ownMainBound = Math.max(Math.min(viewport, content), paddingMain);
  }
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
  // For RowReverse / ColumnReverse, the FIRST source child goes at
  // the trailing edge of the main axis, then we walk forward through
  // source order toward the start edge. So the loop iterates i=0..N-1
  // (NOT reverse) but the cursor moves from the trailing edge toward
  // the start edge.
  //
  // We deliberately update only the main-axis component of
  // `position[0/1]`; the cross-axis component was already written by
  // STEP 6c with the correct `paddingCrossStart + crossOffset` value
  // and must NOT be overwritten (the old implementation wiped both
  // axes, which broke cross-axis alignment for reverse containers).
  if (isReverse(effectiveFd)) {
    const paddingMainStart = paddingBorderStart(node, axisMain, availableMain);
    let cursor = availableInnerMain; // trailing edge of content box
    for (let i = 0; i < visibleChildren.length; i++) {
      const child = visibleChildren[i]!;
      // "Start" / "end" refer to the start/end of the main axis
      // (= left/right for row, top/bottom for column), NOT to the
      // box's visual leading/trailing edge in reverse — the physical
      // edges are what marginStart / marginEnd resolve against.
      const mLead = marginStart(child, axisMain, availableMain);
      const mTrail = marginEnd(child, axisMain, availableMain);
      const size = child._layoutResults.computedFlexBasis;
      // Child's leading edge (toward start of box) = cursor (trailing
      // edge of this child's bounding box, after its trailing margin)
      // minus its trailing margin minus its own size.
      const childMainPos = cursor - mTrail - size;
      if (axisMain) {
        child._layoutResults.position[0] = paddingMainStart + childMainPos;
        // position[1] (Y/cross) is left as STEP 6c wrote it.
      } else {
        child._layoutResults.position[1] = paddingMainStart + childMainPos;
        // position[0] (X/cross) is left as STEP 6c wrote it.
      }
      // Advance cursor past this child's leading margin + gap to
      // the next source-order sibling.
      cursor = childMainPos - mLead;
      if (i < visibleChildren.length - 1) {
        cursor -= gaps[i]!;
      }
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

  // ── Cache write (Bug #2.1 / #2.2) ────────────────────────────────
  // Record the inputs that produced this layout pass + the outputs
  // (width, height) for the next cache hit. The output cache is
  // critical: without storing it, a hit on a later pass would return
  // whatever `layout.width/height` happened to be left from a previous
  // measure pass (intrinsic content size), instead of the constrained
  // viewport size we just computed (the scrollbox vpH=33→2624 bug).
  results.cachedLayout.availableWidth = availableWidth;
  results.cachedLayout.availableHeight = availableHeight;
  results.cachedLayout.widthSizingMode = widthSizingMode;
  results.cachedLayout.heightSizingMode = heightSizingMode;
  results.cachedLayout.computedWidth = node.layout.width;
  results.cachedLayout.computedHeight = node.layout.height;
  results.cachedLayoutOutputs.width = node.layout.width;
  results.cachedLayoutOutputs.height = node.layout.height;
  results.cachedLayoutOutputs.hasLayout = true;
}
