/**
 * Node — the core layout primitive. Each Node owns a Style (input) and
 * a Layout (output) plus per-pass scratch (`_layoutResults`) and
 * hot-path flags (the `_hasX` booleans the algorithm reads instead of
 * scanning arrays).
 *
 * Algorithm-as-free-function + thin-Node hybrid (claude-code pattern):
 * the algorithm lives in `src/algorithm/calculateLayout*` and receives
 * a Node as its first argument. Node itself is data + setters + tree
 * operations; it does NOT do any layout math itself.
 *
 * TUI subset: no errata / experimental gating code; no errata paths to
 * trace through. The algorithm runs the same code path every time.
 */

import { calculateLayout as calculateLayoutAlgorithm } from '../algorithm/calculateLayout.js';
import { Config } from '../config/config.js';
import type {
  Align,
  Direction,
  Display,
  FlexDirection,
  Justify,
  MeasureMode,
  Overflow,
  PhysicalEdge,
  PositionType,
} from '../enums.js';
import { type DimensionInput, parseDimensionInput } from '../value.js';
import { LayoutResults } from './layoutResults.js';
import { createDefaultStyle, type Style } from './style.js';

/** Output layout — read-only view of computed position + size. */
export interface PublicLayout {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Measure callback for leaf nodes that own their intrinsic size.
 * Mirrors upstream Yoga's `YGMeasureFunc`.
 */
export type MeasureFunction = (
  availableWidth: number,
  widthMode: MeasureMode,
  availableHeight: number,
  heightMode: MeasureMode,
) => { width: number; height: number };

/** Edge index for setMargin / setPadding / setBorder / setPosition. */
export type EdgeInput = PhysicalEdge;

// ─── Public class ─────────────────────────────────────────────────────────

export class Node {
  // `style` is non-readonly so `free()` and `reset()` can re-bind it
  // to a fresh default-style object. Consumers should still treat it
  // as a black box (mutate via setters, don't reassign from outside).
  style: Style;
  readonly layout: PublicLayout;
  readonly config: Config;
  children: Node[] = [];
  parent: Node | null = null;
  measureFunc: MeasureFunction | null = null;

  // Hot-path flags — the algorithm reads these instead of scanning
  // margin/padding/border/position arrays for "is anything non-zero".
  // Maintained by the relevant setters.
  _isDirty: boolean = true;
  _hasNewLayout: boolean = false;
  _hasAutoMargin: boolean = false;
  _hasPadding: boolean = false;
  _hasBorder: boolean = false;
  _hasMargin: boolean = false;
  _hasPosition: boolean = false;

  // Per-pass scratch + cached measurements. Mutated by the algorithm.
  _layoutResults: LayoutResults = new LayoutResults();

  private constructor(config: Config) {
    this.config = config;
    this.style = createDefaultStyle();
    this.layout = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }

  // ─── Factory (matches yoga-layout/load API surface) ─────────────────

  static create(config?: Config): Node {
    return new Node(config ?? Config.create());
  }

  static createDefault(): Node {
    return new Node(Config.create());
  }

  static createWithConfig(config: Config): Node {
    return new Node(config);
  }

  /**
   * TUI subset: no native handles, the JS GC reclaims the Node once
   * callers drop their reference. Exists only for API-shape parity.
   */
  static destroy(node: Node): void {
    node.free();
  }

  // ─── Dimension setters ────────────────────────────────────────────────

  setWidth(v: DimensionInput): this {
    this.style.width = parseDimensionInput(v);
    this._markDirtyWithMargins();
    return this;
  }

  setHeight(v: DimensionInput): this {
    this.style.height = parseDimensionInput(v);
    this._markDirtyWithMargins();
    return this;
  }

  setMinWidth(v: DimensionInput): this {
    this.style.minWidth = parseDimensionInput(v);
    this._isDirty = true;
    return this;
  }

  setMinHeight(v: DimensionInput): this {
    this.style.minHeight = parseDimensionInput(v);
    this._isDirty = true;
    return this;
  }

