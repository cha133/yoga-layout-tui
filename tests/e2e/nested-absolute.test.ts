import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/nested-absolute.js';
import { renderToGrid } from './renderer.js';

test('absolute child inside a non-root container places against container edges', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 10);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
