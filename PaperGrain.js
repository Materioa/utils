/**
 * PaperGrain.js — Gaussian Noise Texture Library
 * ES6+ Module | Transparent background support
 * @version 1.0.0
 * @author PaperGrain
 *
 * Usage:
 *   import PaperGrain from './PaperGrain.js';
 *
 *   const grain = new PaperGrain('#my-element', { density: 30, grainSize: 1, opacity: 0.12 });
 *   grain.render();
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** @enum {string} Noise mode identifiers */
export const NoiseMode = Object.freeze({
  GAUSSIAN: 'gaussian',
  PERLIN:   'perlin',
  FILM:     'film',
});

/** Default options */
export const DEFAULTS = Object.freeze({
  mode:       NoiseMode.GAUSSIAN,
  density:    30,          // 1–100  — percentage of pixels that receive noise
  grainSize:  1,           // 1–20   — pixel cluster size (px)
  opacity:    0.12,        // 0–1    — alpha of noise layer
  color:      null,        // null = transparent | '#rrggbb' = solid fill behind noise
  width:      512,         // canvas width  (px) — ignored when targeting a DOM element
  height:     512,         // canvas height (px) — ignored when targeting a DOM element
  animate:    false,       // re-render every animation frame (live grain)
  fps:        24,          // target fps when animate:true
  seed:       null,        // number | null — deterministic seed (null = random each call)
  blendMode:  'source-over', // CSS globalCompositeOperation for noise layer
  monochrome: true,        // true = grey grain | false = chromatic grain (slight RGB shift)
  octaves:    1,           // Perlin only — octaves for fBm (1–6)
  persistence: 0.5,        // Perlin only — amplitude falloff per octave
  frequency:  0.015,       // Perlin only — base frequency
  onRender:   null,        // callback(canvas, ctx) after each render
});

// ─── PRNG (seeded) ────────────────────────────────────────────────────────────

/**
 * Mulberry32 seeded PRNG — returns a function that produces [0,1) floats.
 * @param {number} seed
 * @returns {() => number}
 */
export function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform — Gaussian random using a PRNG.
 * @param {() => number} rand
 * @returns {number} Normal(0,1)
 */
export function gaussianRandom(rand) {
  const u1 = Math.max(1e-10, rand());
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Perlin Noise ─────────────────────────────────────────────────────────────

/**
 * Build a Perlin permutation table from a PRNG.
 * @param {() => number} rand
 * @returns {Uint8Array}
 */
export function buildPermTable(rand) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _lerp(a, b, t) { return a + t * (b - a); }
function _grad(hash, x, y) {
  const h = hash & 3;
  return ((h & 1) ? -(h < 2 ? x : y) : (h < 2 ? x : y)) +
         ((h & 2) ? -(h < 2 ? y : x) : (h < 2 ? y : x));
}

/**
 * Single-octave Perlin noise at (x, y) using a pre-built perm table.
 * @param {Uint8Array} perm
 * @param {number} x
 * @param {number} y
 * @returns {number} [-1, 1]
 */
export function perlinNoise(perm, x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x),   yf = y - Math.floor(y);
  const u = _fade(xf), v = _fade(yf);
  const aa = perm[perm[xi] + yi],     ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
  return _lerp(
    _lerp(_grad(aa, xf, yf),     _grad(ba, xf - 1, yf),     u),
    _lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u),
    v
  );
}

/**
 * Fractional Brownian Motion — layered Perlin octaves.
 * @param {Uint8Array} perm
 * @param {number} x
 * @param {number} y
 * @param {number} octaves
 * @param {number} persistence
 * @returns {number} approximately [-1, 1]
 */
export function fBm(perm, x, y, octaves = 1, persistence = 0.5) {
  let value = 0, amplitude = 1, max = 0, freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += perlinNoise(perm, x * freq, y * freq) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    freq *= 2;
  }
  return value / max;
}

// ─── Core Render Functions ────────────────────────────────────────────────────

/**
 * Apply Gaussian noise to an ImageData buffer.
 * @param {ImageData}    imageData
 * @param {object}       opts       — density, grainSize, opacity, monochrome, color
 * @param {() => number} rand       — PRNG function
 */
