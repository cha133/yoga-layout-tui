/**
 * Edge.Horizontal / Vertical / All shorthand e2e.
 *
 * Verifies that the v0.5 9-element Edge expansion actually affects
 * the algorithm — `setPadding(Edge.Horizontal, 1)` should produce the
 * same padding ring as four individual `setPadding(Left/Right/Top/
 * Bottom, 1)` calls (for the Horizontal case). Pre-v0.5 the algorithm
 * would silently ignore the convenience edge value (the index 6/7/8
 * slot didn't exist on the 4-element array).
 */

import { expect, test } from 'bun:test';
import { Edge, Node, PhysicalEdge, rawValue } from '../../src/index.js';
import { renderToGrid } from './renderer.js';

test('Edge.Horizontal padding sets both L+R (matches physical-edge equivalent)', () => {
  // Build two identical trees, one using Horizontal shorthand, one
  // using explicit Left/Right. The rendered grids must match.
  const a = Node.createDefault().setWidth(8).setHeight(2);
  const aChild = Node.createDefault().setWidth(2).setHeight(1);
  a.insertChild(aChild, 0);
  a.setPadding(Edge.Horizontal, 1);

  const b = Node.createDefault().setWidth(8).setHeight(2);
  const bChild = Node.createDefault().setWidth(2).setHeight(1);
  b.insertChild(bChild, 0);
  b.setPadding(PhysicalEdge.Left, 1).setPadding(PhysicalEdge.Right, 1);

  const gridA = renderToGrid(a, 8, 2);
  const gridB = renderToGrid(b, 8, 2);
  expect(gridA).toBe(gridB);
  a.freeRecursive();
  b.freeRecursive();
});

test('Edge.Vertical padding sets both T+B', () => {
  const a = Node.createDefault().setWidth(6).setHeight(4);
  const aChild = Node.createDefault().setWidth(2).setHeight(1);
  a.insertChild(aChild, 0);
  a.setPadding(Edge.Vertical, 1);

  const b = Node.createDefault().setWidth(6).setHeight(4);
  const bChild = Node.createDefault().setWidth(2).setHeight(1);
  b.insertChild(bChild, 0);
  b.setPadding(PhysicalEdge.Top, 1).setPadding(PhysicalEdge.Bottom, 1);

  const gridA = renderToGrid(a, 6, 4);
  const gridB = renderToGrid(b, 6, 4);
  expect(gridA).toBe(gridB);
  a.freeRecursive();
  b.freeRecursive();
});

test('Edge.All border writes all 4 physical edges + convenience slot', () => {
  // Note: this checks the data on the node, not the rendered grid
  // (the renderer paints whole bounding boxes and doesn't separate
  // out the border ring). For visual verification of border, see
  // unit tests in tests/unit/node/node.test.ts.
  const n = Node.create().setBorder(Edge.All, 2);
  expect(rawValue(n.style.border[PhysicalEdge.Left]!)).toBe(2);
  expect(rawValue(n.style.border[PhysicalEdge.Right]!)).toBe(2);
  expect(rawValue(n.style.border[PhysicalEdge.Top]!)).toBe(2);
  expect(rawValue(n.style.border[PhysicalEdge.Bottom]!)).toBe(2);
  // Convenience slot mirrors the value too.
  expect(rawValue(n.style.border[Edge.All]!)).toBe(2);
});
