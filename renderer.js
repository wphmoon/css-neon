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
