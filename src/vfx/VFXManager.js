/* ============================================================
   VFXManager — Part 5 visual effects (lightweight PixiJS)
   ============================================================ */

import { Container, Graphics } from 'pixi.js';

export class VFXManager {
  /**
   * @param {import('pixi.js').Application} app
   */
  constructor(app) {
    this.app = app;
    this.container = new Container();
    this.container.sortableChildren = true;

    /** @type {Array<any>} */
    this._effects = [];

    // Screen shake
    this._shakeMs = 0;
    this._shakeStrength = 0;
    this._baseX = 0;
    this._baseY = 0;
  }

  attach(stage) {
    stage.addChild(this.container);
  }

  clear() {
    for (const e of this._effects) e?.destroy?.();
    this._effects.length = 0;
    this.container.removeChildren();
    this._shakeMs = 0;
    this._shakeStrength = 0;
  }

  update(dt) {
    // Effects
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const e = this._effects[i];
      e.update(dt);
      if (e.isDone) {
        e.destroy();
        this._effects.splice(i, 1);
      }
    }

    // Shake (applied to game stage parent, i.e. stage itself from Game)
    if (this._shakeMs > 0) {
      this._shakeMs -= dt;
      const t = Math.max(0, this._shakeMs / 250);
      const s = this._shakeStrength * t;
      const ox = (Math.random() - 0.5) * 2 * s;
      const oy = (Math.random() - 0.5) * 2 * s;
      this.app.stage.x = this._baseX + ox;
      this.app.stage.y = this._baseY + oy;
    } else if (this.app.stage.x !== this._baseX || this.app.stage.y !== this._baseY) {
      this.app.stage.x = this._baseX;
      this.app.stage.y = this._baseY;
    }
  }

  shake(strength = 6, durationMs = 120) {
    this._shakeStrength = Math.max(this._shakeStrength, strength);
    this._shakeMs = Math.max(this._shakeMs, durationMs);
  }

  explosionRing(x, y, radius = 60, color = 0xfbbf24, durationMs = 240) {
    const g = new Graphics();
    g.zIndex = 10;
    this.container.addChild(g);
    const e = new RingEffect(g, x, y, radius, color, durationMs);
    this._effects.push(e);
    return e;
  }

  trailForProjectile(projectile, color = 0xff8c00) {
    const g = new Graphics();
    g.zIndex = 5;
    this.container.addChild(g);
    const e = new TrailEffect(g, projectile, color);
    this._effects.push(e);
    return e;
  }

  auraForBall(ball, color = 0x818cf8) {
    const g = new Graphics();
    g.zIndex = 2;
    this.container.addChild(g);
    const e = new AuraEffect(g, ball, color);
    this._effects.push(e);
    return e;
  }

  statusIndicator(ball) {
    const g = new Graphics();
    g.zIndex = 3;
    this.container.addChild(g);
    const e = new StatusIndicatorEffect(g, ball);
    this._effects.push(e);
    return e;
  }
}

class RingEffect {
  constructor(g, x, y, radius, color, durationMs) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.remainingMs = durationMs;
    this.totalMs = durationMs;
    this.isDone = false;
  }
  update(dt) {
    this.remainingMs -= dt;
    if (this.remainingMs <= 0) {
      this.isDone = true;
      return;
    }
    const t = 1 - this.remainingMs / this.totalMs;
    const r = this.radius * (0.6 + 0.6 * t);
    const alpha = 0.55 * (1 - t);
    const w = 2 + 2 * (1 - t);
    this.g.clear();
    this.g.circle(this.x, this.y, r);
    this.g.stroke({ color: this.color, alpha, width: w });
  }
  destroy() {
    this.g.destroy();
  }
}

class TrailEffect {
  constructor(g, projectile, color) {
    this.g = g;
    this.p = projectile;
    this.color = color;
    this.isDone = false;
    this._pts = [];
    this._max = 10;
  }
  update(dt) {
    void dt;
    if (!this.p?.isAlive) {
      // fade out quickly
      this._max = Math.max(0, this._max - 2);
      if (this._max <= 0) this.isDone = true;
    } else {
      this._pts.push({ x: this.p.x, y: this.p.y });
      while (this._pts.length > this._max) this._pts.shift();
    }
    this.g.clear();
    if (this._pts.length < 2) return;
    for (let i = 1; i < this._pts.length; i++) {
      const a = this._pts[i - 1];
      const b = this._pts[i];
      const t = i / this._pts.length;
      this.g.moveTo(a.x, a.y);
      this.g.lineTo(b.x, b.y);
      this.g.stroke({ color: this.color, alpha: 0.25 * t, width: 2.5 * t });
    }
  }
  destroy() {
    this.g.destroy();
  }
}

class AuraEffect {
  constructor(g, ball, color) {
    this.g = g;
    this.ball = ball;
    this.color = color;
    this.isDone = false;
    this._t = 0;
  }
  update(dt) {
    this._t += dt / 1000;
    if (!this.ball?.isAlive) {
      this.isDone = true;
      return;
    }
    // Show aura only if has any buff/passive active
    const hasBuff = (this.ball.statusEffects || []).some((e) => e.type === 'buff');
    const hasPassive = Boolean(this.ball._regenPerSecond) || Boolean(this.ball.thorns);
    if (!hasBuff && !hasPassive) {
      this.g.clear();
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 4);
    const r = this.ball.radius + 10 + pulse * 4;
    this.g.clear();
    this.g.circle(this.ball.x, this.ball.y, r);
    this.g.stroke({ color: this.color, alpha: 0.12 + 0.08 * pulse, width: 2 });
  }
  destroy() {
    this.g.destroy();
  }
}

class StatusIndicatorEffect {
  constructor(g, ball) {
    this.g = g;
    this.ball = ball;
    this.isDone = false;
    this._t = 0;
  }
  update(dt) {
    this._t += dt / 1000;
    if (!this.ball?.isAlive) {
      this.isDone = true;
      return;
    }
    const types = new Set((this.ball.statusEffects || []).map((e) => e.type));
    const burn = types.has('burn');
    const slow = types.has('slow');
    const stun = types.has('stun');
    this.g.clear();
    const x = this.ball.x;
    const y = this.ball.y - this.ball.radius - 8;
    let dx = -10;
    if (burn) {
      dot(this.g, x + dx, y, 0xff4500);
      dx += 10;
    }
    if (slow) {
      dot(this.g, x + dx, y, 0x60a5fa);
      dx += 10;
    }
    if (stun) {
      const a = 0.55 + 0.35 * Math.sin(this._t * 10);
      dot(this.g, x + dx, y, 0xfbbf24, a);
    }
  }
  destroy() {
    this.g.destroy();
  }
}

function dot(g, x, y, color, alpha = 0.9) {
  g.circle(x, y, 3);
  g.fill({ color, alpha });
}

