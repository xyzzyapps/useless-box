/**
 * Fixed dimensions for the wooden box, switch, acrylic finger, lid, and camera.
 * Units are arbitrary scene units; 1 unit is roughly 10 cm.
 */

export const BOX = Object.freeze({
  width: 3.3,
  depth: 2.4,
  lowerHeight: 0.8,
  upperHeight: 0.4,
  totalHeight: 1.2,
  wall: 0.12,
  deckFrontZ: 1.2,
  deckBackZ: 0.16,
  cavityBackZ: -1.2,
  cavityFrontZ: 0.16,
});

export const SWITCH = Object.freeze({
  x: 0.35,
  y: 1.2,
  z: 0.72,
  leverLength: 0.252,
  knobRadius: 0.07,
  offAngle: 0.38,
  onAngle: -0.38,
  plateWidth: 0.46,
  plateDepth: 0.38,
});

export const ARM = Object.freeze({
  x: 0.35,
  y: 1.14,
  z: 0.02,
  upperLength: 0.44,
  lowerLength: 0.48,
  foldedAngle: -1.7,
  readyTarget: Object.freeze({ z: 0.28, y: 1.88 }),
  contactTarget: Object.freeze({ z: 0.48, y: 1.58 }),
  pushTarget: Object.freeze({ z: 0.82, y: 1.58 }),
  bend: -1,
});

export const LID = Object.freeze({
  width: 3.3,
  hingeY: 1.2,
  hingeZ: -1.2,
  depth: 1.42,
  thickness: 0.14,
  openAngle: -1.92,
  frontZ: 0.22,
});

export const CAMERA = Object.freeze({
  target: Object.freeze({ x: 0, y: 0.82, z: 0 }),
  fov: 33,
  azimuth: 0.46,
  elevation: 0.53,
  fitRadius: 2.25,
  margin: 1.07,
  minDistance: 6.4,
});

export const LAYOUT = Object.freeze({
  box: BOX,
  switch: SWITCH,
  arm: ARM,
  lid: LID,
  camera: CAMERA,
});
