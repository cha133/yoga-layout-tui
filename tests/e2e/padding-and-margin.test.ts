import { expect, test } from 'bun:test';
import { buildFixture } from './fixtures/padding-and-margin.js';
import { renderToGrid } from './renderer.js';

test('padding ring visible around content; margin is a no-op (TUI subset)', () => {
  const root = buildFixture();
  const grid = renderToGrid(root, 12, 4);
  expect(grid).toMatchSnapshot();
  root.freeRecursive();
});
