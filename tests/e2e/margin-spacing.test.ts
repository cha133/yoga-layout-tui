import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/margin-spacing.js';
import { renderToGrid } from './renderer.js';

test('margin offsets children from parent edges and from each other', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 3);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
