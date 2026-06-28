/**
 * simple-row — basic horizontal flex with three fixed-width children.
 *
 * Grid: 20 × 5, three children of widths 5 / flexGrow:1 / 8.
 * With flexGrow:1 absorbing remaining 7 cols, the layout is:
 *   [A=5][B=7][C=8]  →  5 + 7 + 8 = 20 ✓
 *
 * C is rendered as 7 chars wide because it has no more grid space.
 * This fixture proves the basic Row flex direction + fixed widths
 * + flexGrow splits work end-to-end.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(20).setHeight(5).setFlexDirection(FlexDirection.Row);

  const a = Node.createDefault().setWidth(5).setHeight(5);
  const b = Node.createDefault().setFlexGrow(1).setHeight(5);
  const c = Node.createDefault().setWidth(8).setHeight(5);

  root.insertChild(a, 0);
  root.insertChild(b, 1);
  root.insertChild(c, 2);

  return root;
}
