import { SVG_NS, createSvgElement } from './utils.js';
import { resolveTextConfig, resolveSvgConfig } from './config.js';

const ITEM_GAP = 16;

function renderLightDom(el, width, height) {
  const textCfg = resolveTextConfig(el);
  const svgCfg = resolveSvgConfig(el);
  const backGroup = createSvgElement('g', { class: 'neon-back' });
  const frontGroup = createSvgElement('g', { class: 'neon-front' });

  // Collect items with estimated widths
  const items = collectItems(el, textCfg);
  const totalWidth = items.reduce((sum, it) => sum + it.width, 0) + Math.max(0, items.length - 1) * ITEM_GAP;
  let x = Math.max(0, (width - totalWidth) / 2);
  const y = height * 0.62;

  for (const item of items) {
    if (item.type === 'text') {
      appendTextLayers(backGroup, frontGroup, item.text, textCfg, x + item.width / 2, y);
    } else if (item.type === 'svg') {
      appendNestedSvg(backGroup, frontGroup, item.el, svgCfg, x, y);
    }
    x += item.width + ITEM_GAP;
  }

  return { backGroup, frontGroup };
}

function collectItems(el, textCfg) {
  const items = [];
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (!text.trim()) continue;
      const width = estimateTextWidth(text, textCfg.fontSize);
      items.push({ type: 'text', text, width });
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'svg') {
      const w = parseFloat(child.getAttribute('width')) || 64;
      items.push({ type: 'svg', el: child, width: w });
    }
  }
  return items;
}

function estimateTextWidth(text, fontSize) {
  let len = 0;
  for (const ch of text) {
    len += /[一-鿿　-〿＀-￯]/.test(ch) ? 1 : 0.55;
  }
  return len * fontSize;
}

function appendTextLayers(backGroup, frontGroup, text, cfg, cx, y) {
  const base = buildTextAttrs(cfg, cx, y);

  const backText = createSvgElement('text', {
    ...base,
    stroke: cfg.color,
    'stroke-width': cfg.blur * 2,
    filter: 'url(#neon-blur)',
  });
  backText.textContent = text;
  backGroup.appendChild(backText);

  const frontText = createSvgElement('text', {
    ...base,
    stroke: cfg.color,
    'stroke-width': 2,
  });
  frontText.textContent = text;
  frontGroup.appendChild(frontText);
}

function buildTextAttrs(cfg, x, y) {
  return {
    'font-family': cfg.fontFamily,
    'font-size': `${cfg.fontSize}px`,
    'font-weight': cfg.fontWeight,
    'font-style': cfg.fontStyle,
    'text-transform': cfg.textTransform,
    'letter-spacing': `${cfg.letterSpacing}px`,
    fill: cfg.color,
    'fill-opacity': '0.4',
    'text-anchor': 'middle',
    x: String(x),
    y: String(y),
  };
}

function appendNestedSvg(backGroup, frontGroup, sourceSvg, cfg, x, y) {
  const vbox = sourceSvg.getAttribute('viewBox') || '0 0 24 24';
  const sw = parseFloat(sourceSvg.getAttribute('width')) || 64;
  const sh = parseFloat(sourceSvg.getAttribute('height')) || 64;
  const shapes = Array.from(sourceSvg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon'));

  // Nested SVG element for back layer
  const backSvg = createSvgElement('svg', {
    x: String(x), y: String(y - sh / 2),
    width: String(sw), height: String(sh),
    viewBox: vbox,
  });
  const backG = createSvgElement('g', {
    fill: 'none',
    stroke: cfg.color,
    'stroke-width': String(cfg.svgStrokeWidth),
    filter: 'url(#neon-blur)',
  });
  for (const shape of shapes) {
    backG.appendChild(cloneShape(shape, cfg));
  }
  backSvg.appendChild(backG);
  backGroup.appendChild(backSvg);

  // Nested SVG element for front layer
  const frontSvg = createSvgElement('svg', {
    x: String(x), y: String(y - sh / 2),
    width: String(sw), height: String(sh),
    viewBox: vbox,
  });
  const frontG = createSvgElement('g', {
    fill: shapeFill(shapes[0]),
    stroke: cfg.color,
    'stroke-width': String(Math.max(2, cfg.svgStrokeWidth * 0.5)),
  });
  for (const shape of shapes) {
    frontG.appendChild(cloneShape(shape, cfg));
  }
  frontSvg.appendChild(frontG);
  frontGroup.appendChild(frontSvg);
}

function cloneShape(shape, cfg) {
  const el = createSvgElement(shape.tagName);
  for (const { name, value } of shape.attributes) {
    if (name === 'fill' || name === 'stroke') continue;
    el.setAttribute(name, value);
  }
  return el;
}

function shapeFill(shape) {
  if (!shape) return 'none';
  return shape.getAttribute('fill') || 'none';
}

function buildSvgSurface(hostWidth, hostHeight) {
  return createSvgElement('svg', {
    class: 'neon-surface',
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${hostWidth} ${hostHeight}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
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
