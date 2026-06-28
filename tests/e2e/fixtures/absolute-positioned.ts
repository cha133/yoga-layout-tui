/**
 * absolute-positioned — TUI modal/dialog overlay pattern.
 *
 * Root is 20 × 10. Three absolutely-positioned children at the four
 * corners (top-left, top-right, bottom-left, bottom-right). One is
 * centered (left=8, top=4) to verify center placement.
 *
 * Absolute children ignore flex flow — they're placed at their
 * style.position[Left/Top] offsets within the parent. They can
 * overlap each other and the parent's bounds (here we keep them
 * inside to keep the snapshot readable).
 */

import { Node, PhysicalEdge, PositionType } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(20).setHeight(10);

  const topLeft = Node.createDefault()
    .setWidth(5)
    .setHeight(2)
    .setPositionType(PositionType.Absolute)
    .setPosition(PhysicalEdge.Left, 0)
    .setPosition(PhysicalEdge.Top, 0);

  const topRight = Node.createDefault()
    .setWidth(5)
    .setHeight(2)
    .setPositionType(PositionType.Absolute)
    .setPosition(PhysicalEdge.Right, 0)
    .setPosition(PhysicalEdge.Top, 0);

  const bottomLeft = Node.createDefault()
    .setWidth(5)
    .setHeight(2)
    .setPositionType(PositionType.Absolute)
    .setPosition(PhysicalEdge.Left, 0)
    .setPosition(PhysicalEdge.Bottom, 0);

  const bottomRight = Node.createDefault()
    .setWidth(5)
    .setHeight(2)
    .setPositionType(PositionType.Absolute)
    .setPosition(PhysicalEdge.Right, 0)
    .setPosition(PhysicalEdge.Bottom, 0);

  root.insertChild(topLeft, 0);
  root.insertChild(topRight, 1);
  root.insertChild(bottomLeft, 2);
  root.insertChild(bottomRight, 3);

  return root;
}
