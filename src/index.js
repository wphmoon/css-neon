import { NeonLight } from './neon-light.js';

function define(name = 'neon-light', element = NeonLight) {
  if (typeof customElements !== 'undefined' && !customElements.get(name)) {
    customElements.define(name, element);
  }
}

define();

export { NeonLight, define };
