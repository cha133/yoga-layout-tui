/**
 * flex-grow — the canonical TUI "main pane fills remaining space" pattern.
 *
 * Root is a Column. Two fixed children (header / footer) sandwich a
 * flexGrow:1 child (body). The body's computed height is
 * `parentHeight - headerHeight - footerHeight = 10 - 1 - 1 = 8`.
 *
 * Width is constrained to 20 on every node so the body's columns
 * matter only vertically — this isolates the flexGrow behavior from
 * any horizontal flex math.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(20)
    .setHeight(10)
    .setFlexDirection(FlexDirection.Column);

  const header = Node.createDefault().setWidth(20).setHeight(1);
  const body = Node.createDefault().setWidth(20).setFlexGrow(1);
  const footer = Node.createDefault().setWidth(20).setHeight(1);

  root.insertChild(header, 0);
  root.insertChild(body, 1);
  root.insertChild(footer, 2);

  return root;
}
