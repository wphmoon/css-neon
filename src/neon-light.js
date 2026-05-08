import { OBSERVED_ATTRS, resolveHostConfig, resolveTextConfig, resolveSvgConfig } from './config.js';
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
    this._mutObserver = null;
    this._svg = null;
  }

  connectedCallback() {
    this._render();
    this._startObserver();
    this._startMutationObserver();
    const src = this.getAttribute('src');
    if (src) this._loadSrc(src);
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._mutObserver) {
      this._mutObserver.disconnect();
      this._mutObserver = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._svg) return;
    if (name === 'src') {
      if (newVal) {
        this._loadSrc(newVal);
      } else if (this._injectedSvg) {
        this._injectedSvg.remove();
        this._injectedSvg = null;
        this._render();
      }
    } else if (name === 'svg-width' || name === 'svg-height') {
      // Update dimensions on injected SVG and re-render
      if (this._injectedSvg) {
        this._injectedSvg.setAttribute(name, newVal);
        this._render();
      }
    } else {
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
    const { backGroup, frontGroup } = renderLightDom(this, width, height);
    this._svg.appendChild(backGroup);
    this._svg.appendChild(frontGroup);

    // Inject animation styles — merge host, text, and svg animation configs
    const textCfg = resolveTextConfig(this);
    const svgCfg = resolveSvgConfig(this);
    const animCSS = generateAnimationStyle(cfg.animate, cfg.speed)
      + generateAnimationStyle(textCfg.animate, textCfg.speed)
      + generateAnimationStyle(svgCfg.animate, svgCfg.speed);
    const styleEl = document.createElement('style');
    styleEl.textContent = BASE_STYLES + animCSS;

    // Replace shadow content
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(styleEl);
    this.shadowRoot.appendChild(this._svg);
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

  _startMutationObserver() {
    if (this._mutObserver) return;
    this._mutObserver = new MutationObserver(() => {
      if (this._svg) this._render();
    });
    this._mutObserver.observe(this, { childList: true });
  }

  async _loadSrc(url) {
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return;
      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const srcSvg = doc.querySelector('svg');
      if (!srcSvg) return;

      // Remove previously injected SVG
      if (this._injectedSvg) {
        this._injectedSvg.remove();
        this._injectedSvg = null;
      }

      this._injectedSvg = srcSvg.cloneNode(true);
      this._injectedSvg.removeAttribute('xmlns:xlink');

      // Apply dimensions: svg-width/svg-height attr > file defaults > 64
      const hostW = this.getAttribute('svg-width') || srcSvg.getAttribute('width');
      const hostH = this.getAttribute('svg-height') || srcSvg.getAttribute('height');
      if (hostW) this._injectedSvg.setAttribute('width', hostW);
      if (hostH) this._injectedSvg.setAttribute('height', hostH);

      this.appendChild(this._injectedSvg);
      // MutationObserver triggers _render()
    } catch (_) {
      // network error or invalid SVG — silently ignore
    }
  }
}

export { NeonLight };