  setMaxWidth(v: DimensionInput): this {
    this.style.maxWidth = parseDimensionInput(v);
    this._isDirty = true;
    return this;
  }

  setMaxHeight(v: DimensionInput): this {
    this.style.maxHeight = parseDimensionInput(v);
    this._isDirty = true;
    return this;
  }

  // ─── Container setters ───────────────────────────────────────────────

  setFlexDirection(d: FlexDirection): this {
    if (this.style.flexDirection === d) return this;
    this.style.flexDirection = d;
    this._isDirty = true;
    return this;
  }

  setJustifyContent(j: Justify): this {
    this.style.justifyContent = j;
    this._isDirty = true;
    return this;
  }

  setAlignItems(a: Align): this {
    this.style.alignItems = a;
    this._isDirty = true;
    return this;
  }

  setAlignSelf(a: Align): this {
    this.style.alignSelf = a;
    this._isDirty = true;
    return this;
  }

  setDisplay(d: Display): this {
    this.style.display = d;
    this._isDirty = true;
    return this;
  }

  setPositionType(t: PositionType): this {
    this.style.positionType = t;
    this._isDirty = true;
    return this;
  }

  setOverflow(o: Overflow): this {
    this.style.overflow = o;
    this._isDirty = true;
    return this;
  }

  // ─── Flex item setters ────────────────────────────────────────────────

  setFlexGrow(n: number): this {
    this.style.flexGrow = n;
    this._isDirty = true;
    return this;
  }

  setFlexShrink(n: number): this {
    this.style.flexShrink = n;
    this._isDirty = true;
    return this;
  }

  setFlexBasis(v: DimensionInput): this {
    this.style.flexBasis = parseDimensionInput(v);
    this._isDirty = true;
    return this;
  }

  // ─── Edge insets ─────────────────────────────────────────────────────

  setMargin(edge: EdgeInput, v: DimensionInput): this {
    this.style.margin[edge] = parseDimensionInput(v);
    this._hasMargin = true;
    this._hasAutoMargin = this._hasAutoMargin || v === 'auto';
    this._isDirty = true;
    return this;
  }

  setPadding(edge: EdgeInput, v: DimensionInput): this {
    this.style.padding[edge] = parseDimensionInput(v);
    this._hasPadding = true;
    this._isDirty = true;
    return this;
  }

  setBorder(edge: EdgeInput, v: DimensionInput): this {
    this.style.border[edge] = parseDimensionInput(v);
    this._hasBorder = true;
    this._isDirty = true;
    return this;
  }

  setPosition(edge: EdgeInput, v: DimensionInput): this {
    this.style.position[edge] = parseDimensionInput(v);
    this._hasPosition = true;
    this._isDirty = true;
    return this;
  }

  /** Convenience: set all four margin edges at once. */
  setMarginAll(v: DimensionInput): this {
    const parsed = parseDimensionInput(v);
    for (const edge of [0, 1, 2, 3] as const) {
      this.style.margin[edge] = parsed;
    }
    this._hasMargin = true;
    this._hasAutoMargin = this._hasAutoMargin || v === 'auto';
    this._isDirty = true;
    return this;
  }

  setPaddingAll(v: DimensionInput): this {
    const parsed = parseDimensionInput(v);
    for (const edge of [0, 1, 2, 3] as const) {
      this.style.padding[edge] = parsed;
    }
    this._hasPadding = true;
    this._isDirty = true;
    return this;
  }

  setBorderAll(v: DimensionInput): this {
    const parsed = parseDimensionInput(v);
    for (const edge of [0, 1, 2, 3] as const) {
      this.style.border[edge] = parsed;
    }
    this._hasBorder = true;
    this._isDirty = true;
    return this;
  }

