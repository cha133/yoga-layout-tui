/**
 * align-stretch — default alignItems stretches cross-axis.
 *
 * Root is a Row 10 × 5 with two children of fixed widths but no
 * fixed heights. alignItems defaults to Stretch, so each child
 * stretches to the parent's full cross-axis size (5 rows).
 *
 * Children have widths 3 and 4. The remaining 3 cols of the parent
 * (10 - 3 - 4 = 3) stay empty because there's no gap and no flexGrow.
 *
 * This is the default behavior of every Yoga container — verifying
 * it explicitly so the snapshot pins the "Stretch is the default"
 * contract.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault().setWidth(10).setHeight(5).setFlexDirection(FlexDirection.Row);

  const a = Node.createDefault().setWidth(3);
  const b = Node.createDefault().setWidth(4);

  root.insertChild(a, 0);
  root.insertChild(b, 1);

  return root;
}
