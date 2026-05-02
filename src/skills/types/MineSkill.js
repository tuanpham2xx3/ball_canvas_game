import { SkillBase } from '../SkillBase.js';

export class MineSkill extends SkillBase {
  cast(target) {
    void target;
    if (!super.cast(null)) return false;
    if (!this.owner.game) return true;

    const lifeMs = Math.max(1000, Number(this.def.duration) || 10000);
    const triggerRadius = Number(this.def.triggerRadius) || 34;
    const mineRadius = Number(this.def.effect?.radius) || 8;
    const dmg = Number(this.def.damage) || 0;

    // Drop near owner with a small random offset
    const ang = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 25;

    this.owner.game.spawnMine({
      owner: this.owner,
      x: this.owner.x + Math.cos(ang) * dist,
      y: this.owner.y + Math.sin(ang) * dist,
      radius: mineRadius,
      triggerRadius,
      damage: dmg,
      debuff: this.def.debuff || null,
      lifeMs,
      color: parseColor(this.def.effect?.color, 0x22c55e),
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

