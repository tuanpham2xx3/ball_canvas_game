/* ============================================================
   SkillBase — Abstract base class for all skills (Part 2)
   ============================================================ */

export class SkillBase {
  /**
   * @param {object} definition - skill JSON definition
   * @param {import('../entities/Ball.js').Ball} owner
   */
  constructor(definition, owner) {
    this.def = definition;
    this.owner = owner;

    this.id = definition.id;
    this.name = definition.name || definition.id;
    this.type = definition.type;
    this.description = definition.description || '';

    this.cooldownMs = Math.max(0, Number(definition.cooldown) || 0);
    this._cdRemainingMs = 0;
    this.enabled = true;
  }

  /** @returns {boolean} */
  get isReady() {
    return this.enabled && this._cdRemainingMs <= 0;
  }

  /** @returns {number} */
  get cooldownRemainingMs() {
    return Math.max(0, this._cdRemainingMs);
  }

  /**
   * Tick cooldown / durations.
   * @param {number} dt
   */
  update(dt) {
    if (!this.enabled) return;
    this._cdRemainingMs = Math.max(0, this._cdRemainingMs - dt);
  }

  /**
   * Lightweight AI check: should we cast now?
   * Override per skill type later.
   * @param {import('../entities/Ball.js').Ball | null} target
   */
  shouldCast(target) {
    void target;
    return this.isReady;
  }

  /**
   * Cast the skill. Returns true if cast happened.
   * Base behavior: consume cooldown only.
   * @param {import('../entities/Ball.js').Ball | null} target
   * @returns {boolean}
   */
  cast(target) {
    void target;
    if (!this.isReady) return false;
    this._cdRemainingMs = this.cooldownMs;
    return true;
  }
}

