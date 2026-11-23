import {
  AuraStyle,
  getEffectVisualParams,
  PARRY_FX,
  TRAILS,
  TrailStyle
} from '../data/finishes';
import { EffectItem, ParryFxId, TrailId, VesselId } from '../types';

function hashStep(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function isTwinEngine(vesselId: VesselId): boolean {
  return (
    vesselId === 'aegis' ||
    vesselId === 'nova' ||
    vesselId === 'volt' ||
    vesselId === 'pyre' ||
    vesselId === 'bastion' ||
    vesselId === 'valkyrie'
  );
}

function getTrailStyle(item: EffectItem): TrailStyle {
  return (TRAILS[item.effectId as TrailId] ?? TRAILS.ion_ash).style;
}

function getAuraStyle(item: EffectItem): AuraStyle {
  return (PARRY_FX[item.effectId as ParryFxId] ?? PARRY_FX.steel_ring).style;
}

function drawJaggedBolt(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: number,
  jitter: number,
  seedPhase: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const off = (hashStep(seedPhase + i * 19.3) - 0.5) * 2 * jitter;
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draws the animated world-space thruster wake behind the ship during gameplay.
 * Trail points are ordered oldest (0) -> newest (length - 1).
 */
export function drawEffectTrailWake(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; alpha: number }>,
  item: EffectItem,
  time: number
): void {
  if (points.length === 0) return;
  const style = getTrailStyle(item);
  const p = getEffectVisualParams(item);

  ctx.save();

  // Overburn / high-wear BS dark soot trail layer
  if (p.sputter > 0.35 || p.overburn) {
    for (let i = 0; i < points.length; i += 2) {
      const pt = points[i];
      ctx.globalAlpha = pt.alpha * (p.overburn ? 0.55 : p.sputter * 0.34);
      ctx.fillStyle = '#14110f';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4 + (1 - pt.alpha) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (style === 'chromatic_helix' && points.length >= 2) {
    const strands = p.symmetry >= 12 ? 3 : 2;
    ctx.lineCap = 'round';
    for (let s = 0; s < strands; s++) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const tx = next.x - prev.x;
        const ty = next.y - prev.y;
        const l = Math.hypot(tx, ty) || 1;
        const nx = -ty / l;
        const ny = tx / l;
        const wave = Math.sin(i * 0.9 * p.twist - time * 14 + (s * Math.PI * 2) / strands) * (6 * pt.alpha + 2);
        const px = pt.x + nx * wave;
        const py = pt.y + ny * wave;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = s === 0 ? p.primary : s === 1 ? p.secondary : p.core;
      ctx.globalAlpha = 0.72 * p.intensity;
      ctx.lineWidth = s === 2 ? 1.8 : 2.6;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (style === 'tesla_wake' && points.length >= 2) {
    const stepBucket = Math.floor(time * 22);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (p.sputter > 0.3 && hashStep(stepBucket + i * 7) < p.sputter * 0.3) continue;
      ctx.globalAlpha = b.alpha * 0.85 * p.intensity;
      ctx.strokeStyle = p.primary;
      ctx.lineWidth = 2.6 * b.alpha + 0.8;
      drawJaggedBolt(ctx, a.x, a.y, b.x, b.y, 3, 6.5, stepBucket + i * 31 + item.seed);
      ctx.strokeStyle = p.core;
      ctx.lineWidth = 1.1;
      drawJaggedBolt(ctx, a.x, a.y, b.x, b.y, 3, 3.5, stepBucket + i * 31 + item.seed + 5);
    }
    ctx.restore();
    return;
  }

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const prev = points[Math.max(0, i - 1)];
    const ang = i > 0 ? Math.atan2(pt.y - prev.y, pt.x - prev.x) : -Math.PI / 2;
    const flick = p.sputter > 0.25 ? 0.75 + 0.25 * Math.sin(time * 32 + i * 5 + item.seed) : 1;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(ang + Math.PI / 2);

    if (style === 'afterburner') {
      // Expanding Mach shock-diamond rings
      const r = 3.2 + (1 - pt.alpha) * 6.5;
      ctx.globalAlpha = pt.alpha * 0.62 * flick * p.intensity;
      ctx.strokeStyle = i % 2 === 0 ? p.secondary : p.primary;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.core;
      ctx.globalAlpha = pt.alpha * 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 * pt.alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'acid_vortex') {
      // Billowing rotating hexagons
      const r = 4.5 + (1 - pt.alpha) * 8.5;
      ctx.rotate(time * 2.2 + i * 0.8);
      ctx.globalAlpha = pt.alpha * 0.48 * flick;
      ctx.fillStyle = i % 2 === 0 ? p.primary : p.secondary;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.core;
      ctx.globalAlpha = pt.alpha * 0.55;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (style === 'blade_chevron') {
      // Swept razor slag chevrons
      const w = 6 + (1 - pt.alpha) * 9;
      ctx.globalAlpha = pt.alpha * 0.78 * flick * p.intensity;
      ctx.strokeStyle = p.primary;
      ctx.lineWidth = 2.4 * pt.alpha + 0.8;
      ctx.beginPath();
      ctx.moveTo(-w, 4);
      ctx.lineTo(0, -4);
      ctx.lineTo(w, 4);
      ctx.stroke();
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, 2.5);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(w * 0.55, 2.5);
      ctx.stroke();
    } else if (style === 'rift_tear') {
      // Dark obsidian void diamond with bright lensing rim
      const r = 5.5 * pt.alpha + 2.5;
      ctx.globalAlpha = pt.alpha * 0.82 * flick;
      ctx.fillStyle = '#0c0814';
      ctx.strokeStyle = i % 2 === 0 ? p.primary : p.secondary;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.45);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r * 1.45);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (style === 'solar_wings') {
      // Radiant feathered relic flares + diamond sparkles
      const span = 8 + (1 - pt.alpha) * 11;
      ctx.globalAlpha = pt.alpha * 0.76 * flick * p.intensity;
      ctx.strokeStyle = p.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-span, 3);
      ctx.quadraticCurveTo(0, -5, span, 3);
      ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = i % 4 === 0 ? p.secondary : p.core;
        const d = 3.6 * pt.alpha + 1;
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(d * 0.7, 0);
        ctx.lineTo(0, d);
        ctx.lineTo(-d * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Default Ion Jet crisp orb + spark core
      ctx.globalAlpha = pt.alpha * 0.5 * flick * p.intensity;
      ctx.fillStyle = p.primary;
      ctx.beginPath();
      ctx.arc(0, 0, 5.2 * pt.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.core;
      ctx.globalAlpha = pt.alpha * 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, 2.1 * pt.alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the thruster plume directly attached to the ship's rear nozzles (local ship space, ship points -Y).
 * `scale` is 1.0 in gameplay (48px ship) and ~2.4 in preview (120px ship).
 */
export function drawEffectThrusterPlume(
  ctx: CanvasRenderingContext2D,
  vesselId: VesselId,
  item: EffectItem,
  time: number,
  scale = 1
): void {
  const style = getTrailStyle(item);
  const p = getEffectVisualParams(item);
  const pulse = 0.85 + 0.2 * Math.sin(time * 28 + item.seed);
  const wearJitter = p.sputter > 0.2 ? 1 - p.sputter * 0.3 * hashStep(Math.floor(time * 24) + item.seed) : 1;
  const len = (14 + pulse * 13) * scale * p.intensity * wearJitter;
  const nozzles = isTwinEngine(vesselId)
    ? [
        { x: -7 * scale, y: 17 * scale, w: 3.5 * scale },
        { x: 7 * scale, y: 17 * scale, w: 3.5 * scale }
      ]
    : [{ x: 0, y: 17 * scale, w: 4.4 * scale }];

  ctx.save();

  for (const n of nozzles) {
    ctx.save();
    ctx.translate(n.x, n.y);

    if (style === 'afterburner') {
      // Supersonic outer flare + pulsing Mach shock diamonds
      const grad = ctx.createLinearGradient(0, 0, 0, len * 1.25);
      grad.addColorStop(0, p.core);
      grad.addColorStop(0.32, p.primary);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-n.w * 1.15, 0);
      ctx.lineTo(0, len * 1.25);
      ctx.lineTo(n.w * 1.15, 0);
      ctx.closePath();
      ctx.fill();

      const rings = 3;
      for (let r = 0; r < rings; r++) {
        const frac = ((r / rings + time * 4.2) % 1);
        const ry = frac * len * 1.05;
        const rw = n.w * (1 - frac * 0.65) * 0.9;
        ctx.fillStyle = r % 2 === 0 ? p.core : p.secondary;
        ctx.globalAlpha = (1 - frac) * 0.92;
        ctx.beginPath();
        ctx.moveTo(0, ry - rw * 0.9);
        ctx.lineTo(rw, ry);
        ctx.lineTo(0, ry + rw * 0.9);
        ctx.lineTo(-rw, ry);
        ctx.closePath();
        ctx.fill();
      }
    } else if (style === 'acid_vortex') {
      // Swirling expanding caustic puffs
      for (let k = 0; k < 4; k++) {
        const frac = ((k * 0.25 + time * 2.6) % 1);
        const py = frac * len * 1.2;
        const px = Math.sin(time * 9 + k * 2.2 + item.seed) * 3 * scale * frac;
        const r = n.w * (0.65 + frac * 1.1);
        ctx.globalAlpha = (1 - frac) * 0.72;
        ctx.fillStyle = k % 2 === 0 ? p.primary : p.secondary;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI) / 3 + time * 2.5 + k;
          const x = px + Math.cos(a) * r;
          const y = py + Math.sin(a) * r;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = p.core;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 2 * scale, n.w * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'blade_chevron') {
      // Swept glowing energy chevrons firing backward
      for (let k = 0; k < 3; k++) {
        const frac = ((k / 3 + time * 3.8) % 1);
        const cy = frac * len * 1.25;
        const span = n.w * (1.2 + frac * 1.5);
        ctx.strokeStyle = k === 0 ? p.secondary : p.primary;
        ctx.globalAlpha = (1 - frac) * 0.95;
        ctx.lineWidth = (2.4 - frac * 1.3) * scale;
        ctx.beginPath();
        ctx.moveTo(-span, cy + 4 * scale);
        ctx.lineTo(0, cy - 2 * scale);
        ctx.lineTo(span, cy + 4 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = p.core;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-n.w * 0.65, 0);
      ctx.lineTo(0, len * 0.55);
      ctx.lineTo(n.w * 0.65, 0);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'tesla_wake') {
      // Crackling forked electric discharges
      const stepB = Math.floor(time * 24);
      ctx.strokeStyle = p.primary;
      ctx.lineWidth = 2.0 * scale;
      ctx.globalAlpha = 0.9;
      drawJaggedBolt(ctx, 0, 0, (hashStep(stepB) - 0.5) * n.w * 2, len * 1.25, 4, 4.2 * scale, stepB + item.seed);
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 1.3 * scale;
      drawJaggedBolt(ctx, -n.w * 0.5, 0, -n.w * 1.6, len * 0.9, 3, 3.2 * scale, stepB + item.seed + 19);
      drawJaggedBolt(ctx, n.w * 0.5, 0, n.w * 1.6, len * 0.9, 3, 3.2 * scale, stepB + item.seed + 43);
      ctx.strokeStyle = p.core;
      ctx.lineWidth = 0.9 * scale;
      drawJaggedBolt(ctx, 0, 0, 0, len * 0.95, 3, 2.2 * scale, stepB + item.seed + 7);
    } else if (style === 'chromatic_helix') {
      // Braided double/triple harmonic sine streams
      const strands = p.symmetry >= 12 ? 3 : 2;
      for (let s = 0; s < strands; s++) {
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const frac = i / 10;
          const py = frac * len * 1.3;
          const amp = n.w * (0.4 + frac * 1.15);
          const px = Math.sin(frac * 7.5 * p.twist - time * 14 + (s * Math.PI * 2) / strands) * amp;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = s === 0 ? p.primary : s === 1 ? p.secondary : p.core;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = (s === 2 ? 1.2 : 2.1) * scale;
        ctx.stroke();
      }
    } else if (style === 'rift_tear') {
      // Black-core void tear with glowing purple/teal accretion flare
      const grad = ctx.createLinearGradient(0, 0, 0, len * 1.25);
      grad.addColorStop(0, p.secondary);
      grad.addColorStop(0.5, p.primary);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(-n.w * 1.1, 0);
      ctx.lineTo(0, len * 1.25);
      ctx.lineTo(n.w * 1.1, 0);
      ctx.closePath();
      ctx.fill();

      // Inner dark singularity slit
      ctx.fillStyle = '#090612';
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 1.1 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 1 * scale);
      ctx.lineTo(n.w * 0.5, len * 0.45);
      ctx.lineTo(0, len * 0.92);
      ctx.lineTo(-n.w * 0.5, len * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (style === 'solar_wings') {
      // Radiant gilded relic wing feathers fanning out behind engine
      const grad = ctx.createLinearGradient(0, 0, 0, len * 1.35);
      grad.addColorStop(0, p.core);
      grad.addColorStop(0.42, p.primary);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(-n.w * 1.2, 0);
      ctx.lineTo(0, len * 1.35);
      ctx.lineTo(n.w * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      for (const side of [-1, 1]) {
        ctx.strokeStyle = p.primary;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.7 * scale;
        ctx.beginPath();
        ctx.moveTo(side * n.w * 0.5, 2 * scale);
        ctx.quadraticCurveTo(
          side * (n.w * 2.8 + Math.sin(time * 9) * scale),
          len * 0.42,
          side * n.w * 1.4,
          len * 1.05
        );
        ctx.stroke();
      }
      // Drifting teal/gold relic diamond spark
      const df = (time * 2.6) % 1;
      const dy = 4 * scale + df * len;
      const ds = (2.8 * (1 - df) + 0.8) * scale;
      ctx.fillStyle = p.secondary;
      ctx.globalAlpha = 1 - df;
      ctx.beginPath();
      ctx.moveTo(0, dy - ds);
      ctx.lineTo(ds * 0.7, dy);
      ctx.lineTo(0, dy + ds);
      ctx.lineTo(-ds * 0.7, dy);
      ctx.closePath();
      ctx.fill();
    } else {
      // Classic crisp Ion Jet
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.primary;
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      ctx.moveTo(-n.w, 0);
      ctx.lineTo(0, len);
      ctx.lineTo(n.w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.core;
      ctx.beginPath();
      ctx.moveTo(-n.w * 0.46, 0);
      ctx.lineTo(0, len * 0.58);
      ctx.lineTo(n.w * 0.46, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Overburn / Battle-Scarred dark soot puffs coming off exhaust nozzle
    if (p.overburn || p.sputter > 0.45) {
      for (let s = 0; s < 2; s++) {
        const f = ((s * 0.5 + time * 3.1) % 1);
        ctx.fillStyle = '#120f0d';
        ctx.globalAlpha = (1 - f) * (p.overburn ? 0.7 : p.sputter * 0.45);
        ctx.beginPath();
        ctx.arc(Math.sin(time * 12 + s * 3) * n.w * 0.6, f * len * 1.1, n.w * (0.5 + f * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the animated geometric Stillpoint Aura centered at (0, 0).
 * Used identically in live gameplay AND 60fps Armory / Inspect / Reveal previews!
 */
export function drawEffectStillpointAura(
  ctx: CanvasRenderingContext2D,
  item: EffectItem,
  radius: number,
  blend: number,
  time: number,
  colorOverride?: string
): void {
  if (blend <= 0.02) return;
  const style = getAuraStyle(item);
  const p = getEffectVisualParams(item);
  const outer = colorOverride ?? p.primary;
  const inner = p.secondary;
  const core = p.core;
  const lwScale = Math.max(1, radius / 46);

  // Subtle Battle-Scarred flicker / power-dropout when floatVal is high
  const stutter =
    p.sputter > 0.35 && hashStep(Math.floor(time * 18) + item.seed) < p.sputter * 0.22
      ? 0.52
      : 1.0;

  ctx.save();
  ctx.globalAlpha = Math.min(1, blend * 0.92 * p.intensity * stutter);

  // Soft radial field halo
  const bg = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * 1.2);
  bg.addColorStop(0, `${outer}00`);
  bg.addColorStop(0.74, `${outer}1c`);
  bg.addColorStop(1, `${outer}00`);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
  ctx.fill();

  if (style === 'sunburst') {
    // Radiating rotating golden prism corona shards + spokes
    const count = p.symmetry;
    ctx.save();
    ctx.rotate(time * 0.7 * p.twist);
    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.6 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      const pulse = 1 + 0.1 * Math.sin(time * 6 + i);
      const rIn = radius * 0.72;
      const rOut = radius * (1.12 + (i % 2 === 0 ? 0.12 : 0)) * pulse;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = i % 2 === 0 ? outer : inner;
      ctx.beginPath();
      ctx.moveTo(rIn, -3.5 * lwScale);
      ctx.lineTo(rOut, 0);
      ctx.lineTo(rIn, 3.5 * lwScale);
      ctx.lineTo(rIn - 4 * lwScale, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.2);
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.1 * lwScale;
    ctx.setLineDash([5 * lwScale, 7 * lwScale]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (style === 'sawtooth') {
    // Counter-rotating jagged crimson crescent vortex blades!
    const blades = Math.max(4, Math.min(8, Math.round(p.symmetry * 0.75)));
    ctx.save();
    ctx.rotate(time * 2.1 * p.twist);
    for (let i = 0; i < blades; i++) {
      const a = (i * Math.PI * 2) / blades;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = outer;
      ctx.strokeStyle = inner;
      ctx.lineWidth = 1.1 * lwScale;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.02, -0.35, 0.25);
      ctx.lineTo(radius * 1.16, 0.42);
      ctx.arc(0, 0, radius * 0.84, 0.3, -0.35, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.6);
    ctx.strokeStyle = inner;
    ctx.lineWidth = 1.5 * lwScale;
    ctx.setLineDash([14 * lwScale, 9 * lwScale]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (style === 'tesla_cage') {
    // Live crackling electric polygon cage with jagged arcs between vertices!
    const verts = Math.max(5, Math.min(8, p.symmetry));
    const stepB = Math.floor(time * 20);
    const pts: Array<[number, number]> = [];
    const rot = time * 0.65 * p.twist;
    for (let i = 0; i < verts; i++) {
      const a = rot + (i * Math.PI * 2) / verts;
      pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    for (let i = 0; i < verts; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % verts];
      if (p.sputter > 0.45 && hashStep(stepB + i * 11) < p.sputter * 0.25) continue;
      ctx.strokeStyle = outer;
      ctx.lineWidth = 2.1 * lwScale;
      drawJaggedBolt(ctx, a[0], a[1], b[0], b[1], 4, 5.5 * lwScale, stepB + i * 29 + item.seed);
      ctx.strokeStyle = core;
      ctx.lineWidth = 0.9 * lwScale;
      drawJaggedBolt(ctx, a[0], a[1], b[0], b[1], 4, 2.8 * lwScale, stepB + i * 29 + item.seed + 3);

      // Node spark dot
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(a[0], a[1], 2.6 * lwScale, 0, Math.PI * 2);
      ctx.fill();
    }
    // Occasional diagonal discharge arc
    const diagIdx = stepB % verts;
    const oppIdx = (diagIdx + Math.floor(verts / 2)) % verts;
    ctx.strokeStyle = inner;
    ctx.globalAlpha *= 0.6;
    ctx.lineWidth = 1.2 * lwScale;
    drawJaggedBolt(
      ctx,
      pts[diagIdx][0] * 0.92,
      pts[diagIdx][1] * 0.92,
      pts[oppIdx][0] * 0.92,
      pts[oppIdx][1] * 0.92,
      5,
      8 * lwScale,
      stepB * 13 + item.seed
    );
  } else if (style === 'mandala') {
    // Interlocking counter-rotating geometric star-polygon sacred lattice!
    const n = p.symmetry;
    const drawStarPoly = (rad: number, rot: number, stroke: string, width: number, step: number) => {
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a1 = (i * Math.PI * 2) / n;
        const a2 = ((i + step) * Math.PI * 2) / n;
        ctx.moveTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
        ctx.lineTo(Math.cos(a2) * rad, Math.sin(a2) * rad);
      }
      ctx.stroke();
      ctx.restore();
    };

    drawStarPoly(radius * 1.04, time * 0.55 * p.twist, outer, 1.4 * lwScale, 2);
    drawStarPoly(radius * 0.86, -time * 0.72 * p.twist, inner, 1.2 * lwScale, n >= 8 ? 3 : 2);

    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.3 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.04, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting vertex diamonds
    ctx.save();
    ctx.rotate(time * 0.55 * p.twist);
    ctx.fillStyle = core;
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 1.04, Math.sin(a) * radius * 1.04, 2.2 * lwScale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (style === 'event_horizon') {
    // Warping dark accretion spiral arms + orbiting void shards!
    ctx.save();
    ctx.rotate(-time * 1.8 * p.twist);
    const arms = 3;
    for (let arm = 0; arm < arms; arm++) {
      const baseA = (arm * Math.PI * 2) / arms;
      ctx.strokeStyle = arm === 0 ? outer : inner;
      ctx.lineWidth = 2.0 * lwScale;
      ctx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const f = s / 18;
        const a = baseA + f * 2.15;
        const r = radius * (0.58 + f * 0.55);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Dark lensing rim ring
    ctx.strokeStyle = '#0a0712';
    ctx.lineWidth = 4.2 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.4 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting monolith shards
    const shards = Math.min(8, p.symmetry);
    for (let i = 0; i < shards; i++) {
      const a = time * 1.4 + (i * Math.PI * 2) / shards;
      const r = radius * (1.02 + 0.08 * Math.sin(time * 4 + i));
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 === 0 ? inner : outer;
      ctx.fillRect(-3.2 * lwScale, -1.6 * lwScale, 6.4 * lwScale, 3.2 * lwScale);
      ctx.restore();
    }
  } else if (style === 'prism_array') {
    // Rotating faceted diamond mirror shards + refracting inner ring!
    const shards = Math.max(6, Math.min(12, p.symmetry));
    ctx.save();
    ctx.rotate(time * 0.9 * p.twist);
    for (let i = 0; i < shards; i++) {
      const a = (i * Math.PI * 2) / shards;
      const pulse = 1 + 0.07 * Math.sin(time * 5 + i * 1.4);
      const r = radius * 0.96 * pulse;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(r, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i % 2 === 0 ? outer : inner;
      ctx.strokeStyle = core;
      ctx.lineWidth = 1.1 * lwScale;
      const sz = 4.8 * lwScale;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 1.35);
      ctx.lineTo(sz * 0.8, 0);
      ctx.lineTo(0, sz * 1.35);
      ctx.lineTo(-sz * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.1);
    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.4 * lwScale;
    ctx.beginPath();
    for (let i = 0; i <= shards; i++) {
      const a = (i * Math.PI * 2) / shards;
      const x = Math.cos(a) * radius * 0.74;
      const y = Math.sin(a) * radius * 0.74;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  } else if (style === 'clockwork') {
    // Relic ★ Monolith Clockwork: dual interlocking golden gear rings + sweeping celestial hands!
    const teeth = p.symmetry >= 12 ? 16 : 12;
    ctx.save();
    ctx.rotate(time * 0.55 * p.twist);
    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.8 * lwScale;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i * Math.PI) / teeth;
      const r = i % 2 === 0 ? radius * 1.08 : radius * 0.95;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Inner counter-rotating teal filigree ring + Roman tick spokes
    ctx.save();
    ctx.rotate(-time * 0.85);
    ctx.strokeStyle = inner;
    ctx.lineWidth = 1.3 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const len = i % 3 === 0 ? 0.16 : 0.08;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (0.78 - len), Math.sin(a) * radius * (0.78 - len));
      ctx.lineTo(Math.cos(a) * radius * 0.78, Math.sin(a) * radius * 0.78);
      ctx.stroke();
    }
    ctx.restore();

    // Sweeping celestial clock hands!
    const drawHand = (ang: number, lenFrac: number, col: string, w: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w * lwScale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * radius * lenFrac, Math.sin(ang) * radius * lenFrac);
      ctx.stroke();
    };
    drawHand(time * 1.6 - Math.PI / 2, 0.92, core, 1.5);
    drawHand(time * 0.35 - Math.PI / 2, 0.65, outer, 2.2);
  } else {
    // Classic Relic Astrolabe with vernier degree ticks & counter-rotating dual rings
    ctx.save();
    ctx.rotate(-time * 0.85 * p.twist);
    ctx.strokeStyle = outer;
    ctx.lineWidth = 1.6 * lwScale;
    ctx.setLineDash(p.sputter > 0.45 ? [8 * lwScale, 12 * lwScale, 3 * lwScale, 11 * lwScale] : [14 * lwScale, 8 * lwScale, 3 * lwScale, 8 * lwScale]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const ticks = Math.max(4, Math.min(12, p.symmetry));
    for (let i = 0; i < ticks; i++) {
      const a = (i * Math.PI * 2) / ticks;
      const major = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (major ? 0.84 : 0.92), Math.sin(a) * radius * (major ? 0.84 : 0.92));
      ctx.lineTo(Math.cos(a) * radius * (major ? 1.14 : 1.06), Math.sin(a) * radius * (major ? 1.14 : 1.06));
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(time * 0.55);
    ctx.strokeStyle = inner;
    ctx.globalAlpha *= 0.65;
    ctx.lineWidth = 1.2 * lwScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Overburn charred dark embers orbiting edge
  if (p.overburn) {
    ctx.fillStyle = '#0d0a08';
    ctx.strokeStyle = '#d95a2b';
    ctx.lineWidth = 1 * lwScale;
    for (let i = 0; i < 6; i++) {
      const a = time * 1.1 + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98, 2.8 * lwScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders a crisp miniature swatch thumbnail for an EffectItem (for Armory grid tiles & crate reel!).
 */
export function drawEffectThumbnail(
  cv: HTMLCanvasElement,
  item: EffectItem,
  time = 1.4
): void {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const W = cv.width;
  const H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  if (item.slot === 'aura') {
    ctx.translate(W * 0.5, H * 0.5);
    drawEffectStillpointAura(ctx, item, Math.min(W, H) * 0.36, 1, time);
    const p = getEffectVisualParams(item);
    ctx.fillStyle = '#ffffff';
    const d = Math.min(W, H) * 0.075;
    ctx.beginPath();
    ctx.moveTo(0, -d);
    ctx.lineTo(d, 0);
    ctx.lineTo(0, d);
    ctx.lineTo(-d, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, d * 1.55, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Exhaust plume flowing upward-to-downward across the tile
    ctx.translate(W * 0.5, H * 0.16);
    const scale = Math.min(W, H) / 48;
    drawEffectThrusterPlume(ctx, 'vesper', item, time, scale * 0.72);
    // Tiny silhouette nozzle cap at top
    ctx.fillStyle = '#5a5c60';
    ctx.fillRect(-5 * scale * 0.7, 10 * scale * 0.7, 10 * scale * 0.7, 4 * scale * 0.7);
  }

  ctx.restore();
}