export function applyGaussianNoise(imageData, opts, rand) {
  const { density, grainSize, opacity, monochrome, color } = opts;
  const w = imageData.width, h = imageData.height;
  const d = imageData.data;
  const densityFrac = density / 100;
  const [bgR, bgG, bgB, hasColor] = color ? [...hexToRgba(color), true] : [0, 0, 0, false];

  for (let py = 0; py < h; py += grainSize) {
    for (let px = 0; px < w; px += grainSize) {
      if (rand() > densityFrac) continue;
      const noise = Math.max(-1, Math.min(1, gaussianRandom(rand) * 0.5));
      const base = noise * 255;
      const rAdj = monochrome ? base : base + (rand() - 0.5) * 20;
      const gAdj = monochrome ? base : base + (rand() - 0.5) * 20;
      const bAdj = monochrome ? base : base + (rand() - 0.5) * 20;

      for (let dy = 0; dy < grainSize && py + dy < h; dy++) {
        for (let dx = 0; dx < grainSize && px + dx < w; dx++) {
          const i = ((py + dy) * w + (px + dx)) * 4;
          if (hasColor) {
            d[i]   = Math.max(0, Math.min(255, bgR + rAdj));
            d[i+1] = Math.max(0, Math.min(255, bgG + gAdj));
            d[i+2] = Math.max(0, Math.min(255, bgB + bAdj));
            d[i+3] = 255;
          } else {
            // Transparent: encode brightness as alpha, mid-grey as base
            const bright = Math.round(clamp(noise, -1, 1) * 255);
            d[i]   = bright >= 0 ? 255 : 0;
            d[i+1] = bright >= 0 ? 255 : 0;
            d[i+2] = bright >= 0 ? 255 : 0;
            d[i+3] = Math.round(Math.abs(bright) * opacity);
          }
        }
      }
    }
  }
}

/**
 * Apply Perlin noise to an ImageData buffer.
 * @param {ImageData}  imageData
 * @param {object}     opts  — density, grainSize, opacity, monochrome, color, octaves, persistence, frequency
 * @param {Uint8Array} perm  — permutation table
 * @param {() => number} rand
 */
export function applyPerlinNoise(imageData, opts, perm, rand) {
  const { grainSize, opacity, monochrome, color, octaves, persistence, frequency } = opts;
  const w = imageData.width, h = imageData.height;
  const d = imageData.data;
  const freq = frequency / grainSize;
  const [bgR, bgG, bgB, hasColor] = color ? [...hexToRgba(color), true] : [0, 0, 0, false];

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const n = fBm(perm, px * freq, py * freq, octaves, persistence);
      const i = (py * w + px) * 4;
      if (hasColor) {
        const adj = n * 255 * opacity;
        d[i]   = Math.max(0, Math.min(255, bgR + adj));
        d[i+1] = Math.max(0, Math.min(255, bgG + (monochrome ? adj : adj + (rand()-0.5)*15)));
        d[i+2] = Math.max(0, Math.min(255, bgB + (monochrome ? adj : adj + (rand()-0.5)*15)));
        d[i+3] = 255;
      } else {
        d[i]   = n >= 0 ? 255 : 0;
        d[i+1] = n >= 0 ? 255 : 0;
        d[i+2] = n >= 0 ? 255 : 0;
        d[i+3] = Math.round(Math.abs(n) * opacity * 255);
      }
    }
  }
}

/**
 * Apply Film Grain noise to an ImageData buffer.
 * @param {ImageData}    imageData
 * @param {object}       opts  — density, grainSize, opacity, monochrome, color
 * @param {() => number} rand
 */
