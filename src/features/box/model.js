import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { ARM, BOX, LID, SWITCH } from './layout.js';
import {
  createFeltBumpTexture,
  createPlateTexture,
  createPushTexture,
  createTitleTexture,
  createWoodTextures,
} from '../../shared/textures.js';

/**
 * Builds the complete wooden box, lid, toggle, acrylic finger, and interior.
 * The returned control handles are all the animation layer needs.
 */
export function createBoxModel({ renderer, logger }) {
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const cherry = createWoodTextures({ anisotropy, variant: 'cherry' });
  const feltBump = createFeltBumpTexture({ anisotropy });

  const woodSide = createWoodMaterial(cherry, {
    anisotropy,
    rotation: Math.PI / 2,
    repeat: [1, 1],
  });
  const woodFront = createWoodMaterial(cherry, {
    anisotropy,
    rotation: 0,
    repeat: [1, 1],
  });
  const woodTop = createWoodMaterial(cherry, {
    anisotropy,
    rotation: 0,
    repeat: [1.3, 1],
  });
  const woodBottom = createWoodMaterial(cherry, {
    anisotropy,
    rotation: 0,
    repeat: [1, 1],
    color: 0x8d7560,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x3a2112,
    roughness: 0.62,
    metalness: 0.02,
  });
  const felt = new THREE.MeshStandardMaterial({
    color: 0x241c17,
    roughness: 0.96,
    metalness: 0,
    bumpMap: feltBump,
    bumpScale: 0.006,
    envMapIntensity: 0.25,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xe6e2d9,
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: 1.25,
  });
  const blackenedSteel = new THREE.MeshStandardMaterial({
    color: 0x2a2724,
    metalness: 0.82,
    roughness: 0.38,
    envMapIntensity: 0.9,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xb88a49,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.1,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x151312,
    roughness: 0.86,
    metalness: 0,
  });
  const servoPlastic = new THREE.MeshStandardMaterial({
    color: 0x1d1c1a,
    roughness: 0.68,
    metalness: 0.08,
  });
  const servoHorn = new THREE.MeshStandardMaterial({
    color: 0xe9e4d8,
    roughness: 0.52,
    metalness: 0.02,
  });
  const acrylic = new THREE.MeshPhysicalMaterial({
    color: 0xe6f7f4,
    metalness: 0,
    roughness: 0.045,
    transmission: 0,
    transparent: true,
    opacity: 0.42,
    ior: 1.49,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.1,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xffffff),
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const hoverMaterial = new THREE.MeshStandardMaterial({
    color: 0xa47a38,
    metalness: 0.83,
    roughness: 0.3,
    emissive: 0xffab3d,
    emissiveIntensity: 0,
    envMapIntensity: 1,
  });
  const ledMaterial = new THREE.MeshStandardMaterial({
    color: 0x641e14,
    emissive: 0xff2f15,
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.1,
  });

  const boxMaterials = [woodSide, woodSide, woodTop, woodBottom, woodFront, woodFront];
  const titleTexture = createTitleTexture({ anisotropy });
  const pushTexture = createPushTexture({ anisotropy });
  const plateTexture = createPlateTexture({ anisotropy });
  const decalMaterial = createDecalMaterial(titleTexture, anisotropy);
  const pushMaterial = createDecalMaterial(pushTexture, anisotropy);
  const plateMaterial = createDecalMaterial(plateTexture, anisotropy);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xfff9ee,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    toneMapped: false,
  });

  const root = new THREE.Group();
  root.name = 'useless-box';

  // Lower carcass.
  addRounded(root, [BOX.width, BOX.lowerHeight, BOX.depth], [0, BOX.lowerHeight / 2, 0], boxMaterials, {
    radius: 0.045,
    segments: 3,
    name: 'lower-carcass',
  });

  // A dark reveal line disguises the seam between carcass and upper rim.
  const trimY = BOX.lowerHeight + 0.001;
  addRounded(root, [BOX.width + 0.02, 0.028, 0.035], [0, trimY, BOX.depth / 2 - 0.012], darkWood, {
    radius: 0.008,
    cast: false,
    name: 'front-trim',
  });
  addRounded(root, [BOX.width + 0.02, 0.028, 0.035], [0, trimY, -BOX.depth / 2 + 0.012], darkWood, {
    radius: 0.008,
    cast: false,
    name: 'back-trim',
  });
  addRounded(root, [0.035, 0.028, BOX.depth + 0.02], [BOX.width / 2 - 0.012, trimY, 0], darkWood, {
    radius: 0.008,
    cast: false,
    name: 'right-trim',
  });
  addRounded(root, [0.035, 0.028, BOX.depth + 0.02], [-BOX.width / 2 + 0.012, trimY, 0], darkWood, {
    radius: 0.008,
    cast: false,
    name: 'left-trim',
  });

  // Upper rim around the rear cavity.
  const upperY = BOX.lowerHeight + BOX.upperHeight / 2;
  const upperDepth = BOX.cavityFrontZ - BOX.cavityBackZ;
  const upperCenterZ = (BOX.cavityFrontZ + BOX.cavityBackZ) / 2;
  addRounded(
    root,
    [BOX.wall, BOX.upperHeight, upperDepth],
    [-(BOX.width / 2 - BOX.wall / 2), upperY, upperCenterZ],
    boxMaterials,
    { radius: 0.025, name: 'left-upper-wall' },
  );
  addRounded(
    root,
    [BOX.wall, BOX.upperHeight, upperDepth],
    [BOX.width / 2 - BOX.wall / 2, upperY, upperCenterZ],
    boxMaterials,
    { radius: 0.025, name: 'right-upper-wall' },
  );
  addRounded(
    root,
    [BOX.width, BOX.upperHeight, BOX.wall],
    [0, upperY, BOX.cavityBackZ + BOX.wall / 2],
    boxMaterials,
    { radius: 0.025, name: 'back-upper-wall' },
  );

  // Fixed front deck with the control surface.
  const deckDepth = BOX.deckFrontZ - BOX.deckBackZ;
  addRounded(
    root,
    [BOX.width, BOX.upperHeight, deckDepth],
    [0, upperY, BOX.deckBackZ + deckDepth / 2],
    boxMaterials,
    { radius: 0.038, name: 'control-deck' },
  );

  // Dark felt lining makes the inside read as a real mechanism bay.
  addFeltPlane(root, felt, [BOX.width - BOX.wall * 2 - 0.02, upperDepth - 0.02], [0, 0.816, upperCenterZ], {
    rotationX: -Math.PI / 2,
    name: 'felt-floor',
  });
  addFeltPlane(root, felt, [upperDepth - 0.02, BOX.upperHeight - 0.04], [-(BOX.width / 2 - BOX.wall - 0.008), 1.0, upperCenterZ], {
    rotationY: Math.PI / 2,
    name: 'felt-left',
  });
  addFeltPlane(root, felt, [upperDepth - 0.02, BOX.upperHeight - 0.04], [BOX.width / 2 - BOX.wall - 0.008, 1.0, upperCenterZ], {
    rotationY: -Math.PI / 2,
    name: 'felt-right',
  });
  addFeltPlane(root, felt, [BOX.width - BOX.wall * 2 - 0.02, BOX.upperHeight - 0.04], [0, 1.0, BOX.cavityBackZ + BOX.wall + 0.008], {
    name: 'felt-back',
  });
  addFeltPlane(root, felt, [BOX.width - BOX.wall * 2 - 0.02, BOX.upperHeight - 0.04], [0, 1.0, BOX.cavityFrontZ - 0.008], {
    rotationY: Math.PI,
    name: 'felt-front',
  });

  // Interior mechanism: servo, gear, wires, and a small controller board.
  buildMechanism(root, {
    brass,
    blackenedSteel,
    servoPlastic,
    servoHorn,
    darkWood,
  });

  // Control deck print.
  addDecal(root, pushMaterial, {
    width: 1.3,
    height: 0.39,
    position: [-0.78, 1.2015, 0.72],
    rotationX: -Math.PI / 2,
    name: 'push-decal',
  });

  // Toggle switch assembly.
  const switchAssembly = buildSwitch({
    chrome,
    blackenedSteel,
    hoverMaterial,
    ledMaterial,
    plateMaterial,
  });
  switchAssembly.root.position.set(SWITCH.x, SWITCH.y, SWITCH.z);
  switchAssembly.root.scale.setScalar(1.4);
  root.add(switchAssembly.root);

  // Acrylic finger and its bearing.
  const armAssembly = buildArm({
    acrylic,
    chrome,
    blackenedSteel,
    rubber,
    edgeMaterial,
  });
  armAssembly.root.position.set(ARM.x, ARM.y, ARM.z);
  root.add(armAssembly.root);

  // Rear-hinged lid.
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, LID.hingeY, LID.hingeZ);
  lidPivot.name = 'lid-pivot';
  root.add(lidPivot);

  addRounded(
    lidPivot,
    [LID.width, LID.thickness, LID.depth],
    [0, 0.09, LID.depth / 2],
    boxMaterials,
    { radius: 0.04, segments: 3, name: 'lid' },
  );

  const lipY = 0.002;
  addRounded(lidPivot, [LID.width - 0.22, 0.04, 0.05], [0, lipY, 1.31], darkWood, {
    radius: 0.01,
    name: 'lid-front-lip',
  });
  addRounded(lidPivot, [LID.width - 0.22, 0.04, 0.05], [0, lipY, 0.11], darkWood, {
    radius: 0.01,
    name: 'lid-back-lip',
  });
  addRounded(lidPivot, [0.05, 0.04, 1.2], [-(LID.width / 2 - 0.135), lipY, LID.depth / 2], darkWood, {
    radius: 0.01,
    name: 'lid-left-lip',
  });
  addRounded(lidPivot, [0.05, 0.04, 1.2], [LID.width / 2 - 0.135, lipY, LID.depth / 2], darkWood, {
    radius: 0.01,
    name: 'lid-right-lip',
  });

  addDecal(lidPivot, decalMaterial, {
    width: 2.5,
    height: 1.05,
    position: [0, 0.1615, LID.depth / 2],
    rotationX: -Math.PI / 2,
    name: 'lid-title-outer',
  });
  addDecal(lidPivot, decalMaterial, {
    width: 2.5,
    height: 1.05,
    position: [0, 0.0195, LID.depth / 2],
    rotationX: Math.PI / 2,
    name: 'lid-title-inner',
  });

  // Hinges at the rear edge.
  for (const x of [-0.98, 0.98]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 20), brass);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(x, LID.hingeY + 0.005, LID.hingeZ);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    root.add(barrel);

    addRounded(root, [0.16, 0.12, 0.035], [x, 1.115, LID.hingeZ - 0.018], blackenedSteel, {
      radius: 0.012,
      name: 'hinge-base-plate',
    });
    addRounded(lidPivot, [0.16, 0.11, 0.035], [x, 0.055, -0.005], blackenedSteel, {
      radius: 0.012,
      name: 'hinge-lid-plate',
    });
  }

  // Front clasp, referencing the photographed box.
  buildClasp(root, { blackenedSteel, chrome });

  // A low-profile maker's plate on the front face adds a little narrative.
  addRounded(root, [0.48, 0.095, 0.018], [-1.05, 0.24, BOX.depth / 2 + 0.008], brass, {
    radius: 0.012,
    cast: false,
    name: 'maker-plate',
  });

  root.traverse((child) => {
    if (child.isMesh) {
      child.receiveShadow = child.receiveShadow !== false;
    }
  });

  logger?.debug(
    'box model built',
    `meshes=${root.children.length}`,
    `anisotropy=${anisotropy}`,
  );

  return {
    root,
    lidPivot,
    switch: switchAssembly,
    arm: armAssembly,
    ledMaterial,
    hoverMaterial,
    hitTargets: [switchAssembly.hitMesh],
    materials: {
      woodSide,
      woodFront,
      woodTop,
      felt,
      chrome,
      brass,
      acrylic,
    },
  };
}

