/* ============================================================
   HUD — HP bars + ball info overlay
   ============================================================ */

import { Container, Graphics, Text } from 'pixi.js';

const BAR_WIDTH = 50;
const BAR_HEIGHT = 5;
const BAR_OFFSET_Y = 12; // below ball center + radius

export class HUD {
  /**
   * @param {import('pixi.js').Application} app
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(app, eventBus) {
    this.app = app;
    this.eventBus = eventBus;
    /** @type {Map<string, object>} ball.id → hud elements */
    this._bars = new Map();
  }

  /**
   * Create HP bar for a ball.
   * @param {import('../entities/Ball.js').Ball} ball
   */
  addBall(ball) {
    const barContainer = new Container();

    // Background
    const bg = new Graphics();
    bg.roundRect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT, 2);
    bg.fill({ color: 0x1e1e3a, alpha: 0.8 });
    bg.stroke({ color: 0x3b3b6b, alpha: 0.5, width: 0.5 });
    barContainer.addChild(bg);

    // HP fill
    const fill = new Graphics();
    barContainer.addChild(fill);

    // HP text
    const hpText = new Text({
      text: `${ball.hp}`,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 9,
        fontWeight: '600',
        fill: 0xffffff,
        align: 'center',
      },
    });
    hpText.anchor.set(0.5, 0);
    hpText.y = BAR_HEIGHT + 2;
    barContainer.addChild(hpText);

    this.app.stage.addChild(barContainer);

    this._bars.set(ball.id, {
      container: barContainer,
      fill,
      hpText,
      ball,
    });
  }

  /**
   * Update all HP bars each frame.
   */
  update() {
    for (const [, entry] of this._bars) {
      const { container, fill, hpText, ball } = entry;

      // Position below ball
      container.x = ball.x;
      container.y = ball.y + ball.radius + BAR_OFFSET_Y;

      // Counter-rotate to stay horizontal (ball.container rotates)
      container.rotation = 0;

      // Redraw HP fill
      fill.clear();
      const pct = ball.hpPercent;
      const fillW = BAR_WIDTH * pct;

      // Color: green → yellow → red
      let color;
      if (pct > 0.6) {
        color = 0x34d399; // green
      } else if (pct > 0.3) {
        color = 0xfbbf24; // yellow
      } else {
        color = 0xf87171; // red
      }

      if (fillW > 0) {
        fill.roundRect(-BAR_WIDTH / 2, 0, fillW, BAR_HEIGHT, 2);
        fill.fill(color);
      }

      // Update text
      hpText.text = `${ball.hp}`;

      // Hide if dead
      container.visible = ball.isAlive;
    }
  }

  /**
   * Remove all HUD elements.
   */
  destroy() {
    for (const [, entry] of this._bars) {
      this.app.stage.removeChild(entry.container);
      entry.container.destroy({ children: true });
    }
    this._bars.clear();
  }
}
