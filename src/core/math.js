/**
 * Small, dependency-free numeric helpers used by the simulation and scene.
 * All easing functions accept and return values in the 0..1 range unless noted.
 */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInCubic(t) {
  const x = clamp(t, 0, 1);
  return x * x * x;
}

export function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(t) {
  const x = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Frame-rate independent exponential smoothing.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * A decaying sine used for small mechanical settles.
 */
export function settle(amplitude, t, frequency = 3) {
  const x = clamp(t, 0, 1);
  return Math.sin(x * Math.PI * frequency) * amplitude * (1 - x);
}
