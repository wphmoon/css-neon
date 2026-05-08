import { createSvgElement } from './utils.js';
import { resolveTextConfig, resolveSvgConfig } from './config.js';

const GAP = 16;

function renderLightDom(el, width, height) {
  const textCfg = resolveTextConfig(el);
  const svgCfg = resolveSvgConfig(el);
  const backGroup = createSvgElement('g', { class: 'neon-back' });
  const frontGroup = createSvgElement('g', { class: 'neon-front' });

  // Separate text and SVG items from light DOM
  const textParts = [];
  const svgParts = [];
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent.trim();
      if (t) textParts.push(t);
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'svg') {
      svgParts.push(child);
    }
  }

  const hasText = textParts.length > 0;
  const hasSvg = svgParts.length > 0;
  const fullText = textParts.join(' ');
  const y = height * 0.62;

  if (hasText && hasSvg) {
    // Text centered in left portion, SVGs to its right
    // Estimate text width for positioning
    const textW = estimateTextPx(fullText, textCfg.fontSize);
    const svgTotalW = svgParts.reduce((s, svg) => s + (parseFloat(svg.getAttribute('width')) || 64), 0)
      + Math.max(0, svgParts.length - 1) * GAP;
    const totalW = textW + GAP + svgTotalW;
    const startX = (width - totalW) / 2;

    // Text at left portion
    appendTextLayers(backGroup, frontGroup, fullText, textCfg, startX + textW / 2, y, startX);

    // SVGs to the right
    let sx = startX + textW + GAP;
    for (const svg of svgParts) {
      const sw = parseFloat(svg.getAttribute('width')) || 64;
      appendNestedSvg(backGroup, frontGroup, svg, svgCfg, sx, y);
      sx += sw + GAP;
    }
  } else if (hasText) {
    // Text only: center in SVG
    appendTextLayers(backGroup, frontGroup, fullText, textCfg, width / 2, y, 0);
  } else if (hasSvg) {
    // SVG only: center all SVGs
    const svgTotalW = svgParts.reduce((s, svg) => s + (parseFloat(svg.getAttribute('width')) || 64), 0)
      + Math.max(0, svgParts.length - 1) * GAP;
    let sx = (width - svgTotalW) / 2;
    for (const svg of svgParts) {
      const sw = parseFloat(svg.getAttribute('width')) || 64;
      appendNestedSvg(backGroup, frontGroup, svg, svgCfg, sx, y);
      sx += sw + GAP;
    }
  }

  return { backGroup, frontGroup };
}

// Rough pixel width estimate — kept generous to avoid clipping
function estimateTextPx(text, fontSize) {
  let n = 0;
  for (const ch of text) {
    n += /[一-鿿　-〿＀-￯]/.test(ch) ? 1.1 : 0.7;
  }
  return Math.ceil(n * fontSize);
}

function appendTextLayers(backGroup, frontGroup, text, cfg, cx, y, /* optional for dash bleed */ _unused) {
  const base = {
    'font-family': cfg.fontFamily,
    'font-size': `${cfg.fontSize}px`,
    'font-weight': cfg.fontWeight,
    'font-style': cfg.fontStyle,
    'text-transform': cfg.textTransform,
    'letter-spacing': `${cfg.letterSpacing}px`,
    fill: cfg.color,
    'fill-opacity': '0.4',
    'text-anchor': 'middle',
    x: String(cx),
    y: String(y),
  };
  const dash = cfg.dashed ? { 'stroke-dasharray': '180 100' } : {};

  const backText = createSvgElement('text', {
    ...base,
    stroke: cfg.color,
    'stroke-width': cfg.blur * 2,
    filter: 'url(#neon-blur)',
    ...dash,
  });
  backText.textContent = text;
  backGroup.appendChild(backText);

  const frontText = createSvgElement('text', {
    ...base,
    stroke: cfg.color,
    'stroke-width': 2,
    ...dash,
  });
  frontText.textContent = text;
  frontGroup.appendChild(frontText);
}

function appendNestedSvg(backGroup, frontGroup, sourceSvg, cfg, x, y) {
  const vbox = sourceSvg.getAttribute('viewBox') || '0 0 24 24';
  const sw = parseFloat(sourceSvg.getAttribute('width')) || 64;
  const sh = parseFloat(sourceSvg.getAttribute('height')) || 64;
  const shapes = Array.from(sourceSvg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon'));
  const dash = cfg.dashed ? { 'stroke-dasharray': '180 100' } : {};

  // Back layer
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
    ...dash,
  });
  for (const shape of shapes) {
    backG.appendChild(cloneShape(shape));
  }
  backSvg.appendChild(backG);
  backGroup.appendChild(backSvg);

  // Front layer
  const frontSvg = createSvgElement('svg', {
    x: String(x), y: String(y - sh / 2),
    width: String(sw), height: String(sh),
    viewBox: vbox,
  });
  const frontG = createSvgElement('g', {
    fill: shapes[0] ? shapes[0].getAttribute('fill') || 'none' : 'none',
    stroke: cfg.color,
    'stroke-width': String(Math.max(2, cfg.svgStrokeWidth * 0.5)),
    ...dash,
  });
  for (const shape of shapes) {
    frontG.appendChild(cloneShape(shape));
  }
  frontSvg.appendChild(frontG);
  frontGroup.appendChild(frontSvg);
}

function cloneShape(shape) {
  const el = createSvgElement(shape.tagName);
  for (const { name, value } of shape.attributes) {
    if (name === 'fill' || name === 'stroke') continue;
    el.setAttribute(name, value);
  }
  return el;
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
