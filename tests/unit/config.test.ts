import { describe, expect, test } from 'bun:test';
import { Config } from '../../src/config/config.js';

describe('Config', () => {
  test('create() returns a Config with default values', () => {
    const c = Config.create();
    expect(c).toBeInstanceOf(Config);
    expect(c.pointScaleFactor).toBe(1.0);
    expect(c.version).toBe(0);
  });

  test('pointScaleFactor is mutable', () => {
    const c = Config.create();
    c.pointScaleFactor = 2.0;
    expect(c.pointScaleFactor).toBe(2.0);
  });

  test('bumpVersion increments version', () => {
    const c = Config.create();
    expect(c.version).toBe(0);
    c.bumpVersion();
    expect(c.version).toBe(1);
    c.bumpVersion();
    expect(c.version).toBe(2);
  });

  test('two Config instances are independent', () => {
    const a = Config.create();
    const b = Config.create();
    a.bumpVersion();
    expect(a.version).toBe(1);
    expect(b.version).toBe(0);
  });

  test('destroy() is a no-op (TUI subset has no native handles)', () => {
    const c = Config.create();
    expect(() => Config.destroy(c)).not.toThrow();
    // After destroy, the Config is still usable in this subset
    // (no-op destroy means GC reclaims it).
    expect(c.version).toBe(0);
  });
});
