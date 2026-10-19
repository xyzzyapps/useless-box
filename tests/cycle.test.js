import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUDIO_CUES,
  ARM_POSES,
  CYCLE_DURATION,
  CycleTimeline,
  phaseAt,
  sampleCycle,
} from '../src/features/box/cycle.js';
import { ARM, LID, SWITCH } from '../src/features/box/layout.js';
import { forwardTwoBone2D } from '../src/features/box/ik.js';

function assertNear(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

test('cycle starts with the switch off, lid closed, and finger folded', () => {
  const pose = sampleCycle(0);
  assertNear(pose.switchAngle, SWITCH.offAngle);
  assertNear(pose.lidAngle, 0);
  assertNear(pose.arm.shoulder, ARM_POSES.folded.shoulder);
  assertNear(pose.arm.elbow, ARM_POSES.folded.elbow);
  assertNear(pose.cameraEnergy, 0);
});

test('the user switch is on before the machine turns it off', () => {
  const onPose = sampleCycle(0.5);
  assertNear(onPose.switchAngle, SWITCH.onAngle);
  assertNear(onPose.led, 1);
  assert.ok(onPose.switchAngle < 0);

  const offPose = sampleCycle(2.3);
  assertNear(offPose.switchAngle, SWITCH.offAngle, 0.02);
  assertNear(offPose.led, 0, 0.01);
  assert.ok(offPose.switchAngle > 0);
});

test('lid opens before the finger is released and closes after it is folded', () => {
  const opening = sampleCycle(0.7);
  assert.ok(opening.lidAngle < 0);

  const open = sampleCycle(1.2);
  assertNear(open.lidAngle, LID.openAngle, 0.03);

  const folded = sampleCycle(2.9);
  assertNear(folded.arm.shoulder, ARM_POSES.folded.shoulder);

  const closing = sampleCycle(3.2);
  assert.ok(closing.lidAngle > LID.openAngle && closing.lidAngle < 0);

  const closed = sampleCycle(3.6);
  assertNear(closed.lidAngle, 0);
});

test('arm poses are finite and the contact pose reaches the switch region', () => {
  for (const pose of Object.values(ARM_POSES)) {
    assert.ok(Number.isFinite(pose.shoulder));
    assert.ok(Number.isFinite(pose.elbow));
  }

  const tip = forwardTwoBone2D({
    root: { z: ARM.z, y: ARM.y },
    lengths: { upper: ARM.upperLength, lower: ARM.lowerLength },
    ...ARM_POSES.contact,
  });

  assert.ok(Math.abs(tip.z - ARM.contactTarget.z) < 1e-5);
  assert.ok(Math.abs(tip.y - ARM.contactTarget.y) < 1e-5);
});

test('the folded finger is hidden below the lid and above the felt floor', () => {
  const tip = forwardTwoBone2D({
    root: { z: ARM.z, y: ARM.y },
    lengths: { upper: ARM.upperLength, lower: ARM.lowerLength },
    ...ARM_POSES.folded,
  });

  assert.ok(tip.y > 0.82, `folded fingertip y=${tip.y} must clear the felt floor`);
  assert.ok(tip.y < 1.2, `folded fingertip y=${tip.y} must stay under the closed lid`);
  assert.ok(tip.z > -1.2 && tip.z < 0.2, 'folded fingertip must stay inside the cavity');
});

test('the lid is open before the finger rises into the hinge path', () => {
  const atRiseStart = sampleCycle(1.0);
  assert.ok(atRiseStart.lidAngle <= -1.8);
});

test('phase names cover the full cycle', () => {
  assert.equal(phaseAt(0.05), 'switch-on');
  assert.equal(phaseAt(0.2), 'latched');
  assert.equal(phaseAt(0.6), 'lid-opening');
  assert.equal(phaseAt(1.2), 'arm-rising');
  assert.equal(phaseAt(1.7), 'arm-reaching');
  assert.equal(phaseAt(2.05), 'switching-off');
  assert.equal(phaseAt(2.3), 'arm-retracting');
  assert.equal(phaseAt(2.7), 'arm-folding');
  assert.equal(phaseAt(3.2), 'lid-closing');
  assert.equal(phaseAt(3.7), 'settling');
});

test('timeline fires every audio cue exactly once and completes', () => {
  const timeline = new CycleTimeline();
  timeline.start();

  const fired = [];
  const step = 1 / 120;
  let safety = 0;
  while (!timeline.complete && safety < 1000) {
    timeline.update(step);
    for (const cue of timeline.consumeCues()) fired.push(cue.name);
    safety += 1;
  }

  assert.equal(timeline.complete, true);
  assert.equal(fired.length, AUDIO_CUES.length);
  assert.deepEqual(fired, AUDIO_CUES.map((cue) => cue.name));
  assertNear(timeline.time, CYCLE_DURATION);
});

test('timeline does not run unless started and never double-fires cues', () => {
  const timeline = new CycleTimeline();
  timeline.update(2);
  assert.equal(timeline.time, 0);
  assert.deepEqual(timeline.consumeCues(), []);

  timeline.start();
  assert.deepEqual(timeline.consumeCues().map((cue) => cue.name), ['switch:on']);
  timeline.update(1.0);
  const cues = timeline.consumeCues().map((cue) => cue.name);
  assert.deepEqual(cues, ['latch:click', 'lid:open', 'arm:rise']);
  assert.deepEqual(timeline.consumeCues(), []);
});
