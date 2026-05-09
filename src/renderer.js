import { createSvgElement } from './utils.js';
import { resolveTextConfig, resolveSvgConfig } from './config.js';

const GAP = 16;

function renderLightDom(el, width, height, font) {
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

  // When font is available, render text as paths directly with text-like styling
  if (font && hasText) {
    if (hasSvg) {
      const textW = calcTextWidthPx(fullText, textCfg.fontSize, font);
      const svgTotalW = svgParts.reduce((s, svg) => s + (parseFloat(svg.getAttribute('width')) || 64), 0)
        + Math.max(0, svgParts.length - 1) * GAP;
      const totalW = textW + GAP + svgTotalW;
      const startX = (width - totalW) / 2;
      renderTextAsPaths(backGroup, frontGroup, fullText, textCfg, svgCfg,
                        startX + textW / 2, y, el, font);
      let sx = startX + textW + GAP;
      for (const svg of svgParts) {
        const sw = parseFloat(svg.getAttribute('width')) || 64;
        appendSvgShapes(backGroup, frontGroup, svg, svgCfg, sx, y);
        sx += sw + GAP;
      }
    } else {
      renderTextAsPaths(backGroup, frontGroup, fullText, textCfg, svgCfg,
                        width / 2, y, el, font);
    }
    return { backGroup, frontGroup };
  }

  // No font — standard text + SVG rendering
  if (hasText && hasSvg) {
    // Text centered in left portion, SVGs to its right
    const textW = estimateTextPx(fullText, textCfg.fontSize);
    const svgTotalW = svgParts.reduce((s, svg) => s + (parseFloat(svg.getAttribute('width')) || 64), 0)
      + Math.max(0, svgParts.length - 1) * GAP;
    const totalW = textW + GAP + svgTotalW;
    const startX = (width - totalW) / 2;

    appendTextLayers(backGroup, frontGroup, fullText, textCfg, startX + textW / 2, y, startX);

    let sx = startX + textW + GAP;
    for (const svg of svgParts) {
      const sw = parseFloat(svg.getAttribute('width')) || 64;
      appendSvgShapes(backGroup, frontGroup, svg, svgCfg, sx, y);
      sx += sw + GAP;
    }
  } else if (hasText) {
    appendTextLayers(backGroup, frontGroup, fullText, textCfg, width / 2, y, 0);
  } else if (hasSvg) {
    // SVG only: center all SVGs
    const svgTotalW = svgParts.reduce((s, svg) => s + (parseFloat(svg.getAttribute('width')) || 64), 0)
      + Math.max(0, svgParts.length - 1) * GAP;
    let sx = (width - svgTotalW) / 2;
    for (const svg of svgParts) {
      const sw = parseFloat(svg.getAttribute('width')) || 64;
      appendSvgShapes(backGroup, frontGroup, svg, svgCfg, sx, y);
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

// Exact pixel width using opentype.js font metrics
function calcTextWidthPx(text, fontSize, font) {
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (const ch of text) {
    w += (font.charToGlyph(ch).advanceWidth || 0) * scale;
  }
  return w;
}

// Render text as glyph paths directly into back/front groups, with text-like
// styling (front stroke=2, fill-opacity=0.4). Supports svg-animate broken/flow
// and per-path config by reusing classifyShapes/parsePathConfig.
function renderTextAsPaths(backGroup, frontGroup, text, textCfg, svgCfg, cx, y, host, font) {
  const scale = textCfg.fontSize / font.unitsPerEm;

  let totalWidth = 0;
  const charData = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const advance = (glyph.advanceWidth || 0) * scale;
    charData.push({ glyph, advance });
    totalWidth += advance;
  }
  if (charData.length === 0) return;

  const startX = cx - totalWidth / 2;

  const paths = [];
  let curX = startX;
  for (let i = 0; i < charData.length; i++) {
    const { glyph, advance } = charData[i];
    const gPath = glyph.getPath(curX, y, textCfg.fontSize);
    const d = gPath.toPathData(2);
    if (d) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d);
      el.setAttribute('p-id', String(i));
      paths.push(el);
    }
    curX += advance;
  }
  if (paths.length === 0) return;

  const dash = textCfg.dashed ? { 'stroke-dasharray': '180 100' } : {};

  if (svgCfg.animate === 'broken') {
    const pathCfg = parsePathConfig(host.getAttribute('path-config'));
    const ratio = getBrokenRatio(host, svgCfg);
    const { normalShapes, brokenShapes } = classifyShapes(paths, pathCfg, ratio);

    if (normalShapes.length > 0) {
      addTextPathLayers(backGroup, normalShapes, textCfg, true, dash, false);
      addTextPathLayers(frontGroup, normalShapes, textCfg, false, dash, false);
    }
    if (brokenShapes.length > 0) {
      addTextPathLayers(backGroup, brokenShapes, textCfg, true, { ...dash, class: 'neon-svg-broken-glow' }, true);
      addTextPathLayers(frontGroup, brokenShapes, textCfg, false, { ...dash, class: 'neon-svg-broken-dim' }, true);
    }
    return;
  }

  if (svgCfg.animate === 'flow') {
    addTextPathLayers(backGroup, paths, textCfg, true, dash, false);
    addTextPathLayers(frontGroup, paths, textCfg, false, { ...dash, style: 'opacity:0.3' }, false);
    appendTextFlowLayers(frontGroup, paths, textCfg, svgCfg);
    return;
  }

  // No SVG animation — simple back/front layers
  addTextPathLayers(backGroup, paths, textCfg, true, dash, false);
  addTextPathLayers(frontGroup, paths, textCfg, false, dash, false);
}

