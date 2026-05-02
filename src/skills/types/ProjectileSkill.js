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
}

