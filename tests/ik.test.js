import test from 'node:test';
import assert from 'node:assert/strict';

import { forwardTwoBone2D, solveTwoBone2D } from '../src/features/box/ik.js';

const root = { z: 0, y: 0 };
const lengths = { upper: 0.4, lower: 0.4 };

function assertNear(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

test('two-bone IK reaches a target exactly', () => {
  const target = { z: 0.2, y: 0.5 };
  const pose = solveTwoBone2D({ root, lengths, target, bend: -1 });
  const tip = forwardTwoBone2D({ root, lengths, ...pose });

  assertNear(tip.z, target.z);
  assertNear(tip.y, target.y);
  assert.equal(pose.reachable, true);
});

test('both bend directions reach the same target with mirrored elbows', () => {
  const target = { z: 0.25, y: 0.45 };
  const a = solveTwoBone2D({ root, lengths, target, bend: -1 });
  const b = solveTwoBone2D({ root, lengths, target, bend: 1 });
  const tipA = forwardTwoBone2D({ root, lengths, ...a });
  const tipB = forwardTwoBone2D({ root, lengths, ...b });

  assertNear(tipA.z, target.z);
  assertNear(tipA.y, target.y);
  assertNear(tipB.z, target.z);
  assertNear(tipB.y, target.y);

  const cross = (point) => target.z * point.y - target.y * point.z;
  assert.ok(cross(a.elbowPoint) * cross(b.elbowPoint) < 0, 'elbows should be on opposite sides');
});

test('IK clamps unreachable targets to the maximum reach', () => {
  const target = { z: 3, y: 3 };
  const pose = solveTwoBone2D({ root, lengths, target, bend: -1 });
  const tip = forwardTwoBone2D({ root, lengths, ...pose });

  assert.equal(pose.reachable, false);
  assertNear(Math.hypot(tip.z, tip.y), 0.8, 1e-4);
});

test('IK avoids a singular fully collapsed solution', () => {
  const pose = solveTwoBone2D({
    root,
    lengths,
    target: { z: 0.0001, y: 0.0001 },
    bend: -1,
  });

  assert.ok(Number.isFinite(pose.shoulder));
  assert.ok(Number.isFinite(pose.elbow));
});
