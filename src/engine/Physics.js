/* ============================================================
   Physics — Wall bounce + ball collision + damage
   ============================================================ */

import { ARENA, PHYSICS } from '../config.js';
import { magnitude } from '../utils/MathUtils.js';

export class Physics {
  /**
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Update all ball positions and handle collisions.
   * @param {import('../entities/Ball.js').Ball[]} balls
   * @param {number} dt
   */
  update(balls, dt) {
    const size = ARENA.SIZE;
    const {
      GRAVITY, CONSTANT_ACCEL, MIN_SPEED, MAX_SPEED,
      WALL_RESTITUTION, BALL_RESTITUTION,
    } = PHYSICS;

    // --- Move each ball ---
    for (const ball of balls) {
      if (!ball.isAlive) continue;

      // Gravity
      ball.vy += GRAVITY;

      // Constant acceleration in movement direction
      const speed = magnitude(ball.vx, ball.vy);
      if (speed > 0.01) {
        const dirX = ball.vx / speed;
        const dirY = ball.vy / speed;
        const accel = speed < MIN_SPEED
          ? CONSTANT_ACCEL * ball.speedMul * 2
          : CONSTANT_ACCEL * ball.speedMul;
        ball.vx += dirX * accel;
        ball.vy += dirY * accel;
      } else {
        // Nearly stopped → random kick
        const kickAngle = Math.random() * Math.PI * 2;
        ball.vx = Math.cos(kickAngle) * MIN_SPEED;
        ball.vy = Math.sin(kickAngle) * MIN_SPEED;
      }

      // Cap max speed
      const newSpeed = magnitude(ball.vx, ball.vy);
      if (newSpeed > MAX_SPEED * ball.speedMul) {
        const cap = MAX_SPEED * ball.speedMul;
        ball.vx = (ball.vx / newSpeed) * cap;
        ball.vy = (ball.vy / newSpeed) * cap;
      }

      // Integrate position
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounce (NO damage)
      this._wallBounce(ball, size, WALL_RESTITUTION);
    }

    // --- Ball-ball collisions ---
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (!balls[i].isAlive || !balls[j].isAlive) continue;
        this._ballCollision(balls[i], balls[j], BALL_RESTITUTION);
      }
    }
  }

  /**
   * Wall bounce — no damage.
   */
  _wallBounce(ball, size, restitution) {
    const r = ball.radius;

    if (ball.x - r < 0) {
      ball.x = r;
      ball.vx = Math.abs(ball.vx) * restitution;
    } else if (ball.x + r > size) {
      ball.x = size - r;
      ball.vx = -Math.abs(ball.vx) * restitution;
    }

    if (ball.y - r < 0) {
      ball.y = r;
      ball.vy = Math.abs(ball.vy) * restitution;
    } else if (ball.y + r > size) {
      ball.y = size - r;
      ball.vy = -Math.abs(ball.vy) * restitution;
    }
  }

  /**
   * Elastic ball-ball collision + damage.
   */
  _ballCollision(a, b, restitution) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist >= minDist || dist < 0.001) return;

    // Normal
    const nx = dx / dist;
    const ny = dy / dist;

    // Relative velocity
    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const relVelN = dvx * nx + dvy * ny;

    // Already separating
    if (relVelN <= 0) return;

    // Impact speed (for damage calc)
    const impactSpeed = Math.abs(relVelN);

    // Elastic impulse
    const totalMass = a.mass + b.mass;
    const impulse = (2 * relVelN * restitution) / totalMass;

    a.vx -= impulse * b.mass * nx;
    a.vy -= impulse * b.mass * ny;
    b.vx += impulse * a.mass * nx;
    b.vy += impulse * a.mass * ny;

    // Separate overlapping
    const overlap = minDist - dist;
    const sepX = (overlap / 2 + 0.5) * nx;
    const sepY = (overlap / 2 + 0.5) * ny;
    a.x -= sepX;
    a.y -= sepY;
    b.x += sepX;
    b.y += sepY;

    // --- DAMAGE ---
    // Each ball takes damage based on the OTHER ball's ATK × impactSpeed
    const dmgToA = a.takeDamage(b.atk * impactSpeed * 0.1, b, 'physical');
    const dmgToB = b.takeDamage(a.atk * impactSpeed * 0.1, a, 'physical');

    // Track hits
    a.hits++;
    b.hits++;

    // Emit collision event
    this.eventBus.emit('collision', {
      ballA: a,
      ballB: b,
      impactSpeed,
      dmgToA,
      dmgToB,
    });
  }
}
