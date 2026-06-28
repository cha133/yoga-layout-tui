import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/gap-row.js';
import { renderToGrid } from './renderer.js';

test('gap=2 in a Row leaves 2 empty cells between each child', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 3);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
