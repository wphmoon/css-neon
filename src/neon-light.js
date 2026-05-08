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
}

export { NeonLight };
