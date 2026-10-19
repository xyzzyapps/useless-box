import * as THREE from 'three';

/**
 * Procedural, asset-free textures. Every visual is generated at runtime so the
 * page has no image, font, or audio downloads beyond the local Three.js build.
 */

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeRng(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createTexture(canvas, { anisotropy = 1, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function addSpeckle(ctx, size, rng, strength, alpha = 1) {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rng() - 0.5) * strength;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    if (alpha < 1) data[i + 3] = Math.round(data[i + 3] * alpha);
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Generates a wood colour map and a matching bump map. The grain runs along the
 * canvas X axis; materials rotate the texture for vertical side panels.
 */
export function createWoodTextures({ anisotropy = 1, variant = 'cherry' } = {}) {
  const size = 512;
  const rng = makeRng(variant === 'cherry' ? 0x51a7c3 : 0x91b2d4);
  const palette =
    variant === 'cherry'
      ? {
          base: '#743117',
          light: '#95482a',
          pale: '#b96840',
          dark: '#401607',
        }
      : {
          base: '#d9c3a4',
          light: '#e8d7be',
          pale: '#f0e2cd',
          dark: '#b0936e',
        };

  const colorCanvas = makeCanvas(size, size);
  const bumpCanvas = makeCanvas(size, size);
  const ctx = colorCanvas.getContext('2d');
  const bump = bumpCanvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size * 0.35, size);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(0.45, palette.base);
  gradient.addColorStop(1, palette.base);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  bump.fillStyle = '#808080';
  bump.fillRect(0, 0, size, size);

  // Broad, wandering grain bands.
  const broadLines = variant === 'cherry' ? 84 : 54;
  for (let i = 0; i < broadLines; i += 1) {
    const baseY = rng() * size;
    const amplitude = 1 + rng() * 7;
    const frequency = 0.004 + rng() * 0.014;
    const phase = rng() * Math.PI * 2;
    const dark = rng() < 0.64;
    const alpha = (0.065 + rng() * 0.19) * (variant === 'cherry' ? 1 : 0.62);
    const width = 0.8 + rng() * (variant === 'cherry' ? 3.6 : 2.2);

    ctx.beginPath();
    bump.beginPath();
    for (let x = -8; x <= size + 8; x += 6) {
      const y =
        baseY +
        Math.sin(x * frequency + phase) * amplitude +
        Math.sin(x * frequency * 2.6 + phase * 1.8) * amplitude * 0.35;
      if (x === -8) {
        ctx.moveTo(x, y);
        bump.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        bump.lineTo(x, y);
      }
    }
    ctx.strokeStyle = dark ? palette.dark : palette.pale;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();

    bump.strokeStyle = dark ? '#2c2c2c' : '#d4d4d4';
    bump.globalAlpha = alpha * 0.7;
    bump.lineWidth = width;
    bump.stroke();
  }

  // Hairline grain.
  for (let i = 0; i < 210; i += 1) {
    const y = rng() * size;
    const drift = (rng() - 0.5) * 6;
    const alpha = (0.028 + rng() * 0.075) * (variant === 'cherry' ? 1 : 0.55);
    ctx.beginPath();
    bump.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const yy = y + Math.sin(x * 0.011 + i) * 1.2 + (x / size) * drift;
      if (x === 0) {
        ctx.moveTo(x, yy);
        bump.moveTo(x, yy);
      } else {
        ctx.lineTo(x, yy);
        bump.lineTo(x, yy);
      }
    }
    ctx.strokeStyle = rng() < 0.5 ? palette.dark : palette.pale;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 0.5 + rng() * 0.8;
    ctx.stroke();
    bump.strokeStyle = rng() < 0.5 ? '#333333' : '#cccccc';
    bump.globalAlpha = alpha * 0.65;
    bump.lineWidth = 0.6;
    bump.stroke();
  }

  // Occasional knots, kept subtle so the box reads as finished furniture.
  const knots = variant === 'cherry' ? 2 : 1;
  for (let k = 0; k < knots; k += 1) {
    const cx = 70 + rng() * (size - 140);
    const cy = 70 + rng() * (size - 140);
    const radius = 16 + rng() * 24;
    for (let ring = 0; ring < 10; ring += 1) {
      const t = ring / 9;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (0.35 + t), radius * (0.1 + t * 0.45), 0.12, 0, Math.PI * 2);
      ctx.strokeStyle = palette.dark;
      ctx.globalAlpha = 0.045 + (1 - t) * 0.07;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.stroke();
    }
    bump.beginPath();
    bump.ellipse(cx, cy, radius * 0.6, radius * 0.28, 0.12, 0, Math.PI * 2);
    bump.strokeStyle = '#3c3c3c';
    bump.globalAlpha = 0.25;
    bump.lineWidth = 2;
    bump.stroke();
  }

  ctx.globalAlpha = 1;
  bump.globalAlpha = 1;
  addSpeckle(ctx, size, rng, variant === 'cherry' ? 10 : 7);
  addSpeckle(bump, size, rng, 8);

  return {
    map: createTexture(colorCanvas, { anisotropy }),
    bumpMap: createTexture(bumpCanvas, { anisotropy, srgb: false }),
  };
}