  /**
   * Gap between items on each axis.
   *
   * `setGap(rowGap)` → both axes equal `rowGap`.
   * `setGap(rowGap, columnGap)` → row = `rowGap`, column = `columnGap`.
   *
   * Naming follows upstream Yoga's `YGNodeStyleSetGap(Gutter, value)`,
   * which takes `Gutter.Column` for the cross-axis gap (when flexDirection
   * is Row) and `Gutter.Row` for the main-axis gap. The `setGap(row)`
   * convention is the most common case for TUI (uniform spacing).
   */
  setGap(gap: DimensionInput, crossGap?: DimensionInput): this {
    this.style.gap[0] = parseDimensionInput(crossGap ?? gap);
    this.style.gap[1] = parseDimensionInput(gap);
    this._isDirty = true;
    return this;
  }

  // ─── Tree operations ─────────────────────────────────────────────────

  insertChild(child: Node, index: number): void {
    if (child.parent !== null) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.splice(index, 0, child);
    this._markDirtyRecursive();
  }

  removeChild(child: Node): void {
    const i = this.children.indexOf(child);
    if (i < 0) return;
    this.children.splice(i, 1);
    child.parent = null;
    this._markDirtyRecursive();
  }

  getChildCount(): number {
    return this.children.length;
  }

  getChild(index: number): Node {
    const child = this.children[index];
    if (child === undefined) {
      throw new Error(`getChild(${index}): out of range (have ${this.children.length} children)`);
    }
    return child;
  }

