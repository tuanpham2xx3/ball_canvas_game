import { SkillBase } from '../SkillBase.js';

export class PassiveSkill extends SkillBase {
  // Passive skills don't use cooldown by default.
  cast() {
    return false;
  }

  update(dt) {
    super.update(dt);
    // Apply passive every tick
    if (this.def.passive === 'regen') {
      const perSec = Number(this.def.amountPerSecond) || 0;
      this.owner.regen(perSec);
    }
    if (this.def.passive === 'thorns') {
      this.owner.thorns = Number(this.def.reflectPct) || 0;
    }
  }
}

