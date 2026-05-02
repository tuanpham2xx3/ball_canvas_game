import { SkillBase } from '../SkillBase.js';

export class DebuffSkill extends SkillBase {
  cast(target) {
    if (!super.cast(target)) return false;
    if (!target || !target.isAlive) return true;
    if (!this.def.debuff) return true;

    target.applyStatusEffect({
      ...this.def.debuff,
      source: this.owner,
    });
    return true;
  }
}

