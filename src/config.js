import { parseBoolean, parseNumber } from './utils.js';

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
  brokenRatio: 0.5,
  vertical: false,
  chaseDelay: 0.3,
  eclipseDelay: 0.3,
};

// Attributes that trigger re-render on change
const OBSERVED_ATTRS = [
  'color', 'glow', 'blur', 'animate', 'speed', 'dashed',
  'text-color', 'text-glow', 'text-blur', 'text-animate', 'text-speed', 'text-dashed',
  'svg-color', 'svg-glow', 'svg-blur', 'svg-animate', 'svg-speed', 'svg-dashed', 'svg-stroke-width', 'svg-broken-ratio',
  'broken-ratio', 'path-config',
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-transform', 'letter-spacing',
  'src', 'svg-width', 'svg-height',
  'font-src',
  'vertical', 'text-vertical',
  'chase-delay', 'text-chase-delay', 'svg-chase-delay',
  'eclipse-delay', 'text-eclipse-delay', 'svg-eclipse-delay',
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
  'svg-broken-ratio': ['svg', 'brokenRatio'],
};

// Convert camelCase to kebab-case for HTML attribute lookup
function camelToKebab(str) {
  if (!str) return str;
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

// Read attribute value from element, fall through cascade chain
function readAttr(el, name) {
  if (!name) return null;
  return el.getAttribute(camelToKebab(name));
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
    glow: parseNumber(get('glow'), DEFAULTS.glow),
    blur: parseNumber(get('blur'), DEFAULTS.blur),
    animate: get('animate'),
    speed: parseNumber(get('speed'), DEFAULTS.speed),
    dashed: parseBoolean(get('dashed')),
    fontFamily: get('fontFamily'),
    fontSize: parseNumber(get('fontSize'), DEFAULTS.fontSize),
    fontWeight: get('fontWeight'),
    fontStyle: get('fontStyle'),
    textTransform: get('textTransform'),
    letterSpacing: parseNumber(get('letterSpacing'), DEFAULTS.letterSpacing),
    vertical: parseBoolean(get('vertical')),
    svgStrokeWidth: parseNumber(get('svgStrokeWidth'), DEFAULTS.svgStrokeWidth),
    brokenRatio: parseNumber(
      readAttr(el, contentType !== 'host' ? `${contentType}-brokenRatio` : null) ||
      get('brokenRatio'),
      DEFAULTS.brokenRatio),
    chaseDelay: parseNumber(get('chaseDelay'), DEFAULTS.chaseDelay),
    eclipseDelay: parseNumber(get('eclipseDelay'), DEFAULTS.eclipseDelay),
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