  getParent(): Node | null {
    return this.parent;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────

  free(): void {
    if (this.parent !== null) {
      this.parent.removeChild(this);
    }
    this.children = [];
    this.parent = null;
    this.style = createDefaultStyle();
    this._layoutResults = new LayoutResults();
    this._isDirty = true;
    this._hasNewLayout = false;
    this._hasAutoMargin = false;
    this._hasPadding = false;
    this._hasBorder = false;
    this._hasMargin = false;
    this._hasPosition = false;
  }

  freeRecursive(): void {
    // Snapshot children before freeing — `free()` mutates the array.
    const snapshot = [...this.children];
    for (const child of snapshot) {
      child.freeRecursive();
    }
    this.free();
  }

  reset(): void {
    this.style = createDefaultStyle();
    this._layoutResults.reset();
    this._hasNewLayout = false;
    this._isDirty = true;
    this._hasAutoMargin = false;
    this._hasPadding = false;
    this._hasBorder = false;
    this._hasMargin = false;
    this._hasPosition = false;
    for (const child of this.children) {
      child.reset();
    }
  }

  markDirty(): void {
    // Propagate UP, not down. Cache invalidation contract: if a
    // child's style changes, every ancestor's cached layout is also
    // stale (the child's resolved size feeds into the parent's main-
    // axis computation). Propagating down would force every
    // descendant to recompute on every ancestor change — wasteful
    // and breaks cache hit frequency.
    //
    // The `!this.parent._isDirty` guard is the optimization that
    // maintains the invariant "dirty node ⇒ all ancestors dirty"
    // without redundant work: if the parent is already dirty, the
    // grandparent was already dirtied by whichever path marked the
    // parent. We only recurse up when there's still an undirtied
    // ancestor to mark. (Early-returning on `this._isDirty` alone
    // would break the invariant when this node was dirtied by an
    // external path that didn't walk all the way up.)
    //
    // For tree mutations (insert/remove) where every descendant IS
    // stale, use `_markDirtyRecursive` — that propagates down.
    this._isDirty = true;
    if (this.parent !== null && !this.parent._isDirty) {
      this.parent.markDirty();
    }
  }

  // ─── Callback ────────────────────────────────────────────────────────

  setMeasureFunc(fn: MeasureFunction | null): this {
    this.measureFunc = fn;
    this._isDirty = true;
    return this;
  }

  // ─── Layout (stub — real implementation lands in Phase 4) ───────────

  /**
   * Compute layout for this subtree using the 11-STEP algorithm
   * (Phase 4 implementation, TUI subset).
   *
   * Contract:
   *   - Recursively processes children in tree order
   *   - Sets `layout.{width,height}` to the resolved size
   *   - Sets `layout.{left,top,right,bottom}` to the resolved position
   *   - Sets `_hasNewLayout = true`
   *   - Sets `_isDirty = false`
   *   - Skips children with `style.display === Display.None`
   *   - Lays out absolute children with their own position style
   */
  calculateLayout(width?: number, height?: number, direction?: Direction): void {
    const w = width ?? Number.NaN;
    const h = height ?? Number.NaN;
    const dir = direction ?? this.style.direction;
    calculateLayoutAlgorithm(this, w, h, dir);
  }

  // ─── Read-side API ───────────────────────────────────────────────────

  getComputedLeft(): number {
    return this._layoutResults.position[0];
  }

  getComputedTop(): number {
    return this._layoutResults.position[1];
  }

  getComputedRight(): number {
    // Upstream Yoga semantic: distance from the parent's right edge.
    // `this.layout.left` may be stale for non-leaf children (the
    // algorithm only sets `layout.left/top` on the root + measure-func
    // leaves), so we read the parent-relative left from
    // `_layoutResults.position[0]` instead — that's authoritative
    // for every node after `calculateLayoutImpl` runs.
    const p = this.parent;
    if (p === null) return 0;
    return p.layout.width - this._layoutResults.position[0] - this.layout.width;
  }

  getComputedBottom(): number {
    // Upstream Yoga semantic: distance from the parent's bottom edge.
    const p = this.parent;
    if (p === null) return 0;
    return p.layout.height - this._layoutResults.position[1] - this.layout.height;
  }

  getComputedWidth(): number {
    return this.layout.width;
  }

  getComputedHeight(): number {
    return this.layout.height;
  }

  getComputedLayout(): PublicLayout {
    // Read left/top from `_layoutResults.position` (the algorithm
    // updates this for every node, including children, after applying
    // main-axis offsets from justifyContent). `this.layout.left/top`
    // is only meaningful for the root — recursive `calculateLayoutImpl`
    // calls reset it to 0 for each sub-tree root.
    //
    // width/height live on `this.layout` because the algorithm writes
    // them there for every node.
    //
    // right/bottom on the PublicLayout object: per Yoga C++ spec these
    // are the right/bottom EDGE in parent-relative coords (i.e.
    // `left + width`). The standalone `getComputedRight/Bottom()`
    // methods above return the distance-from-parent-edge inset
    // (matches claude-code TS port + retty-ui/Ink reconciler
    // expectations) — use the getter when you want the inset, read
    // `layout.right` when you want the edge.
    const left = this._layoutResults.position[0];
    const top = this._layoutResults.position[1];
    const width = this.layout.width;
    const height = this.layout.height;
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    };
  }

  getHasNewLayout(): boolean {
    return this._hasNewLayout;
  }

  /**
   * Acknowledge that the consumer has observed the most recent layout.
   * Resets the internal `_hasNewLayout` flag back to `false` so the
   * next `calculateLayout` call will set it to `true` again.
   *
   * Yoga contract: `hasNewLayout()` should return `true` only between
   * a layout computation and the consumer's acknowledgment. Without
   * this, React reconcilers that re-render based on `hasNewLayout`
   * would treat every node as perpetually dirty and repaint the
   * whole tree on every pass.
   */
  markLayoutSeen(): this {
    this._hasNewLayout = false;
    return this;
  }

  // ─── Internals ───────────────────────────────────────────────────────

  /**
   * Mark this node dirty AND all descendants (unless they're already dirty).
   * Used by operations that affect child layout (insert/remove/margin change).
   */
  private _markDirtyRecursive(): void {
    this._markDirtyWithMargins();
    for (const child of this.children) {
      child.markDirty();
    }
  }

  /**
   * Mark dirty without recursing — used by dimension / margin setters
   * that don't require child re-layout (their effect is local to this node).
   */
  private _markDirtyWithMargins(): void {
    this._isDirty = true;
  }
}
