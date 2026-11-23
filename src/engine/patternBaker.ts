import {
  FINISHES,
  getCaseHardenedBluePct,
  getDopplerVariant
} from '../data/finishes';
import { CoatingItem, FinishId } from '../types';

// Deterministic fast PRNG for repeatable Pattern Seed & Float Wear rendering!
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let val = 0;
  let amp = 0.52;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 97) * amp;
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k)
  ];
}

// Render a standalone procedural CS:GO-style pattern swatch (also used for coating tiles & baking onto ships!)
export function renderPatternCanvas(
  finishId: FinishId,
  seed: number,
  floatVal: number,
  size = 160
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const rand = mulberry32(seed * 7919 + 1337);

  // Seed-driven UV translation & rotation so every #000..#999 seed shifts the layout on the ship!
  const offX = rand() * 8;
  const offY = rand() * 8;
  const rotAng = (rand() - 0.5) * Math.PI * 1.4;

  if (finishId === 'factory_issue') {
    ctx.fillStyle = '#5a626b';
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  if (finishId === 'case_hardened') {
    // Iconic CS:GO heat-treated cobalt blue / tarnished gold / purple mottled steel!
    const img = ctx.createImageData(size, size);
    const bluePct = getCaseHardenedBluePct(seed);
    const blueBias = (bluePct - 48) / 110; // shifts blue gem seeds strongly cobalt!
    const cGold: [number, number, number] = [218, 174, 84];
    const cPurple: [number, number, number] = [148, 84, 176];
    const cBlue: [number, number, number] = [44, 134, 245];
    const cSilver: [number, number, number] = [184, 190, 198];

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 3.8 + offX;
        const ny = (py / size) * 3.8 + offY;
        const n1 = fbm(nx, ny, seed, 4);
        const n2 = fbm(nx * 1.6 + 4.1, ny * 1.6 - 2.7, seed + 53, 3);
        const v = Math.max(0, Math.min(1, n1 * 0.72 + n2 * 0.28 + blueBias));

        let rgb: [number, number, number];
        if (v > 0.54) {
          rgb = lerpRgb(cPurple, cBlue, (v - 0.54) / 0.24);
        } else if (v > 0.42) {
          rgb = lerpRgb(cGold, cPurple, (v - 0.42) / 0.12);
        } else if (v > 0.24) {
          rgb = lerpRgb(cSilver, cGold, (v - 0.24) / 0.18);
        } else {
          rgb = lerpRgb([118, 110, 98], cSilver, v / 0.24);
        }
        const i = (py * size + px) * 4;
        img.data[i] = rgb[0];
        img.data[i + 1] = rgb[1];
        img.data[i + 2] = rgb[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'doppler') {
    const dv = getDopplerVariant(seed);
    const c0 = hexToRgb(dv.primary);
    const c1 = hexToRgb(dv.secondary);
    const c2 = hexToRgb(dv.highlight);
    const img = ctx.createImageData(size, size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 3.2 + offX;
        const ny = (py / size) * 3.2 + offY;
        const warp = fbm(nx, ny, seed, 3) * 2.4;
        const v = fbm(nx + warp, ny - warp * 0.7, seed + 19, 3);
        const rgb =
          v < 0.5 ? lerpRgb(c0, c1, v * 2) : lerpRgb(c1, c2, (v - 0.5) * 2.1);
        const i = (py * size + px) * 4;
        img.data[i] = rgb[0];
        img.data[i + 1] = rgb[1];
        img.data[i + 2] = rgb[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'fade') {
    // Iconic metallic chrome -> indigo -> magenta -> molten amber Fade shifted by seed!
    const fadeShift = ((seed * 37) % 101) / 100; // 0 = 80% fade, 1 = 100% full fade
    const ang = -Math.PI * 0.38 + (rand() - 0.5) * 0.4;
    const gx = Math.cos(ang) * size * 0.7;
    const gy = Math.sin(ang) * size * 0.7;
    const g = ctx.createLinearGradient(size / 2 - gx, size / 2 - gy, size / 2 + gx, size / 2 + gy);
    const chromeStop = Math.max(0, 0.24 - fadeShift * 0.24);
    g.addColorStop(0, '#c6ced6');
    g.addColorStop(chromeStop, '#8d96a6');
    g.addColorStop(Math.min(0.95, chromeStop + 0.22), '#6446c9');
    g.addColorStop(Math.min(0.97, chromeStop + 0.5), '#d93b8a');
    g.addColorStop(Math.min(0.99, chromeStop + 0.76), '#eb8b34');
    g.addColorStop(1, '#f5d256');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (finishId === 'marble_fade') {
    const img = ctx.createImageData(size, size);
    const trueFireIce = seed % 23 === 0;
    const cRed: [number, number, number] = [218, 52, 46];
    const cBlue: [number, number, number] = [38, 108, 224];
    const cGold: [number, number, number] = [228, 178, 56];
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 2.4 + offX;
        const ny = (py / size) * 2.4 + offY;
        const swirl = fbm(nx, ny, seed, 3) * 2.2;
        const band = (Math.sin((nx * 1.4 + ny * 0.9 + swirl) * 2.1) + 1) * 0.5;
        let rgb: [number, number, number];
        if (trueFireIce) {
          rgb = lerpRgb(cBlue, cRed, band);
        } else if (band < 0.34) {
          rgb = lerpRgb(cBlue, cRed, band / 0.34);
        } else if (band < 0.68) {
          rgb = lerpRgb(cRed, cGold, (band - 0.34) / 0.34);
        } else {
          rgb = lerpRgb(cGold, cBlue, (band - 0.68) / 0.32);
        }
        const i = (py * size + px) * 4;
        img.data[i] = rgb[0];
        img.data[i + 1] = rgb[1];
        img.data[i + 2] = rgb[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'crimson_web') {
    const g = ctx.createRadialGradient(size * 0.45, size * 0.45, size * 0.05, size * 0.5, size * 0.5, size * 0.8);
    g.addColorStop(0, '#c4232c');
    g.addColorStop(1, '#590d14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const centerSpecial = seed % 17;
    const webCount = centerSpecial === 0 ? 3 : centerSpecial <= 3 ? 2 : 1 + Math.floor(rand() * 2);
    ctx.strokeStyle = 'rgba(18, 6, 8, 0.85)';
    for (let w = 0; w < webCount; w++) {
      const cx =
        w === 0 && centerSpecial <= 3
          ? size * (0.44 + (rand() - 0.5) * 0.14)
          : size * (0.15 + rand() * 0.7);
      const cy =
        w === 0 && centerSpecial <= 3
          ? size * (0.44 + (rand() - 0.5) * 0.14)
          : size * (0.15 + rand() * 0.7);
      const spokes = 8 + Math.floor(rand() * 4);
      const maxR = size * (0.48 + rand() * 0.35);
      ctx.lineWidth = 1.6;
      for (let s = 0; s < spokes; s++) {
        const a = (s * Math.PI * 2) / spokes + rotAng;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.stroke();
      }
      ctx.lineWidth = 1.25;
      for (let ring = 1; ring <= 5; ring++) {
        const rr = (ring / 5) * maxR * 0.82;
        ctx.beginPath();
        for (let s = 0; s <= spokes; s++) {
          const a = (s * Math.PI * 2) / spokes + rotAng;
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  } else if (finishId === 'kintsugi') {
    ctx.fillStyle = '#1b1a1f';
    ctx.fillRect(0, 0, size, size);
    // Subtle dark ceramic sheen
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, 'rgba(65, 62, 72, 0.35)');
    g.addColorStop(1, 'rgba(12, 11, 15, 0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const veins = 5 + Math.floor(rand() * 4);
    for (let v = 0; v < veins; v++) {
      let vx = rand() * size;
      let vy = rand() * size;
      let ang = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let step = 0; step < 9; step++) {
        ang += (rand() - 0.5) * 0.85;
        vx += Math.cos(ang) * (size * 0.14);
        vy += Math.sin(ang) * (size * 0.14);
        ctx.lineTo(vx, vy);
      }
      ctx.strokeStyle = '#d49a2a';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = '#fff0b0';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  } else if (finishId === 'damascus') {
    const img = ctx.createImageData(size, size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 4.5 + offX;
        const ny = (py / size) * 4.5 + offY;
        const n = fbm(nx, ny, seed, 3);
        const wave = Math.sin((nx * 2.2 + n * 7.5) * Math.PI);
        const lum = Math.round(92 + (wave * 0.5 + 0.5) * 124);
        const i = (py * size + px) * 4;
        img.data[i] = lum;
        img.data[i + 1] = Math.min(255, lum + 5);
        img.data[i + 2] = Math.min(255, lum + 12);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'copper_patina') {
    const img = ctx.createImageData(size, size);
    const cCop: [number, number, number] = [176, 102, 58];
    const cDark: [number, number, number] = [94, 56, 36];
    const cPat: [number, number, number] = [66, 178, 152];
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 4.0 + offX;
        const ny = (py / size) * 4.0 + offY;
        const n = fbm(nx, ny, seed, 4);
        const rgb =
          n > 0.52 ? lerpRgb(cCop, cPat, (n - 0.52) / 0.25) : lerpRgb(cDark, cCop, n / 0.52);
        const i = (py * size + px) * 4;
        img.data[i] = rgb[0];
        img.data[i + 1] = rgb[1];
        img.data[i + 2] = rgb[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'tiger_rust') {
    ctx.fillStyle = '#d46224';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rotAng * 0.65);
    ctx.translate(-size, -size);
    for (let y = 0; y < size * 2; y += 16) {
      ctx.fillStyle = '#1b1715';
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size * 2; x += 22) {
        const w = 4 + Math.sin(x * 0.05 + y * 0.1 + seed) * 3.5;
        ctx.lineTo(x, y + w);
      }
      for (let x = size * 2; x >= 0; x -= 22) {
        ctx.lineTo(x, y + 9 + Math.cos(x * 0.04 + seed) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (finishId === 'oxide_hazard') {
    ctx.fillStyle = '#252422';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4 + (rand() - 0.5) * 0.5);
    ctx.translate(-size, -size);
    ctx.fillStyle = '#d99e26';
    const step = 20 + Math.floor(rand() * 8);
    for (let x = 0; x < size * 2; x += step * 2) {
      ctx.fillRect(x, 0, step * 0.9, size * 2);
    }
    ctx.restore();
    // Weathered iron band patch
    ctx.fillStyle = 'rgba(42, 39, 36, 0.55)';
    ctx.fillRect(0, size * (0.25 + rand() * 0.35), size, size * 0.28);
  } else if (finishId === 'dune_splinter') {
    const palette = ['#8f7b5b', '#52493d', '#b89f78', '#332f2a', '#70583c'];
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, size, size);
    for (let k = 0; k < 20; k++) {
      ctx.fillStyle = palette[1 + Math.floor(rand() * (palette.length - 1))];
      const cx = rand() * size;
      const cy = rand() * size;
      const r = size * (0.16 + rand() * 0.28);
      ctx.beginPath();
      const sides = 3 + Math.floor(rand() * 3);
      for (let s = 0; s < sides; s++) {
        const a = (s * Math.PI * 2) / sides + rand() * 0.7;
        const rr = r * (0.6 + rand() * 0.6);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (finishId === 'ash_topo') {
    const img = ctx.createImageData(size, size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 3.4 + offX;
        const ny = (py / size) * 3.4 + offY;
        const n = fbm(nx, ny, seed, 3);
        const contour = Math.abs((n * 10) % 1 - 0.5);
        const isLine = contour < 0.06;
        const base = Math.round(48 + n * 48);
        const i = (py * size + px) * 4;
        img.data[i] = isLine ? 186 : base;
        img.data[i + 1] = isLine ? 194 : base + 4;
        img.data[i + 2] = isLine ? 184 : base + 2;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (finishId === 'slag_carbon') {
    ctx.fillStyle = '#1b1a1d';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2d2b30';
    for (let y = 0; y < size; y += 8) {
      for (let x = (y % 16 === 0 ? 0 : 4); x < size; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    ctx.strokeStyle = '#e06024';
    ctx.lineWidth = 2.4;
    for (let k = 0; k < 3; k++) {
      const p = rand() * size;
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, (p + size * 0.4) % size);
      ctx.stroke();
    }
  } else if (finishId === 'aurelia_gold') {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#f5d26e');
    g.addColorStop(0.45, '#c98e28');
    g.addColorStop(0.75, '#f0be4a');
    g.addColorStop(1, '#8c5c14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // Engraved geometric relic filigree + turquoise inlays
    ctx.strokeStyle = 'rgba(40, 26, 8, 0.55)';
    ctx.lineWidth = 1.6;
    const step = 28;
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        ctx.strokeRect(x + 3, y + 3, step - 6, step - 6);
      }
    }
    ctx.strokeStyle = '#4adbc8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size * (0.3 + rand() * 0.4), size * (0.3 + rand() * 0.4), size * 0.26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Apply physical wear overlay to swatch preview when floatVal > 0.08
  if (floatVal > 0.08) {
    applyWearScratches(ctx, size, seed, floatVal);
  }
  return c;
}

function applyWearScratches(
  ctx: CanvasRenderingContext2D,
  size: number,
  seed: number,
  floatVal: number
): void {
  const rand = mulberry32(seed * 3571 + Math.floor(floatVal * 10000));
  const intensity = Math.max(0, Math.min(1, (floatVal - 0.07) / 0.88));

  // 1. Chipped bare gunmetal blotches (heavy at FT -> BS!)
  const chips = Math.floor(intensity * 26);
  for (let i = 0; i < chips; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = (4 + rand() * 14) * (0.4 + intensity * 0.85);
    ctx.fillStyle =
      floatVal >= 0.9
        ? `rgba(18, 17, 19, ${0.42 + rand() * 0.35})` // coveted blackened BS patina
        : `rgba(54, 52, 50, ${0.32 + intensity * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * (0.4 + rand() * 0.7), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Crisp metallic combat scratches
  const scratches = Math.floor(4 + intensity * 30);
  for (let i = 0; i < scratches; i++) {
    const x1 = rand() * size;
    const y1 = rand() * size;
    const ang = rand() * Math.PI * 2;
    const len = 8 + rand() * (20 + intensity * 26);
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(198, 192, 180, ${0.24 + intensity * 0.32})`
        : `rgba(24, 22, 20, ${0.35 + intensity * 0.38})`;
    ctx.lineWidth = 0.8 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
    ctx.stroke();
  }

  // 3. Battle-Scarred soot & rust haze
  if (floatVal > 0.42) {
    const bs = (floatVal - 0.42) / 0.58;
    ctx.fillStyle = `rgba(38, 22, 14, ${bs * 0.38})`;
    ctx.fillRect(0, 0, size, size);
  }
}

// Bake a rolled CS:GO pattern + float wear directly onto a rendered ship sprite preserving 3D metal shading!
export function bakeCoatedShipCanvas(
  baseImg: HTMLImageElement,
  coating: CoatingItem,
  size = 192
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.drawImage(baseImg, 0, 0, size, size);
  if (coating.finishId === 'factory_issue') {
    return c;
  }

  const pattern = renderPatternCanvas(coating.finishId, coating.seed, coating.floatVal, size);
  const def = FINISHES[coating.finishId];

  // Blend pattern onto ship hull while keeping every rivet, shadow & bevel from baseImg!
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  // Color transfer pass
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = coating.floatVal > 0.65 ? 0.68 : 0.88;
  ctx.drawImage(pattern, 0, 0, size, size);

  // Pattern detail / contrast pass (preserves stripes, webs, kintsugi gold veins, camo edges!)
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = def.rarity === 'covert' || def.rarity === 'contraband' ? 0.62 : 0.52;
  ctx.drawImage(pattern, 0, 0, size, size);

  // For high-contrast graphic patterns (webs, kintsugi, hazard, tiger), blend light source-atop detail
  if (
    coating.finishId === 'crimson_web' ||
    coating.finishId === 'kintsugi' ||
    coating.finishId === 'oxide_hazard' ||
    coating.finishId === 'tiger_rust' ||
    coating.finishId === 'dune_splinter'
  ) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.28 * (1 - Math.min(0.6, coating.floatVal * 0.5));
    ctx.drawImage(pattern, 0, 0, size, size);
  }

  // Extra crisp wear scuffs directly on hull for FT / WW / BS!
  if (coating.floatVal > 0.14) {
    ctx.globalCompositeOperation = 'source-atop';
    applyWearScratches(ctx, size, coating.seed + 77, coating.floatVal);
  }
  ctx.restore();

  // Restore exact original silhouette alpha mask (zero fringe bleed!)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(baseImg, 0, 0, size, size);
  return c;
}
