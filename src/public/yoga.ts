/**
 * Yoga namespace — the public-facing factory surface.
 *
 * Mirrors the `yoga-layout/load` package shape so callers can switch
 * imports without touching call sites:
 *
 *   import Yoga from 'yoga-layout/load';
 *   const n = Yoga.Node.create();
 *
 *   import { Yoga } from 'yoga-layout-tui';
 *   const n = Yoga.Node.create();
 *
 * Why a namespace at all? Upstream Yoga's factory functions (`YGNodeCreate`,
 * `YGNodeCreateWithConfig`, etc.) take a Yoga instance so they can share
 * state with the algorithm. We don't have that need (no FFI, no global
 * config), but mirroring the shape keeps the door open for a future
 * "swap-in" migration.
 *
 * TUI subset: no `Logger`, no `Config.cloneNode`, no `experimental feature`
 * flags. Just the four factories + their `destroy()` no-ops.
 */

import { Config } from '../config/config.js';
import { Node } from '../node/node.js';

export interface Yoga {
  Config: {
    create(): Config;
    destroy(config: Config): void;
  };
  Node: {
    create(config?: Config): Node;
    createDefault(): Node;
    createWithConfig(config: Config): Node;
    destroy(node: Node): void;
  };
}

export const Yoga: Yoga = {
  Config: {
    create: () => Config.create(),
    destroy: (config) => Config.destroy(config),
  },
  Node: {
    create: (config) => Node.create(config),
    createDefault: () => Node.createDefault(),
    createWithConfig: (config) => Node.createWithConfig(config),
    destroy: (node) => Node.destroy(node),
  },
};

/**
 * Async-shape loader, matching `yoga-layout/load.loadYoga()`.
 *
 * Upstream Yoga ships as a WebAssembly module that needs an async
 * `loadYoga()` because the WASM init is async. Our pure-TS port has
 * nothing to load — but we expose the same shape so existing async
 * caller code keeps working.
 */
export const loadYoga = (): Promise<Yoga> => Promise.resolve(Yoga);

export default Yoga;
