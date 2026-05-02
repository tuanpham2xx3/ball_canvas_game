/* ============================================================
   Projectile — Skill projectile entity (Part 4)
   ============================================================ */

import { Graphics, Container } from 'pixi.js';
import { ARENA } from '../config.js';

export class Projectile {
  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.vx
   * @param {number} opts.vy
   * @param {number} opts.radius
   * @param {number} opts.damage
   * @param {import('./Ball.js').Ball} opts.owner
   * @param {import('./Ball.js').Ball} opts.target
   * @param {object|null} [opts.debuff]
   * @param {number} [opts.lifeMs]
   * @param {number} [opts.color]
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.radius = opts.radius ?? 10;
    this.damage = opts.damage ?? 0;
    this.owner = opts.owner;
    this.target = opts.target;
    this.debuff = opts.debuff || null;
    this.remainingMs = Math.max(200, Number(opts.lifeMs) || 4000);
    this.isAlive = true;

    const color = Number(opts.color) || 0xff8c00;
    this.container = new Container();
    const g = new Graphics();
    g.circle(0, 0, this.radius);
    g.fill({ color, alpha: 0.95 });
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

    this.x += this.vx;
    this.y += this.vy;
    this.container.x = this.x;
    this.container.y = this.y;

    // Wall bounds: destroy if out of arena
    if (
      this.x < -20 || this.y < -20 ||
      this.x > ARENA.SIZE + 20 || this.y > ARENA.SIZE + 20
    ) {
      this.isAlive = false;
    }
  }

  /**
   * Check collision with a ball.
   * @param {import('./Ball.js').Ball} ball
   */
  hitsBall(ball) {
    if (!this.isAlive) return false;
    if (!ball?.isAlive) return false;
    if (ball === this.owner) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const r = ball.radius + this.radius;
    return dx * dx + dy * dy <= r * r;
  }

  destroy() {
    this.isAlive = false;
    this.container.destroy({ children: true });
  }
}