function createWoodMaterial(
  textureSet,
  { anisotropy = 1, rotation = 0, repeat = [1, 1], color = 0xffffff } = {},
) {
  const map = cloneConfiguredTexture(textureSet.map, { anisotropy, rotation, repeat });
  const bumpMap = cloneConfiguredTexture(textureSet.bumpMap, {
    anisotropy,
    rotation,
    repeat,
    srgb: false,
  });

  return new THREE.MeshPhysicalMaterial({
    map,
    bumpMap,
    bumpScale: 0.024,
    color,
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.24,
    clearcoatRoughness: 0.44,
    envMapIntensity: 0.58,
  });
}

function cloneConfiguredTexture(texture, { rotation = 0, repeat = [1, 1], srgb = true } = {}) {
  const clone = texture.clone();
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.center.set(0.5, 0.5);
  clone.rotation = rotation;
  clone.repeat.set(repeat[0], repeat[1]);
  clone.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  clone.needsUpdate = true;
  return clone;
}

function createDecalMaterial(texture, anisotropy) {
  const map = texture.clone();
  map.anisotropy = anisotropy;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    roughness: 0.72,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    envMapIntensity: 0.4,
  });
}

function addRounded(
  parent,
  [width, height, depth],
  [x, y, z],
  material,
  { radius = 0.03, segments = 3, cast = true, receive = true, name = '' } = {},
) {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addFeltPlane(
  parent,
  material,
  [width, height],
  [x, y, z],
  { rotationX = 0, rotationY = 0, name = '' } = {},
) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotationX, rotationY, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addDecal(parent, material, { width, height, position, rotationX = 0, name = '' }) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(...position);
  mesh.rotation.x = rotationX;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addScrew(parent, material, { x, y, z, radius = 0.018, depth = 0.012, axis = 'z', slot = true }) {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, depth, 14), material);
  if (axis === 'z') head.rotation.x = Math.PI / 2;
  if (axis === 'x') head.rotation.z = Math.PI / 2;
  head.position.set(x, y, z);
  head.castShadow = true;
  head.receiveShadow = true;
  parent.add(head);

  if (slot) {
    const slotMesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.15, 0.003, radius * 0.22), material);
    if (axis === 'z') {
      slotMesh.position.set(x, y + 0.001, z + depth / 2);
    } else if (axis === 'y') {
      slotMesh.rotation.x = Math.PI / 2;
      slotMesh.position.set(x, y + depth / 2, z);
    } else {
      slotMesh.rotation.y = Math.PI / 2;
      slotMesh.position.set(x + depth / 2, y, z);
    }
    parent.add(slotMesh);
  }

  return head;
}

