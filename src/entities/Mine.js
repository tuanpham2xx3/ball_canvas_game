/* ============================================================
   Mine — Skill mine entity (Part 4)
   ============================================================ */

import { Graphics, Container } from 'pixi.js';

export class Mine {
  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.radius
   * @param {number} opts.triggerRadius
   * @param {number} opts.damage
   * @param {import('./Ball.js').Ball} opts.owner
   * @param {object|null} [opts.debuff]
   * @param {number} [opts.lifeMs]
   * @param {number} [opts.color]
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.radius = Number(opts.radius) || 8;
    this.triggerRadius = Number(opts.triggerRadius) || 26;
    this.damage = Number(opts.damage) || 0;
    this.owner = opts.owner;
    this.debuff = opts.debuff || null;
    this.remainingMs = Math.max(500, Number(opts.lifeMs) || 12000);
    this.isAlive = true;

    const color = Number(opts.color) || 0x22c55e;
    this.container = new Container();
    const g = new Graphics();
    g.circle(0, 0, this.radius);
    g.fill({ color, alpha: 0.95 });
    g.stroke({ color: 0xffffff, alpha: 0.18, width: 1 });
    this.container.addChild(g);
    this._g = g;
    this.container.x = this.x;
    this.container.y = this.y;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.remainingMs -= dt;
    if (this.remainingMs <= 0) {
      this.isAlive = false;
      return;
    }
    // subtle pulse
    const t = (this.remainingMs / 1000) % 1;
    this.container.scale.set(0.95 + 0.05 * Math.sin(t * Math.PI * 2));
  }

  /**
   * @param {import('./Ball.js').Ball} ball
   */
  isTriggeredBy(ball) {
    if (!this.isAlive) return false;
    if (!ball?.isAlive) return false;
    if (ball === this.owner) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    return dx * dx + dy * dy <= this.triggerRadius * this.triggerRadius;
  }

  destroy() {
    this.isAlive = false;
    this.container.destroy({ children: true });
  }
}

