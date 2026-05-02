/* ============================================================
   DamageText — Floating damage numbers
   ============================================================ */

import { Text } from 'pixi.js';

const FLOAT_SPEED = 1.2;
const LIFETIME = 50; // frames
const COLORS = {
  physical: 0xff6b6b,
  heal: 0x34d399,
  skill: 0xfbbf24,
};

export class DamageText {
  /**
   * @param {import('pixi.js').Application} app
   */
  constructor(app) {
    this.app = app;
    /** @type {Array<{text: Text, life: number, vy: number}>} */
    this._texts = [];
  }

  /**
   * Spawn a floating damage number.
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   * @param {string} [type='physical']
   */
  spawn(x, y, amount, type = 'physical') {
    const color = COLORS[type] || COLORS.physical;
    const prefix = type === 'heal' ? '+' : '-';

    const text = new Text({
      text: `${prefix}${amount}`,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 14 + Math.min(amount / 50, 8), // bigger text for bigger damage
        fontWeight: '700',
        fill: color,
        stroke: { color: 0x000000, width: 2 },
        align: 'center',
      },
    });
    text.anchor.set(0.5);
    text.x = x + (Math.random() - 0.5) * 20;
    text.y = y - 10;

    this.app.stage.addChild(text);

    this._texts.push({
      text,
      life: LIFETIME,
      vy: -FLOAT_SPEED - Math.random() * 0.5,
    });
  }

  /**
   * Update all floating texts.
   */
  update() {
    for (let i = this._texts.length - 1; i >= 0; i--) {
      const entry = this._texts[i];
      entry.life--;
      entry.text.y += entry.vy;
      entry.text.alpha = Math.max(0, entry.life / LIFETIME);

      // Scale down as it fades
      const scale = 0.8 + 0.2 * (entry.life / LIFETIME);
      entry.text.scale.set(scale);

      if (entry.life <= 0) {
        this.app.stage.removeChild(entry.text);
        entry.text.destroy();
        this._texts.splice(i, 1);
      }
    }
  }

  /**
   * Remove all texts.
   */
  destroy() {
    for (const entry of this._texts) {
      this.app.stage.removeChild(entry.text);
      entry.text.destroy();
    }
    this._texts.length = 0;
  }
}
