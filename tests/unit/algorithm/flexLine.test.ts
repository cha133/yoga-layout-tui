import { describe, expect, test } from 'bun:test';
import { buildSingleFlexLine } from '../../../src/algorithm/flexLine.js';
import { Config } from '../../../src/config/config.js';
import { Display } from '../../../src/enums.js';
import { Node } from '../../../src/node/node.js';

function makeChild(): Node {
  return Node.create();
}

function makeDisplayNoneChild(): Node {
  return Node.create().setDisplay(Display.None);
}

describe('buildSingleFlexLine', () => {
  test('returns a single FlexLine with the given children', () => {
    const a = makeChild();
    const b = makeChild();
    const c = makeChild();
    const line = buildSingleFlexLine([a, b, c]);
    expect(line.items).toEqual([a, b, c]);
  });

  test('counters all start at 0', () => {
    const line = buildSingleFlexLine([makeChild()]);
    expect(line.mainSize).toBe(0);
    expect(line.crossSize).toBe(0);
    expect(line.growCount).toBe(0);
    expect(line.shrinkCount).toBe(0);
  });

  test('display:none children are filtered out', () => {
    const a = makeChild();
    const b = makeChild();
    const none = makeDisplayNoneChild();
    const line = buildSingleFlexLine([a, none, b]);
    expect(line.items).toEqual([a, b]);
  });

  test('empty children list returns an empty line', () => {
    const line = buildSingleFlexLine([]);
    expect(line.items).toEqual([]);
  });

  test('multiple display:none in a row are all filtered', () => {
    const a = makeChild();
    const line = buildSingleFlexLine([makeDisplayNoneChild(), makeDisplayNoneChild(), a]);
    expect(line.items).toEqual([a]);
  });

  test('preserves source order of visible children', () => {
    const a = makeChild();
    const b = makeChild();
    const c = makeChild();
    const line = buildSingleFlexLine([a, b, c]);
    expect(line.items[0]).toBe(a);
    expect(line.items[1]).toBe(b);
    expect(line.items[2]).toBe(c);
  });

  test('does not mutate the input children array', () => {
    const a = makeChild();
    const none = makeDisplayNoneChild();
    const input = [a, none];
    const inputSnapshot = [...input];
    buildSingleFlexLine(input);
    expect(input).toEqual(inputSnapshot);
    expect(input[1]).toBe(none);
  });
});

// Suppress unused-var lint from imported symbols we don't use in this file.
// (Compile-only, not a test.)
const _config = Config.create;
void _config;
