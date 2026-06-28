import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/simple-row.js';
import { renderToGrid } from './renderer.js';

test('simple-row renders three fixed-width children in a Row flex', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 5);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
