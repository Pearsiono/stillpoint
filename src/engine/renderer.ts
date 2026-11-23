import { VESSELS } from '../data/vessels';
import {
  BossEnclosure,
  Enemy,
  EnemyBullet,
  HazardZone,
  InputSnapshot,
  LaserBeam,
  ParryWave,
  Pickup,
  PlayerBullet,
  PlayerState,
  VesselId
} from '../types';
import { ParticleSystem } from './particles';
import { sprites } from './sprites';
import { getHaloBladesPositions, getPrismDronePositions } from './weapons';

export interface RenderState {
  player: PlayerState;
  vesselId: VesselId;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  hazards: HazardZone[];
  lasers: LaserBeam[];
  parryWaves: ParryWave[];
  pickups: Pickup[];
  enclosure: BossEnclosure;
  particles: ParticleSystem;
  input: InputSnapshot;
  cameraX: number;
  cameraY: number;
  shakeX: number;
  shakeY: number;
  realTime: number;
  elapsed: number;
  showTutorialHint: boolean;
  reduceFlash: boolean;
  menuMode: boolean;
}

const GRID_STEP = 54;

export class NeonRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 390;
  private height = 844;
  private dpr = 1;
  private worldScale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    sprites.init();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = Math.min(dpr, 2.5);
    // Keep gameplay scale consistent across iPhone SE, iPhone Pro Max, iPad & Desktop
    const scaleW = cssWidth / 390;
    const scaleH = cssHeight / 760;
    this.worldScale = Math.max(0.85, Math.min(1.45, Math.min(scaleW, scaleH)));
  }

  getWorldScale(): number {
    return this.worldScale;
  }

  render(state: RenderState): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const blend = state.player.stillpointBlend;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 1. Deep Obsidian Void Backdrop
    ctx.fillStyle = blend > 0.05 ? '#040711' : '#05060b';
    ctx.fillRect(0, 0, w, h);

    // Subtle radial depth glow in screen space
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.46, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    if (state.enclosure.active) {
      bgGrad.addColorStop(0, 'rgba(65, 14, 46, 0.34)');
      bgGrad.addColorStop(1, 'rgba(5, 6, 11, 0)');
    } else if (blend > 0.05) {
      bgGrad.addColorStop(0, `rgba(10, 46, 78, ${0.22 + blend * 0.25})`);
      bgGrad.addColorStop(1, 'rgba(4, 7, 17, 0)');
    } else {
      bgGrad.addColorStop(0, 'rgba(14, 28, 54, 0.28)');
      bgGrad.addColorStop(1, 'rgba(5, 6, 11, 0)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Enter World Coordinate Space
    ctx.save();
    ctx.translate(w * 0.5 + state.shakeX, h * 0.5 + state.shakeY);
    ctx.scale(this.worldScale, this.worldScale);
    ctx.translate(-state.cameraX, -state.cameraY);

    const viewHalfW = w / (2 * this.worldScale) + 80;
    const viewHalfH = h / (2 * this.worldScale) + 80;

    // 2. Reactive Shockwave-Warped Cyber Grid
    this.drawWarpedGrid(ctx, state, viewHalfW, viewHalfH);

    // 3. Parallax Void Motes
    this.drawVoidMotes(ctx, state, viewHalfW, viewHalfH);

    // 4. Neon Boss Containment Enclosure
    if (state.enclosure.active || state.enclosure.warningTimer > 0) {
      this.drawBossEnclosure(ctx, state.enclosure, state.realTime);
    }

    // 5. Hazard Zones (Void Mortar Craters / Singularity Wells / Rifts)
    this.drawHazards(ctx, state.hazards, state.realTime);

    // 6. Pickups
    this.drawPickups(ctx, state.pickups, state.realTime);

    if (!state.menuMode) {
      // 7. Player Trail & Diegetic Rings
      this.drawPlayer(ctx, state);

      // 8. Halo Sawblades & Prism Drones
      this.drawOrbitalWeapons(ctx, state);
    }

    // 9. Enemies & Bosses
    this.drawEnemies(ctx, state.enemies, state.realTime);

    // 10. Lasers & Enemy Sniper Telegraphs
    this.drawLasers(ctx, state.lasers, state.enemies, state.realTime);

    // 11. Arc Lightning Flashes
    this.drawArcs(ctx, state.particles);

    // 12. Additive Glow Layer: Bullets, Parry Waves & Sparks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.drawPlayerBullets(ctx, state.playerBullets, state.realTime);
    this.drawEnemyBullets(ctx, state.enemyBullets, state.realTime);
    this.drawParryWaves(ctx, state.parryWaves);
    this.drawParticles(ctx, state.particles);
    ctx.restore();

    // 13. Floating Combat Callouts (PARRY!, GRAZE, PHASE)
    this.drawCallouts(ctx, state.particles);

    // 14. Diegetic Onboarding Hint beneath ship on first seconds of run
    if (!state.menuMode && state.showTutorialHint) {
      this.drawTutorialHint(ctx, state);
    }

    ctx.restore(); // Exit World Space

    // 15. Screen-Space Stillpoint Chromatic Vignette & Scan Pulse
    if (blend > 0.02 && !state.menuMode) {
      this.drawStillpointOverlay(ctx, w, h, blend, state.realTime, state.reduceFlash);
    }

    // 16. Floating One-Thumb Joystick Visualization (Touch / Mouse drag)
    if (!state.menuMode && state.input.joystickActive) {
      this.drawFloatingJoystick(ctx, state.input, VESSELS[state.vesselId].accent);
    }

    ctx.restore();
  }

  private drawWarpedGrid(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    halfW: number,
    halfH: number
  ): void {
    const { cameraX, cameraY, particles, player, enclosure } = state;
    const minX = Math.floor((cameraX - halfW) / GRID_STEP) * GRID_STEP;
    const maxX = Math.ceil((cameraX + halfW) / GRID_STEP) * GRID_STEP;
    const minY = Math.floor((cameraY - halfH) / GRID_STEP) * GRID_STEP;
    const maxY = Math.ceil((cameraY + halfH) / GRID_STEP) * GRID_STEP;

    const ripples = particles.ripples;
    const hasRipples = ripples.length > 0;
    const blend = player.stillpointBlend;

    const displace = (gx: number, gy: number): [number, number] => {
      if (!hasRipples) return [gx, gy];
      let ox = 0;
      let oy = 0;
      for (const r of ripples) {
        const dx = gx - r.x;
        const dy = gy - r.y;
        const dist = Math.hypot(dx, dy) || 1;
        const delta = Math.abs(dist - r.radius);
        if (delta < 48) {
          const wave = Math.cos((delta / 48) * Math.PI * 0.5) * r.strength * (1 - r.age / r.duration);
          ox += (dx / dist) * wave;
          oy += (dy / dist) * wave;
        }
      }
      return [gx + ox, gy + oy];
    };

    ctx.lineWidth = 1;
    ctx.strokeStyle = enclosure.active
      ? 'rgba(255, 62, 128, 0.11)'
      : blend > 0.1
        ? `rgba(42, 224, 255, ${0.09 + blend * 0.12})`
        : 'rgba(60, 125, 210, 0.095)';

    ctx.beginPath();
    // Vertical lines
    for (let gx = minX; gx <= maxX; gx += GRID_STEP) {
      let first = true;
      for (let gy = minY; gy <= maxY; gy += GRID_STEP) {
        const [px, py] = displace(gx, gy);
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
    }
    // Horizontal lines
    for (let gy = minY; gy <= maxY; gy += GRID_STEP) {
      let first = true;
      for (let gx = minX; gx <= maxX; gx += GRID_STEP) {
        const [px, py] = displace(gx, gy);
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
    }
    ctx.stroke();

    // Subtle intersection dots for depth
    ctx.fillStyle = blend > 0.2 ? 'rgba(80, 240, 255, 0.24)' : 'rgba(90, 165, 255, 0.16)';
    for (let gx = minX; gx <= maxX; gx += GRID_STEP * 2) {
      for (let gy = minY; gy <= maxY; gy += GRID_STEP * 2) {
        const [px, py] = displace(gx, gy);
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
  }

  private drawVoidMotes(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    halfW: number,
    halfH: number
  ): void {
    const cell = 140;
    const minX = Math.floor((state.cameraX - halfW) / cell);
    const maxX = Math.ceil((state.cameraX + halfW) / cell);
    const minY = Math.floor((state.cameraY - halfH) / cell);
    const maxY = Math.ceil((state.cameraY + halfH) / cell);

    ctx.fillStyle = state.player.stillpointBlend > 0.25 ? 'rgba(130, 245, 255, 0.22)' : 'rgba(130, 180, 255, 0.16)';
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const h1 = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
        const h2 = Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453;
        const fx = h1 - Math.floor(h1);
        const fy = h2 - Math.floor(h2);
        const mx = (cx + fx) * cell + Math.sin(state.realTime * 0.7 + cx) * 6;
        const my = (cy + fy) * cell + Math.cos(state.realTime * 0.6 + cy) * 6;
        const r = 1 + (fx > 0.7 ? 1.2 : 0.4);
        ctx.fillRect(mx, my, r, r);
      }
    }
  }

  private drawBossEnclosure(
    ctx: CanvasRenderingContext2D,
    enc: BossEnclosure,
    realTime: number
  ): void {
    const x = enc.cx - enc.halfW;
    const y = enc.cy - enc.halfH;
    const w = enc.halfW * 2;
    const h = enc.halfH * 2;
    const pulse = 0.65 + 0.35 * Math.sin(realTime * 7);

    ctx.save();
    // Darken slightly outside the enclosure
    ctx.strokeStyle = enc.warningTimer > 0
      ? `rgba(255, 190, 11, ${0.4 + pulse * 0.5})`
      : `rgba(255, 51, 118, ${0.55 + pulse * 0.35})`;
    ctx.lineWidth = enc.warningTimer > 0 ? 2.5 : 3.5;

    if (enc.warningTimer > 0) {
      ctx.setLineDash([14, 10]);
    }
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Outer glow border
    ctx.strokeStyle = enc.warningTimer > 0
      ? 'rgba(255, 190, 11, 0.18)'
      : 'rgba(255, 51, 118, 0.22)';
    ctx.lineWidth = 11;
    ctx.strokeRect(x, y, w, h);

    // Corner brackets
    const corner = 24;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    const corners: Array<[number, number, number, number]> = [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1]
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * corner, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * corner);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHazards(ctx: CanvasRenderingContext2D, hazards: HazardZone[], realTime: number): void {
    for (const h of hazards) {
      const fade = Math.min(1, (h.maxAge - h.age) * 2);
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.globalAlpha = fade * (h.kind === 'singularity' ? 0.92 : 0.72);

      // Soft inner glow
      const glow = sprites.get(h.kind === 'rift' ? 'glow_cyan' : 'glow_magenta');
      ctx.drawImage(glow, -h.radius * 1.15, -h.radius * 1.15, h.radius * 2.3, h.radius * 2.3);

      // Ring outline
      ctx.strokeStyle = h.color;
      ctx.lineWidth = h.kind === 'singularity' ? 2.8 : 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Swirling gravity arcs for singularities
      if (h.kind === 'singularity' || h.kind === 'rift') {
        const spin = realTime * (h.kind === 'singularity' ? 6 : 3.5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const a = spin + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(0, 0, h.radius * 0.56, a, a + 0.9);
          ctx.stroke();
        }
        ctx.fillStyle = '#070512';
        ctx.beginPath();
        ctx.arc(0, 0, h.radius * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], realTime: number): void {
    for (const p of pickups) {
      const bob = Math.sin(realTime * 6 + p.id) * 1.8;
      let key: Parameters<typeof sprites.get>[0] = 'xp_small';
      let size = 16;
      if (p.kind === 'xp_mid') {
        key = 'xp_mid';
        size = 22;
      } else if (p.kind === 'xp_large') {
        key = 'xp_large';
        size = 28;
      } else if (p.kind === 'heal') {
        key = 'pickup_heal';
        size = 28;
      } else if (p.kind === 'shard') {
        key = 'pickup_shard';
        size = 28;
      } else if (p.kind === 'magnet') {
        key = 'pickup_magnet';
        size = 30;
      }
      const img = sprites.get(key);
      ctx.drawImage(img, p.x - size / 2, p.y - size / 2 + bob, size, size);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { player, vesselId, realTime } = state;
    const vessel = VESSELS[vesselId];
    const blend = player.stillpointBlend;
    const chargeRatio = Math.max(0, Math.min(1, player.kineticCharge / player.maxKineticCharge));
    const parryReady = player.parryCooldown <= 0 && player.kineticCharge >= 18;

    // 1. Afterimage Trail
    for (const t of player.trail) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.globalAlpha = t.alpha * 0.35;
      ctx.fillStyle = vessel.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 7 * t.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // 2. Graze Halo (Subtle dotted ring around player)
    ctx.save();
    ctx.rotate(realTime * (0.4 + blend * 1.4));
    ctx.strokeStyle =
      player.grazeCombo > 0
        ? `rgba(110, 245, 255, ${0.28 + Math.min(0.4, player.grazeCombo * 0.04)})`
        : 'rgba(110, 210, 255, 0.13)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, player.grazeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Diegetic Kinetic Charge Ring around vessel!
    const ringR = 25 + blend * 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (chargeRatio > 0.01) {
      ctx.strokeStyle = blend > 0.25
        ? '#ffffff'
        : parryReady
          ? vessel.accent
          : 'rgba(130, 175, 255, 0.65)';
      ctx.lineWidth = parryReady ? 3.2 : 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio);
      ctx.stroke();
    }

    // Energy Shield outer sheen if active
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(123, 247, 255, 0.62)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Vessel Glow Aura
    const aura = sprites.get(vesselId === 'aegis' ? 'glow_emerald' : vesselId === 'phantom' ? 'glow_magenta' : 'glow_cyan');
    const auraSize = 68 + blend * 22;
    ctx.globalAlpha = 0.55 + blend * 0.35;
    ctx.drawImage(aura, -auraSize / 2, -auraSize / 2, auraSize, auraSize);
    ctx.globalAlpha = 1;

    // 5. Vessel Geometric Hull (dims gracefully in Stillpoint so pinpoint core stands out)
    ctx.save();
    ctx.rotate(player.facingAngle);
    const invulnBlink = player.invulnTimer > 0 && Math.floor(realTime * 22) % 2 === 0;
    ctx.globalAlpha = invulnBlink ? 0.35 : 1 - blend * 0.52;
    ctx.fillStyle = player.hitFlash > 0 ? '#ffffff' : vessel.accent;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    if (vesselId === 'vesper') {
      // Sleek interceptor delta
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 11);
    } else if (vesselId === 'aegis') {
      // Armored hex bastion
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const r = i === 0 ? 15 : 12;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      // Razor needle wraith
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-12, 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. Pinpoint Core Hitbox (blazes crisply in Stillpoint!)
    const coreR = blend > 0.2 ? 4.5 : 3.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -coreR * 1.45);
    ctx.lineTo(coreR * 1.45, 0);
    ctx.lineTo(0, coreR * 1.45);
    ctx.lineTo(-coreR * 1.45, 0);
    ctx.closePath();
    ctx.fill();

    if (blend > 0.15) {
      ctx.strokeStyle = '#22e6ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawOrbitalWeapons(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const blades = getHaloBladesPositions(state.player, state.realTime);
    for (const b of blades) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle * 3.5);
      const glow = sprites.get(b.evolved ? 'glow_gold' : 'glow_emerald');
      ctx.drawImage(glow, -b.radius * 1.8, -b.radius * 1.8, b.radius * 3.6, b.radius * 3.6);

      ctx.strokeStyle = b.evolved ? '#ffe680' : '#4effb4';
      ctx.lineWidth = b.isStillpoint ? 3.2 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner razor cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-b.radius * 0.7, 0);
      ctx.lineTo(b.radius * 0.7, 0);
      ctx.moveTo(0, -b.radius * 0.7);
      ctx.lineTo(0, b.radius * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    const drones = getPrismDronePositions(state.player, state.realTime);
    for (const d of drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle + Math.PI / 2);
      ctx.fillStyle = d.evolved ? '#ffe680' : '#7bf7ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 6);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], realTime: number): void {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      ctx.save();
      ctx.translate(e.x, e.y);

      // Soft neon underglow
      const glowKey = e.isBoss
        ? e.kind === 'boss_archon'
          ? 'glow_gold'
          : e.kind === 'boss_seraph'
            ? 'glow_magenta'
            : 'glow_coral'
        : 'glow_coral';
      const glowR = e.radius * (e.isBoss ? 2.8 : e.isElite ? 2.4 : 2.0);
      ctx.globalAlpha = e.isBoss ? 0.78 : e.isElite ? 0.6 : 0.42;
      ctx.drawImage(sprites.get(glowKey), -glowR, -glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;

      if (e.isBoss) {
        this.drawBossGeometry(ctx, e, realTime);
      } else {
        this.drawRegularEnemyGeometry(ctx, e);
      }

      // Elite crown ring & mini HP bar
      if (e.isElite && !e.isBoss) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        const bw = e.radius * 2.2;
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-bw / 2, e.radius + 8, bw, 3.5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-bw / 2, e.radius + 8, bw * ratio, 3.5);
      }

      ctx.restore();
    }
  }

  private drawRegularEnemyGeometry(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.rotate(e.angle);
    const fill = e.hitFlash > 0 ? '#ffffff' : e.accent;
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = e.isElite ? 2 : 1.3;

    const r = e.radius;
    ctx.beginPath();
    switch (e.kind) {
      case 'swarmer':
      case 'dart':
        ctx.moveTo(r * 1.15, 0);
        ctx.lineTo(-r * 0.85, -r * 0.78);
        ctx.lineTo(-r * 0.35, 0);
        ctx.lineTo(-r * 0.85, r * 0.78);
        break;
      case 'splitter':
        ctx.rect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64);
        break;
      case 'sniper':
        ctx.moveTo(r * 1.35, 0);
        ctx.lineTo(0, -r * 0.72);
        ctx.lineTo(-r * 1.1, 0);
        ctx.lineTo(0, r * 0.72);
        break;
      case 'ring_caster':
      case 'spinner': {
        const sides = e.kind === 'ring_caster' ? 8 : 4;
        for (let i = 0; i < sides * 2; i++) {
          const a = (i * Math.PI) / sides;
          const rad = i % 2 === 0 ? r * 1.1 : r * 0.62;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        break;
      }
      default: {
        // Hexagon (turret & bulwark)
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        break;
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner dark geometric cut for crisp contrast
    ctx.fillStyle = '#090914';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBossGeometry(ctx: CanvasRenderingContext2D, boss: Enemy, realTime: number): void {
    const r = boss.radius;
    const fill = boss.hitFlash > 0 ? '#ffffff' : boss.accent;

    // Outer rotating sacred geometry ring
    ctx.save();
    ctx.rotate(boss.angle);
    ctx.strokeStyle = fill;
    ctx.lineWidth = 3;
    const pts = boss.kind === 'boss_archon' ? 8 : boss.kind === 'boss_seraph' ? 6 : 5;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = (i * Math.PI) / pts;
      const rad = i % 2 === 0 ? r * 1.18 : r * 0.76;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 8, 28, 0.85)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Counter-rotating inner core
    ctx.save();
    ctx.rotate(-boss.angle * 1.6);
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const px = Math.cos(a) * r * 0.56;
      const py = Math.sin(a) * r * 0.56;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Pulsing white nucleus
    const pulse = 1 + Math.sin(realTime * 10) * 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLasers(
    ctx: CanvasRenderingContext2D,
    lasers: LaserBeam[],
    enemies: Enemy[],
    realTime: number
  ): void {
    // Draw sniper telegraph lines
    for (const e of enemies) {
      if (e.telegraphTimer !== undefined && e.telegraphTimer > 0 && e.telegraphAngle !== undefined) {
        const ang = e.telegraphAngle;
        const urgency = 1 - e.telegraphTimer / 0.95;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 46, 99, ${0.35 + urgency * 0.55})`;
        ctx.lineWidth = 1.5 + urgency * 2.5;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ang) * 520, e.y + Math.sin(ang) * 520);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Draw active beams & boss telegraph beams
    for (const l of lasers) {
      const ratio = Math.max(0, l.life / l.maxLife);
      ctx.save();
      if (l.isTelegraph) {
        const urgency = 1 - ratio;
        const flash = 0.5 + 0.5 * Math.sin(realTime * 36);
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = 0.25 + urgency * 0.6 * flash;
        ctx.lineWidth = 2 + urgency * 3;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ratio;
        ctx.lineCap = 'round';
        // Outer glow
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.width * (0.7 + ratio * 0.6);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        // Hot white core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, l.width * 0.38 * ratio);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawArcs(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    for (const a of particles.arcs) {
      const alpha = Math.max(0, a.life / a.maxLife);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.width * 2;
      ctx.beginPath();
      a.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, a.width * 0.7);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPlayerBullets(
    ctx: CanvasRenderingContext2D,
    bullets: PlayerBullet[],
    realTime: number
  ): void {
    for (const b of bullets) {
      if (b.kind === 'dagger_planted' || b.kind === 'dagger_homing') {
        const ang =
          b.kind === 'dagger_homing'
            ? Math.atan2(b.vy, b.vx)
            : realTime * 2.5 + b.id;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.evolved ? '#ffd166' : '#ff66e5';
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(-6, -4.5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-2, -2);
        ctx.lineTo(-2, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      const key =
        b.kind === 'parry_shard'
          ? 'bullet_shard'
          : b.kind === 'prism_bolt'
            ? 'bullet_prism'
            : b.kind === 'mortar_shell'
              ? 'bullet_violet'
              : 'bullet_cyan';
      const img = sprites.get(key);
      const size = b.radius * (b.kind === 'parry_shard' ? 4.4 : 3.8);
      ctx.drawImage(img, b.x - size / 2, b.y - size / 2, size, size);
    }
  }

  private drawEnemyBullets(
    ctx: CanvasRenderingContext2D,
    bullets: EnemyBullet[],
    realTime: number
  ): void {
    for (const b of bullets) {
      const key = b.isParryBonus
        ? 'bullet_parry'
        : b.kind === 'diamond'
          ? 'bullet_amber'
          : b.kind === 'needle'
            ? 'bullet_crimson'
            : 'bullet_coral';
      const img = sprites.get(key);
      const pulse = b.isParryBonus ? 1 + Math.sin(realTime * 14 + b.id) * 0.14 : 1;
      const size = b.radius * (b.isParryBonus ? 4.8 : 4.2) * pulse;
      ctx.drawImage(img, b.x - size / 2, b.y - size / 2, size, size);
    }
  }

  private drawParryWaves(ctx: CanvasRenderingContext2D, waves: ParryWave[]): void {
    for (const w of waves) {
      const t = Math.min(1, w.age / w.duration);
      const alpha = (1 - t) * 0.95;

      // Chromatic cyan-magenta split ring
      ctx.strokeStyle = '#ff4df0';
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 4 * (1 - t) + 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Math.max(4, w.radius - 4), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = w.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 7 * (1 - t) + 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    for (const p of particles.particles) {
      ctx.globalAlpha = p.alpha;
      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2 * p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, p.size * 0.7);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawCallouts(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of particles.texts) {
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.6);
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(13 * f.scale)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`;
      ctx.fillStyle = '#05060b';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  private drawTutorialHint(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pulse = 0.65 + 0.35 * Math.sin(state.realTime * 4.5);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillStyle = '#e6f9ff';
    const msg = state.input.hasInteracted
      ? 'LIFT THUMB (OR HOLD SPACE) → STILLPOINT PARRY'
      : 'DRAG TO WEAVE · LIFT TO SLOW TIME & PARRY';
    ctx.fillText(msg, state.player.x, state.player.y + 56);
    ctx.restore();
  }

  private drawStillpointOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    blend: number,
    realTime: number,
    reduceFlash: boolean
  ): void {
    // Crisp cyan-indigo focus vignette around edges
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.24, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 170, 235, ${blend * (reduceFlash ? 0.14 : 0.26)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle glowing frame inset
    ctx.strokeStyle = `rgba(34, 230, 255, ${blend * 0.45})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Delicate scanline shimmer
    if (!reduceFlash) {
      const scanY = ((realTime * 160) % (h + 80)) - 40;
      ctx.fillStyle = `rgba(34, 230, 255, ${blend * 0.08})`;
      ctx.fillRect(0, scanY, w, 2);
    }
  }

  private drawFloatingJoystick(
    ctx: CanvasRenderingContext2D,
    input: InputSnapshot,
    accent: string
  ): void {
    const ox = input.joyOriginX;
    const oy = input.joyOriginY;
    const dx = input.joyCurrentX - ox;
    const dy = input.joyCurrentY - oy;
    const dist = Math.hypot(dx, dy);
    const maxR = 52;
    const clamped = Math.min(maxR, dist);
    const kx = dist > 0.1 ? ox + (dx / dist) * clamped : ox;
    const ky = dist > 0.1 ? oy + (dy / dist) * clamped : oy;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent + '88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(kx, ky);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(kx, ky, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
