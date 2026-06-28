import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/simple-column.js';
import { renderToGrid } from './renderer.js';

test('simple-column renders three vertically-stacked children', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 10, 10);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