export function createFeltBumpTexture({ anisotropy = 1 } = {}) {
  const size = 128;
  const rng = makeRng(0xf3e1);
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4200; i += 1) {
    const shade = 60 + Math.floor(rng() * 150);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.globalAlpha = 0.18 + rng() * 0.3;
    ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2);
  }
  return createTexture(canvas, { anisotropy, srgb: false });
}

function fitFont(ctx, text, maxWidth, maxSize, fontFamily, style = 'italic 700') {
  let size = maxSize;
  do {
    ctx.font = `${style} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > 24);
  return size;
}

function engraveText(ctx, text, x, y, font, color, { highlight = true } = {}) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (highlight) {
    ctx.fillStyle = 'rgba(255, 240, 218, 0.16)';
    ctx.fillText(text, x, y + 3);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function createTitleTexture({ anisotropy = 1 } = {}) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const family = "Georgia, 'Times New Roman', serif";
  const color = '#26140c';

  const line1 = 'Useless';
  const line2 = 'Box';
  const size1 = fitFont(ctx, line1, width * 0.8, 190, family);
  const size2 = fitFont(ctx, line2, width * 0.5, 190, family);

  ctx.save();
  ctx.shadowColor = 'rgba(32, 14, 5, 0.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  engraveText(ctx, line1, width / 2, height * 0.38, `italic 700 ${size1}px ${family}`, color);
  engraveText(ctx, line2, width / 2, height * 0.68, `italic 700 ${size2}px ${family}`, color);
  ctx.restore();

  // A small hand-drawn rule keeps the label from feeling like a rendered font sample.
  ctx.strokeStyle = 'rgba(38, 20, 12, 0.62)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(width * 0.39, height * 0.85);
  ctx.bezierCurveTo(width * 0.47, height * 0.87, width * 0.56, height * 0.83, width * 0.62, height * 0.85);
  ctx.stroke();

  return createTexture(canvas, { anisotropy });
}

export function createPushTexture({ anisotropy = 1 } = {}) {
  const width = 1024;
  const height = 300;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const color = '#20120b';
  const family = "'Trebuchet MS', 'Segoe UI', sans-serif";

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `800 150px ${family}`;
  ctx.fillStyle = 'rgba(255, 240, 218, 0.12)';
  ctx.fillText('PUSH', 107, 156);
  ctx.fillStyle = color;
  ctx.fillText('PUSH', 100, 150);

  // Two chunky chevrons pointing at the switch.
  ctx.strokeStyle = color;
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const x of [735, 870]) {
    ctx.beginPath();
    ctx.moveTo(x, 68);
    ctx.lineTo(x + 88, 150);
    ctx.lineTo(x, 232);
    ctx.stroke();
  }
  ctx.restore();

  return createTexture(canvas, { anisotropy });
}

export function createPlateTexture({ anisotropy = 1 } = {}) {
  const width = 512;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(238, 224, 196, 0.72)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "600 34px 'Trebuchet MS', sans-serif";
  ctx.fillText('ON', width / 2, 92);
  ctx.fillText('OFF', width / 2, height - 90);
  return createTexture(canvas, { anisotropy });
}

export function createContactShadowTexture({ anisotropy = 1 } = {}) {
  const width = 512;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(1.45, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 168);
  gradient.addColorStop(0, 'rgba(38, 22, 12, 0.48)');
  gradient.addColorStop(0.35, 'rgba(38, 22, 12, 0.31)');
  gradient.addColorStop(0.72, 'rgba(38, 22, 12, 0.12)');
  gradient.addColorStop(1, 'rgba(38, 22, 12, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-width, -height, width * 2, height * 2);
  ctx.restore();
  return createTexture(canvas, { anisotropy });
}

/**
 * Soft studio environment used for reflections on chrome and acrylic. Built from
 * an equirectangular canvas so there is no dependency on a texture asset.
 */
export function createStudioEnvironment(renderer) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#fbf4e8');
  sky.addColorStop(0.44, '#e8d5ba');
  sky.addColorStop(0.62, '#a98665');
  sky.addColorStop(1, '#372c23');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = (x, y, radius, color, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.45, color.replace(/[\d.]+\)$/, `${alpha * 0.65})`));
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  glow(260, 150, 280, 'rgba(255, 248, 235, 1)', 1);
  glow(760, 110, 220, 'rgba(220, 235, 255, 0.9)', 0.85);
  glow(520, 380, 340, 'rgba(120, 80, 50, 0.35)', 0.6);

  ctx.fillStyle = 'rgba(255, 244, 225, 0.88)';
  ctx.beginPath();
  ctx.roundRect(190, 104, 330, 72, 34);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 231, 255, 0.5)';
  ctx.beginPath();
  ctx.roundRect(682, 76, 180, 48, 24);
  ctx.fill();

  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;
  source.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(source);
  source.dispose();
  pmrem.dispose();
  return target.texture;
}
