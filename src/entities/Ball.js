/* ============================================================
   Ball — Main entity with HP, stats, graphics
   ============================================================ */

import { Graphics, Container, Text } from 'pixi.js';
import { DEFAULT_BALL_STATS } from '../config.js';
import { SkillRunner } from '../skills/SkillRunner.js';

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
    this.baseSpeedMul = s.speed; // multiplier for constant accel
    this._speedMulBonus = 0; // additive bonus (e.g. buffs), expressed as multiplier delta
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
    this.skills = Array.isArray(opts.skills) ? opts.skills : [];
    this.statusEffects = [];
    this.skillRunner = new SkillRunner(this);
    this.game = null; // set by Game when added

    // Status aggregations (computed from statusEffects)
    this._slowMul = 1;
    this._stunRemainingMs = 0;

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
    // Skin system (Part 6): solid / gradient + optional pattern overlay
    drawBallFill(body, r, this.skin);
    this.container.addChild(body);
    this._body = body;

    // Pattern overlay (optional)
    const pattern = new Graphics();
    drawBallPattern(pattern, r, this.skin);
    this.container.addChild(pattern);
    this._pattern = pattern;

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

      // Thorns (passive reflect)
      if (this.thorns && this.thorns > 0) {
        const reflect = Math.max(1, Math.round(actual * (this.thorns / 100)));
        source.takeDamage(reflect + 0, null, 'thorns');
        if (this.game) {
          this.game.eventBus.emit('skillHit', { x: source.x, y: source.y, amount: reflect, type: 'skill' });
        }
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

    // Status effects (Part 4)
    this._updateStatusEffects(dt);
    this._tickPassives(dt);

    // Skills (Part 2 scaffolding)
    this.skillRunner.update(dt);
  }

  /**
   * Apply a timed status effect.
   * @param {object} effect
   * @param {string} effect.type - 'burn' | 'slow' | 'stun'
   * @param {number} effect.duration
   */
  applyStatusEffect(effect) {
    if (!effect || !effect.type) return;
    const now = Date.now();
    const e = {
      id: effect.id || `${effect.type}_${now}_${Math.random().toString(16).slice(2)}`,
      type: effect.type,
      remainingMs: Math.max(0, Number(effect.duration) || 0),
      source: effect.source || null,
      // burn
      damage: Number(effect.damage) || 0,
      tickRate: Math.max(50, Number(effect.tickRate) || 1000),
      _tickAccMs: 0,
      // slow
      slowMul: clampMul(effect.slowMul, 0.2, 1),
      // stun
      stun: true,
    };

    // Simple stacking rule: same type refreshes if stronger/longer
    const idx = this.statusEffects.findIndex((x) => x.type === e.type);
    if (idx >= 0) {
      const cur = this.statusEffects[idx];
      cur.remainingMs = Math.max(cur.remainingMs, e.remainingMs);
      if (e.type === 'burn') cur.damage = Math.max(cur.damage, e.damage);
      if (e.type === 'burn') cur.tickRate = Math.min(cur.tickRate, e.tickRate);
      if (e.type === 'slow') cur.slowMul = Math.min(cur.slowMul, e.slowMul);
      return;
    }
    this.statusEffects.push(e);
  }

  _updateStatusEffects(dt) {
    if (!this.isAlive) return;

    let slowMul = 1;
    let stunRemaining = 0;

    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const e = this.statusEffects[i];
      e.remainingMs -= dt;

      if (e.type === 'burn') {
        e._tickAccMs += dt;
        while (e._tickAccMs >= e.tickRate && e.remainingMs > 0) {
          e._tickAccMs -= e.tickRate;
          const dmg = Math.max(1, Math.round(e.damage));
          if (dmg > 0) {
            this.takeDamage(dmg, e.source || null, 'burn');
            if (this.game) {
              this.game.eventBus.emit('skillHit', { x: this.x, y: this.y, amount: dmg, type: 'skill' });
            }
          }
        }
      }

      if (e.type === 'slow') {
        slowMul = Math.min(slowMul, e.slowMul || 1);
      }

      if (e.type === 'stun') {
        stunRemaining = Math.max(stunRemaining, e.remainingMs);
      }

      if (e.remainingMs <= 0) {
        if (e.type === 'buff' && typeof e._revert === 'function') {
          e._revert();
        }
        this.statusEffects.splice(i, 1);
      }
    }

    this._slowMul = slowMul;
    this._stunRemainingMs = Math.max(0, stunRemaining);
  }

  /** Effective speed multiplier with debuffs/buffs applied. */
  get speedMul() {
    return Math.max(0.05, (this.baseSpeedMul + this._speedMulBonus) * this._slowMul);
  }

  get isStunned() {
    return this._stunRemainingMs > 0;
  }

  /** Temporary stat modifiers (Buffs). */
  addTempStatMul({ atkMul = 0, defMul = 0, speedMul = 0, durationMs = 0 } = {}) {
    const id = `buff_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const baseAtk = this.atk;
    const baseDef = this.def;
    const baseSpeed = this._speedMulBonus;

    this.atk = Math.round(this.atk * (1 + atkMul));
    this.def = Math.round(this.def * (1 + defMul));
    this._speedMulBonus += speedMul;

    this.statusEffects.push({
      id,
      type: 'buff',
      remainingMs: Math.max(0, Number(durationMs) || 0),
      _revert: () => {
        this.atk = baseAtk;
        this.def = baseDef;
        this._speedMulBonus = baseSpeed;
      },
    });
  }

  get thorns() {
    return Number(this._thornsPct) || 0;
  }

  set thorns(v) {
    this._thornsPct = Number(v) || 0;
  }

  regen(amountPerSecond) {
    this._regenPerSecond = Number(amountPerSecond) || 0;
  }

  _tickPassives(dt) {
    if (!this._regenPerSecond) return;
    const healAmt = (this._regenPerSecond * dt) / 1000;
    if (healAmt > 0) this.heal(Math.round(healAmt));
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

function clampMul(v, min, max) {
  const x = Number(v);
  if (!Number.isFinite(x)) return 1;
  return Math.min(max, Math.max(min, x));
}

function drawBallFill(g, r, skin) {
  g.clear();
  const grad = skin?.gradient;
  const enabled = Boolean(grad?.enabled);

  if (!enabled) {
    g.circle(0, 0, r);
    g.fill(skin?.fill ?? 0x818cf8);
    return;
  }

  const inner = Number(grad?.inner ?? skin?.fill ?? 0x818cf8);
  const outer = Number(grad?.outer ?? skin?.fill ?? 0x818cf8);

  // Approx radial gradient via concentric circles (cheap + good enough)
  const steps = 14;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const col = lerpColor(inner, outer, 1 - t);
    g.circle(0, 0, r * t);
    g.fill(col);
  }
}

function drawBallPattern(g, r, skin) {
  g.clear();
  const type = skin?.pattern?.type || 'none';
  if (type === 'none') return;

  if (type === 'dots') {
    // seeded-ish random based on name
    const seed = hash32(String(skin?.pattern?.seed ?? 'dots'));
    let s = seed;
    const rand = () => {
      // xorshift32
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return ((s >>> 0) % 10000) / 10000;
    };
    const count = 12;
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const rr = (0.15 + rand() * 0.75) * r;
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr;
      g.circle(x, y, 2 + rand() * 2.2);
      g.fill({ color: 0xffffff, alpha: 0.12 });
    }
  }

  if (type === 'stripes') {
    const w = 2;
    for (let x = -r * 1.2; x < r * 1.2; x += 6) {
      g.moveTo(x, -r * 1.2);
      g.lineTo(x + r * 1.2, r * 1.2);
      g.stroke({ color: 0xffffff, alpha: 0.08, width: w });
    }
  }

  // Clip pattern to circle by drawing a mask-ish circle with destination-in isn't available,
  // so we rely on low alpha and staying roughly inside bounds.
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
