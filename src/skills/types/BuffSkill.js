import { SkillBase } from '../SkillBase.js';

export class BuffSkill extends SkillBase {
  cast(target) {
    void target;
    if (!super.cast(null)) return false;
    const dur = Math.max(250, Number(this.def.duration) || 2000);
    const atkMul = Number(this.def.atkMul) || 0;
    const defMul = Number(this.def.defMul) || 0;
    const speedMul = Number(this.def.speedMul) || 0;
    this.owner.addTempStatMul({ atkMul, defMul, speedMul, durationMs: dur });
    return true;
  }
}

