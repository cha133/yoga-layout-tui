import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/gap-column.js';
import { renderToGrid } from './renderer.js';

test('gap=2 in a Column leaves 2 empty rows between each child', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 10);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
