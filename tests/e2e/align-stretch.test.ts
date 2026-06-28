import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/align-stretch.js';
import { renderToGrid } from './renderer.js';

test('default alignItems=Stretch pulls each child to the parent cross-axis size', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 10, 5);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
