# PaperGrain.js

> Lightweight ES6+ module for Gaussian, Perlin, and Film Grain noise textures with **transparent background support**.

## Install

Copy `PaperGrain.js` into your project. No build step needed.

```html
<script type="module" src="./PaperGrain.js"></script>
```

Or import directly:

```js
import PaperGrain, { NoiseMode, generateNoiseDataURL, applyNoiseToElement } from './PaperGrain.js';
```

---

## Quick Start

```js
// Overlay transparent grain onto any element
const grain = new PaperGrain('#hero', { density: 30, opacity: 0.12 });
grain.render();
```

---

## Options

| Option        | Type       | Default      | Description |
|---------------|------------|--------------|-------------|
| `mode`        | `string`   | `'gaussian'` | `'gaussian'` \| `'perlin'` \| `'film'` |
| `density`     | `number`   | `30`         | 1–100 — % of pixels that receive noise |
| `grainSize`   | `number`   | `1`          | 1–20 — pixel cluster size (px) |
| `opacity`     | `number`   | `0.12`       | 0–1 — noise alpha |
| `color`       | `string\|null` | `null`   | `null` = **transparent** \| `'#rrggbb'` = solid fill |
| `width`       | `number`   | `512`        | Canvas width (headless mode) |
| `height`      | `number`   | `512`        | Canvas height (headless mode) |
| `animate`     | `boolean`  | `false`      | Live flickering grain |
| `fps`         | `number`   | `24`         | Animation frame rate |
| `seed`        | `number\|null` | `null`   | Deterministic seed (null = random) |
| `monochrome`  | `boolean`  | `true`       | `false` = chromatic RGB grain |
| `blendMode`   | `string`   | `'source-over'` | Canvas globalCompositeOperation |
| `octaves`     | `number`   | `1`          | Perlin: fBm octave layers (1–6) |
| `persistence` | `number`   | `0.5`        | Perlin: amplitude falloff per octave |
| `frequency`   | `number`   | `0.015`      | Perlin: base frequency |
| `onRender`    | `function\|null` | `null` | `(canvas, ctx) => void` callback |
| `zIndex`      | `number`   | `0`          | z-index of overlay canvas |

---

## API

### `new PaperGrain(target, opts)`
Mount noise overlay onto a DOM element or selector.

### `.render()` → `this`
Render once. Chainable.

### `.set(opts)` → `this`
Update options. Chainable. Call `.render()` after to apply.

### `.animate(fps?)` → `this`
Start live flickering animation.

### `.stop()` → `this`
Stop animation.

### `.toDataURL(type?, quality?)` → `string`
Export as data URL.

### `.toBlob(type?)` → `Promise<Blob>`
Export as Blob.

### `.download(filename?)`
Trigger browser download.

### `.destroy()`
Remove canvas overlay and disconnect observers.

### `.canvas` / `.ctx`
Access underlying `HTMLCanvasElement` / `CanvasRenderingContext2D`.

### `.options`
Get copy of current options.

---

## Standalone Functions

```js
import { generateNoiseTexture, generateNoiseDataURL, applyNoiseToElement } from './PaperGrain.js';

// Get {canvas, imageData}
const { canvas } = await generateNoiseTexture({ width: 512, height: 512, opacity: 0.1 });

// Get PNG data URL (for CSS background-image)
const url = await generateNoiseDataURL({ mode: 'film', density: 40, opacity: 0.15 });
document.body.style.backgroundImage = `url(${url})`;

// One-liner DOM overlay
await applyNoiseToElement('#card', { mode: 'gaussian', density: 25 });
```

---

## Named Exports

| Export | Type | Description |
|--------|------|-------------|
| `PaperGrain` | `class` | Main class (default export too) |
| `NoiseMode` | `const enum` | `GAUSSIAN`, `PERLIN`, `FILM` |
| `DEFAULTS` | `object` | Default option values |
| `createPRNG` | `function` | Seeded PRNG (Mulberry32) |
| `gaussianRandom` | `function` | Box-Muller Gaussian sample |
| `buildPermTable` | `function` | Perlin permutation table |
| `perlinNoise` | `function` | Single-octave Perlin at (x, y) |
| `fBm` | `function` | Fractional Brownian Motion |
| `applyGaussianNoise` | `function` | Fill ImageData with Gaussian noise |
| `applyPerlinNoise` | `function` | Fill ImageData with Perlin noise |
| `applyFilmGrain` | `function` | Fill ImageData with Film grain |
| `generateNoiseTexture` | `async function` | Returns `{canvas, imageData}` |
| `generateNoiseDataURL` | `async function` | Returns PNG data URL string |
| `applyNoiseToElement` | `async function` | DOM overlay helper |
| `hexToRgba` | `function` | Hex color → [r,g,b] |
| `clamp` | `function` | Clamp value to range |

---
