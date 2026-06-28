/**
 * simple-column — basic vertical flex (the TUI default direction).
 *
 * Grid: 10 × 10, three children with fixed heights 3 / flexGrow:1 / 2.
 * The flexGrow child absorbs the remaining 5 rows.
 *
 * Column is the default flexDirection (see createDefaultStyle), so
 * this fixture also doubles as a sanity check that the default
 * direction is honored without explicit setFlexDirection.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(10)
    .setHeight(10)
    .setFlexDirection(FlexDirection.Column);

  const a = Node.createDefault().setWidth(10).setHeight(3);
  const b = Node.createDefault().setWidth(10).setFlexGrow(1);
  const c = Node.createDefault().setWidth(10).setHeight(2);

  root.insertChild(a, 0);
  root.insertChild(b, 1);
  root.insertChild(c, 2);

  return root;
}
