/* ============================================================
   Main — Arena entry point
   ============================================================ */

import { Game } from './engine/Game.js';
import { BALL_PRESETS } from './config.js';

let game = null;

async function init() {
  const container = document.getElementById('game-container');
  game = new Game(container);
  await game.init();

  startNewMatch();

  // --- Controls ---
  document.getElementById('btn-reset').addEventListener('click', () => {
    startNewMatch();
  });

  document.getElementById('btn-gravity').addEventListener('click', () => {
    // Toggle gravity is handled via config import
    // For now, we can toggle via a simple approach
    const btn = document.getElementById('btn-gravity');
    const { PHYSICS } = await import('./config.js');
    if (PHYSICS.GRAVITY > 0) {
      PHYSICS.GRAVITY = 0;
      btn.textContent = '🌙 Gravity: OFF';
    } else {
      PHYSICS.GRAVITY = 0.35;
      btn.textContent = '🌍 Gravity: ON';
    }
  });
}

function startNewMatch() {
  const p1 = BALL_PRESETS[0];
  const p2 = BALL_PRESETS[1];

  game.startMatch(
    {
      name: p1.name,
      skin: { fill: p1.fill, glow: p1.glow },
      stats: { atk: 100, def: 40, speed: 1.0, maxHp: 10000 },
    },
    {
      name: p2.name,
      skin: { fill: p2.fill, glow: p2.glow },
      stats: { atk: 120, def: 30, speed: 1.2, maxHp: 8000 },
    }
  );
}

init().catch(console.error);
