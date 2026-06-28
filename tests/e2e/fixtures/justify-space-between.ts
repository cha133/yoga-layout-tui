/**
 * justify-space-between — TUI top status bar / bottom shortcut hint.
 *
 * Root is a Row 20 × 1, justifyContent=SpaceBetween. Two children
 * each 4 × 1. SpaceBetween pushes the first to the left edge and
 * the second to the right edge, with 20 - 4 - 4 = 12 EMPTY_CHAR
 * cells between them.
 */

import { FlexDirection, Justify, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(20)
    .setHeight(1)
    .setFlexDirection(FlexDirection.Row)
    .setJustifyContent(Justify.SpaceBetween);

  const left = Node.createDefault().setWidth(4).setHeight(1);
  const right = Node.createDefault().setWidth(4).setHeight(1);

  root.insertChild(left, 0);
  root.insertChild(right, 1);

  return root;
}
