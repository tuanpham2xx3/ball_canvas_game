import { SkillBase } from '../SkillBase.js';

export class AoeSkill extends SkillBase {
  cast(target) {
    if (!super.cast(target)) return false;
    if (!this.owner.game) return true;

    const radius = Number(this.def.effect?.onHit?.radius) || Number(this.def.radius) || 60;
    const dmg = Number(this.def.damage) || 0;
    this.owner.game.applyAoe({
      owner: this.owner,
      x: this.owner.x,
      y: this.owner.y,
      radius,
      damage: dmg,
      debuff: this.def.debuff || null,
      color: parseColor(this.def.effect?.onHit?.color, 0xfbbf24),
      durationMs: Math.max(150, Number(this.def.effect?.onHit?.duration) || 250),
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

