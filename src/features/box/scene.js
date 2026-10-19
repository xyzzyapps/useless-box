import * as THREE from 'three';

import { CAMERA } from './layout.js';
import { createBoxModel } from './model.js';
import {
  createContactShadowTexture,
  createStudioEnvironment,
} from '../../shared/textures.js';
import { damp, degToRad } from '../../core/math.js';

/**
 * Owns the renderer, camera rig, lighting, table, and model. The app tells this
 * layer which pose to display; it never advances the joke's timeline itself.
 */
export function createBoxScene({ canvas, logger, reducedMotion = false }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd9c6ae, 17, 42);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 100);
  camera.position.set(5, 4.5, 7);

  const environment = createStudioEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.82;

  const model = createBoxModel({ renderer, logger });
  scene.add(model.root);

  buildTable(scene, renderer);
  const lights = buildLights(scene);
  lights.interior.intensity = 0.34;

  const rig = createCameraRig(camera);

  let targetLed = 0;
  let currentLed = 0;
  let targetEnergy = 0;
  let currentEnergy = 0;
  let ringIntensity = 0;
  let elapsed = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  function applyPose(pose) {
    model.lidPivot.rotation.x = pose.lidAngle;
    model.switch.pivot.rotation.x = pose.switchAngle;
    model.arm.shoulder.rotation.x = pose.arm.shoulder;
    model.arm.elbow.rotation.x = pose.arm.elbow;
    targetLed = pose.led;
    targetEnergy = pose.cameraEnergy;
  }

  function applyIdlePose(idlePose) {
    applyPose(idlePose);
    targetLed = 0;
    targetEnergy = 0;
    currentEnergy = 0;
    currentLed = 0;
    model.ledMaterial.emissiveIntensity = 0;
  }

  function resize(width, height, pixelRatio = window.devicePixelRatio) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w;
    lastHeight = h;
    const dpr = Math.min(Math.max(1, pixelRatio), 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.resize(camera.aspect);
    logger?.debug('resize', `${w}x${h}`, `dpr=${dpr}`, `distance=${rig.fitDistance.toFixed(2)}`);
  }

  function update(
    dt,
    { pointerX = 0, pointerY = 0, hovered = false, idle = true, still = false } = {},
  ) {
    elapsed += dt;
    currentLed = damp(currentLed, targetLed, 12, dt);
    currentEnergy = damp(currentEnergy, targetEnergy, 4.5, dt);
    model.ledMaterial.emissiveIntensity = currentLed * 4.2;

    let ringTarget = 0;
    if (idle && !hovered) {
      ringTarget = 0.11 + (Math.sin(elapsed * 2.1) * 0.5 + 0.5) * 0.11;
    }
    if (idle && hovered) ringTarget = 0.95;
    ringIntensity = damp(ringIntensity, ringTarget, 9, dt);
    model.hoverMaterial.emissiveIntensity = ringIntensity;

    rig.update(dt, {
      pointerX,
      pointerY,
      energy: currentEnergy,
      reducedMotion,
      still,
      elapsed,
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  const onContextLost = (event) => {
    event.preventDefault();
    logger?.warn('WebGL context lost');
  };
  const onContextRestored = () => logger?.warn('WebGL context restored');
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  return {
    scene,
    camera,
    renderer,
    model,
    lights,
    rig,
    applyPose,
    applyIdlePose,
    resize,
    update,
    render,
    get elapsed() {
      return elapsed;
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.dispose();
      environment.dispose();
    },
  };
}

function createCameraRig(camera) {
  const target = new THREE.Vector3(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z);
  const temporaryTarget = target.clone();
  let fitDistance = 9;
  let azimuth = CAMERA.azimuth;
  let elevation = CAMERA.elevation;
  let distance = fitDistance;

  function resize(aspect) {
    const vHalf = degToRad(CAMERA.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.01));
    const limitingHalf = Math.min(vHalf, hHalf);
    fitDistance = Math.max(
      CAMERA.minDistance,
      (CAMERA.fitRadius / Math.sin(limitingHalf)) * CAMERA.margin,
    );
    distance = fitDistance;
  }

  function update(dt, { pointerX, pointerY, energy, reducedMotion, still: frozen, elapsed }) {
    const motionScale = reducedMotion || frozen ? 0 : 1;
    const driftAzimuth = Math.sin(elapsed * 0.32) * 0.006 * motionScale;
    const targetAzimuth = CAMERA.azimuth + pointerX * 0.022 * motionScale + driftAzimuth;
    const targetElevation = CAMERA.elevation - pointerY * 0.014 * motionScale;
    const targetDistance = fitDistance * (1 - energy * 0.035);
    const targetY = CAMERA.target.y + energy * 0.06;

    azimuth = damp(azimuth, targetAzimuth, 3.2, dt);
    elevation = damp(elevation, targetElevation, 3.2, dt);
    distance = damp(distance, targetDistance, 3.4, dt);
    temporaryTarget.set(CAMERA.target.x, targetY, CAMERA.target.z);

    const cosE = Math.cos(elevation);
    camera.position.set(
      temporaryTarget.x + Math.sin(azimuth) * cosE * distance,
      temporaryTarget.y + Math.sin(elevation) * distance,
      temporaryTarget.z + Math.cos(azimuth) * cosE * distance,
    );
    camera.lookAt(temporaryTarget);
  }

  // Prime the rig at the square aspect so the first frame is already framed.
  resize(1);

  return {
    update,
    resize,
    get fitDistance() {
      return fitDistance;
    },
  };
}

function buildTable(scene, renderer) {
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd8c4aa,
    roughness: 0.93,
    metalness: 0.01,
    envMapIntensity: 0.32,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.004;
  floor.receiveShadow = true;
  floor.name = 'table';
  scene.add(floor);

  const shadowTexture = createContactShadowTexture({ anisotropy });
  shadowTexture.wrapS = THREE.ClampToEdgeWrapping;
  shadowTexture.wrapT = THREE.ClampToEdgeWrapping;
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.7, 3.6),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
      toneMapped: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.002, 0.03);
  contactShadow.renderOrder = 1;
  contactShadow.name = 'contact-shadow';
  scene.add(contactShadow);
}

function buildLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0xfff7e9, 0x6c5845, 0.92);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffe0b9, 1.9);
  key.position.set(4.8, 5.8, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.022;
  key.shadow.radius = 4;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xffebd6, 0.68);
  fill.position.set(-4.5, 3.2, 4.5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xb9d2ff, 1.0);
  rim.position.set(-3.5, 4.2, -4.5);
  scene.add(rim);

  const interior = new THREE.PointLight(0xffc98f, 0.3, 3.4, 2);
  interior.position.set(0.1, 1.7, -0.38);
  scene.add(interior);

  return { hemisphere, key, fill, rim, interior };
}
