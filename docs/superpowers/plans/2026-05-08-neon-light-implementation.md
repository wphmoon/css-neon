# <neon-light> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web Component `<neon-light>` that renders text and SVG content with neon glow effects using Shadow DOM v1 and Custom Elements v1.

**Architecture:** Single custom element with light DOM content parsing. Content is mirrored into a Shadow DOM SVG with dual-layer rendering (blur glow back layer + sharp front layer). Config cascade: element-level attrs (text-*/svg-*) > host attrs > built-in defaults. No dependencies.

**Tech Stack:** Pure ES Modules, zero dependencies, browser-native APIs only (HTMLElement, customElements, Shadow DOM, SVG, ResizeObserver). Target: Chrome 54+, Firefox 63+, Safari 10.1+, Edge 79+.

---

## File Structure

```
E:\css-neon\
├── utils.js           # SVG namespace constant, DOM helpers
├── config.js          # Attribute defaults, cascading config resolver
├── animations.js      # Animation preset generators
├── renderer.js        # Light DOM → SVG conversion engine
├── neon-light.js      # Main NeonLight class extends HTMLElement
├── index.js           # Entry point: import + define
└── demo/
    └── index.html     # Visual test page
```

**Dependency graph:**
```
utils.js  (zero deps)
config.js (zero deps)
animations.js (zero deps)
renderer.js ← utils.js, config.js
neon-light.js ← renderer.js, animations.js, config.js, utils.js
index.js ← neon-light.js
```

---

### Task 1: utils.js — SVG namespace and DOM helpers

**Files:**
- Create: `E:\css-neon\utils.js`

- [ ] **Step 1: Write utils.js with SVG namespace and helper**

```js
const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

function setAttrs(el, attrs = {}) {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
}

function parseNumber(value, fallback) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? fallback : n;
}

function parseBoolean(value) {
  return value !== null && value !== 'false';
}

export { SVG_NS, createSvgElement, setAttrs, parseNumber, parseBoolean };
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\utils.js
git commit -m "feat: add utils.js with SVG helpers and value parsers"
```

---

### Task 2: config.js — Attribute defaults and cascading config

**Files:**
- Create: `E:\css-neon\config.js`

- [ ] **Step 1: Write config.js**

```js
const DEFAULTS = {
  color: '#ff69b4',
  glow: 10,
  blur: 4,
  animate: 'none',
  speed: 1,
  dashed: false,
  fontFamily: 'inherit',
  fontSize: 64,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textTransform: 'none',
  letterSpacing: 0,
  svgStrokeWidth: 10,
};

// Attributes that trigger re-render on change
const OBSERVED_ATTRS = [
  'color', 'glow', 'blur', 'animate', 'speed', 'dashed',
  'text-color', 'text-glow', 'text-blur', 'text-animate', 'text-speed', 'text-dashed',
  'svg-color', 'svg-glow', 'svg-blur', 'svg-animate', 'svg-speed', 'svg-dashed', 'svg-stroke-width',
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-transform', 'letter-spacing',
];

// Property map: 'text-color' → { target: 'text', prop: 'color' }
const PREFIX_MAP = {
  'text-color': ['text', 'color'],
  'text-glow': ['text', 'glow'],
  'text-blur': ['text', 'blur'],
  'text-animate': ['text', 'animate'],
  'text-speed': ['text', 'speed'],
  'text-dashed': ['text', 'dashed'],
  'svg-color': ['svg', 'color'],
  'svg-glow': ['svg', 'glow'],
  'svg-blur': ['svg', 'blur'],
  'svg-animate': ['svg', 'animate'],
  'svg-speed': ['svg', 'speed'],
  'svg-dashed': ['svg', 'dashed'],
  'svg-stroke-width': ['svg', 'svgStrokeWidth'],
};

// Read attribute value from element, fall through cascade chain
function readAttr(el, name) {
  return el.getAttribute(name);
}

function resolveConfig(el, contentType) {
  const get = (prop) => {
    if (contentType !== 'host') {
      const prefixed = `${contentType}-${prop}`;
      const val = readAttr(el, prefixed);
      if (val !== null) return val;
    }
    const val = readAttr(el, prop);
    if (val !== null) return val;
    return DEFAULTS[prop];
  };

  return {
    color: get('color'),
    glow: parseFloat(get('glow')),
    blur: parseFloat(get('blur')),
    animate: get('animate'),
    speed: parseFloat(get('speed')),
    dashed: get('dashed') !== null && get('dashed') !== 'false',
    fontFamily: get('fontFamily'),
    fontSize: parseFloat(get('fontSize')),
    fontWeight: get('fontWeight'),
    fontStyle: get('fontStyle'),
    textTransform: get('textTransform'),
    letterSpacing: parseFloat(get('letterSpacing')),
    svgStrokeWidth: parseFloat(get('svgStrokeWidth')),
  };
}

function resolveHostConfig(el) {
  return resolveConfig(el, 'host');
}

function resolveTextConfig(el) {
  return resolveConfig(el, 'text');
}

function resolveSvgConfig(el) {
  return resolveConfig(el, 'svg');
}

export {
  DEFAULTS, OBSERVED_ATTRS, PREFIX_MAP,
  resolveHostConfig, resolveTextConfig, resolveSvgConfig,
};
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\config.js
git commit -m "feat: add config.js with cascading attribute resolver"
```

