/**
 * margin-spacing — verify margin pushes children apart from parent edges
 * and from each other.
 *
 * Row 20×3, three children of widths 4 / 4 / 4 with varying margins:
 *   - A: marginLeft=1, marginRight=1 → pushed 1 col in from left, 1 col
 *     clearance after; occupies cols 1-4 (4 wide) + 1 col margin-right
 *   - B: marginLeft=2, marginRight=2 → starts 2 cols after A's zone
 *     (i.e., at col 8 = 5 cols after A starts), occupies cols 8-11
 *   - C: marginLeft=3, no marginRight → starts 3 cols after B's zone
 *     (i.e., at col 16 = 7 cols after B starts), occupies cols 16-19
 *
 * Total: 1+4+1+2+4+2+3+4 = 21, but parent is only 20 cols, so the last
 * 1 col is truncated. Cells that fall inside a margin zone show as ░
 * (the parent's char since the renderer paints parent → child and
 * child only fills its box).
 */

import { FlexDirection, Node, PhysicalEdge } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.create().setWidth(20).setHeight(3).setFlexDirection(FlexDirection.Row);

  const a = Node.create()
    .setWidth(4)
    .setHeight(3)
    .setMargin(PhysicalEdge.Left, 1)
    .setMargin(PhysicalEdge.Right, 1);
  const b = Node.create()
    .setWidth(4)
    .setHeight(3)
    .setMargin(PhysicalEdge.Left, 2)
    .setMargin(PhysicalEdge.Right, 2);
  const c = Node.create().setWidth(4).setHeight(3).setMargin(PhysicalEdge.Left, 3);

  root.insertChild(a, 0);
  root.insertChild(b, 1);
  root.insertChild(c, 2);

  return root;
}
