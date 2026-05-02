/* ============================================================
   Builder — Ball builder page UI (Part 3)
   ============================================================ */

import { DEFAULT_BALL_STATS } from '../config.js';

const STORAGE_KEY = 'ballsArena.balls.v1';

function clampNumber(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

function colorToHexInt(cssColor) {
  // cssColor: "#rrggbb"
  const v = String(cssColor || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return 0xffffff;
  return parseInt(v.slice(1), 16);
}

function hexIntToCssColor(n) {
  const x = Math.max(0, Math.min(0xffffff, Number(n) || 0));
  return `#${x.toString(16).padStart(6, '0')}`;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function loadSavedBalls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBallsList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export class Builder {
  /**
   * @param {HTMLElement} rootEl
   */
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.state = {
      list: loadSavedBalls(),
      editingId: null,
    };
  }

  mount() {
    this.rootEl.innerHTML = '';
    this.rootEl.appendChild(this._render());
    this._syncListUI();
    this._syncFormUI(this._getEditingBall());
  }

  _render() {
    const wrap = document.createElement('div');
    wrap.className = 'builder-grid';

    // Left: editor
    const editor = document.createElement('div');
    editor.className = 'card builder-card';
    editor.innerHTML = `
      <div class="card-title">Ball Editor</div>
      <div class="builder-row">
        <label>Name</label>
        <input id="b-name" class="input" type="text" placeholder="Inferno" />
      </div>

      <div class="builder-row two">
        <div>
          <label>Fill</label>
          <input id="b-fill" class="input" type="color" />
        </div>
        <div>
          <label>Glow</label>
          <input id="b-glow" class="input" type="color" />
        </div>
      </div>

      <div class="builder-row two">
        <div>
          <label>Gradient</label>
          <label class="toggle">
            <input id="b-grad-on" type="checkbox" />
            <span>Enable</span>
          </label>
        </div>
        <div>
          <label>Pattern</label>
          <select id="b-pattern" class="select">
            <option value="none">None</option>
            <option value="dots">Dots</option>
            <option value="stripes">Stripes</option>
          </select>
        </div>
      </div>

      <div class="builder-row two">
        <div>
          <label>Gradient Inner</label>
          <input id="b-grad-inner" class="input" type="color" />
        </div>
        <div>
          <label>Gradient Outer</label>
          <input id="b-grad-outer" class="input" type="color" />
        </div>
      </div>

      <div class="builder-row two">
        <div>
          <label>Trail</label>
          <label class="toggle">
            <input id="b-trail-on" type="checkbox" />
            <span>Enable</span>
          </label>
        </div>
        <div>
          <label>Trail Length</label>
          <input id="b-trail-len" class="input" type="number" min="4" step="1" />
        </div>
      </div>

      <div class="builder-row">
        <label>Trail Color</label>
        <input id="b-trail-color" class="input" type="color" />
      </div>

      <div class="builder-row two">
        <div>
          <label>Max HP</label>
          <input id="b-hp" class="input" type="number" min="1" step="1" />
        </div>
        <div>
          <label>Radius</label>
          <input id="b-radius" class="input" type="number" min="10" step="1" />
        </div>
      </div>

      <div class="builder-row three">
        <div>
          <label>ATK</label>
          <input id="b-atk" class="input" type="number" min="0" step="1" />
        </div>
        <div>
          <label>DEF</label>
          <input id="b-def" class="input" type="number" min="0" step="1" />
        </div>
        <div>
          <label>Speed</label>
          <input id="b-speed" class="input" type="number" min="0.2" step="0.05" />
        </div>
      </div>

      <div class="builder-actions">
        <button id="btn-template-tank" class="btn">🛡️ Tank</button>
        <button id="btn-template-fighter" class="btn">⚔️ Fighter</button>
        <button id="btn-template-speed" class="btn">⚡ Speedster</button>
        <button id="btn-template-mage" class="btn">🔮 Mage</button>
      </div>

      <div class="builder-actions">
        <button id="btn-save" class="btn primary">💾 Save</button>
        <button id="btn-new" class="btn">➕ New</button>
        <button id="btn-delete" class="btn danger">🗑️ Delete</button>
      </div>

      <div class="builder-actions">
        <button id="btn-export" class="btn">⬇️ Export JSON</button>
        <label class="btn file-btn">
          ⬆️ Import JSON
          <input id="file-import" type="file" accept="application/json" />
        </label>
      </div>

      <div class="builder-hint">
        Saved balls are stored in <code>localStorage</code>.
      </div>
    `;

    // Right: list + preview
    const listCard = document.createElement('div');
    listCard.className = 'card builder-card';
    listCard.innerHTML = `
      <div class="card-title">Saved Balls</div>
      <div id="balls-empty" class="builder-hint" style="display:none">No saved balls yet. Create one and hit Save.</div>
      <div id="balls-list" class="balls-list"></div>
    `;

    wrap.appendChild(editor);
    wrap.appendChild(listCard);

    // Wire events
    queueMicrotask(() => this._wire(editor, listCard));
    return wrap;
  }

  _wire(editorEl, listCardEl) {
    this._els = {
      name: editorEl.querySelector('#b-name'),
      fill: editorEl.querySelector('#b-fill'),
      glow: editorEl.querySelector('#b-glow'),
      gradOn: editorEl.querySelector('#b-grad-on'),
      gradInner: editorEl.querySelector('#b-grad-inner'),
      gradOuter: editorEl.querySelector('#b-grad-outer'),
      pattern: editorEl.querySelector('#b-pattern'),
      trailOn: editorEl.querySelector('#b-trail-on'),
      trailLen: editorEl.querySelector('#b-trail-len'),
      trailColor: editorEl.querySelector('#b-trail-color'),
      hp: editorEl.querySelector('#b-hp'),
      radius: editorEl.querySelector('#b-radius'),
      atk: editorEl.querySelector('#b-atk'),
      def: editorEl.querySelector('#b-def'),
      speed: editorEl.querySelector('#b-speed'),
      btnSave: editorEl.querySelector('#btn-save'),
      btnNew: editorEl.querySelector('#btn-new'),
      btnDelete: editorEl.querySelector('#btn-delete'),
      btnExport: editorEl.querySelector('#btn-export'),
      fileImport: editorEl.querySelector('#file-import'),
      list: listCardEl.querySelector('#balls-list'),
      empty: listCardEl.querySelector('#balls-empty'),
    };

    editorEl.querySelector('#btn-template-tank').addEventListener('click', () => this._applyTemplate('tank'));
    editorEl.querySelector('#btn-template-fighter').addEventListener('click', () => this._applyTemplate('fighter'));
    editorEl.querySelector('#btn-template-speed').addEventListener('click', () => this._applyTemplate('speedster'));
    editorEl.querySelector('#btn-template-mage').addEventListener('click', () => this._applyTemplate('mage'));

    this._els.btnSave.addEventListener('click', () => this._save());
    this._els.btnNew.addEventListener('click', () => this._new());
    this._els.btnDelete.addEventListener('click', () => this._delete());
    this._els.btnExport.addEventListener('click', () => this._export());
    this._els.fileImport.addEventListener('change', (e) => this._importFile(e));

    // Defaults
    if (!this.state.editingId && this.state.list.length > 0) {
      this.state.editingId = this.state.list[0].id;
    }
  }

  _getEditingBall() {
    if (!this.state.editingId) return null;
    return this.state.list.find((b) => b.id === this.state.editingId) || null;
  }

  _readForm() {
    const name = String(this._els.name.value || '').trim() || 'Unnamed';
    const stats = {
      maxHp: clampNumber(this._els.hp.value, 1, 999999, DEFAULT_BALL_STATS.maxHp),
      atk: clampNumber(this._els.atk.value, 0, 999999, DEFAULT_BALL_STATS.atk),
      def: clampNumber(this._els.def.value, 0, 999999, DEFAULT_BALL_STATS.def),
      speed: clampNumber(this._els.speed.value, 0.2, 5, DEFAULT_BALL_STATS.speed),
      radius: clampNumber(this._els.radius.value, 10, 80, DEFAULT_BALL_STATS.radius),
    };

    return {
      name,
      skin: {
        fill: colorToHexInt(this._els.fill.value),
        glow: colorToHexInt(this._els.glow.value),
        gradient: {
          enabled: Boolean(this._els.gradOn.checked),
          inner: colorToHexInt(this._els.gradInner.value),
          outer: colorToHexInt(this._els.gradOuter.value),
        },
        pattern: {
          type: this._els.pattern.value || 'none',
        },
        trail: {
          enabled: Boolean(this._els.trailOn.checked),
          length: clampNumber(this._els.trailLen.value, 4, 24, 12),
          color: colorToHexInt(this._els.trailColor.value),
        },
      },
      stats,
      // Part 3: skills not wired yet; keep schema placeholder
      skills: [],
    };
  }

  _syncFormUI(ball) {
    const b = ball || {
      id: null,
      name: '',
      skin: { fill: 0x818cf8, glow: 0x6366f1, gradient: { enabled: false, inner: 0x818cf8, outer: 0x818cf8 }, pattern: { type: 'none' }, trail: { enabled: false, length: 12, color: 0x6366f1 } },
      stats: { ...DEFAULT_BALL_STATS },
    };
    this._els?.name && (this._els.name.value = b.name || '');
    this._els?.fill && (this._els.fill.value = hexIntToCssColor(b.skin?.fill ?? 0x818cf8));
    this._els?.glow && (this._els.glow.value = hexIntToCssColor(b.skin?.glow ?? 0x6366f1));

    this._els?.gradOn && (this._els.gradOn.checked = Boolean(b.skin?.gradient?.enabled));
    this._els?.gradInner && (this._els.gradInner.value = hexIntToCssColor(b.skin?.gradient?.inner ?? b.skin?.fill ?? 0x818cf8));
    this._els?.gradOuter && (this._els.gradOuter.value = hexIntToCssColor(b.skin?.gradient?.outer ?? b.skin?.fill ?? 0x818cf8));
    this._els?.pattern && (this._els.pattern.value = b.skin?.pattern?.type || 'none');
    this._els?.trailOn && (this._els.trailOn.checked = Boolean(b.skin?.trail?.enabled));
    this._els?.trailLen && (this._els.trailLen.value = b.skin?.trail?.length ?? 12);
    this._els?.trailColor && (this._els.trailColor.value = hexIntToCssColor(b.skin?.trail?.color ?? b.skin?.glow ?? 0x6366f1));

    this._els?.hp && (this._els.hp.value = b.stats?.maxHp ?? DEFAULT_BALL_STATS.maxHp);
    this._els?.radius && (this._els.radius.value = b.stats?.radius ?? DEFAULT_BALL_STATS.radius);
    this._els?.atk && (this._els.atk.value = b.stats?.atk ?? DEFAULT_BALL_STATS.atk);
    this._els?.def && (this._els.def.value = b.stats?.def ?? DEFAULT_BALL_STATS.def);
    this._els?.speed && (this._els.speed.value = b.stats?.speed ?? DEFAULT_BALL_STATS.speed);

    if (this._els?.btnDelete) {
      this._els.btnDelete.disabled = !ball;
    }
  }

  _syncListUI() {
    const { list } = this.state;
    if (!this._els?.list) return;

    this._els.list.innerHTML = '';
    this._els.empty.style.display = list.length === 0 ? 'block' : 'none';

    for (const b of list) {
      const item = document.createElement('button');
      item.className = `ball-item ${b.id === this.state.editingId ? 'active' : ''}`;
      item.type = 'button';
      item.innerHTML = `
        <span class="swatch" style="background:${hexIntToCssColor(b.skin.fill)}"></span>
        <span class="ball-item-name">${b.name}</span>
        <span class="ball-item-meta">HP ${b.stats.maxHp} • ATK ${b.stats.atk} • DEF ${b.stats.def} • SPD ${b.stats.speed}</span>
      `;
      item.addEventListener('click', () => {
        this.state.editingId = b.id;
        this._syncListUI();
        this._syncFormUI(b);
      });
      this._els.list.appendChild(item);
    }
  }

  _applyTemplate(kind) {
    const presets = {
      tank: { maxHp: 15000, atk: 60, def: 120, speed: 0.7, radius: 30 },
      fighter: { maxHp: 10000, atk: 150, def: 50, speed: 1.0, radius: 28 },
      speedster: { maxHp: 7000, atk: 80, def: 30, speed: 1.8, radius: 26 },
      mage: { maxHp: 8000, atk: 50, def: 40, speed: 1.0, radius: 28 },
    };
    const t = presets[kind];
    if (!t) return;
    this._els.hp.value = t.maxHp;
    this._els.atk.value = t.atk;
    this._els.def.value = t.def;
    this._els.speed.value = t.speed;
    this._els.radius.value = t.radius;
  }

  _new() {
    this.state.editingId = null;
    this._syncListUI();
    this._syncFormUI(null);
  }

  _save() {
    const data = this._readForm();
    const now = Date.now();

    if (this.state.editingId) {
      const idx = this.state.list.findIndex((b) => b.id === this.state.editingId);
      if (idx >= 0) {
        this.state.list[idx] = { ...this.state.list[idx], ...data, updatedAt: now };
      }
    } else {
      const id = `ball_${Math.random().toString(16).slice(2)}_${now}`;
      const entry = { id, createdAt: now, updatedAt: now, ...data };
      this.state.list.unshift(entry);
      this.state.editingId = id;
    }

    saveBallsList(this.state.list);
    this._syncListUI();
    this._syncFormUI(this._getEditingBall());
  }

  _delete() {
    if (!this.state.editingId) return;
    const idx = this.state.list.findIndex((b) => b.id === this.state.editingId);
    if (idx < 0) return;
    this.state.list.splice(idx, 1);
    this.state.editingId = this.state.list[0]?.id ?? null;
    saveBallsList(this.state.list);
    this._syncListUI();
    this._syncFormUI(this._getEditingBall());
  }

  _export() {
    const ball = this._getEditingBall();
    if (!ball) {
      downloadJson('balls.json', this.state.list);
      return;
    }
    downloadJson(`${ball.name || ball.id}.json`, ball);
  }

  async _importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    const toImport = Array.isArray(parsed) ? parsed : [parsed];
    const now = Date.now();
    for (const raw of toImport) {
      if (!raw || typeof raw !== 'object') continue;
      const id = raw.id || `ball_${Math.random().toString(16).slice(2)}_${now}`;
      const normalized = {
        id,
        createdAt: raw.createdAt || now,
        updatedAt: now,
        name: String(raw.name || id),
        skin: {
          fill: Number(raw.skin?.fill) || 0x818cf8,
          glow: Number(raw.skin?.glow) || 0x6366f1,
          gradient: {
            enabled: Boolean(raw.skin?.gradient?.enabled),
            inner: Number(raw.skin?.gradient?.inner) || Number(raw.skin?.fill) || 0x818cf8,
            outer: Number(raw.skin?.gradient?.outer) || Number(raw.skin?.fill) || 0x818cf8,
          },
          pattern: {
            type: raw.skin?.pattern?.type || 'none',
          },
          trail: {
            enabled: Boolean(raw.skin?.trail?.enabled),
            length: clampNumber(raw.skin?.trail?.length, 4, 24, 12),
            color: Number(raw.skin?.trail?.color) || Number(raw.skin?.glow) || 0x6366f1,
          },
        },
        stats: {
          maxHp: clampNumber(raw.stats?.maxHp, 1, 999999, DEFAULT_BALL_STATS.maxHp),
          atk: clampNumber(raw.stats?.atk, 0, 999999, DEFAULT_BALL_STATS.atk),
          def: clampNumber(raw.stats?.def, 0, 999999, DEFAULT_BALL_STATS.def),
          speed: clampNumber(raw.stats?.speed, 0.2, 5, DEFAULT_BALL_STATS.speed),
          radius: clampNumber(raw.stats?.radius, 10, 80, DEFAULT_BALL_STATS.radius),
        },
        skills: Array.isArray(raw.skills) ? raw.skills : [],
      };

      // Upsert by id
      const idx = this.state.list.findIndex((b) => b.id === normalized.id);
      if (idx >= 0) this.state.list[idx] = normalized;
      else this.state.list.unshift(normalized);
    }

    saveBallsList(this.state.list);
    this.state.editingId = this.state.list[0]?.id ?? null;
    this._syncListUI();
    this._syncFormUI(this._getEditingBall());
  }
}

