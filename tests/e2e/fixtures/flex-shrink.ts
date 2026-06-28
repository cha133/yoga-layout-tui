/**
 * flex-shrink — children sum larger than the parent must shrink to fit.
 *
 * Root is a Row 10 columns wide. Children have widths 5 / 4 / 4
 * (sum=13 > 10). Each child has flexShrink=1 so they shrink
 * proportionally: each loses (13-10)/3 = 1 column.
 *
 * Resulting widths: 4 / 3 / 3 (sum = 10 ✓).
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(10).setHeight(1).setFlexDirection(FlexDirection.Row);

  const a = Node.createDefault().setWidth(5).setHeight(1).setFlexShrink(1);
  const b = Node.createDefault().setWidth(4).setHeight(1).setFlexShrink(1);
  const c = Node.createDefault().setWidth(4).setHeight(1).setFlexShrink(1);

  root.insertChild(a, 0);
  root.insertChild(b, 1);
  root.insertChild(c, 2);

  return root;
}
