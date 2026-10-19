import {
  clamp,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  inverseLerp,
  lerp,
  settle,
} from '../../core/math.js';
import { ARM, LID, SWITCH } from './layout.js';
import { solveTwoBone2D } from './ik.js';

/**
 * The whole joke is one deterministic 3.8 second timeline. Rendering and audio
 * both read from this data; neither owns timing state.
 */

export const CYCLE_DURATION = 3.8;

export const CYCLE = Object.freeze({
  switchOnStart: 0,
  switchOnEnd: 0.14,
  switchOffStart: 2.0,
  switchOffEnd: 2.16,
  lidOpenStart: 0.3,
  lidOpenEnd: 1.15,
  lidCloseStart: 2.8,
  lidCloseEnd: 3.55,
  armRiseStart: 1.0,
  armRiseEnd: 1.45,
  armReachStart: 1.45,
  armReachEnd: 1.95,
  armPushStart: 1.95,
  armPushEnd: 2.15,
  armRetractStart: 2.15,
  armRetractEnd: 2.55,
  armFoldStart: 2.55,
  armFoldEnd: 2.9,
  settleEnd: 3.8,
});

export const AUDIO_CUES = Object.freeze([
  Object.freeze({ at: 0, name: 'switch:on' }),
  Object.freeze({ at: 0.18, name: 'latch:click' }),
  Object.freeze({ at: 0.3, name: 'lid:open' }),
  Object.freeze({ at: 1.0, name: 'arm:rise' }),
  Object.freeze({ at: 1.45, name: 'arm:reach' }),
  Object.freeze({ at: 2.0, name: 'switch:off' }),
  Object.freeze({ at: 2.15, name: 'arm:retract' }),
  Object.freeze({ at: 2.8, name: 'lid:close' }),
  Object.freeze({ at: 3.55, name: 'thunk' }),
]);

const IK_ROOT = Object.freeze({ z: ARM.z, y: ARM.y });
const IK_LENGTHS = Object.freeze({ upper: ARM.upperLength, lower: ARM.lowerLength });

export const ARM_POSES = Object.freeze({
  folded: Object.freeze({ shoulder: ARM.foldedAngle, elbow: 0 }),
  ready: Object.freeze(pickPose(ARM.readyTarget)),
  contact: Object.freeze(pickPose(ARM.contactTarget)),
  push: Object.freeze(pickPose(ARM.pushTarget)),
});

function pickPose(target) {
  const solved = solveTwoBone2D({
    root: IK_ROOT,
    lengths: IK_LENGTHS,
    target,
    bend: ARM.bend,
  });
  return { shoulder: solved.shoulder, elbow: solved.elbow };
}

function poseForTarget(target) {
  return pickPose(target);
}

function lerpPose(a, b, t) {
  return {
    shoulder: lerp(a.shoulder, b.shoulder, t),
    elbow: lerp(a.elbow, b.elbow, t),
  };
}

function switchAngleAt(t) {
  const { offAngle, onAngle } = SWITCH;
  if (t < CYCLE.switchOnEnd) {
    return lerp(offAngle, onAngle, easeOutCubic(t / CYCLE.switchOnEnd));
  }
  if (t < CYCLE.switchOnEnd + 0.18) {
    return onAngle + settle(0.025, (t - CYCLE.switchOnEnd) / 0.18, 3);
  }
  if (t < CYCLE.switchOffStart) return onAngle;
  if (t < CYCLE.switchOffEnd) {
    const p = inverseLerp(CYCLE.switchOffStart, CYCLE.switchOffEnd, t);
    return lerp(onAngle, offAngle, easeOutCubic(p));
  }
  return offAngle + settle(0.018, (t - CYCLE.switchOffEnd) / 0.22, 3);
}

function lidAngleAt(t) {
  if (t <= CYCLE.lidOpenStart) return 0;
  if (t < CYCLE.lidOpenEnd) {
    const p = inverseLerp(CYCLE.lidOpenStart, CYCLE.lidOpenEnd, t);
    return LID.openAngle * easeOutCubic(p) + settle(0.018, p, 2);
  }
  if (t < CYCLE.lidCloseStart) return LID.openAngle;
  if (t < CYCLE.lidCloseEnd) {
    const p = inverseLerp(CYCLE.lidCloseStart, CYCLE.lidCloseEnd, t);
    return LID.openAngle * (1 - easeInOutCubic(p));
  }
  return 0;
}

