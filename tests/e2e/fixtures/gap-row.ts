/**
 * gap-row — TUI button group with horizontal spacing.
 *
 * Root is a Row 20 × 3, gap=2. Three children each 4 × 3.
 * Layout: [btn=4][gap=2][btn=4][gap=2][btn=4]  →  4+2+4+2+4 = 16.
 * Last 4 cols of the row are EMPTY_CHAR (the parent is 20 wide but
 * the content only takes 16 cols — TUI buttons are usually left-
 * aligned by default, so the gap stops at 16 and the trailing
 * 4 cols are parent's empty cells).
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(20)
    .setHeight(3)
    .setFlexDirection(FlexDirection.Row)
    .setGap(2);

  const btn1 = Node.createDefault().setWidth(4).setHeight(3);
  const btn2 = Node.createDefault().setWidth(4).setHeight(3);
  const btn3 = Node.createDefault().setWidth(4).setHeight(3);

  root.insertChild(btn1, 0);
  root.insertChild(btn2, 1);
  root.insertChild(btn3, 2);

  return root;
}
