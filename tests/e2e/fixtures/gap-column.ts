/**
 * gap-column — TUI form field stack with vertical spacing.
 *
 * Root is a Column 20 × 10, gap=2. Three children each 20 × 2.
 * Layout: [field=2][gap=2][field=2][gap=2][field=2]  →  2+2+2+2+2 = 10.
 * Fills the full parent height exactly.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(20)
    .setHeight(10)
    .setFlexDirection(FlexDirection.Column)
    .setGap(2);

  const field1 = Node.createDefault().setWidth(20).setHeight(2);
  const field2 = Node.createDefault().setWidth(20).setHeight(2);
  const field3 = Node.createDefault().setWidth(20).setHeight(2);

  root.insertChild(field1, 0);
  root.insertChild(field2, 1);
  root.insertChild(field3, 2);

  return root;
}