function buildSwitch({ chrome, blackenedSteel, hoverMaterial, ledMaterial, plateMaterial }) {
  const root = new THREE.Group();
  root.name = 'toggle-switch';

  const switchPlateMaterial = new THREE.MeshStandardMaterial({
    color: 0x171513,
    metalness: 0.62,
    roughness: 0.48,
    envMapIntensity: 0.55,
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.255, 0.292, 64), hoverMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.0025;
  ring.receiveShadow = false;
  ring.castShadow = false;
  root.add(ring);

  addRounded(
    root,
    [SWITCH.plateWidth, 0.032, SWITCH.plateDepth],
    [0, 0.016, 0],
    switchPlateMaterial,
    { radius: 0.026, name: 'switch-plate' },
  );

  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.13, 0.13]) {
      addScrew(root, chrome, { x, y: 0.033, z, radius: 0.014, depth: 0.008, axis: 'y' });
    }
  }

  const platePrint = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), plateMaterial);
  platePrint.rotation.x = -Math.PI / 2;
  platePrint.position.set(0, 0.0335, 0);
  platePrint.castShadow = false;
  platePrint.receiveShadow = false;
  root.add(platePrint);

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 10), ledMaterial);
  led.scale.y = 0.45;
  led.position.set(-0.17, 0.036, 0.14);
  led.castShadow = false;
  root.add(led);

  const pivot = new THREE.Group();
  pivot.position.y = 0.034;
  root.add(pivot);

  const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 20), chrome);
  washer.position.y = 0.006;
  washer.castShadow = true;
  pivot.add(washer);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.038, 0.22, 16), chrome);
  stem.position.y = 0.12;
  stem.castShadow = true;
  pivot.add(stem);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(SWITCH.knobRadius, 24, 16), blackenedSteel);
  knob.position.y = SWITCH.leverLength;
  knob.castShadow = true;
  pivot.add(knob);

  pivot.rotation.x = SWITCH.offAngle;

  const invisibleMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.55, 0.76), invisibleMaterial);
  hitMesh.position.y = 0.23;
  hitMesh.name = 'switch-hit-area';
  hitMesh.userData.hit = 'switch';
  root.add(hitMesh);

  return { root, pivot, hitMesh, ring, led, platePrint };
}

