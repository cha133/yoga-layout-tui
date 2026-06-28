/**
 * Render a computed-layout Node tree into a fixed-size ASCII grid.
 *
 * Algorithm:
 *   1. Force a layout pass on `root` with the requested grid size.
 *   2. Initialize a `gridWidth × gridHeight` 2-D char array filled
 *      with EMPTY_CHAR.
 *   3. Walk the tree depth-first via stack (no recursion — pathological
 *      deep trees could blow V8's stack limit).
 *   4. For each node, paint its computed `[left..left+width)` ×
 *      `[top..top+height)` rectangle with the node's char. Children
 *      OVERWRITE the parent's char in their bounding rectangles —
 *      this matches what you see when you actually render the layout
 *      (a child box covers the parent's area it occupies).
 *   5. The root node is skipped when painting: its bounding rectangle
 *      is the entire grid, so painting it would fill every cell and
 *      hide all children. The parent's char still appears in cells
 *      outside any child's bounds (e.g., margin areas around a child
 *      that doesn't fill its parent's space).
 *
 * Positions accumulate through stack frames: yoga-layout-tui's
 * `getComputedLeft/Top` returns coordinates RELATIVE to the immediate
 * parent (matches upstream Yoga C++ and Yoga WASM). We add the parent's
 * accumulated origin to each child's local offset to get screen-space
 * coords for painting. Same pattern as Ink's
 * `render-node-to-output.ts:435-438` (`offsetX + yogaNode.getComputedLeft()`).
 *
 * The output is a single string with `\n`-separated rows. bun:test's
 * `toMatchSnapshot()` handles this cleanly.
 *
 * Out-of-bounds: cells where `left+width > gridWidth` or
 * `top+height > gridHeight` are clamped (you'll see the node truncated
 * in the snapshot). This is intentional — if the algorithm places a
 * child outside the grid, the snapshot shows that visibly.
 */

import type { Node } from '../../src/index.js';
import { EMPTY_CHAR, NODE_CHARS } from './asciiChars.js';

interface StackFrame {
  node: Node;
  charIndex: number;
  depth: number;
  // Accumulated absolute origin of this node's top-left corner in
  // screen coords. Computed as parent origin + node.getComputedLeft/Top().
  absX: number;
  absY: number;
}

export function renderToGrid(root: Node, gridWidth: number, gridHeight: number): string {
  // Force a layout pass — the caller built the tree but didn't run
  // calculateLayout yet (or the grid size is different from a prior
  // call and we want a fresh pass).
  root.calculateLayout(gridWidth, gridHeight);

  // Grid — `string[][]` rather than a flat `string` so we can
  // mutate cell-by-cell without offset math.
  const grid: string[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => EMPTY_CHAR),
  );

  // Depth-first via stack. Root sits at (0, 0) — it has no parent so
  // its local left/top = 0 is also its absolute origin. Children
  // accumulate their parent's absX/absY + their local left/top.
  const stack: StackFrame[] = [{ node: root, charIndex: 0, depth: -1, absX: 0, absY: 0 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    const { node, charIndex, depth, absX, absY } = frame;
    const char = NODE_CHARS[charIndex % NODE_CHARS.length] ?? EMPTY_CHAR;
    const layout = node.getComputedLayout();

    // Skip painting at depth -1 (the root): its bounds == the entire
    // grid, so painting would overwrite the EMPTY_CHAR cells that
    // represent "outside any node". Children at depth 0 and deeper
    // DO paint — their bounds are subsets of the grid, and their
    // chars overwrite the parent's char in their cell range.
    //
    // Pixel-grid rounding: the algorithm emits fractional `left` /
    // `top` for some layouts (e.g., flex-shrink proportions). We floor
    // the start coord and ceil the end so the painted cell range
    // fully covers the layout's extent — never leaves a gap when the
    // algorithm intended to fill 3.846 → 6.846.
    if (depth >= 0) {
      const xStart = Math.max(0, Math.floor(absX + layout.left));
      const xEnd = Math.min(gridWidth, Math.ceil(absX + layout.left + layout.width));
      const yStart = Math.max(0, Math.floor(absY + layout.top));
      const yEnd = Math.min(gridHeight, Math.ceil(absY + layout.top + layout.height));
      for (let y = yStart; y < yEnd; y++) {
        const row = grid[y];
        if (row === undefined) continue;
        for (let x = xStart; x < xEnd; x++) {
          row[x] = char;
        }
      }
    }

    // Push children in REVERSE so the leftmost child is processed
    // LAST (it pops off the stack first, painting on top of later
    // siblings — matches document order).
    //
    // Each child gets charIndex + 1 + i — this skips a slot so a
    // grandchild can't reuse the same char as its parent's sibling.
    //
    // Child absolute origin = this frame's absX/absY + this node's
    // local left/top (= parent's local-position contribution to the
    // child). The child's own getComputedLeft/Top is its local offset,
    // so we add that to its origin in the next frame's paint loop.
    const childOriginX = absX + layout.left;
    const childOriginY = absY + layout.top;
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child === undefined) continue;
      stack.push({
        node: child,
        charIndex: charIndex + 1 + i,
        depth: depth + 1,
        absX: childOriginX,
        absY: childOriginY,
      });
    }
  }

  return grid.map((row) => row.join('')).join('\n');
}
