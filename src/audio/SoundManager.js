/* ============================================================
   SoundManager — Minimal WebAudio SFX (Part 7)
   ============================================================ */

const STORAGE_SFX = 'ballsArena.settings.sfx';

export class SoundManager {
  constructor() {
    this.enabled = true;
    this._ctx = null;
    this._gain = null;

    const saved = localStorage.getItem(STORAGE_SFX);
    if (saved === '0') this.enabled = false;
  }

  setEnabled(on) {
    this.enabled = Boolean(on);
    localStorage.setItem(STORAGE_SFX, this.enabled ? '1' : '0');
    if (!this.enabled) this._stopAll();
  }

  getEnabled() {
    return this.enabled;
  }

  _ensure() {
    if (this._ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this._ctx = new Ctx();
    this._gain = this._ctx.createGain();
    this._gain.gain.value = 0.12;
    this._gain.connect(this._ctx.destination);
  }

  _beep({ freq = 440, dur = 0.06, type = 'sine', detune = 0 } = {}) {
    if (!this.enabled) return;
    this._ensure();
    if (!this._ctx) return;
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});

    const o = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(this._gain);
    const t0 = this._ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.01);
  }

  collision(strength = 1) {
    const s = Math.max(0, Math.min(1, strength));
    this._beep({ freq: 120 + 240 * s, dur: 0.04 + 0.03 * s, type: 'triangle' });
  }

  skill(strength = 1) {
    const s = Math.max(0, Math.min(1, strength));
    this._beep({ freq: 520 + 340 * s, dur: 0.05, type: 'sine', detune: 30 });
  }

  victory() {
    this._beep({ freq: 660, dur: 0.08, type: 'sine' });
    setTimeout(() => this._beep({ freq: 880, dur: 0.08, type: 'sine' }), 90);
  }

  _stopAll() {
    // no-op: short oscillators end on their own
  }
}

