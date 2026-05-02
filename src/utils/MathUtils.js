/* ============================================================
   MathUtils — Vector & math helpers
   ============================================================ */

/**
 * Euclidean distance between two points.
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize a 2D vector. Returns { x, y } with magnitude 1.
 * If magnitude is 0, returns { x: 0, y: 0 }.
 */
export function normalize(x, y) {
  const mag = Math.sqrt(x * x + y * y);
  if (mag < 0.0001) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}

/**
 * Magnitude of a 2D vector.
 */
export function magnitude(x, y) {
  return Math.sqrt(x * x + y * y);
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Random float between min (inclusive) and max (exclusive).
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random angle in radians [0, 2π).
 */
export function randomAngle() {
  return Math.random() * Math.PI * 2;
}

/**
 * Dot product of two 2D vectors.
 */
export function dot(x1, y1, x2, y2) {
  return x1 * x2 + y1 * y2;
}
