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
