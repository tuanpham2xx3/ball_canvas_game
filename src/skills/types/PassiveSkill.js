import { SkillBase } from '../SkillBase.js';

export class PassiveSkill extends SkillBase {
  // Passive skills don't use cooldown by default.
  cast() {
    return false;
  }
}

