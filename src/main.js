/* ============================================================
   Main — Arena entry point
   ============================================================ */

import { Game } from './engine/Game.js';
import { BALL_PRESETS, GAME, PHYSICS } from './config.js';
import { loadSavedBalls } from './ui/Builder.js';

let game = null;
let matchSeed = 0;

const STORAGE_SELECTED_A = 'ballsArena.match.selectedA';
const STORAGE_SELECTED_B = 'ballsArena.match.selectedB';

async function init() {
  const container = document.getElementById('game-container');
  game = new Game(container);
  await game.init();

  // Build initial match configs but do not auto-start (Part 1 state flow)
  hydrateMatchPicker();
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
  const saved = loadSavedBalls();
  const selA = localStorage.getItem(STORAGE_SELECTED_A);
  const selB = localStorage.getItem(STORAGE_SELECTED_B);

  const a = selA ? saved.find((x) => x.id === selA) : null;
  const b = selB ? saved.find((x) => x.id === selB) : null;

  if (a && b && a.id !== b.id) {
    _preparedA = _toMatchConfig(a);
    _preparedB = _toMatchConfig(b);
    return;
  }

  // Fallback: rotate presets (so arena still works without builder)
  const aIdx = matchSeed % BALL_PRESETS.length;
  const bIdx = (matchSeed + 1) % BALL_PRESETS.length;
  matchSeed++;
  _preparedA = {
    name: BALL_PRESETS[aIdx].name,
    skin: { fill: BALL_PRESETS[aIdx].fill, glow: BALL_PRESETS[aIdx].glow },
    stats: { atk: 100, def: 40, speed: 1.0, maxHp: 10000 },
  };
  _preparedB = {
    name: BALL_PRESETS[bIdx].name,
    skin: { fill: BALL_PRESETS[bIdx].fill, glow: BALL_PRESETS[bIdx].glow },
    stats: { atk: 120, def: 30, speed: 1.2, maxHp: 8000 },
  };
}

function startMatchFromPrepared() {
  if (!_preparedA || !_preparedB) prepareNextMatch();
  game.startMatch(_preparedA, _preparedB);
}

function hydrateMatchPicker() {
  const selA = document.getElementById('sel-a');
  const selB = document.getElementById('sel-b');
  if (!selA || !selB) return;

  const saved = loadSavedBalls();
  const opts = saved.map((b) => ({
    id: b.id,
    label: `${b.name} (HP ${b.stats?.maxHp ?? '?'}, ATK ${b.stats?.atk ?? '?'}, DEF ${b.stats?.def ?? '?'})`,
  }));

  const fill = (sel, selectedId) => {
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = saved.length ? '— Select saved ball —' : '— No saved balls (open Builder) —';
    sel.appendChild(placeholder);

    for (const o of opts) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      sel.appendChild(opt);
    }
    if (selectedId) sel.value = selectedId;
  };

  fill(selA, localStorage.getItem(STORAGE_SELECTED_A) || '');
  fill(selB, localStorage.getItem(STORAGE_SELECTED_B) || '');

  selA.addEventListener('change', () => {
    localStorage.setItem(STORAGE_SELECTED_A, selA.value);
    prepareNextMatch();
  });
  selB.addEventListener('change', () => {
    localStorage.setItem(STORAGE_SELECTED_B, selB.value);
    prepareNextMatch();
  });
}

function _toMatchConfig(savedBall) {
  return {
    name: savedBall.name,
    skin: { fill: savedBall.skin?.fill, glow: savedBall.skin?.glow },
    stats: {
      atk: savedBall.stats?.atk,
      def: savedBall.stats?.def,
      speed: savedBall.stats?.speed,
      maxHp: savedBall.stats?.maxHp,
      radius: savedBall.stats?.radius,
    },
    // Skills will be wired in Part 4; keep placeholder
    skills: Array.isArray(savedBall.skills) ? savedBall.skills : [],
  };
}

init().catch(console.error);
