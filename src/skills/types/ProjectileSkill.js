import { SkillBase } from '../SkillBase.js';

export class ProjectileSkill extends SkillBase {
  shouldCast(target) {
    if (!super.shouldCast(target)) return false;
    if (!target || !target.isAlive) return false;
    const range = Number(this.def.range) || Number(this.def.ai?.castRange) || 0;
    if (range <= 0) return true;
    const dx = target.x - this.owner.x;
    const dy = target.y - this.owner.y;
    return dx * dx + dy * dy <= range * range;
  }

  cast(target) {
    if (!super.cast(target)) return false;
    if (!this.owner.game) return true;
    if (!target || !target.isAlive) return true;

    const dx = target.x - this.owner.x;
    const dy = target.y - this.owner.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = Number(this.def.speed) || 8;

    this.owner.game.spawnProjectile({
      owner: this.owner,
      target,
      x: this.owner.x,
      y: this.owner.y,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
      radius: Number(this.def.effect?.radius) || 10,
      color: parseColor(this.def.effect?.color, 0xff8c00),
      damage: Number(this.def.damage) || 0,
      debuff: this.def.debuff || null,
      lifeMs: Math.max(500, Number(this.def.duration) || 3500),
    });

    return true;
  }
}

function parseColor(v, fallback) {
  if (typeof v === 'number') return v;
  const s = String(v || '').trim();
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s.slice(2), 16);
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.slice(1), 16);
  return fallback;
}

