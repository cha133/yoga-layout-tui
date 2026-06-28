# yoga-layout-tui

**Pure TypeScript port of Meta's [Yoga](https://www.yogalayout.dev/) flexbox engine — TUI-only subset.**

A 2,000-line flexbox layout engine in your terminal app. Zero dependencies,
zero runtime cost beyond V8's optimizer. Designed for [Ink](https://github.com/vadimdemedes/ink),
blessed, terminal-ui, and any framework that needs deterministic 2D layout.

## Why?

Meta's Yoga is the canonical flexbox engine for native UIs — but it's a
2,800-line C++ library with a WebAssembly build and a C-style API. This
port reimplements the algorithm in idiomatic TypeScript with the
[`yoga-layout/load`](https://www.npmjs.com/package/yoga-layout) package
shape (so existing call sites drop in with a one-line import change).

**It's a TUI subset, not a full Yoga port.** Hard constraints:

- No `flex-wrap` (TUI screens don't wrap)
- No `align-content` (no wrap → no extra alignment axis)
- No `display: contents` (TUI doesn't need it)
- No `aspect-ratio` (boxes are rectangular anyway)
- No RTL (`Direction.LTR` only — TUI is always LTR)
- No baseline alignment (TUI is fixed-pitch; `alignItems: FlexStart | Center | FlexEnd | Stretch` covers all real cases)
- No CSS Yoga errata / experimental-feature flags

What it DOES support:

- 4 `FlexDirection` (Row / RowReverse / Column / ColumnReverse)
- 4 `Justify` (FlexStart / Center / FlexEnd / SpaceBetween)
- 4 `Align` (FlexStart / Center / FlexEnd / Stretch)
- `flex-grow` / `flex-shrink` / `flex-basis` (Point + Percent + Auto)
- `width` / `height` / `min-*` / `max-*` (Point + Percent + Auto)
- `margin` (all 4 sides + `margin: auto`)
- `padding` (all 4 sides)
- `position: absolute` (with `top` / `right` / `bottom` / `left`)
- `display: flex` / `display: none`
- `gap` (uniform or per-axis)
- `measure` callbacks (for text leaves with intrinsic size)

## Install

```bash
bun add yoga-layout-tui
# or
npm install yoga-layout-tui
# or
pnpm add yoga-layout-tui
```

> **Note:** This package ships **raw TypeScript source** (no build step).
> Consume it from a tool that handles `.ts` natively — Bun, Deno, or any
> modern bundler (esbuild / Vite / webpack with ts-loader / Rollup with
> @rollup/plugin-typescript). For raw Node.js (≥ 22.6) you can use
> `node --experimental-strip-types`.

## Quick start

### Node-style (recommended)

```ts
import { FlexDirection, Justify, Node } from 'yoga-layout-tui';

const root = Node.create();
root.setWidth(80);
root.setHeight(24);
root.setFlexDirection(FlexDirection.Column);

const header = Node.create();
header.setHeight(1);
header.setJustifyContent(Justify.Center);

const body = Node.create();
body.setFlexGrow(1);
body.setFlexDirection(FlexDirection.Row);

const sidebar = Node.create().setWidth(20);
const main = Node.create().setFlexGrow(1);

const footer = Node.create().setHeight(1);

root.insertChild(header, 0);
body.insertChild(sidebar, 0);
body.insertChild(main, 1);
root.insertChild(body, 1);
root.insertChild(footer, 2);

root.calculateLayout(80, 24);

console.log(header.getComputedLayout());
// → { left: 0, top: 0, right: 80, bottom: 1, width: 80, height: 1 }
console.log(main.getComputedLayout());
// → { left: 20, top: 1, right: 80, bottom: 23, width: 60, height: 22 }
```

### Yoga namespace style (drop-in for `yoga-layout/load`)

```ts
import { Yoga, FlexDirection } from 'yoga-layout-tui';

const root = Yoga.Node.createDefault().setWidth(80).setHeight(24);
const child = Yoga.Node.createDefault().setFlexDirection(FlexDirection.Row);

root.insertChild(child, 0);
root.calculateLayout(80, 24);
```

## API surface

### Classes

- **`Node`** — the layout primitive. Set styles with chained setters, build
  the tree with `insertChild` / `removeChild`, run `calculateLayout(width, height)`,
  read the result with `getComputedLayout()`.

- **`Config`** — per-tree config. Currently a no-op placeholder for API
  parity with upstream Yoga (versioned cache invalidation hook lives here).

### Enums

`Direction`, `FlexDirection`, `Justify`, `Align`, `PositionType`, `Overflow`,
`Display`, `Unit`, `MeasureMode`, `PhysicalEdge`, `Gutter`.

All numeric values match upstream Yoga (so a `2` from the upstream package
maps to `FlexDirection.Row` here too).

### Value helpers

```ts
import { pointValue, percentValue, AUTO_VALUE, UNDEFINED_VALUE, parseDimensionInput } from 'yoga-layout-tui';

parseDimensionInput(100);          // Point(100)
parseDimensionInput('50%');        // Percent(50)
parseDimensionInput('auto');       // AUTO_VALUE
```

### Measure callbacks

For text leaves that know their intrinsic size (from font metrics):

```ts
const text = Node.create();
text.setMeasureFunc((availableWidth, wMode, availableHeight, hMode) => {
  // Return the text node's intrinsic pixel size given the available space.
  // `wMode` / `hMode` are `MeasureMode` (Undefined / Exactly / AtMost).
  return { width: computeTextWidth(), height: computeTextHeight() };
});
```

## Algorithm

11-STEP Flexbox layout pass, single-pass for `flex-grow` / `flex-shrink`
(matching upstream Yoga's simplified behavior; we skip the rare
two-pass resolution for spec-conformance edge cases).

```
STEP  1+2: available inner dimensions (after padding + border)
STEP    3: compute flex basis per child (flexBasis → width/height → measure)
STEP    5: resolve flex grow / shrink (single pass)
STEP    6: cross size + recursive layout for non-measure-func children
STEP    7: align children on cross axis
STEP    8: distribute main-axis offsets (justifyContent + gaps)
STEP    9: determine own final measured size
STEP   10: reverse-direction placement (RowReverse / ColumnReverse)
STEP   11: layout absolute children (find containing block, place)
```

See [`.claude/11-algorithm-mapping.md`](./.claude/11-algorithm-mapping.md)
for the C++ → TS function mapping.

## Local development

```bash
bun install              # install deps
bun test                 # all tests (185 unit + 12 e2e snapshots)
bun test tests/unit      # unit only
bun test tests/e2e       # snapshot only
bun run typecheck        # tsc --noEmit
bun run lint             # biome check src tests
bun run format           # biome format --write src tests
```

## Project layout

```
src/
├── index.ts                  ← package entry
├── public/yoga.ts            ← Yoga namespace (drop-in for yoga-layout/load)
├── enums.ts                  ← Direction / FlexDirection / Justify / ...
├── value.ts                  ← Point / Percent / Auto / Undefined + helpers
├── config/config.ts          ← Config class
├── node/
│   ├── node.ts               ← Node class (30+ setters, tree ops, layout)
│   ├── style.ts              ← Style interface + createDefaultStyle()
│   ├── layoutResults.ts      ← per-node mutable scratch + measure cache
│   └── cachedMeasurement.ts  ← one slot of the measure cache
├── numeric/
│   ├── comparison.ts         ← inexactEquals / maxOrDefined / minOrDefined
│   └── floatOptional.ts      ← isDefined / isUndefined
└── algorithm/
    ├── calculateLayout.ts    ← public entry (with generation counter)
    ├── calculateLayoutImpl.ts← 11-STEP orchestrator
    ├── boundAxis.ts          ← min/max clamp helper
    ├── cache.ts              ← canUseCachedMeasurement
    ├── flexDirection.ts      ← isRow / isReverse / resolveDirection
    ├── flexLine.ts           ← FlexLine interface
    ├── pixelGrid.ts          ← roundValueToPixelGrid
    ├── align.ts              ← cross-axis alignment (alignItems / alignSelf)
    └── absoluteLayout.ts     ← absolute child placement

tests/
├── unit/                     ← unit tests (one file per STEP / type)
└── e2e/                      ← snapshot tests (12 fixtures + ASCII grids)
```

Internal design docs live in `.claude/`:

- `00-index.md` — entry point
- `01-state.md` — current TODO + phase progress
- `10-architecture.md` — TS design decisions
- `11-algorithm-mapping.md` — C++ STEP → TS function map
- `20-api-surface.md` — public API spec
- `30-testing-strategy.md` — unit + e2e testing plan

## License

MIT © 2026 Chacha

Built as a focused TUI alternative to [yoga-layout](https://www.npmjs.com/package/yoga-layout).
The algorithm is a from-scratch TypeScript implementation; it does not
depend on or link against the upstream Yoga C++ source.