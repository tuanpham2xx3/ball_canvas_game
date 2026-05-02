/* ============================================================
   SkillRegistry — Load + instantiate skills from JSON (Part 2)
   ============================================================ */

import { BuffSkill } from './types/BuffSkill.js';
import { DebuffSkill } from './types/DebuffSkill.js';
import { ProjectileSkill } from './types/ProjectileSkill.js';
import { AoeSkill } from './types/AoeSkill.js';
import { MineSkill } from './types/MineSkill.js';
import { PassiveSkill } from './types/PassiveSkill.js';

const TYPE_TO_CLASS = {
  buff: BuffSkill,
  debuff: DebuffSkill,
  projectile: ProjectileSkill,
  aoe: AoeSkill,
  mine: MineSkill,
  passive: PassiveSkill,
};

export class SkillRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this._definitions = new Map(); // id -> definition
  }

  /**
   * Register one definition.
   * @param {object} def
   */
  register(def) {
    if (!def || typeof def !== 'object') return;
    if (!def.id) return;
    this._definitions.set(def.id, def);
  }

  /**
   * Register many definitions.
   * @param {object[]} defs
   */
  registerMany(defs) {
    if (!Array.isArray(defs)) return;
    for (const d of defs) this.register(d);
  }

  /**
   * Return definition by id.
   * @param {string} id
   */
  getDefinition(id) {
    return this._definitions.get(id) || null;
  }

  /**
   * Instantiate a skill for an owner.
   * @param {string|object} defOrId
   * @param {import('../entities/Ball.js').Ball} owner
   */
  create(defOrId, owner) {
    const def = typeof defOrId === 'string' ? this.getDefinition(defOrId) : defOrId;
    if (!def) return null;

    const SkillClass = TYPE_TO_CLASS[def.type];
    if (!SkillClass) {
      // Unknown types are ignored for now (Part 2: scaffolding only)
      return null;
    }

    return new SkillClass(def, owner);
  }

  /**
   * Create multiple skills from IDs/defs.
   * @param {Array<string|object>} defsOrIds
   * @param {import('../entities/Ball.js').Ball} owner
   */
  createMany(defsOrIds, owner) {
    if (!Array.isArray(defsOrIds)) return [];
    const out = [];
    for (const item of defsOrIds) {
      const s = this.create(item, owner);
      if (s) out.push(s);
    }
    return out;
  }
}