export function applyFilmGrain(imageData, opts, rand) {
  const { density, grainSize, opacity, monochrome, color } = opts;
  const w = imageData.width, h = imageData.height;
  const d = imageData.data;
  const densityFrac = density / 100;
  const [bgR, bgG, bgB, hasColor] = color ? [...hexToRgba(color), true] : [0, 0, 0, false];

  for (let py = 0; py < h; py += grainSize) {
    for (let px = 0; px < w; px += grainSize) {
      const roll = rand();
      let brightness = 0;
      if (roll < densityFrac * 0.5)       brightness =  (rand() * 0.8 + 0.2);  // bright speck
      else if (roll < densityFrac)        brightness = -(rand() * 0.8 + 0.2);  // dark speck

      for (let dy = 0; dy < grainSize && py + dy < h; dy++) {
        for (let dx = 0; dx < grainSize && px + dx < w; dx++) {
          const i = ((py + dy) * w + (px + dx)) * 4;
          if (hasColor) {
            const adj = brightness * 255 * opacity;
            d[i]   = clamp(bgR + (monochrome ? adj : adj + (rand()-0.5)*20), 0, 255);
            d[i+1] = clamp(bgG + (monochrome ? adj : adj + (rand()-0.5)*20), 0, 255);
            d[i+2] = clamp(bgB + (monochrome ? adj : adj + (rand()-0.5)*20), 0, 255);
            d[i+3] = 255;
          } else {
            d[i]   = brightness >= 0 ? 255 : 0;
            d[i+1] = brightness >= 0 ? 255 : 0;
            d[i+2] = brightness >= 0 ? 255 : 0;
            d[i+3] = Math.round(Math.abs(brightness) * opacity * 255);
          }
        }
      }
    }
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/** @param {number} v @param {number} min @param {number} max */
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * Parse a hex color string to [r, g, b].
 * @param {string} hex — '#rrggbb' or '#rgb'
 * @returns {[number, number, number]}
 */
export function hexToRgba(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Generate noise directly onto an OffscreenCanvas (or regular Canvas).
 * Returns a Promise<ImageBitmap> (or ImageData if OffscreenCanvas unavailable).
 *
 * @param {object} opts — any PaperGrain options
 * @returns {Promise<{canvas: HTMLCanvasElement|OffscreenCanvas, imageData: ImageData}>}
 */
export async function generateNoiseTexture(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const seed = o.seed != null ? o.seed : Math.random() * 0xffffffff;
  const rand = createPRNG(seed);
  const w = o.width, h = o.height;

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const imageData = ctx.createImageData(w, h);

  switch (o.mode) {
    case NoiseMode.PERLIN: {
      const perm = buildPermTable(rand);
      applyPerlinNoise(imageData, o, perm, rand);
      break;
    }
    case NoiseMode.FILM:
      applyFilmGrain(imageData, o, rand);
      break;
    case NoiseMode.GAUSSIAN:
    default:
      applyGaussianNoise(imageData, o, rand);
  }

  ctx.putImageData(imageData, 0, 0);
  return { canvas, imageData };
}

/**
 * Render noise as a CSS `background` data URL (transparent PNG).
 * Useful for injecting as a background-image without a canvas element.
 *
 * @param {object} opts
 * @returns {Promise<string>} data URL
 */
export async function generateNoiseDataURL(opts = {}) {
  const { canvas } = await generateNoiseTexture(opts);
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
  return canvas.toDataURL('image/png');
}

/**
 * Apply noise texture as a CSS background-image overlay to a DOM element.
 * The element gets `position: relative` and a pseudo-overlay `<canvas>` child.
 *
 * @param {HTMLElement|string} target — element or CSS selector
 * @param {object}             opts
 * @returns {Promise<PaperGrain>} — PaperGrain instance for chaining / cleanup
 */
export async function applyNoiseToElement(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`PaperGrain: target "${target}" not found`);
  const grain = new PaperGrain(el, opts);
  await grain.render();
  return grain;
}

// ─── PaperGrain Class ─────────────────────────────────────────────────────────

/**
 * PaperGrain — main class.
 *
 * @example
 * const grain = new PaperGrain('#hero', { mode: 'gaussian', density: 25, opacity: 0.1 });
 * grain.render();
 *
 * // Update options live
 * grain.set({ density: 50 }).render();
 *
 * // Animate (re-renders every frame)
 * grain.animate();
 *
 * // Export current texture
 * const dataURL = await grain.toDataURL();
 *
 * // Destroy and clean up
 * grain.destroy();
 */
export class PaperGrain {
  /**
   * @param {HTMLElement|string|null} target
   *   The DOM element (or selector) to overlay noise onto.
   *   Pass `null` to use in headless / offscreen mode.
   * @param {Partial<typeof DEFAULTS>} opts
   */
  constructor(target = null, opts = {}) {
    this._opts    = { ...DEFAULTS, ...opts };
    this._target  = null;
    this._canvas  = null;
    this._ctx     = null;
    this._rafId   = null;
    this._lastRaf = 0;
    this._perm    = null;
    this._rand    = null;
    this._isAnimating = false;

    if (target) {
      this._target = typeof target === 'string'
        ? document.querySelector(target)
        : target;
      if (!this._target) throw new Error(`PaperGrain: target "${target}" not found`);
      this._mountCanvas();
    } else {
      // Headless mode — standalone canvas
      this._canvas = document.createElement('canvas');
      this._canvas.width  = this._opts.width;
      this._canvas.height = this._opts.height;
      this._ctx = this._canvas.getContext('2d');
    }

    this._initNoise();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _mountCanvas() {
    const el = this._target;
    const style = getComputedStyle(el);
    if (style.position === 'static') el.style.position = 'relative';

    this._canvas = document.createElement('canvas');
    const cs = this._canvas.style;
    cs.position   = 'absolute';
    cs.inset      = '0';
    cs.width      = '100%';
    cs.height     = '100%';
    cs.pointerEvents = 'none';
    cs.zIndex     = this._opts.zIndex ?? '0';

    // Match element size
    const rect = el.getBoundingClientRect();
    this._canvas.width  = Math.round(rect.width)  || this._opts.width;
    this._canvas.height = Math.round(rect.height) || this._opts.height;

    el.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._resizeObserver = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        this._canvas.width  = Math.round(width);
        this._canvas.height = Math.round(height);
        this._initNoise();
        if (!this._isAnimating) this._draw();
      }
    });
    this._resizeObserver.observe(el);
  }

  _initNoise() {
    const seed = this._opts.seed != null ? this._opts.seed : Math.random() * 0xffffffff;
    this._rand = createPRNG(seed);
    if (this._opts.mode === NoiseMode.PERLIN) {
      this._perm = buildPermTable(this._rand);
    }
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._canvas.width, h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    const imageData = ctx.createImageData(w, h);
    const o = this._opts;

    switch (o.mode) {
      case NoiseMode.PERLIN:
        if (!this._perm) this._perm = buildPermTable(this._rand);
        applyPerlinNoise(imageData, o, this._perm, this._rand);
        break;
      case NoiseMode.FILM:
        applyFilmGrain(imageData, o, this._rand);
        break;
      default:
        applyGaussianNoise(imageData, o, this._rand);
    }

    ctx.putImageData(imageData, 0, 0);

    if (typeof o.onRender === 'function') o.onRender(this._canvas, ctx);
    return this;
  }

  _animate(timestamp) {
    if (!this._isAnimating) return;
    const interval = 1000 / this._opts.fps;
    if (timestamp - this._lastRaf >= interval) {
      this._lastRaf = timestamp;
      // Re-seed for each frame so grain flickers
      this._rand = createPRNG(Math.random() * 0xffffffff);
      if (this._opts.mode === NoiseMode.PERLIN) this._perm = buildPermTable(this._rand);
      this._draw();
    }
    this._rafId = requestAnimationFrame(ts => this._animate(ts));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Update one or more options without re-rendering.
   * @param {Partial<typeof DEFAULTS>} opts
   * @returns {PaperGrain} — this (chainable)
   */
  set(opts = {}) {
    Object.assign(this._opts, opts);
    this._initNoise();
    return this;
  }

  /**
   * Get a copy of current options.
   * @returns {object}
   */
  get options() {
    return { ...this._opts };
  }

  /**
   * Render the noise texture immediately.
   * @returns {PaperGrain} — this (chainable)
   */
  render() {
    this._initNoise();
    return this._draw();
  }

  /**
   * Start animated (live flickering) grain.
   * @param {number} [fps] — override fps option
   * @returns {PaperGrain}
   */
  animate(fps) {
    if (fps != null) this._opts.fps = fps;
    this._isAnimating = true;
    this._rafId = requestAnimationFrame(ts => this._animate(ts));
    return this;
  }

  /**
   * Stop animation, keep last frame visible.
   * @returns {PaperGrain}
   */
  stop() {
    this._isAnimating = false;
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    return this;
  }

  /**
   * Export current canvas as a PNG data URL.
   * @returns {string}
   */
  toDataURL(type = 'image/png', quality = 1) {
    return this._canvas.toDataURL(type, quality);
  }

  /**
   * Export current canvas as a Blob.
   * @param {string} type
   * @returns {Promise<Blob>}
   */
  toBlob(type = 'image/png') {
    return new Promise(resolve => this._canvas.toBlob(resolve, type));
  }

  /**
   * Trigger browser download of the current texture.
   * @param {string} [filename]
   */
  download(filename = 'paper-grain.png') {
    this.toBlob().then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  }

  /**
   * Return the underlying HTMLCanvasElement.
   * @returns {HTMLCanvasElement}
   */
  get canvas() { return this._canvas; }

  /**
   * Return canvas 2D context.
   * @returns {CanvasRenderingContext2D}
   */
  get ctx() { return this._ctx; }

  /**
   * Remove the canvas overlay and stop all activity.
   */
  destroy() {
    this.stop();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx    = null;
    this._target = null;
  }
}

// ─── Default Export ───────────────────────────────────────────────────────────
export default PaperGrain;
