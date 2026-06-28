/**
 * Config — a small per-tree configuration object.
 *
 * TUI subset: only `pointScaleFactor` (we keep 1.0; no sub-pixel layout)
 * and `version` (cache invalidation key). The full Yoga Config carries
 * Errata flags, ExperimentalFeature sets, a logger, and a cloneNodeCallback
 * — all deliberately excluded by the TUI-only constraint.
 *
 * `bumpVersion()` is the single way to mutate `version`; layouts compare
 * the cached config version against `Config.version` to detect that the
 * config changed and the cached layout is stale.
 */
export class Config {
  pointScaleFactor: number = 1.0;
  private _version: number = 0;

  get version(): number {
    return this._version;
  }

  /** Invalidate every cached layout / measurement keyed on this config. */
  bumpVersion(): void {
    this._version += 1;
  }

  static create(): Config {
    return new Config();
  }

  /**
   * TUI subset: no native handles, no FFI handles, no observers. The
   * JS GC reclaims the Config once callers drop their reference. This
   * static exists only to mirror the `yoga-layout/load` API shape so
   * drop-in swaps don't have to remove the `destroy()` call.
   */
  static destroy(_config: Config): void {
    // intentionally empty
  }
}