// Render a set of text paths into one parent group, grouped by per-path color.
// forceNoneFill: true for broken shapes (fill:none), false for normal.
function addTextPathLayers(parent, shapes, cfg, isBack, extraAttrs, forceNoneFill) {
  const groups = new Map();
  for (const shape of shapes) {
    const c = shape._effColor || cfg.color;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(shape);
  }
  for (const [color, groupShapes] of groups) {
    const attrs = {
      stroke: color,
      'stroke-width': String(isBack ? cfg.glow : 2),
      ...(extraAttrs || {}),
    };
    if (forceNoneFill) {
      attrs.fill = 'none';
    } else {
      attrs.fill = color;
      attrs['fill-opacity'] = '0.4';
    }
    if (isBack) {
      attrs.filter = 'url(#neon-blur)';
    }
    const g = createSvgElement('g', attrs);
    for (const p of groupShapes) g.appendChild(cloneShape(p));
    parent.appendChild(g);
  }
}

// Flow animation for text paths (compact version of appendFlowLayers)
function appendTextFlowLayers(frontGroup, paths, cfg, svgCfg) {
  const dashBase = cfg.fontSize * 2;
  const flowDash = dashBase * 0.15;
  const flowGap = dashBase * 3;
  const flowTotal = flowDash + flowGap;
  const dashFlow = { 'stroke-dasharray': `${flowDash} ${flowGap}` };
  const speeds = ['0s', `-${(0.8 / svgCfg.speed).toFixed(2)}s`, `-${(1.6 / svgCfg.speed).toFixed(2)}s`];
  for (const layer of [{ op: 1, d: speeds[0] }, { op: 0.55, d: speeds[1] }, { op: 0.25, d: speeds[2] }]) {
    const g = createSvgElement('g', {
      fill: 'none',
      stroke: cfg.color,
      'stroke-width': String(Math.max(1, svgCfg.svgStrokeWidth)),
      class: 'neon-svg-flow',
      style: `--flow-total:${flowTotal};opacity:${layer.op};animation-delay:${layer.d}`,
      ...dashFlow,
    });
    for (const p of paths) g.appendChild(cloneShape(p));
    frontGroup.appendChild(g);
  }
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
    'stroke-width': cfg.glow,
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

function appendSvgShapes(backGroup, frontGroup, sourceSvg, cfg, x, y) {
  const shapes = Array.from(sourceSvg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon'));
  if (shapes.length === 0) return;

  // Compute scale so the shapes render at the inline SVG's declared size
  const vbox = sourceSvg.getAttribute('viewBox') || '0 0 24 24';
  const vbParts = vbox.split(/\s+/).map(Number);
  const vbW = vbParts[2] || 24;
  const vbH = vbParts[3] || 24;
  const sw = parseFloat(sourceSvg.getAttribute('width')) || 64;
  const sh = parseFloat(sourceSvg.getAttribute('height')) || 64;
  const sx = sw / vbW;
  const sy = sh / vbH;
  const ty = y - (sh / 2);
  const fill = shapes[0] ? (shapes[0].getAttribute('fill') || 'none') : 'none';

  if (cfg.animate === 'broken') {
    const host = sourceSvg.closest('neon-light');
    const pathCfg = parsePathConfig(host ? host.getAttribute('path-config') : null);
    const ratio = getBrokenRatio(host, cfg);
    const { normalShapes, brokenShapes } = classifyShapes(shapes, pathCfg, ratio);
    if (normalShapes.length > 0) {
      renderGroupedShapes(backGroup, normalShapes, cfg, x, ty, sx, sy, { fill, blur: true });
      renderGroupedShapes(frontGroup, normalShapes, cfg, x, ty, sx, sy, { fill });
    }
    if (brokenShapes.length > 0) {
      renderGroupedShapes(backGroup, brokenShapes, cfg, x, ty, sx, sy, {
        fill: 'none', blur: true, class: 'neon-svg-broken-glow',
      });
      renderGroupedShapes(frontGroup, brokenShapes, cfg, x, ty, sx, sy, {
        fill: 'none', class: 'neon-svg-broken-dim',
      });
    }
    return;
  }

  const dash = cfg.dashed ? { 'stroke-dasharray': '180 100' } : {};
  const frontStyle = cfg.animate === 'flow' ? 'opacity:0.3' : '';

  // Apply per-path color overrides from path-config if present
  const host = sourceSvg.closest('neon-light');
  const pathCfg = parsePathConfig(host ? host.getAttribute('path-config') : null);
  if (pathCfg.size > 0) {
    for (const shape of shapes) {
      const sid = shape.getAttribute('id') || shape.getAttribute('p-id');
      const override = sid ? pathCfg.get(sid) : null;
      shape._effColor = (override && override.color) ? override.color : null;
    }
  }

  if (cfg.animate === 'flow') {
    addShapeLayer(backGroup, shapes, cfg, x, ty, sx, sy, { fill: 'none', blur: true, dash });
    addShapeLayer(frontGroup, shapes, cfg, x, ty, sx, sy, { fill, style: frontStyle, dash });
  } else {
    renderGroupedShapes(backGroup, shapes, cfg, x, ty, sx, sy, { fill: 'none', blur: true, dash });
    renderGroupedShapes(frontGroup, shapes, cfg, x, ty, sx, sy, { fill, style: frontStyle, dash });
  }

  if (cfg.animate === 'flow') {
    appendFlowLayers(frontGroup, shapes, cfg, x, ty, sx, sy, Math.max(vbW, vbH));
  }
}

// Parse path-config attribute: "id1: color:#fff, broken:true; id2: color:#f00"
function parsePathConfig(str) {
  const map = new Map();
  if (!str) return map;
  for (const block of str.split(';')) {
    const idx = block.indexOf(':');
    if (idx === -1) continue;
    const id = block.substring(0, idx).trim();
    const rest = block.substring(idx + 1).trim();
    if (!id || !rest) continue;
    const props = {};
    for (const pair of rest.split(',')) {
      const pidx = pair.indexOf(':');
      if (pidx === -1) continue;
      const k = pair.substring(0, pidx).trim();
      const v = pair.substring(pidx + 1).trim();
      if (k) props[k] = v;
    }
    if (Object.keys(props).length > 0) map.set(id, props);
  }
  return map;
}

function getBrokenRatio(host, cfg) {
  if (!host) return cfg.brokenRatio || 0.5;
  const raw = host.getAttribute('svg-broken-ratio') || host.getAttribute('broken-ratio');
  return raw ? Math.max(0, Math.min(1, parseFloat(raw))) : (cfg.brokenRatio || 0.5);
}

// Classify shapes into normal/broken, considering per-path overrides and global ratio
function classifyShapes(shapes, pathCfg, ratio) {
  const forceBroken = [];
  const forceNormal = [];
  const autoShapes = [];

  for (const shape of shapes) {
    const sid = shape.getAttribute('id') || shape.getAttribute('p-id');
    const override = sid ? pathCfg.get(sid) : null;
    shape._effColor = (override && override.color) ? override.color : null;

    if (override && 'broken' in override) {
      if (override.broken === 'true' || override.broken === '1') forceBroken.push(shape);
      else forceNormal.push(shape);
    } else {
      autoShapes.push(shape);
    }
  }

  const targetBroken = Math.round(shapes.length * ratio);
  const needed = Math.max(0, targetBroken - forceBroken.length);
  const clamped = Math.min(needed, autoShapes.length);

  const autoBrokenSet = new Set();
  if (clamped > 0 && autoShapes.length > 0) {
    const hashed = autoShapes.map((s, i) => {
      const str = s.getAttribute('d') || s.getAttribute('points') || s.getAttribute('cx') || s.outerHTML;
      let h = 0;
      for (let j = 0; j < str.length; j++) { h = ((h << 5) - h) + str.charCodeAt(j); h |= 0; }
      return { idx: i, hash: Math.abs(h) };
    });
    hashed.sort((a, b) => a.hash - b.hash);
    for (const item of hashed.slice(0, clamped)) autoBrokenSet.add(item.idx);
  }

  const normalShapes = [...forceNormal];
  const brokenShapes = [...forceBroken];
  for (let i = 0; i < autoShapes.length; i++) {
    if (autoBrokenSet.has(i)) brokenShapes.push(autoShapes[i]);
    else normalShapes.push(autoShapes[i]);
  }
  return { normalShapes, brokenShapes };
}

// Group shapes by effective color and render each group
function renderGroupedShapes(parent, shapes, cfg, x, ty, sx, sy, opts) {
  const groups = new Map();
  for (const shape of shapes) {
    const c = shape._effColor || cfg.color;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(shape);
  }
  for (const [color, groupShapes] of groups) {
    addShapeLayer(parent, groupShapes, cfg, x, ty, sx, sy, { ...opts, color });
  }
}

function addShapeLayer(parent, shapes, cfg, x, ty, sx, sy, opts) {
  const attrs = {
    transform: `translate(${x}, ${ty}) scale(${sx}, ${sy})`,
    fill: opts.fill || 'none',
    stroke: opts.color || cfg.color,
    'stroke-width': String(opts.blur ? cfg.glow : Math.max(1, cfg.svgStrokeWidth)),
    ...(opts.filter || (opts.blur ? 'url(#neon-blur)' : '')),
    ...(opts.class ? { class: opts.class } : {}),
    ...(opts.style ? { style: opts.style } : {}),
    ...(opts.dash || {}),
  };
  if (!attrs.filter) delete attrs.filter;
  const g = createSvgElement('g', attrs);
  for (const shape of shapes) g.appendChild(cloneShape(shape));
  parent.appendChild(g);
}

function appendFlowLayers(frontGroup, shapes, cfg, x, ty, sx, sy, dashBase) {
  const flowDash = dashBase * 0.15;
  const flowGap = dashBase * 3;
  const flowTotal = flowDash + flowGap;
  const dashFlow = { 'stroke-dasharray': `${flowDash} ${flowGap}` };
  const delays = ['0s', `-${(0.8 / cfg.speed).toFixed(2)}s`, `-${(1.6 / cfg.speed).toFixed(2)}s`];
  // 3 chasing light layers at different brightness
  const layers = [
    { opacity: 1, delay: delays[0] },
    { opacity: 0.55, delay: delays[1] },
    { opacity: 0.25, delay: delays[2] },
  ];
  for (const layer of layers) {
    const g = createSvgElement('g', {
      transform: `translate(${x}, ${ty}) scale(${sx}, ${sy})`,
      fill: 'none',
      stroke: cfg.color,
      'stroke-width': String(Math.max(1, cfg.svgStrokeWidth)),
      class: 'neon-svg-flow',
      style: `--flow-total:${flowTotal};opacity:${layer.opacity};animation-delay:${layer.delay}`,
      ...dashFlow,
    });
    for (const shape of shapes) {
      g.appendChild(cloneShape(shape));
    }
    frontGroup.appendChild(g);
  }
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