---

### Task 3: animations.js — Animation preset generators

**Files:**
- Create: `E:\css-neon\animations.js`

- [ ] **Step 1: Write animations.js**

```js
function generateFlicker(speed) {
  const dur = (6 / speed).toFixed(2);
  return `
    @keyframes neon-flicker {
      0%, 13%, 26%, 37%, 58%, 77%, 100% { opacity: 1; }
      5%, 20%, 30%, 50%, 69%, 90%      { opacity: 0.25; }
    }
    @keyframes neon-flicker-glow {
      0%, 15%, 28%, 39%, 56%, 75%, 100% { opacity: 0.7; }
      7%, 22%, 32%, 48%, 66%, 88%       { opacity: 0.15; }
    }
    .neon-front { animation: neon-flicker ${dur}s infinite step-end; }
    .neon-back  { animation: neon-flicker-glow ${dur}s infinite 0.15s step-end; }
  `;
}

function generateBreath(speed) {
  const dur = (4 / speed).toFixed(2);
  return `
    @keyframes neon-breath {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
    @keyframes neon-breath-glow {
      0%, 100% { opacity: 0.75; }
      50%      { opacity: 0.2; }
    }
    .neon-front { animation: neon-breath ${dur}s infinite ease-in-out; }
    .neon-back  { animation: neon-breath-glow ${dur}s infinite 0.2s ease-in-out; }
  `;
}

function generateGlitch(speed) {
  const dur = (3 / speed).toFixed(2);
  return `
    @keyframes neon-glitch {
      0%, 15%, 55%, 85%          { opacity: 1; }
      8%, 23%, 48%, 75%, 92%     { opacity: 0.1; }
      35%, 67%                   { opacity: 0.7; }
    }
    @keyframes neon-glitch-color {
      0%, 15%, 55%, 85%          { stroke: inherit; }
      8%, 48%, 92%               { stroke: #fff; }
      23%, 75%                   { stroke: gold; }
      35%, 67%                   { stroke: currentColor; }
    }
    @keyframes neon-glitch-glow {
      0%, 17%, 53%, 82%          { opacity: 0.6; }
      10%, 25%, 50%, 72%, 90%    { opacity: 0.1; }
      38%, 65%                   { opacity: 0.4; }
    }
    .neon-front { animation: neon-glitch ${dur}s infinite step-end, neon-glitch-color ${dur}s infinite step-end; }
    .neon-back  { animation: neon-glitch-glow ${dur}s infinite 0.08s step-end; }
  `;
}

const ANIMATION_GENERATORS = {
  flicker: generateFlicker,
  breath: generateBreath,
  glitch: generateGlitch,
};

function generateAnimationStyle(animateName, speed) {
  if (!animateName || animateName === 'none') return '';
  const gen = ANIMATION_GENERATORS[animateName];
  return gen ? gen(speed) : '';
}

export { generateAnimationStyle };
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\animations.js
git commit -m "feat: add animations.js with flicker/breath/glitch presets"
```

---

### Task 4: renderer.js — Light DOM to SVG rendering engine

**Files:**
- Create: `E:\css-neon\renderer.js`

- [ ] **Step 1: Write renderer.js**

```js
import { SVG_NS, createSvgElement, setAttrs } from './utils.js';
import { resolveTextConfig, resolveSvgConfig } from './config.js';

function renderLightDom(el) {
  const textCfg = resolveTextConfig(el);
  const svgCfg = resolveSvgConfig(el);
  const backGroup = createSvgElement('g', { class: 'neon-back' });
  const frontGroup = createSvgElement('g', { class: 'neon-front' });

  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (!text.trim()) continue;
      appendTextLayers(backGroup, frontGroup, text, textCfg);
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'svg') {
      appendSvgLayers(backGroup, frontGroup, child, svgCfg);
    }
  }

  return { backGroup, frontGroup, textCfg, svgCfg };
}

function appendTextLayers(backGroup, frontGroup, text, cfg) {
  const textAttrs = buildTextAttrs(cfg);
  // Back layer: blur + glow via filter + thick stroke
  const backText = createSvgElement('text', {
    ...textAttrs,
    stroke: cfg.color,
    'stroke-width': cfg.blur * 2,
    filter: 'url(#neon-blur)',
    'text-anchor': 'middle',
  });
  backText.textContent = text;
  backGroup.appendChild(backText);

  // Front layer: thin stroke, no blur
  const frontText = createSvgElement('text', {
    ...textAttrs,
    stroke: cfg.color,
    'stroke-width': 2,
    'text-anchor': 'middle',
  });
  frontText.textContent = text;
  frontGroup.appendChild(frontText);
}

function buildTextAttrs(cfg) {
  return {
    'font-family': cfg.fontFamily,
    'font-size': `${cfg.fontSize}px`,
    'font-weight': cfg.fontWeight,
    'font-style': cfg.fontStyle,
    'text-transform': cfg.textTransform,
    'letter-spacing': `${cfg.letterSpacing}px`,
    fill: cfg.color,
    'fill-opacity': '0.4',
  };
}

function appendSvgLayers(backGroup, frontGroup, sourceSvg, cfg) {
  const shapes = sourceSvg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
  for (const shape of shapes) {
    const pathData = extractShapeAttrs(shape);
    // Back layer
    const backEl = createSvgElement(shape.tagName, {
      ...pathData,
      fill: 'none',
      stroke: cfg.color,
      'stroke-width': cfg.svgStrokeWidth,
      filter: 'url(#neon-blur)',
    });
    if (cfg.dashed) {
      backEl.setAttribute('stroke-dasharray', '180 100');
    }
    backGroup.appendChild(backEl);

    // Front layer
    const frontEl = createSvgElement(shape.tagName, {
      ...pathData,
      fill: shape.getAttribute('fill') || 'none',
      stroke: cfg.color,
      'stroke-width': Math.max(2, cfg.svgStrokeWidth * 0.5),
    });
    if (cfg.dashed) {
      frontEl.setAttribute('stroke-dasharray', '180 100');
    }
    frontGroup.appendChild(frontEl);
  }
}

function extractShapeAttrs(shape) {
  const attrs = {};
  for (const { name, value } of shape.attributes) {
    if (name === 'fill' || name === 'stroke') continue;
    attrs[name] = value;
  }
  if (shape.tagName.toLowerCase() === 'circle') {
    attrs.d = '';
  }
  return attrs;
}

function buildSvgSurface(hostWidth, hostHeight) {
  const svg = createSvgElement('svg', {
    class: 'neon-surface',
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${hostWidth} ${hostHeight}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  return svg;
}

function buildDefs(blurAmount) {
  const defs = createSvgElement('defs');
  const filter = createSvgElement('filter', { id: 'neon-blur' });
  const blur = createSvgElement('feGaussianBlur', {
    in: 'SourceGraphic',
    stdDeviation: String(blurAmount),
  });
  filter.appendChild(blur);
  defs.appendChild(filter);
  return defs;
}

export { renderLightDom, buildSvgSurface, buildDefs };
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\renderer.js
git commit -m "feat: add renderer.js for light DOM to SVG conversion"
```

---

### Task 5: neon-light.js — Main component class

**Files:**
- Create: `E:\css-neon\neon-light.js`

- [ ] **Step 1: Write neon-light.js**

```js
import { createSvgElement } from './utils.js';
import { OBSERVED_ATTRS, resolveHostConfig } from './config.js';
import { generateAnimationStyle } from './animations.js';
import { renderLightDom, buildSvgSurface, buildDefs } from './renderer.js';

const BASE_STYLES = `
  :host {
    display: inline-block;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
  }
  :host([hidden]) { display: none; }
  svg.neon-surface {
    display: block;
    width: 100%;
    height: 100%;
  }
  .neon-back {
    opacity: var(--neon-back-opacity, 0.6);
  }
  .neon-front {
    opacity: var(--neon-front-opacity, 1);
  }
`;

class NeonLight extends HTMLElement {
  static observedAttributes = OBSERVED_ATTRS;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._observer = null;
    this._svg = null;
  }

  connectedCallback() {
    this._render();
    this._startObserver();
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this._svg) {
      this._render();
    }
  }

  _render() {
    const cfg = resolveHostConfig(this);
    const rect = this.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 150;

    // Bridge config values to CSS custom properties (user style attr takes precedence)
    this._syncCssProps(cfg);

    // Build SVG surface
    this._svg = buildSvgSurface(width, height);
    const defs = buildDefs(cfg.blur);
    this._svg.appendChild(defs);

    // Render light DOM content into dual layers
    const { backGroup, frontGroup } = renderLightDom(this);
    this._svg.appendChild(backGroup);
    this._svg.appendChild(frontGroup);

    // Inject animation styles
    const animCSS = generateAnimationStyle(cfg.animate, cfg.speed);
    const styleEl = document.createElement('style');
    styleEl.textContent = BASE_STYLES + animCSS;

    // Replace shadow content
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(styleEl);
    this.shadowRoot.appendChild(this._svg);

    // Adjust text y-position after render
    this._adjustTextPositions(width, height);
  }

  _adjustTextPositions(width, height) {
    const texts = this.shadowRoot.querySelectorAll('text');
    const y = height * 0.6;
    for (const text of texts) {
      text.setAttribute('y', String(y));
    }
  }

  _syncCssProps(cfg) {
    // Only set a custom property if the user hasn't explicitly set it via style attr
    const sync = (name, value) => {
      if (!this.style.getPropertyValue(name)) {
        this.style.setProperty(name, value);
      }
    };
    sync('--neon-color', cfg.color);
    sync('--neon-blur-amount', String(cfg.blur));
    sync('--neon-stroke-width', String(cfg.svgStrokeWidth));
    sync('--neon-dash-length', '180');
    sync('--neon-dash-gap', '100');
  }

  _startObserver() {
    if (this._observer) return;
    this._observer = new ResizeObserver(() => {
      if (this._svg) this._render();
    });
    this._observer.observe(this);
  }
}

export { NeonLight };
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\neon-light.js
git commit -m "feat: add neon-light.js main component class"
```

---

### Task 6: index.js — Entry point

**Files:**
- Create: `E:\css-neon\index.js`

- [ ] **Step 1: Write index.js**

```js
import { NeonLight } from './neon-light.js';

function define(name = 'neon-light', element = NeonLight) {
  if (typeof customElements !== 'undefined' && !customElements.get(name)) {
    customElements.define(name, element);
  }
}

define();

export { NeonLight, define };
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\index.js
git commit -m "feat: add index.js entry point with auto-define"
```

---

### Task 7: demo/index.html — Visual test page

**Files:**
- Create: `E:\css-neon\demo\index.html`

- [ ] **Step 1: Write demo page**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>neon-light Demo</title>
  <style>
    body {
      background: #0a0a0a;
      margin: 0;
      padding: 40px;
      font-family: sans-serif;
    }
    h2 { color: #666; margin: 40px 0 16px; font-size: 16px; }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: center;
    }
    .card {
      background: #111;
      border-radius: 12px;
      padding: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>

  <h2>1. Basic text neon</h2>
  <div class="card">
    <neon-light color="#ff69b4" glow="12" font-size="72" style="width:600px;height:120px">
      霓虹灯效果
    </neon-light>
  </div>

  <h2>2. Animated — flicker</h2>
  <div class="card">
    <neon-light color="#00ffcc" glow="15" animate="flicker" font-size="64" style="width:600px;height:120px">
      FLICKER
    </neon-light>
  </div>

  <h2>3. Animated — breath</h2>
  <div class="card">
    <neon-light color="#ffaa00" glow="12" animate="breath" font-size="64" style="width:600px;height:120px">
      BREATH
    </neon-light>
  </div>

  <h2>4. Animated — glitch</h2>
  <div class="card">
    <neon-light color="#ff3355" glow="14" animate="glitch" font-size="64" style="width:600px;height:120px">
      GLITCH
    </neon-light>
  </div>

  <h2>5. Text + SVG icon</h2>
  <div class="card">
    <neon-light color="#ff69b4" glow="12" animate="flicker"
                font-family="YouYuan" font-size="64" style="width:700px;height:120px">
      巴黎の玫瑰
    </neon-light>
  </div>

  <h2>6. Text and SVG with independent config</h2>
  <div class="card">
    <neon-light
      color="#ff69b4" glow="10"
      text-color="#00ffcc" text-animate="breath"
      svg-color="#ff4444" svg-glow="20" svg-animate="glitch"
      font-size="48" style="width:700px;height:120px">
      NEON
      <svg viewBox="0 0 24 24" width="48" height="48">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </neon-light>
  </div>

  <h2>7. Dashed effect</h2>
  <div class="card">
    <neon-light color="#ff69b4" glow="10" dashed font-size="64" style="width:600px;height:120px">
      BROKEN NEON
    </neon-light>
  </div>

  <script type="module" src="../index.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```
git add E:\css-neon\demo\index.html
git commit -m "feat: add demo page with all effect variants"
```

---

### Task 8: Verification — open demo and check all effects

- [ ] **Step 1: Start a static file server**

```
npx serve E:/css-neon -p 3000
```

- [ ] **Step 2: Open demo page in browser**

Open `http://localhost:3000/demo/` and verify:
- [ ] Static text neon displays with pink glow
- [ ] Flicker animation: text opacity jumps irregularly
- [ ] Breath animation: text fades in/out smoothly
- [ ] Glitch animation: text strobes with color shifts
- [ ] Text + SVG icon renders both with matching glow
- [ ] Independent text/svg config shows different colors/animations
- [ ] Dashed effect shows broken-tube style neon
- [ ] Resize browser window — neon SVG adjusts size
