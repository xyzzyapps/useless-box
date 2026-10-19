import { clamp } from '../../core/math.js';

/**
 * Analytic two-bone IK in the Y/Z plane.
 *
 * Angles are measured from +Y toward +Z, matching THREE.Group.rotation.x for
 * segments modelled along local +Y. `elbow` is the local rotation of the second
 * bone relative to the first. `bend` selects which of the two mirrored elbow
 * solutions to use: -1 puts the elbow on the hinge side for this machine.
 *
 * @param {object} options
 * @param {{z:number,y:number}} options.root
 * @param {{upper:number,lower:number}} options.lengths
 * @param {{z:number,y:number}} options.target
 * @param {number} [options.bend=-1]
 * @returns {{shoulder:number, elbow:number, elbowPoint:{z:number,y:number}, tip:{z:number,y:number}, reachable:boolean, distance:number}}
 */
export function solveTwoBone2D({ root, lengths, target, bend = -1 }) {
  const upper = Math.max(0.0001, lengths.upper);
  const lower = Math.max(0.0001, lengths.lower);
  const dz = target.z - root.z;
  const dy = target.y - root.y;
  const rawDistance = Math.hypot(dz, dy);
  const minReach = Math.abs(upper - lower) + 1e-5;
  const maxReach = upper + lower - 1e-5;
  const distance = clamp(rawDistance, minReach, maxReach);
  const phi = Math.atan2(dz, dy);

  const cosAlpha = clamp(
    (distance * distance + upper * upper - lower * lower) / (2 * distance * upper),
    -1,
    1,
  );
  const cosBeta = clamp(
    (upper * upper + lower * lower - distance * distance) / (2 * upper * lower),
    -1,
    1,
  );
  const alpha = Math.acos(cosAlpha);
  const beta = Math.acos(cosBeta);

  const shoulder = phi + bend * alpha;
  const elbow = -bend * (Math.PI - beta);

  const elbowPoint = {
    z: root.z + Math.sin(shoulder) * upper,
    y: root.y + Math.cos(shoulder) * upper,
  };
  const secondAngle = shoulder + elbow;
  const tip = {
    z: elbowPoint.z + Math.sin(secondAngle) * lower,
    y: elbowPoint.y + Math.cos(secondAngle) * lower,
  };

  return {
    shoulder,
    elbow,
    elbowPoint,
    tip,
    reachable: Math.abs(distance - rawDistance) < 1e-5,
    distance: rawDistance,
  };
}

/**
 * Returns the tip position for a pair of joint angles. Useful in tests and for
 * debugging the rig without a renderer.
 */
export function forwardTwoBone2D({ root, lengths, shoulder, elbow }) {
  const secondAngle = shoulder + elbow;
  return {
    z: root.z + Math.sin(shoulder) * lengths.upper + Math.sin(secondAngle) * lengths.lower,
    y: root.y + Math.cos(shoulder) * lengths.upper + Math.cos(secondAngle) * lengths.lower,
  };
}
