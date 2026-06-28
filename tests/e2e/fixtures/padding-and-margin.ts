/**
 * padding-only — verify padding ring is visible around child content.
 *
 * NOTE: this fixture was originally called "padding-and-margin" but
 * margin is intentionally NOT implemented in the TUI subset (the
 * algorithm ignores `style.margin` — TUI margins are usually modeled
 * as separate spacing nodes). The snapshot still proves that padding
 * shows as the parent's char ring with child content carved out.
 *
 * Root is 12 × 6 Column. Two children:
 *   - Box A: width=6, height=2, padding=1 all sides. No children —
 *     so A's content area (4 × 0) is empty, and we see only A's outer
 *     char ring.
 *   - Box B: width=4, height=2, padding=2 all sides. No children —
 *     B's content area is negative, so we see only B's outer char.
 *
 * For a clearer padding visualization we also place a tiny child inside
 * Box A and Box B. The renderer paints parent → child, so the parent's
 * padding ring stays visible as the parent's char and the child's
 * content shows as the child's char.
 */

import { Node, PhysicalEdge } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(12).setHeight(10);

  const a = Node.createDefault()
    .setWidth(6)
    .setHeight(4)
    .setPadding(PhysicalEdge.Left, 1)
    .setPadding(PhysicalEdge.Top, 1)
    .setPadding(PhysicalEdge.Right, 1)
    .setPadding(PhysicalEdge.Bottom, 1);
  const aContent = Node.createDefault().setWidth(4).setHeight(2);

  const b = Node.createDefault()
    .setWidth(4)
    .setHeight(4)
    .setPadding(PhysicalEdge.Left, 1)
    .setPadding(PhysicalEdge.Top, 1)
    .setPadding(PhysicalEdge.Right, 1)
    .setPadding(PhysicalEdge.Bottom, 1);
  const bContent = Node.createDefault().setWidth(2).setHeight(2);

  a.insertChild(aContent, 0);
  b.insertChild(bContent, 0);
  root.insertChild(a, 0);
  root.insertChild(b, 1);

  return root;
}