function buildArm({ acrylic, chrome, blackenedSteel, rubber, edgeMaterial }) {
  const root = new THREE.Group();
  root.name = 'acrylic-finger';

  addRounded(root, [0.36, 0.1, 0.18], [0, -0.065, 0.03], blackenedSteel, {
    radius: 0.02,
    name: 'arm-bearing-block',
  });
  for (const x of [-0.145, 0.145]) {
    addRounded(root, [0.035, 0.15, 0.16], [x, -0.01, 0], blackenedSteel, {
      radius: 0.012,
      name: 'arm-bearing-ear',
    });
  }

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.31, 24), chrome);
  axle.rotation.z = Math.PI / 2;
  axle.castShadow = true;
  root.add(axle);

  const shoulder = new THREE.Group();
  shoulder.position.y = 0;
  root.add(shoulder);

  const upper = addAcrylicSegment(
    shoulder,
    [0.07, ARM.upperLength, 0.16],
    [0, ARM.upperLength / 2, 0],
    acrylic,
    edgeMaterial,
    { radius: 0.02 },
  );

  const shoulderCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 24), chrome);
  shoulderCollar.rotation.z = Math.PI / 2;
  shoulderCollar.position.y = 0.025;
  shoulderCollar.castShadow = true;
  shoulder.add(shoulderCollar);

  const elbow = new THREE.Group();
  elbow.position.y = ARM.upperLength;
  shoulder.add(elbow);

  const lower = addAcrylicSegment(
    elbow,
    [0.075, 0.42, 0.16],
    [0, 0.21, 0],
    acrylic,
    edgeMaterial,
    { radius: 0.02 },
  );

  const elbowCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 24), chrome);
  elbowCollar.rotation.z = Math.PI / 2;
  elbowCollar.castShadow = true;
  elbow.add(elbowCollar);

  const tip = addRounded(elbow, [0.09, 0.06, 0.15], [0, 0.45, 0], rubber, {
    radius: 0.024,
    name: 'rubber-fingertip',
  });
  tip.castShadow = true;

  shoulder.rotation.x = ARM.foldedAngle;
  elbow.rotation.x = 0;

  return { root, shoulder, elbow, upper, lower, tip };
}

