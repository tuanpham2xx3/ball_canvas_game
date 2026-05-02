/* ============================================================
   Builder Main — Builder entry point (Part 3)
   ============================================================ */

import { Builder } from './ui/Builder.js';

function init() {
  const root = document.getElementById('builder-root');
  if (!root) throw new Error('Missing #builder-root');
  new Builder(root).mount();
}

init();

