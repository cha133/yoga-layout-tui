/**
 * nested-absolute — absolute child inside a non-root container.
 *
 * Outer root is 20 × 10. Inside it, a relative-positioned container
 * occupies the top 5 rows. Within that container, an absolutely-
 * positioned child sits in the bottom-right corner (offset 3 from
 * the container's right and bottom edges).
 *
 * Tests that `absoluteLayout` recurses correctly through nested
 * containers (the algorithm needs to walk up to find the nearest
 * non-static ancestor to determine the containing block).
 */

import { Node, PhysicalEdge, PositionType } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(20).setHeight(10);

  const container = Node.createDefault().setWidth(20).setHeight(5);

  const absoluteChild = Node.createDefault()
    .setWidth(4)
    .setHeight(2)
    .setPositionType(PositionType.Absolute)
    .setPosition(PhysicalEdge.Right, 0)
    .setPosition(PhysicalEdge.Bottom, 0);

  container.insertChild(absoluteChild, 0);
  root.insertChild(container, 0);

  return root;
}
