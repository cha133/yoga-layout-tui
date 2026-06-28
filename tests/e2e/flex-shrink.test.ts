import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/flex-shrink.js';
import { renderToGrid } from './renderer.js';

test('flex-shrink distributes width deficit proportionally', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 10, 1);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
