/* ============================================================
   Config — Game constants & default ball stats
   ============================================================ */

export const ARENA = {
  SIZE: 520,
  BG_COLOR: 0x0e0e24,
};

export const PHYSICS = {
  GRAVITY: 0.35,
  CONSTANT_ACCEL: 0.15,
  MIN_SPEED: 3,
  MAX_SPEED: 12,
  WALL_RESTITUTION: 0.95,
  BALL_RESTITUTION: 0.95,
  INITIAL_SPEED: 5,
};

export const DEFAULT_BALL_STATS = {
  maxHp: 10000,
  atk: 100,
  def: 50,
  speed: 1.0,
  radius: 28,
  // Extended stats — default 0, expand later
  crit: 0,
  critDamage: 0,
  lifesteal: 0,
  armor: 0,
  magicPower: 0,
  cooldownReduction: 0,
  tenacity: 0,
};

export const BALL_PRESETS = [
  {
    name: 'Indigo',
    fill: 0x818cf8,
    glow: 0x6366f1,
  },
  {
    name: 'Coral',
    fill: 0xf472b6,
    glow: 0xec4899,
  },
  {
    name: 'Emerald',
    fill: 0x34d399,
    glow: 0x10b981,
  },
  {
    name: 'Amber',
    fill: 0xfbbf24,
    glow: 0xf59e0b,
  },
];

export const GAME = {
  COUNTDOWN_MS: 0, // 0 = start immediately, increase for countdown
};
