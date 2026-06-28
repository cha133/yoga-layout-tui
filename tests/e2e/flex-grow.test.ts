import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/flex-grow.js';
import { renderToGrid } from './renderer.js';

test('flex-grow child absorbs remaining vertical space between fixed siblings', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 10);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
