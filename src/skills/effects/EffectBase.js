/* ============================================================
   EffectBase — Visual/effect base class (Part 2)
   ============================================================ */

export class EffectBase {
  /**
   * @param {object} config
   * @param {import('../../entities/Ball.js').Ball} owner
   */
  constructor(config, owner) {
    this.config = config || {};
    this.owner = owner;
    this.isDone = false;
    this._remainingMs = Math.max(0, Number(this.config.duration) || 0);
  }

  update(dt) {
    this._remainingMs = Math.max(0, this._remainingMs - dt);
    if (this._remainingMs <= 0 && (Number(this.config.duration) || 0) > 0) {
      this.isDone = true;
    }
  }
}

