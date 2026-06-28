import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/nested-row-in-column.js';
import { renderToGrid } from './renderer.js';

test('column of rows, each row splitting into icon / text / badge', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 8);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
