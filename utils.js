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
