function generateFlicker(speed) {
  const dur = (6 / speed).toFixed(2);
  return `
    @keyframes neon-flicker {
      0%, 13%, 26%, 37%, 58%, 77%, 100% { opacity: 1; }
      5%, 20%, 30%, 50%, 69%, 90%      { opacity: 0.25; }
    }
    @keyframes neon-flicker-glow {
      0%, 15%, 28%, 39%, 56%, 75%, 100% { opacity: 0.7; }
      7%, 22%, 32%, 48%, 66%, 88%       { opacity: 0.15; }
    }
    .neon-front { animation: neon-flicker ${dur}s infinite step-end; }
    .neon-back  { animation: neon-flicker-glow ${dur}s infinite 0.15s step-end; }
  `;
}

function generateBreath(speed) {
  const dur = (4 / speed).toFixed(2);
  return `
    @keyframes neon-breath {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
    @keyframes neon-breath-glow {
      0%, 100% { opacity: 0.75; }
      50%      { opacity: 0.2; }
    }
    .neon-front { animation: neon-breath ${dur}s infinite ease-in-out; }
    .neon-back  { animation: neon-breath-glow ${dur}s infinite 0.2s ease-in-out; }
  `;
}

function generateGlitch(speed) {
  const dur = (3 / speed).toFixed(2);
  return `
    @keyframes neon-glitch {
      0%, 15%, 55%, 85%          { opacity: 1; }
      8%, 23%, 48%, 75%, 92%     { opacity: 0.1; }
      35%, 67%                   { opacity: 0.7; }
    }
    @keyframes neon-glitch-color {
      0%, 15%, 55%, 85%          { stroke: inherit; }
      8%, 48%, 92%               { stroke: #fff; }
      23%, 75%                   { stroke: gold; }
      35%, 67%                   { stroke: currentColor; }
    }
    @keyframes neon-glitch-glow {
      0%, 17%, 53%, 82%          { opacity: 0.6; }
      10%, 25%, 50%, 72%, 90%    { opacity: 0.1; }
      38%, 65%                   { opacity: 0.4; }
    }
    .neon-front { animation: neon-glitch ${dur}s infinite step-end, neon-glitch-color ${dur}s infinite step-end; }
    .neon-back  { animation: neon-glitch-glow ${dur}s infinite 0.08s step-end; }
  `;
}

function generateBroken(speed) {
  const dur = (4 / speed).toFixed(2);
  return `
    @keyframes neon-broken-flicker {
      0%, 100% { opacity: 0.55; }
      18%, 33%, 68% { opacity: 0.15; }
      25%, 51%, 82% { opacity: 0.75; }
      43%, 91% { opacity: 0.08; }
    }
    @keyframes neon-broken-glow {
      0%, 100% { opacity: 0.6; }
      18%, 33%, 68% { opacity: 0.25; }
      25%, 51%, 82% { opacity: 0.8; }
      43%, 91% { opacity: 0.12; }
    }
    .neon-svg-broken-dim { animation: neon-broken-flicker ${dur}s infinite step-end; }
    .neon-svg-broken-glow { animation: neon-broken-glow ${dur}s infinite 0.15s step-end; }
  `;
}

function generateFlow(speed) {
  const dur = (2.5 / speed).toFixed(2);
  return `
    @keyframes neon-flow-march {
      0%   { stroke-dashoffset: var(--flow-total); }
      100% { stroke-dashoffset: 0; }
    }
    .neon-svg-flow {
      animation: neon-flow-march ${dur}s infinite linear;
    }
  `;
}

const ANIMATION_GENERATORS = {
  flicker: generateFlicker,
  breath: generateBreath,
  glitch: generateGlitch,
  broken: generateBroken,
  flow: generateFlow,
};

function generateAnimationStyle(animateName, speed) {
  if (!animateName || animateName === 'none') return '';
  const gen = ANIMATION_GENERATORS[animateName];
  return gen ? gen(speed) : '';
}

export { generateAnimationStyle };
