import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/absolute-positioned.js';
import { renderToGrid } from './renderer.js';

test('four absolutely-positioned children snap to the parent corners', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 20, 10);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
