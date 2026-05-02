/* ============================================================
   Main — Arena entry point
   ============================================================ */

import { Game } from './engine/Game.js';
import { BALL_PRESETS, GAME, PHYSICS } from './config.js';

let game = null;
let matchSeed = 0;

async function init() {
  const container = document.getElementById('game-container');
  game = new Game(container);
  await game.init();

  // Build initial match configs but do not auto-start (Part 1 state flow)
  prepareNextMatch();

  // --- Controls ---
  const startBtn = document.getElementById('btn-start');
  document.getElementById('btn-reset').addEventListener('click', () => {
    prepareNextMatch();
    startMatchFromPrepared();
  });

  document.getElementById('btn-gravity').addEventListener('click', () => {
    const btn = document.getElementById('btn-gravity');
    if (PHYSICS.GRAVITY > 0) {
      PHYSICS.GRAVITY = 0;
      btn.textContent = '🌙 Gravity: OFF';
    } else {
      PHYSICS.GRAVITY = 0.35;
      btn.textContent = '🌍 Gravity: ON';
    }
  });

  startBtn.addEventListener('click', () => {
    startMatchFromPrepared();
  });

  // Keep UI state in sync with game
  game.eventBus.on('matchStarting', ({ countdownMs }) => {
    const s = Math.ceil(countdownMs / 1000);
    startBtn.disabled = true;
    startBtn.textContent = GAME.COUNTDOWN_MS > 0 ? `⏳ ${s}s` : '▶ Start';
  });
  game.eventBus.on('countdown', ({ secondsLeft }) => {
    startBtn.disabled = true;
    startBtn.textContent = secondsLeft > 0 ? `⏳ ${secondsLeft}s` : '⚔️ Fight!';
  });
  game.eventBus.on('matchStart', () => {
    startBtn.disabled = true;
    startBtn.textContent = '⚔️ Fighting...';
  });
  game.eventBus.on('gameOver', () => {
    startBtn.disabled = false;
    startBtn.textContent = '▶ Rematch';
    prepareNextMatch();
  });
}

let _preparedA = null;
let _preparedB = null;

function prepareNextMatch() {
  // Rotate presets for variety
  const aIdx = matchSeed % BALL_PRESETS.length;
  const bIdx = (matchSeed + 1) % BALL_PRESETS.length;
  matchSeed++;

  const p1 = BALL_PRESETS[aIdx];
  const p2 = BALL_PRESETS[bIdx];

  _preparedA = {
    name: p1.name,
    skin: { fill: p1.fill, glow: p1.glow },
    stats: { atk: 100, def: 40, speed: 1.0, maxHp: 10000 },
  };
  _preparedB = {
    name: p2.name,
    skin: { fill: p2.fill, glow: p2.glow },
    stats: { atk: 120, def: 30, speed: 1.2, maxHp: 8000 },
  };
}

function startMatchFromPrepared() {
  if (!_preparedA || !_preparedB) prepareNextMatch();
  game.startMatch(_preparedA, _preparedB);
}

init().catch(console.error);
