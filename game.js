/* ============================================================
   Balls Physics Game — PixiJS v8
   Features: gravity, wall bounce, elastic ball-ball collision
   ============================================================ */

const BOX_SIZE = 520;
const BALL_RADIUS = 28;
const GRAVITY = 0.35;
const CONSTANT_ACCEL = 0.15;  // constant acceleration applied every frame
const MIN_SPEED = 3;          // minimum speed balls try to maintain
const MAX_SPEED = 12;         // speed cap to prevent runaway
const WALL_RESTITUTION = 0.95; // energy kept on wall bounce
const BALL_RESTITUTION = 0.95; // energy kept on ball-ball collision
const INITIAL_SPEED = 5;

let gravityOn = true;
let balls = [];
let app;

/* ---------- Color palette for balls ---------- */
const BALL_COLORS = [
  { fill: 0x818cf8, glow: 0x6366f1, label: 'Indigo' },
  { fill: 0xf472b6, glow: 0xec4899, label: 'Pink' },
  { fill: 0x34d399, glow: 0x10b981, label: 'Emerald' },
  { fill: 0xfbbf24, glow: 0xf59e0b, label: 'Amber' },
  { fill: 0x38bdf8, glow: 0x0ea5e9, label: 'Sky' },
  { fill: 0xf87171, glow: 0xef4444, label: 'Red' },
  { fill: 0xa78bfa, glow: 0x8b5cf6, label: 'Violet' },
  { fill: 0x2dd4bf, glow: 0x14b8a6, label: 'Teal' },
];

let colorIndex = 0;
function nextColor() {
  const c = BALL_COLORS[colorIndex % BALL_COLORS.length];
  colorIndex++;
  return c;
}

/* ---------- Create a ball graphic ---------- */
function createBallGraphic(color, radius) {
  const container = new PIXI.Container();

  // Outer glow
  const glow = new PIXI.Graphics();
  glow.circle(0, 0, radius + 8);
  glow.fill({ color: color.glow, alpha: 0.15 });
  container.addChild(glow);

  // Main circle
  const circle = new PIXI.Graphics();
  circle.circle(0, 0, radius);
  circle.fill(color.fill);
  container.addChild(circle);

  // Inner highlight (top-left)
  const highlight = new PIXI.Graphics();
  highlight.circle(-radius * 0.28, -radius * 0.28, radius * 0.35);
  highlight.fill({ color: 0xffffff, alpha: 0.3 });
  container.addChild(highlight);

  // Tiny specular dot
  const spec = new PIXI.Graphics();
  spec.circle(-radius * 0.15, -radius * 0.4, radius * 0.12);
  spec.fill({ color: 0xffffff, alpha: 0.6 });
  container.addChild(spec);

  return container;
}

/* ---------- Create a ball entity ---------- */
function createBall(x, y, vx, vy, colorObj, radius) {
  const graphic = createBallGraphic(colorObj, radius);
  graphic.x = x;
  graphic.y = y;

  // Collision count label
  const label = new PIXI.Text({
    text: '0',
    style: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: Math.max(14, radius * 0.6),
      fontWeight: '700',
      fill: 0xffffff,
      align: 'center',
    },
  });
  label.anchor.set(0.5);
  label.x = 0;
  label.y = 0;
  graphic.addChild(label);

  app.stage.addChild(graphic);

  return {
    graphic,
    label,
    x, y,
    vx, vy,
    radius,
    mass: radius * radius, // mass proportional to area
    color: colorObj,
    hits: 0,
    flashTimer: 0, // for collision flash effect
  };
}

/* ---------- Draw arena border lines ---------- */
function drawArena() {
  const border = new PIXI.Graphics();
  // Subtle inner border
  border.rect(1, 1, BOX_SIZE - 2, BOX_SIZE - 2);
  border.stroke({ color: 0x818cf8, alpha: 0.12, width: 1 });
  // Grid dots for visual flair
  for (let gx = 40; gx < BOX_SIZE; gx += 40) {
    for (let gy = 40; gy < BOX_SIZE; gy += 40) {
      border.circle(gx, gy, 1);
      border.fill({ color: 0x818cf8, alpha: 0.06 });
    }
  }
  app.stage.addChild(border);
}

/* ---------- Physics: wall collision ---------- */
function wallBounce(ball) {
  const r = ball.radius;

  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION;
  } else if (ball.x + r > BOX_SIZE) {
    ball.x = BOX_SIZE - r;
    ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION;
  }

  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION;
  } else if (ball.y + r > BOX_SIZE) {
    ball.y = BOX_SIZE - r;
    ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION;
  }
}

/* ---------- Physics: elastic ball-ball collision ---------- */
function ballCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist && dist > 0.001) {
    // Normal vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Relative velocity along normal
    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const relVelN = dvx * nx + dvy * ny;

    // Don't resolve if moving apart
    if (relVelN <= 0) return;

    // Impulse scalar (elastic collision with restitution)
    const totalMass = a.mass + b.mass;
    const impulse = (2 * relVelN * BALL_RESTITUTION) / totalMass;

    // Apply impulse
    a.vx -= impulse * b.mass * nx;
    a.vy -= impulse * b.mass * ny;
    b.vx += impulse * a.mass * nx;
    b.vy += impulse * a.mass * ny;

    // Separate overlapping balls
    const overlap = minDist - dist;
    const sepX = (overlap / 2 + 0.5) * nx;
    const sepY = (overlap / 2 + 0.5) * ny;
    a.x -= sepX;
    a.y -= sepY;
    b.x += sepX;
    b.y += sepY;

    // Count collision hits
    a.hits++;
    b.hits++;
    a.label.text = String(a.hits);
    b.label.text = String(b.hits);
    a.flashTimer = 8;
    b.flashTimer = 8;
  }
}

