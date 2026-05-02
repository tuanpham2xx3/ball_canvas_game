/* ============================================================
   Main — Arena entry point
   ============================================================ */

import { Game } from './engine/Game.js';
import { BALL_PRESETS, GAME, PHYSICS } from './config.js';
import { loadSavedBalls } from './ui/Builder.js';
import { SoundManager } from './audio/SoundManager.js';

let game = null;
let matchSeed = 0;
let sfx = null;

const STORAGE_SELECTED_A = 'ballsArena.match.selectedA';
const STORAGE_SELECTED_B = 'ballsArena.match.selectedB';
const STORAGE_HISTORY = 'ballsArena.history.v1';
const STORAGE_BO3 = 'ballsArena.tournament.bo3';
const STORAGE_SERIES = 'ballsArena.series.v1';

async function init() {
  const container = document.getElementById('game-container');
  game = new Game(container);
  await game.init();

  sfx = new SoundManager();

  // Build initial match configs but do not auto-start (Part 1 state flow)
  hydrateMatchPicker();
  prepareNextMatch();

  // --- Controls ---
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');
  const speedSel = document.getElementById('sel-speed');
  const chkSfx = document.getElementById('chk-sfx');
  const chkBo3 = document.getElementById('chk-bo3');
  const seriesResetBtn = document.getElementById('btn-series-reset');
  document.getElementById('btn-reset').addEventListener('click', () => {
    resetSeriesIfDisabled();
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

  pauseBtn?.addEventListener('click', () => {
    game.setPaused(!game.paused);
    pauseBtn.textContent = game.paused ? '▶ Resume' : '⏸ Pause';
  });

  speedSel?.addEventListener('change', () => {
    game.setTimeScale(Number(speedSel.value) || 1);
  });

  if (chkSfx) {
    chkSfx.checked = sfx.getEnabled();
    chkSfx.addEventListener('change', () => sfx.setEnabled(chkSfx.checked));
  }

  if (chkBo3) {
    chkBo3.checked = localStorage.getItem(STORAGE_BO3) === '1';
    chkBo3.addEventListener('change', () => {
      localStorage.setItem(STORAGE_BO3, chkBo3.checked ? '1' : '0');
      if (!chkBo3.checked) seriesReset();
      renderSeries();
    });
  }
  seriesResetBtn?.addEventListener('click', () => {
    seriesReset();
    renderSeries();
  });

  renderHistory();
  renderSeries();

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
  game.eventBus.on('collision', ({ dmgToA, dmgToB }) => {
    const big = Math.max(dmgToA || 0, dmgToB || 0);
    if (big > 0) sfx.collision(Math.min(1, big / 900));
  });
  game.eventBus.on('skillHit', ({ amount }) => {
    if (amount > 0) sfx.skill(Math.min(1, amount / 900));
  });

  game.eventBus.on('gameOver', ({ winner, loser }) => {
    startBtn.disabled = false;
    startBtn.textContent = '▶ Rematch';

    sfx.victory();

    // History
    pushHistory({
      at: Date.now(),
      winner: winner?.name || 'Draw',
      loser: loser?.name || '',
      a: summarizeBall(game.balls[0]),
      b: summarizeBall(game.balls[1]),
    });
    renderHistory();

    // Tournament Bo3
    if (localStorage.getItem(STORAGE_BO3) === '1') {
      seriesApplyResult(winner?.id || null, game.balls[0], game.balls[1]);
      renderSeries();
      if (seriesIsComplete()) startBtn.textContent = '🏁 Series Done';
    }

    prepareNextMatch();
  });
}

function summarizeBall(ball) {
  if (!ball) return null;
  return {
    id: ball.id,
    name: ball.name,
    hp: ball.hp,
    maxHp: ball.maxHp,
    hits: ball.hits,
    damageDealt: ball.damageDealt,
    damageTaken: ball.damageTaken,
  };
}

function readHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushHistory(entry) {
  const list = readHistory();
  list.unshift(entry);
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list.slice(0, 12)));
}

function renderHistory() {
  const el = document.getElementById('match-history');
  if (!el) return;
  const list = readHistory();
  el.innerHTML = '';
  if (!list.length) {
    el.innerHTML = `<div class="item"><div><b>No matches yet</b></div><div class="sub">Play a match to see history.</div></div>`;
    return;
  }
  for (const m of list) {
    const d = new Date(m.at);
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div><b>${m.winner}</b> won ${m.loser ? `vs ${m.loser}` : ''} <span class="sub">• ${time}</span></div>
      <div class="sub">${m.a?.name}: ${m.a?.damageDealt ?? 0} dmg • ${m.b?.name}: ${m.b?.damageDealt ?? 0} dmg</div>
    `;
    el.appendChild(item);
  }
}

function seriesRead() {
  try {
    const raw = localStorage.getItem(STORAGE_SERIES);
    const s = raw ? JSON.parse(raw) : null;
    return s && typeof s === 'object' ? s : { aWins: 0, bWins: 0, rounds: 0 };
  } catch {
    return { aWins: 0, bWins: 0, rounds: 0 };
  }
}

function seriesWrite(s) {
  localStorage.setItem(STORAGE_SERIES, JSON.stringify(s));
}

function seriesReset() {
  seriesWrite({ aWins: 0, bWins: 0, rounds: 0 });
}

function resetSeriesIfDisabled() {
  if (localStorage.getItem(STORAGE_BO3) !== '1') seriesReset();
}

function seriesApplyResult(winnerId, ballA, ballB) {
  const s = seriesRead();
  s.rounds += 1;
  if (winnerId && ballA?.id === winnerId) s.aWins += 1;
  else if (winnerId && ballB?.id === winnerId) s.bWins += 1;
  seriesWrite(s);
}

function seriesIsComplete() {
  const s = seriesRead();
  return s.aWins >= 2 || s.bWins >= 2;
}

function renderSeries() {
  const el = document.getElementById('series-score');
  if (!el) return;
  const s = seriesRead();
  el.textContent = `A ${s.aWins} — ${s.bWins} B • Rounds ${s.rounds}`;
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
    skills: ['fireball', 'rage'],
  };
  _preparedB = {
    name: BALL_PRESETS[bIdx].name,
    skin: { fill: BALL_PRESETS[bIdx].fill, glow: BALL_PRESETS[bIdx].glow },
    stats: { atk: 120, def: 30, speed: 1.2, maxHp: 8000 },
    skills: ['ice_shard', 'shockwave', 'regen'],
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
    skin: savedBall.skin,
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