function addAcrylicSegment(parent, size, position, material, edgeMaterial, { radius = 0.02 } = {}) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 42), edgeMaterial);
  edges.position.copy(mesh.position);
  edges.renderOrder = 2;
  parent.add(edges);
  return mesh;
}

function buildMechanism(parent, { brass, blackenedSteel, servoPlastic, servoHorn, darkWood }) {
  const bayX = -0.86;
  const bayZ = -0.55;

  addRounded(parent, [0.3, 0.18, 0.34], [bayX, 0.905, bayZ], servoPlastic, {
    radius: 0.035,
    name: 'servo-body',
  });
  addRounded(parent, [0.16, 0.035, 0.1], [bayX + 0.02, 1.01, bayZ + 0.03], servoHorn, {
    radius: 0.012,
    name: 'servo-horn',
  });
  addScrew(parent, brass, { x: bayX - 0.1, y: 1.01, z: bayZ + 0.12, radius: 0.014, axis: 'y' });
  addScrew(parent, brass, { x: bayX + 0.12, y: 1.01, z: bayZ + 0.12, radius: 0.014, axis: 'y' });

  // A simple exposed brass gear.
  const gear = new THREE.Group();
  gear.position.set(-0.36, 0.85, -0.82);
  parent.add(gear);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.028, 28), brass);
  disc.castShadow = true;
  disc.receiveShadow = true;
  gear.add(disc);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.026, 0.048), brass);
    tooth.position.set(Math.cos(angle) * 0.135, 0, Math.sin(angle) * 0.135);
    tooth.rotation.y = -angle;
    tooth.castShadow = true;
    tooth.receiveShadow = true;
    gear.add(tooth);
  }
  const gearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 16), blackenedSteel);
  gearAxle.position.y = 0.035;
  gear.add(gearAxle);

  // Cable runs from the servo into the back wall.
  const wireMaterialRed = new THREE.MeshStandardMaterial({ color: 0x862822, roughness: 0.7 });
  const wireMaterialBlack = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.7 });
  for (const [offset, material] of [
    [0.035, wireMaterialRed],
    [-0.035, wireMaterialBlack],
  ]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bayX + offset, 0.9, bayZ - 0.16),
      new THREE.Vector3(bayX + offset - 0.12, 0.84, -0.78),
      new THREE.Vector3(bayX + 0.32, 0.835, -0.98),
      new THREE.Vector3(bayX + 0.8, 0.85, -1.1),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.012, 6, false), material);
    tube.castShadow = false;
    tube.receiveShadow = false;
    parent.add(tube);
  }

  const board = addRounded(parent, [0.34, 0.014, 0.24], [-1.27, 0.829, -0.92], darkWood, {
    radius: 0.012,
    name: 'control-board',
  });
  board.castShadow = false;
  for (const z of [-0.98, -0.9, -0.82]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.035), brass);
    pad.position.set(-1.32, 0.838, z);
    pad.castShadow = false;
    parent.add(pad);
  }
}

function buildClasp(parent, { blackenedSteel, chrome }) {
  const z = BOX.depth / 2 + 0.01;
  addRounded(parent, [0.37, 0.3, 0.035], [0, 0.67, z], blackenedSteel, {
    radius: 0.022,
    name: 'clasp-plate',
  });
  addRounded(parent, [0.24, 0.05, 0.045], [0, 0.77, z + 0.03], chrome, {
    radius: 0.012,
    name: 'clasp-hook',
  });
  addScrew(parent, chrome, { x: -0.12, y: 0.77, z: z + 0.058, radius: 0.018, depth: 0.012 });
  addScrew(parent, chrome, { x: 0.12, y: 0.77, z: z + 0.058, radius: 0.018, depth: 0.012 });
  addScrew(parent, blackenedSteel, { x: 0, y: 0.58, z: z + 0.025, radius: 0.03, depth: 0.014, slot: false });

  const hasp = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.018, 8, 24, Math.PI),
    blackenedSteel,
  );
  hasp.rotation.z = Math.PI;
  hasp.position.set(0, 0.66, z + 0.045);
  hasp.castShadow = true;
  parent.add(hasp);
}
