/* ============================================================
   Game — Main orchestrator
   Init PixiJS, game loop, state management, win/lose
   ============================================================ */

import { Application, Graphics, Text, Container } from 'pixi.js';
import { ARENA, GAME, PHYSICS } from '../config.js';
import { EventBus } from '../utils/EventBus.js';
import { Physics } from './Physics.js';
import { Ball } from '../entities/Ball.js';
import { HUD } from '../ui/HUD.js';
import { DamageText } from '../ui/DamageText.js';
import { randomAngle } from '../utils/MathUtils.js';

/**
 * Game states
 * @enum {string}
 */
const STATE = {
  IDLE: 'idle',
  STARTING: 'starting',
  PLAYING: 'playing',
  GAME_OVER: 'gameOver',
};

export class Game {
  /**
   * @param {HTMLElement} containerEl - DOM element to mount canvas
   */
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.app = null;
    this.eventBus = new EventBus();
    this.physics = new Physics(this.eventBus);
    this.hud = null;
    this.damageText = null;

    /** @type {Ball[]} */
    this.balls = [];
    this.state = STATE.IDLE;
    this.winner = null;

    // UI refs
    this._arenaGraphic = null;
    this._gameOverContainer = null;
    this._countdownText = null;
    this._countdownRemainingMs = 0;
  }

  /**
   * Initialize PixiJS and build the arena.
   */
  async init() {
    this.app = new Application();
    await this.app.init({
      width: ARENA.SIZE,
      height: ARENA.SIZE,
      backgroundColor: ARENA.BG_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.containerEl.appendChild(this.app.canvas);

    // Draw arena grid
    this._drawArena();

    // Init subsystems
    this.hud = new HUD(this.app, this.eventBus);
    this.damageText = new DamageText(this.app);

    // Listen for collision events → spawn damage text
    this.eventBus.on('collision', (data) => {
      if (data.dmgToA > 0) {
        this.damageText.spawn(data.ballA.x, data.ballA.y, data.dmgToA, 'physical');
      }
      if (data.dmgToB > 0) {
        this.damageText.spawn(data.ballB.x, data.ballB.y, data.dmgToB, 'physical');
      }
    });

    // Game loop
    this.app.ticker.add((ticker) => this._gameLoop(ticker));
  }

  /**
   * Draw subtle arena grid dots.
   */
  _drawArena() {
    const border = new Graphics();
    border.rect(1, 1, ARENA.SIZE - 2, ARENA.SIZE - 2);
    border.stroke({ color: 0x818cf8, alpha: 0.12, width: 1 });

    for (let gx = 40; gx < ARENA.SIZE; gx += 40) {
      for (let gy = 40; gy < ARENA.SIZE; gy += 40) {
        border.circle(gx, gy, 1);
        border.fill({ color: 0x818cf8, alpha: 0.06 });
      }
    }
    this.app.stage.addChild(border);
    this._arenaGraphic = border;
  }

  /**
   * Add a ball to the arena.
   * @param {object} config - Ball constructor options
   * @returns {Ball}
   */
  addBall(config) {
    const ball = new Ball(config);
    this.balls.push(ball);
    this.app.stage.addChild(ball.container);
    this.hud.addBall(ball);
    return ball;
  }

  /**
   * Start the match with 2 balls.
   * @param {object} configA - config for ball A
   * @param {object} configB - config for ball B
   */
  startMatch(configA, configB) {
    this.reset();

    // Random starting positions
    const angleA = randomAngle();
    const angleB = randomAngle();
    const spd = PHYSICS.INITIAL_SPEED;

    const ballA = this.addBall({
      ...configA,
      x: ARENA.SIZE * 0.25,
      y: ARENA.SIZE * 0.5,
      vx: Math.cos(angleA) * spd,
      vy: Math.sin(angleA) * spd,
    });

    const ballB = this.addBall({
      ...configB,
      x: ARENA.SIZE * 0.75,
      y: ARENA.SIZE * 0.5,
      vx: Math.cos(angleB) * spd,
      vy: Math.sin(angleB) * spd,
    });

    // Set targets
    ballA.target = ballB;
    ballB.target = ballA;

    const countdownMs = Math.max(0, Number(GAME.COUNTDOWN_MS) || 0);
    if (countdownMs > 0) {
      this.state = STATE.STARTING;
      this._countdownRemainingMs = countdownMs;
      this._showCountdownOverlay(Math.ceil(countdownMs / 1000));
      this.eventBus.emit('matchStarting', { ballA, ballB, countdownMs });
    } else {
      this.state = STATE.PLAYING;
      this.eventBus.emit('matchStart', { ballA, ballB });
    }
  }

  /**
   * Main game loop.
   */
  _gameLoop(ticker) {
    const dt = ticker.deltaMS;

    // Countdown phase (no physics updates)
    if (this.state === STATE.STARTING) {
      this._countdownRemainingMs -= dt;
      const secs = Math.max(0, Math.ceil(this._countdownRemainingMs / 1000));
      this._updateCountdownOverlay(secs);
      this.eventBus.emit('countdown', { secondsLeft: secs });

      if (this._countdownRemainingMs <= 0) {
        this._hideCountdownOverlay();
        this.state = STATE.PLAYING;
        this.eventBus.emit('matchStart', { ballA: this.balls[0], ballB: this.balls[1] });
      }
      return;
    }

    if (this.state !== STATE.PLAYING) return;

    // Physics update
    this.physics.update(this.balls, dt);

    // Ball updates
    for (const ball of this.balls) {
      ball.update(dt);
    }

    // HUD update
    this.hud.update();

    // Damage text update
    this.damageText.update();

    // Check win condition
    this._checkGameOver();
  }

  /**
   * Check if any ball is dead.
   */
  _checkGameOver() {
    for (const ball of this.balls) {
      if (ball.isDead()) {
        this.state = STATE.GAME_OVER;
        this.winner = this.balls.find((b) => b.isAlive) || null;

        this.eventBus.emit('gameOver', {
          winner: this.winner,
          loser: ball,
        });

        this._showGameOverScreen();
        return;
      }
    }
  }

  /**
   * Show game over overlay.
   */
  _showGameOverScreen() {
    const container = new Container();

    // Dimmed backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, ARENA.SIZE, ARENA.SIZE);
    backdrop.fill({ color: 0x000000, alpha: 0.6 });
    container.addChild(backdrop);

    // Winner text
    const winnerName = this.winner ? this.winner.name : 'Draw';
    const title = new Text({
      text: '🏆 VICTORY',
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 36,
        fontWeight: '700',
        fill: 0xfbbf24,
        align: 'center',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowDistance: 3,
      },
    });
    title.anchor.set(0.5);
    title.x = ARENA.SIZE / 2;
    title.y = ARENA.SIZE / 2 - 60;
    container.addChild(title);

    const nameText = new Text({
      text: winnerName,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 28,
        fontWeight: '600',
        fill: this.winner ? this.winner.skin.fill : 0xffffff,
        align: 'center',
      },
    });
    nameText.anchor.set(0.5);
    nameText.x = ARENA.SIZE / 2;
    nameText.y = ARENA.SIZE / 2 - 15;
    container.addChild(nameText);

    // Stats
    const statsLines = this.balls.map((b) =>
      `${b.name}: ${b.hp}/${b.maxHp} HP • ${b.hits} hits • ${b.damageDealt} dmg dealt`
    ).join('\n');

    const stats = new Text({
      text: statsLines,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 13,
        fill: 0x94a3b8,
        align: 'center',
        lineHeight: 20,
      },
    });
    stats.anchor.set(0.5);
    stats.x = ARENA.SIZE / 2;
    stats.y = ARENA.SIZE / 2 + 35;
    container.addChild(stats);

    // Restart hint
    const hint = new Text({
      text: 'Click RESET to play again',
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 12,
        fill: 0x64748b,
        align: 'center',
      },
    });
    hint.anchor.set(0.5);
    hint.x = ARENA.SIZE / 2;
    hint.y = ARENA.SIZE / 2 + 85;
    container.addChild(hint);

    this.app.stage.addChild(container);
    this._gameOverContainer = container;
  }

  _showCountdownOverlay(seconds) {
    if (this._countdownText) {
      this._countdownText.text = `${seconds}`;
      this._countdownText.visible = true;
      return;
    }

    const t = new Text({
      text: `${seconds}`,
      style: {
        fontFamily: 'Outfit, sans-serif',
        fontSize: 64,
        fontWeight: '800',
        fill: 0xffffff,
        align: 'center',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowDistance: 4,
      },
    });
    t.anchor.set(0.5);
    t.x = ARENA.SIZE / 2;
    t.y = ARENA.SIZE / 2;
    this.app.stage.addChild(t);
    this._countdownText = t;
  }

  _updateCountdownOverlay(seconds) {
    if (!this._countdownText) return;
    this._countdownText.text = seconds > 0 ? `${seconds}` : 'FIGHT!';
    this._countdownText.alpha = seconds > 0 ? 1 : 0.95;
  }

  _hideCountdownOverlay() {
    if (!this._countdownText) return;
    this._countdownText.visible = false;
  }

  /**
   * Reset the game state.
   */
  reset() {
    // Remove balls
    for (const ball of this.balls) {
      this.app.stage.removeChild(ball.container);
      ball.container.destroy({ children: true });
    }
    this.balls = [];

    // Clear HUD
    this.hud.destroy();
    this.hud = new HUD(this.app, this.eventBus);

    // Clear damage texts
    this.damageText.destroy();

    // Remove game over screen
    if (this._gameOverContainer) {
      this.app.stage.removeChild(this._gameOverContainer);
      this._gameOverContainer.destroy({ children: true });
      this._gameOverContainer = null;
    }

    // Hide countdown
    this._hideCountdownOverlay();
    this._countdownRemainingMs = 0;

    this.winner = null;
    this.state = STATE.IDLE;
  }

  /**
   * Destroy the entire game.
   */
  destroy() {
    this.reset();
    this.eventBus.clear();
    this.app.destroy(true);
  }
}
