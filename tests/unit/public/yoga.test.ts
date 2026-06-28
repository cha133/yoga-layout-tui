/**
 * Phase 5 — Yoga namespace shape & behaviour.
 *
 * The Yoga object exists for drop-in compatibility with
 * `yoga-layout/load`; the tests verify the contract is honored end-to-end
 * (factories return real Config/Node, destroy() is safe to call, the
 * async loader resolves to the same singleton).
 */

import { describe, expect, test } from 'bun:test';

import { Config } from '../../../src/config/config.js';
import { Node } from '../../../src/node/node.js';
import { loadYoga, Yoga, default as YogaDefault } from '../../../src/public/yoga.js';

describe('Yoga namespace — Config', () => {
  test('Config.create returns a Config instance', () => {
    const c = Yoga.Config.create();
    expect(c).toBeInstanceOf(Config);
  });

  test('Config.destroy is a callable no-op (TUI subset has no native handles)', () => {
    const c = Yoga.Config.create();
    // Must not throw, must accept the config argument.
    expect(() => Yoga.Config.destroy(c)).not.toThrow();
  });

  test('two Config.create calls return distinct instances', () => {
    const a = Yoga.Config.create();
    const b = Yoga.Config.create();
    expect(a).not.toBe(b);
    expect(a.version).toBe(b.version);
    a.bumpVersion();
    expect(a.version).toBe(b.version + 1);
  });
});

describe('Yoga namespace — Node', () => {
  test('Node.create() returns a Node with a default Config', () => {
    const n = Yoga.Node.create();
    expect(n).toBeInstanceOf(Node);
    expect(n.config).toBeInstanceOf(Config);
  });

  test('Node.create(config) attaches the supplied Config', () => {
    const cfg = Yoga.Config.create();
    const n = Yoga.Node.create(cfg);
    expect(n.config).toBe(cfg);
  });

  test('Node.createDefault() == Node.create() (both produce a default-config Node)', () => {
    const a = Yoga.Node.createDefault();
    const b = Yoga.Node.create();
    expect(a).toBeInstanceOf(Node);
    expect(b).toBeInstanceOf(Node);
    expect(a.config).not.toBe(b.config);
  });

  test('Node.createWithConfig(config) attaches the supplied Config', () => {
    const cfg = Yoga.Config.create();
    const n = Yoga.Node.createWithConfig(cfg);
    expect(n.config).toBe(cfg);
  });

  test('Node.destroy(node) is a safe no-op (GC reclaims)', () => {
    const n = Yoga.Node.create();
    expect(() => Yoga.Node.destroy(n)).not.toThrow();
  });

  test('end-to-end: build a tiny tree and calculate', () => {
    const root = Yoga.Node.createDefault().setWidth(80).setHeight(24);
    const child = Yoga.Node.createDefault().setFlexGrow(1);
    root.insertChild(child, 0);

    root.calculateLayout(80, 24);

    expect(root.getComputedWidth()).toBe(80);
    expect(root.getComputedHeight()).toBe(24);
    expect(child.getComputedWidth()).toBe(80);
    expect(child.getComputedHeight()).toBe(24);

    root.freeRecursive();
  });
});

describe('Yoga namespace — loadYoga + default', () => {
  test('loadYoga() resolves to a Promise<Yoga>', async () => {
    const promise = loadYoga();
    expect(promise).toBeInstanceOf(Promise);
    const y = await promise;
    expect(y).toBe(Yoga);
  });

  test('default export == named Yoga export', () => {
    expect(YogaDefault).toBe(Yoga);
  });
});
