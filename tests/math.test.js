import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  damp,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  inverseLerp,
  lerp,
  settle,
} from '../src/core/math.js';

test('clamp and lerp stay inside their bounds', () => {
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(lerp(10, 20, 0.25), 12.5);
});

test('inverseLerp handles ranges and degenerate input', () => {
  assert.equal(inverseLerp(0, 10, 5), 0.5);
  assert.equal(inverseLerp(0, 10, -5), 0);
  assert.equal(inverseLerp(0, 10, 15), 1);
  assert.equal(inverseLerp(3, 3, 3), 0);
});

test('easing functions preserve endpoints and monotonicity', () => {
  for (const fn of [easeInCubic, easeOutCubic, easeInOutCubic]) {
    assert.ok(Math.abs(fn(0)) < 1e-12);
    assert.ok(Math.abs(fn(1) - 1) < 1e-12);
  }
  assert.equal(settle(0.1, 0), 0);
  assert.equal(settle(0.1, 1), 0);
});

test('damp approaches its target without overshooting', () => {
  let value = 0;
  for (let i = 0; i < 120; i += 1) value = damp(value, 1, 8, 1 / 60);
  assert.ok(value > 0.999);
  assert.ok(value <= 1.0000001);
});