/* ---------- Update loop ---------- */
function update() {
  for (const ball of balls) {
    // Apply gravity
    if (gravityOn) {
      ball.vy += GRAVITY;
    }

    // Constant acceleration: always boost speed in movement direction
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > 0.01) {
      // Boost toward movement direction
      const dirX = ball.vx / speed;
      const dirY = ball.vy / speed;
      if (speed < MIN_SPEED) {
        // Below min speed: stronger push to get back up
        ball.vx += dirX * CONSTANT_ACCEL * 2;
        ball.vy += dirY * CONSTANT_ACCEL * 2;
      } else {
        // Normal constant acceleration
        ball.vx += dirX * CONSTANT_ACCEL;
        ball.vy += dirY * CONSTANT_ACCEL;
      }
    } else {
      // Nearly stopped: give a random kick
      const kickAngle = Math.random() * Math.PI * 2;
      ball.vx = Math.cos(kickAngle) * MIN_SPEED;
      ball.vy = Math.sin(kickAngle) * MIN_SPEED;
    }

    // Cap max speed
    const newSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (newSpeed > MAX_SPEED) {
      ball.vx = (ball.vx / newSpeed) * MAX_SPEED;
      ball.vy = (ball.vy / newSpeed) * MAX_SPEED;
    }

    // Integrate position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounce
    wallBounce(ball);
  }

  // Ball-ball collisions (all pairs)
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      ballCollision(balls[i], balls[j]);
    }
  }

  // Sync graphics
  for (const ball of balls) {
    ball.graphic.x = ball.x;
    ball.graphic.y = ball.y;

    // Subtle squash-stretch based on velocity
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const stretch = Math.min(1 + speed * 0.004, 1.15);
    const angle = Math.atan2(ball.vy, ball.vx);
    ball.graphic.rotation = angle;
    ball.graphic.scale.x = stretch;
    ball.graphic.scale.y = 2 - stretch; // conserve "volume"

    // Keep label upright (counter-rotate) and un-stretched
    ball.label.rotation = -angle;
    ball.label.scale.x = 1 / stretch;
    ball.label.scale.y = 1 / (2 - stretch);

    // Collision flash effect
    if (ball.flashTimer > 0) {
      ball.flashTimer--;
      const flashScale = 1 + ball.flashTimer * 0.02;
      ball.graphic.scale.x *= flashScale;
      ball.graphic.scale.y *= flashScale;
      ball.label.alpha = 1;
    } else {
      ball.label.alpha = 0.85;
    }
  }
}

/* ---------- Reset game ---------- */
function resetGame() {
  // Remove old ball graphics
  for (const ball of balls) {
    app.stage.removeChild(ball.graphic);
  }
  balls = [];
  colorIndex = 0;

  // Create two initial balls
  const c1 = nextColor();
  const c2 = nextColor();
  balls.push(createBall(
    BOX_SIZE * 0.3, BOX_SIZE * 0.3,
    INITIAL_SPEED, INITIAL_SPEED * 0.5,
    c1, BALL_RADIUS
  ));
  balls.push(createBall(
    BOX_SIZE * 0.7, BOX_SIZE * 0.5,
    -INITIAL_SPEED * 0.8, -INITIAL_SPEED,
    c2, BALL_RADIUS
  ));
}

/* ---------- Add a new ball ---------- */
function addBall() {
  const c = nextColor();
  const angle = Math.random() * Math.PI * 2;
  const speed = INITIAL_SPEED * (0.6 + Math.random() * 0.8);
  const r = BALL_RADIUS * (0.7 + Math.random() * 0.6);
  const ball = createBall(
    BOX_SIZE / 2 + (Math.random() - 0.5) * 100,
    r + 10,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed,
    c, r
  );
  balls.push(ball);
}

/* ---------- Init PixiJS ---------- */
async function init() {
  app = new PIXI.Application();
  await app.init({
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 0x0e0e24,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.getElementById('game-container').appendChild(app.canvas);

  drawArena();
  resetGame();

  // Game loop
  app.ticker.add(update);

  // Controls
  document.getElementById('btn-reset').addEventListener('click', resetGame);

  document.getElementById('btn-gravity').addEventListener('click', () => {
    gravityOn = !gravityOn;
    document.getElementById('btn-gravity').textContent =
      gravityOn ? '🌍 Gravity: ON' : '🌙 Gravity: OFF';
  });

  document.getElementById('btn-add').addEventListener('click', addBall);

  // Click on canvas to give balls a random kick
  app.canvas.addEventListener('click', (e) => {
    const rect = app.canvas.getBoundingClientRect();
    const scaleX = BOX_SIZE / rect.width;
    const scaleY = BOX_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const ball of balls) {
      const dx = ball.x - mx;
      const dy = ball.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        const force = (200 - dist) / 200 * 8;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        ball.vx += nx * force;
        ball.vy += ny * force;
      }
    }
  });
}

init().catch(console.error);
