/* ============================================================
   SkillRunner — AI decision for when to cast skills (Part 2)
   ============================================================ */

export class SkillRunner {
  /**
   * @param {import('../entities/Ball.js').Ball} owner
   */
  constructor(owner) {
    this.owner = owner;
  }

  /**
   * Tick skills and attempt a cast if something is ready.
   * Part 2 scaffolding: casts are "no-op" (consume cooldown only).
   * @param {number} dt
   */
  update(dt) {
    const owner = this.owner;
    if (!owner.isAlive) return;

    const skills = owner.skills || [];
    for (const s of skills) s.update(dt);

    // Pick a ready skill by highest priority (default 0)
    const target = owner.target || null;
    let best = null;
    let bestPriority = -Infinity;

    for (const s of skills) {
      if (!s.isReady) continue;
      if (!s.shouldCast(target)) continue;
      const p = Number(s.def?.ai?.priority) || 0;
      if (p > bestPriority) {
        bestPriority = p;
        best = s;
      }
    }

    if (!best) return;
    best.cast(target);
  }
}

