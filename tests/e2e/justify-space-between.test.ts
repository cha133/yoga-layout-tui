import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/justify-space-between.js';
import { renderToGrid } from './renderer.js';

test('SpaceBetween pushes first child to left edge and last child to right edge', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 1);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
