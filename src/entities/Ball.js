/* ============================================================
   Ball — Main entity with HP, stats, graphics
   ============================================================ */

import { Graphics, Container, Text } from 'pixi.js';
import { DEFAULT_BALL_STATS } from '../config.js';

let ballIdCounter = 0;

export class Ball {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.vx
   * @param {number} opts.vy
   * @param {object} opts.skin - { fill, glow }
   * @param {object} [opts.stats] - overrides for DEFAULT_BALL_STATS
   */
  constructor(opts) {
    this.id = `ball_${++ballIdCounter}`;
    this.name = opts.name || this.id;

    // Merge stats with defaults
    const s = { ...DEFAULT_BALL_STATS, ...opts.stats };
    this.maxHp = s.maxHp;
    this.hp = s.maxHp;
    this.atk = s.atk;
    this.def = s.def;
    this.speedMul = s.speed; // multiplier for constant accel
    this.radius = s.radius;
    this.mass = s.radius * s.radius; // proportional to area

    // Extended stats (default 0)
    this.crit = s.crit;
    this.critDamage = s.critDamage;
    this.lifesteal = s.lifesteal;
    this.armor = s.armor;
    this.magicPower = s.magicPower;
    this.cooldownReduction = s.cooldownReduction;
    this.tenacity = s.tenacity;

    // Physics state
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;

    // Skin
    this.skin = opts.skin || { fill: 0x818cf8, glow: 0x6366f1 };

    // Combat state
    this.isAlive = true;
    this.hits = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.flashTimer = 0;

    // Skills placeholder (Part 2)
    this.skills = [];
    this.statusEffects = [];

    // AI target reference (set by Game)
    this.target = null;

    // Build graphics
    this.container = new Container();
    this._buildGraphics();
  }

  _buildGraphics() {
    const r = this.radius;

    // Outer glow
    const glow = new Graphics();
    glow.circle(0, 0, r + 8);
    glow.fill({ color: this.skin.glow, alpha: 0.15 });
    this.container.addChild(glow);
    this._glow = glow;

    // Main body
    const body = new Graphics();
    body.circle(0, 0, r);
    body.fill(this.skin.fill);
    this.container.addChild(body);
    this._body = body;

    // Highlight
    const highlight = new Graphics();
    highlight.circle(-r * 0.28, -r * 0.28, r * 0.35);
    highlight.fill({ color: 0xffffff, alpha: 0.3 });
    this.container.addChild(highlight);

    // Specular
    const spec = new Graphics();
    spec.circle(-r * 0.15, -r * 0.4, r * 0.12);
    spec.fill({ color: 0xffffff, alpha: 0.6 });
    this.container.addChild(spec);

    // Name label
    this._nameLabel = new Text({
      text: this.name,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: 0xffffff,
        align: 'center',
      },
    });
    this._nameLabel.anchor.set(0.5);
    this._nameLabel.y = -r - 20;
    this.container.addChild(this._nameLabel);

    // Sync position
    this.container.x = this.x;
    this.container.y = this.y;
  }

  /**
   * Take damage from a source.
   * @param {number} rawDamage - damage before DEF reduction
   * @param {Ball} [source] - the attacker
   * @param {string} [type='physical'] - damage type
   * @returns {number} actual damage dealt
   */
  takeDamage(rawDamage, source = null, type = 'physical') {
    if (!this.isAlive) return 0;

    const reduction = this.def + this.armor;
    const actual = Math.max(1, Math.round(rawDamage - reduction));

    this.hp -= actual;
    this.damageTaken += actual;
    this.flashTimer = 10;

    if (source) {
      source.damageDealt += actual;

      // Lifesteal
      if (source.lifesteal > 0) {
        const healAmt = Math.round(actual * source.lifesteal / 100);
        source.heal(healAmt);
      }
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }

    return actual;
  }

  /**
   * Heal HP (capped at maxHp).
   * @param {number} amount
   */
  heal(amount) {
    if (!this.isAlive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Update per frame.
   * @param {number} dt - delta time (ms since last frame)
   */
  update(dt) {
    // Flash decay
    if (this.flashTimer > 0) {
      this.flashTimer--;
    }

    // Sync graphic position
    this.container.x = this.x;
    this.container.y = this.y;

    // Squash-stretch based on velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const stretch = Math.min(1 + speed * 0.003, 1.12);
    const angle = Math.atan2(this.vy, this.vx);

    this.container.rotation = angle;
    this.container.scale.x = stretch;
    this.container.scale.y = 2 - stretch;

    // Keep name label upright
    this._nameLabel.rotation = -angle;
    this._nameLabel.scale.x = 1 / stretch;
    this._nameLabel.scale.y = 1 / (2 - stretch);

    // Flash effect on damage
    if (this.flashTimer > 0) {
      const flash = 1 + this.flashTimer * 0.015;
      this.container.scale.x *= flash;
      this.container.scale.y *= flash;
      this._body.alpha = 0.6 + Math.sin(this.flashTimer * 2) * 0.4;
    } else {
      this._body.alpha = 1;
    }

    // Death visual
    if (!this.isAlive) {
      this.container.alpha = Math.max(0.2, this.container.alpha - 0.02);
    }
  }

  /** Get HP percentage [0, 1]. */
  get hpPercent() {
    return this.hp / this.maxHp;
  }

  /** Check if dead. */
  isDead() {
    return !this.isAlive;
  }
}
