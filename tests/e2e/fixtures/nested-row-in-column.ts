/**
 * nested-row-in-column — bidirectional flex (TUI list item pattern).
 *
 * Root is a Column 20 × 8. It contains two Row children (list items).
 * Each Row has three cells: icon | text (flexGrow:1) | badge.
 *
 * The text cell uses flexGrow to absorb the row's remaining width
 * after the icon (2 cols) and badge (3 cols) take their share. So
 * text = 20 - 2 - 3 = 15.
 */

import { FlexDirection, Node } from '../../../src/index.js';

export function buildFixture(): Node {
  const root = Node.createDefault()
    .setWidth(20)
    .setHeight(8)
    .setFlexDirection(FlexDirection.Column);

  const item1 = Node.createDefault().setWidth(20).setHeight(2).setFlexDirection(FlexDirection.Row);
  const item2 = Node.createDefault().setWidth(20).setHeight(2).setFlexDirection(FlexDirection.Row);

  const makeCells = (parent: Node) => {
    const icon = Node.createDefault().setWidth(2).setHeight(2);
    const text = Node.createDefault().setFlexGrow(1).setHeight(2);
    const badge = Node.createDefault().setWidth(3).setHeight(2);
    parent.insertChild(icon, 0);
    parent.insertChild(text, 1);
    parent.insertChild(badge, 2);
  };

  makeCells(item1);
  makeCells(item2);

  root.insertChild(item1, 0);
  root.insertChild(item2, 1);

  return root;
}