function armPoseAt(t) {
  const { folded, ready, contact, push } = ARM_POSES;

  if (t <= CYCLE.armRiseStart) return folded;
  if (t < CYCLE.armRiseEnd) {
    const p = inverseLerp(CYCLE.armRiseStart, CYCLE.armRiseEnd, t);
    return lerpPose(folded, ready, easeOutCubic(p));
  }
  if (t < CYCLE.armReachStart) return ready;
  if (t < CYCLE.armReachEnd) {
    const p = inverseLerp(CYCLE.armReachStart, CYCLE.armReachEnd, t);
    const target = {
      z: lerp(ARM.readyTarget.z, ARM.contactTarget.z, easeInOutCubic(p)),
      y: lerp(ARM.readyTarget.y, ARM.contactTarget.y, easeInOutCubic(p)),
    };
    return poseForTarget(target);
  }
  if (t < CYCLE.armPushStart) return contact;
  if (t < CYCLE.armPushEnd) {
    const p = inverseLerp(CYCLE.armPushStart, CYCLE.armPushEnd, t);
    const target = {
      z: lerp(ARM.contactTarget.z, ARM.pushTarget.z, easeInOutCubic(p)),
      y: lerp(ARM.contactTarget.y, ARM.pushTarget.y, easeInOutCubic(p)),
    };
    return poseForTarget(target);
  }
  if (t < CYCLE.armRetractStart) return push;
  if (t < CYCLE.armRetractEnd) {
    const p = inverseLerp(CYCLE.armRetractStart, CYCLE.armRetractEnd, t);
    const target = {
      z: lerp(ARM.pushTarget.z, ARM.readyTarget.z, easeInOutCubic(p)),
      y: lerp(ARM.pushTarget.y, ARM.readyTarget.y, easeInOutCubic(p)),
    };
    return poseForTarget(target);
  }
  if (t < CYCLE.armFoldStart) return ready;
  if (t < CYCLE.armFoldEnd) {
    const p = inverseLerp(CYCLE.armFoldStart, CYCLE.armFoldEnd, t);
    return lerpPose(ready, folded, easeInCubic(p));
  }
  return folded;
}

function cameraEnergyAt(t) {
  if (t < 0.3) return easeInOutCubic(t / 0.3) * 0.18;
  if (t < 1.05) return lerp(0.18, 1, easeInOutCubic(inverseLerp(0.3, 1.05, t)));
  if (t < 2.7) return 1;
  if (t < 3.5) return 1 - easeInOutCubic(inverseLerp(2.7, 3.5, t));
  return 0;
}

export function phaseAt(t) {
  if (t < CYCLE.switchOnEnd) return 'switch-on';
  if (t < CYCLE.lidOpenStart) return 'latched';
  if (t < CYCLE.lidOpenEnd) return 'lid-opening';
  if (t < CYCLE.armRiseEnd) return 'arm-rising';
  if (t < CYCLE.armReachEnd) return 'arm-reaching';
  if (t < CYCLE.armPushEnd) return 'switching-off';
  if (t < CYCLE.armRetractEnd) return 'arm-retracting';
  if (t < CYCLE.armFoldEnd) return 'arm-folding';
  if (t < CYCLE.lidCloseEnd) return 'lid-closing';
  return 'settling';
}

/**
 * Sample every animated channel at an absolute time in the cycle.
 */
export function sampleCycle(time) {
  const t = clamp(time, 0, CYCLE_DURATION);
  const switchAngle = switchAngleAt(t);
  const arm = armPoseAt(t);

  return {
    time: t,
    phase: phaseAt(t),
    switchAngle,
    led: clamp((SWITCH.offAngle - switchAngle) / (SWITCH.offAngle - SWITCH.onAngle), 0, 1),
    lidAngle: lidAngleAt(t),
    arm,
    cameraEnergy: cameraEnergyAt(t),
  };
}

/**
 * Stateful wrapper around the pure timeline. Cues are consumed exactly once and
 * are returned in scheduling order.
 */
export class CycleTimeline {
  constructor() {
    this.time = 0;
    this.playing = false;
    this.complete = false;
    this._started = false;
    this._fired = new Set();
  }

  start() {
    this.time = 0;
    this.playing = true;
    this.complete = false;
    this._started = true;
    this._fired.clear();
  }

  update(dt) {
    if (!this.playing) return this.sample();
    this.time = clamp(this.time + Math.max(0, dt), 0, CYCLE_DURATION);
    if (this.time >= CYCLE_DURATION) {
      this.time = CYCLE_DURATION;
      this.playing = false;
      this.complete = true;
    }
    return this.sample();
  }

  sample() {
    return sampleCycle(this.time);
  }

  consumeCues() {
    if (!this._started) return [];
    const due = [];
    AUDIO_CUES.forEach((cue, index) => {
      if (!this._fired.has(index) && cue.at <= this.time) {
        this._fired.add(index);
        due.push(cue);
      }
    });
    return due;
  }
}
