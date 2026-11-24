import { SECTORS } from '../data/sectors';
import { resolveSkinColors, SKINS } from '../data/skins';
import { PACTS } from '../data/upgrades';
import {
  BlinkDecoy,
  BossEnclosure,
  CoatingItem,
  CoreId,
  EffectItem,
  Enemy,
  EnemyBullet,
  HazardZone,
  InputSnapshot,
  LaserBeam,
  MeteorStrike,
  PhaseEcho,
  Pickup,
  PlayerBullet,
  PlayerState,
  RailPylon,
  SectorId,
  SkinDef,
  SkinId,
  VesselId,
  WakeMine,
  WorldNode
} from '../types';
import {
  drawEffectStillpointAura,
  drawEffectThrusterPlume,
  drawEffectTrailWake
} from './effectRenderer';
import { ParticleSystem } from './particles';
import { RuinPropKey, sprites } from './sprites';
import {
  findNearestEnemy,
  getGravityFlailPositions,
  getHaloBladesPositions,
  getPrismDronePositions
} from './weapons';

export interface RenderState {
  player: PlayerState;
  vesselId: VesselId;
  coreId: CoreId;
  skinId: SkinId;
  coating: CoatingItem;
  trailItem: EffectItem;
  auraItem: EffectItem;
  trailColor: string;
  trailCoreColor: string;
  accentColor: string;
  auraOuter: string;
  auraInner: string;
  sectorId: SectorId;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  pylons: RailPylon[];
  hazards: HazardZone[];
  nodes: WorldNode[];
  decoys: BlinkDecoy[];
  mines: WakeMine[];
  echoes: PhaseEcho[];
  meteors: MeteorStrike[];
  lasers: LaserBeam[];
  pickups: Pickup[];
  enclosure: BossEnclosure;
  particles: ParticleSystem;
  input: InputSnapshot;
  cameraX: number;
  cameraY: number;
  shakeX: number;
  shakeY: number;
  realTime: number;
  worldTime: number;
  elapsed: number;
  showHint: boolean;
  reduceFlash: boolean;
  menuMode: boolean;
  menuSheetOpen: boolean;
}

const TILE_SIZE = 512;
const RUIN_CELL = 440;
const RUIN_KEYS: RuinPropKey[] = ['slab', 'girder', 'gear', 'pillar', 'hazard_plate'];

export class WastelandRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 390;
  private height = 844;
  private dpr = 1;
  private worldScale = 1;
  private vignetteCache: { key: string; grad: CanvasGradient } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    sprites.init();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = Math.min(dpr, 2.5);
    const scaleW = cssWidth / 390;
    const scaleH = cssHeight / 760;
    this.worldScale = Math.max(0.86, Math.min(1.42, Math.min(scaleW, scaleH)));
  }

  getWorldScale(): number {
    return this.worldScale;
  }

  render(state: RenderState): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const blend = state.player.stillpointBlend;
    const sector = SECTORS[state.sectorId];
    const skin = resolveSkinColors(SKINS[state.skinId], state.realTime);

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 1. Base biome slate fill
    ctx.fillStyle = sector.bgBase;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5 + state.shakeX, h * 0.5 + state.shakeY);
    ctx.scale(this.worldScale, this.worldScale);
    ctx.translate(-state.cameraX, -state.cameraY);

    const viewHalfW = w / (2 * this.worldScale) + 120;
    const viewHalfH = h / (2 * this.worldScale) + 120;

    // 2. Seamless Wasteland Biome Floor Tiles & Grounded Ruins
    this.drawBiomeTerrain(ctx, state, viewHalfW, viewHalfH);
    this.drawRuinProps(ctx, state, viewHalfW, viewHalfH);

    // 3. Shockwave distortion ripples
    if (state.particles.ripples.length > 0) {
      this.drawShockwaveRipples(ctx, state);
    }

    // 4. Stillpoint Ash-Silence Ground Dimmer
    if (!state.menuMode && blend > 0.02) {
      ctx.fillStyle = `rgba(9, 10, 14, ${blend * 0.52})`;
      ctx.fillRect(
        state.cameraX - viewHalfW,
        state.cameraY - viewHalfH,
        viewHalfW * 2,
        viewHalfH * 2
      );
    }

    if (!state.menuMode) {
      this.drawWorldNodes(ctx, state.nodes, state.realTime);
      if (state.enclosure.active || state.enclosure.warningTimer > 0) {
        this.drawBossEnclosure(ctx, state.enclosure, state.realTime);
      }
      this.drawHazards(ctx, state.hazards, state.realTime);
      this.drawMeteorsAndDecoys(ctx, state);
      this.drawPylons(ctx, state.pylons, state.enemies, state.realTime);
      this.drawPickups(ctx, state.pickups, state.realTime);

      this.drawPlayer(ctx, state, skin);
      this.drawOrbitalWeapons(ctx, state);
      this.drawEnemies(ctx, state.enemies, state.realTime);
      if (state.player.missileLocks.length > 0) {
        this.drawMissileLockReticles(ctx, state);
      }
      this.drawLasers(ctx, state.lasers, state.enemies, state.realTime);
      this.drawArcs(ctx, state.particles);
      this.drawPlayerBullets(ctx, state.playerBullets, state.realTime);
      this.drawEnemyBullets(ctx, state.enemyBullets, state.realTime);
      this.drawParticles(ctx, state.particles);
      this.drawPlayerHealthBar(ctx, state);
      this.drawCallouts(ctx, state.particles);

      if (state.showHint) {
        this.drawMinimalHint(ctx, state);
      }
    }

    this.drawAtmosphericAsh(ctx, state, viewHalfW, viewHalfH);
    ctx.restore();

    this.drawScreenAtmosphere(ctx, w, h, state, skin);

    if (!state.menuMode) {
      this.drawOffscreenNodePips(ctx, w, h, state);
    }

    if (!state.menuMode && state.input.joystickActive) {
      this.drawFloatingJoystick(ctx, state.input, state.accentColor);
    }

    ctx.restore();
  }

  private drawBiomeTerrain(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    halfW: number,
    halfH: number
  ): void {
    const painted = sprites.getPaintedBiomeTile(state.sectorId);
    const tile = painted ?? sprites.getBiomeTile(state.sectorId);
    const step = painted ? TILE_SIZE : 256;
    const minX = Math.floor((state.cameraX - halfW) / step) * step;
    const maxX = Math.ceil((state.cameraX + halfW) / step) * step;
    const minY = Math.floor((state.cameraY - halfH) / step) * step;
    const maxY = Math.ceil((state.cameraY + halfH) / step) * step;

    for (let x = minX; x < maxX; x += step) {
      for (let y = minY; y < maxY; y += step) {
        ctx.drawImage(tile, x, y, step, step);
      }
    }
  }

  private drawRuinProps(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    halfW: number,
    halfH: number
  ): void {
    const minCx = Math.floor((state.cameraX - halfW) / RUIN_CELL);
    const maxCx = Math.ceil((state.cameraX + halfW) / RUIN_CELL);
    const minCy = Math.floor((state.cameraY - halfH) / RUIN_CELL);
    const maxCy = Math.ceil((state.cameraY + halfH) / RUIN_CELL);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const h1 = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
        const f1 = h1 - Math.floor(h1);
        if (f1 < 0.42) continue;

        const h2 = Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453;
        const f2 = h2 - Math.floor(h2);
        const h3 = Math.sin(cx * 419.2 + cy * 97.1) * 43758.5453;
        const f3 = h3 - Math.floor(h3);

        const px = (cx + 0.18 + f1 * 0.64) * RUIN_CELL;
        const py = (cy + 0.18 + f2 * 0.64) * RUIN_CELL;

        // Biome-matched painterly wreckage props!
        let paintedKey: 'slab' | 'gear' | 'grate' | 'monolith' = 'slab';
        if (state.sectorId === 'singularity') {
          paintedKey = f3 > 0.38 ? 'monolith' : 'gear';
        } else if (state.sectorId === 'furnace') {
          paintedKey = f3 > 0.4 ? 'grate' : 'gear';
        } else if (state.sectorId === 'helix') {
          paintedKey = f3 > 0.5 ? 'gear' : f3 > 0.25 ? 'slab' : 'grate';
        } else {
          paintedKey = f3 > 0.55 ? 'slab' : f3 > 0.28 ? 'grate' : 'gear';
        }

        const painted = sprites.getPaintedProp(paintedKey);
        const drawSz = 96 + f2 * 36;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((f1 - 0.5) * Math.PI * 2);
        if (painted) {
          ctx.globalAlpha = 0.78;
          ctx.drawImage(painted, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
        } else {
          const propKey: RuinPropKey = RUIN_KEYS[Math.floor(f3 * RUIN_KEYS.length)];
          const img = sprites.getRuinProp(propKey);
          ctx.globalAlpha = 0.65;
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }
        ctx.restore();
      }
    }
  }

  private drawShockwaveRipples(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const r of state.particles.ripples) {
      const t = r.age / r.duration;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.lineWidth = 2.5 * (1 - t) + 0.8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private drawWorldNodes(ctx: CanvasRenderingContext2D, nodes: WorldNode[], realTime: number): void {
    for (const n of nodes) {
      ctx.save();
      ctx.translate(n.x, n.y);

      if (n.kind === 'overclock_ring') {
        const pulse = 0.75 + 0.25 * Math.sin(realTime * 5);
        ctx.fillStyle = 'rgba(69, 232, 216, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
        ctx.fill();

        const padArt = sprites.getArt('deploy_overclock_pad');
        if (padArt) {
          ctx.save();
          ctx.rotate(realTime * 0.35);
          ctx.globalAlpha = 0.9;
          const sz = n.radius * 2.15;
          ctx.drawImage(padArt, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }

        ctx.strokeStyle = `rgba(110, 240, 200, ${0.4 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 7]);
        ctx.save();
        ctx.rotate(-realTime * 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, n.radius * 0.76, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(222, 255, 224, 0.92)';
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('2× FOCUS', 0, 4);
      } else if (n.kind === 'shrine') {
        const art = sprites.getNodeArt('shrine');
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(5, 10, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        if (art) {
          ctx.drawImage(art, -30, -30, 60, 60);
        } else {
          ctx.fillStyle = '#2d2820';
          ctx.strokeStyle = '#e5b34c';
          ctx.lineWidth = 2;
          ctx.fillRect(-16, -16, 32, 32);
          ctx.strokeRect(-16, -16, 32, 32);
        }

        const pct = Math.max(0, n.hp / n.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(-20, 32, 40, 4);
        ctx.fillStyle = '#e5b34c';
        ctx.fillRect(-20, 32, 40 * pct, 4);
      } else if (n.kind === 'pact_altar' && n.pactId) {
        const pact = PACTS[n.pactId];
        ctx.fillStyle = 'rgba(227, 75, 66, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pact.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (n.progress > 0.01) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, n.radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * n.progress);
          ctx.stroke();
        }

        const art = sprites.getNodeArt('pact_altar');
        if (art) {
          ctx.drawImage(art, -26, -26, 52, 52);
        } else {
          ctx.fillStyle = '#261417';
          ctx.strokeStyle = pact.accent;
          ctx.fillRect(-10, -14, 20, 28);
          ctx.strokeRect(-10, -14, 20, 28);
        }

        ctx.textAlign = 'center';
        ctx.font = '700 9px "Chakra Petch", sans-serif';
        ctx.fillStyle = pact.accent;
        ctx.fillText(pact.name, 0, -n.radius - 14);
        ctx.fillStyle = '#ebe2d2';
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.fillText(pact.trade, 0, -n.radius - 4);
      }
      ctx.restore();
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
    ctx.strokeStyle =
      enc.warningTimer > 0
        ? `rgba(229, 179, 76, ${0.45 + pulse * 0.45})`
        : `rgba(227, 75, 66, ${0.62 + pulse * 0.3})`;
    ctx.lineWidth = enc.warningTimer > 0 ? 2 : 3;
    if (enc.warningTimer > 0) ctx.setLineDash([12, 8]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    const cLen = 22;
    ctx.strokeStyle = '#ebe7dc';
    ctx.lineWidth = 2.5;
    for (const [cx, cy, sx, sy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * cLen, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * cLen);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHazards(ctx: CanvasRenderingContext2D, hazards: HazardZone[], realTime: number): void {
    for (const h of hazards) {
      if (h.kind === 'nova_wave' || h.kind === 'frost_burst') {
        // Chunky multi-layered arcade shockwave blast (dark ink contrast edge + energy band + radial spikes!)
        const t = Math.min(1, h.age / h.maxAge);
        const eased = 1 - Math.pow(1 - t, 2.5);
        const rad = 18 + ((h.maxRadius ?? 110) - 18) * eased;
        const fadeOut = 1 - t;
        ctx.save();
        ctx.translate(h.x, h.y);

        // Soft interior shock wash
        const wash = ctx.createRadialGradient(0, 0, rad * 0.55, 0, 0, rad);
        wash.addColorStop(0, 'rgba(0,0,0,0)');
        wash.addColorStop(0.84, h.color + '44');
        wash.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = fadeOut * 0.9;
        ctx.fillStyle = wash;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();

        // Soft luminous plasma shockband (no cartoon black border!)
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = h.color;
        ctx.globalAlpha = fadeOut * 0.55;
        ctx.lineWidth = (h.kind === 'frost_burst' ? 7 : 10) * fadeOut + 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = h.color;
        ctx.globalAlpha = fadeOut * 0.92;
        ctx.lineWidth = (h.kind === 'frost_burst' ? 3.8 : 5.2) * fadeOut + 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();

        // White-hot leading energy edge
        ctx.strokeStyle = '#fff9e8';
        ctx.globalAlpha = fadeOut * 0.88;
        ctx.lineWidth = Math.max(1.2, 2.4 * fadeOut);
        ctx.beginPath();
        ctx.arc(0, 0, rad - 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Radial jagged shock-teeth trailing behind the wavefront
        const spikes = h.kind === 'frost_burst' ? 10 : 12;
        ctx.strokeStyle = h.kind === 'frost_burst' ? '#dffaff' : '#ffe8a8';
        ctx.lineWidth = Math.max(1.2, 2.2 * fadeOut);
        ctx.globalAlpha = fadeOut * 0.75;
        for (let k = 0; k < spikes; k++) {
          const a = (k * Math.PI * 2) / spikes + h.id * 0.7;
          const rIn = Math.max(8, rad - (14 + (k % 2) * 8) * fadeOut);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      const fade = Math.min(1, (h.maxAge - h.age) * 2);
      ctx.save();
      ctx.translate(h.x, h.y);

      if (h.kind === 'acid_pool') {
        // Organic multi-lobe bubbling caustic wasteland puddle!
        ctx.globalAlpha = fade * 0.85;
        ctx.drawImage(sprites.get('glow_emerald'), -h.radius * 1.15, -h.radius * 1.15, h.radius * 2.3, h.radius * 2.3);

        const traceLobe = (scale: number, wobble: number) => {
          ctx.beginPath();
          const steps = 28;
          for (let s = 0; s <= steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const n =
              1 +
              0.11 * Math.sin(a * 3 + h.id * 1.7 + realTime * 1.6) +
              0.07 * Math.cos(a * 5 - h.id * 0.9 - realTime * 2.2);
            const r = h.radius * scale * (1 - wobble + wobble * n);
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        };

        // Dark corroded sludge interior
        traceLobe(0.96, 1.0);
        const sludge = ctx.createRadialGradient(0, 0, h.radius * 0.12, 0, 0, h.radius);
        sludge.addColorStop(0, 'rgba(18, 42, 16, 0.72)');
        sludge.addColorStop(0.68, 'rgba(54, 118, 36, 0.56)');
        sludge.addColorStop(1, 'rgba(128, 226, 86, 0.25)');
        ctx.fillStyle = sludge;
        ctx.fill();
        ctx.strokeStyle = h.evolved ? '#b9ff72' : '#7ae352';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Rising & popping animated caustic gas bubbles!
        for (let b = 0; b < 5; b++) {
          const cycle = (realTime * (0.9 + (b % 3) * 0.25) + h.id * 0.37 + b * 0.21) % 1;
          const ba = b * 1.38 + h.id;
          const br = h.radius * (0.22 + ((b * 0.19 + 0.12) % 0.52));
          const bx = Math.cos(ba) * br;
          const by = Math.sin(ba) * br;
          const bubR = (2.2 + cycle * 4.6) * (h.radius / 42);
          ctx.globalAlpha = fade * (1 - cycle) * 0.78;
          ctx.strokeStyle = '#d4ff9c';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, bubR, 0, Math.PI * 2);
          ctx.stroke();
          if (cycle < 0.75) {
            ctx.fillStyle = 'rgba(218, 255, 170, 0.45)';
            ctx.beginPath();
            ctx.arc(bx - bubR * 0.3, by - bubR * 0.3, Math.max(0.8, bubR * 0.28), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        continue;
      }

      ctx.globalAlpha = fade * (h.kind === 'singularity' ? 0.9 : 0.68);
      const glow = sprites.get(h.kind === 'rift' ? 'glow_cyan' : 'glow_magenta');
      ctx.drawImage(glow, -h.radius * 1.1, -h.radius * 1.1, h.radius * 2.2, h.radius * 2.2);

      ctx.strokeStyle = h.color;
      ctx.lineWidth = h.kind === 'singularity' ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (h.kind === 'singularity' || h.kind === 'rift') {
        const spin = realTime * (h.kind === 'singularity' ? 5.5 : 3.2);
        ctx.strokeStyle = '#ebe7dc';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          const a = spin + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(0, 0, h.radius * 0.56, a, a + 0.85);
          ctx.stroke();
        }
        ctx.fillStyle = '#0e0c14';
        ctx.beginPath();
        ctx.arc(0, 0, h.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawMeteorsAndDecoys(ctx: CanvasRenderingContext2D, state: RenderState): void {
    // Meteor Barrage: red-amber ground telegraph + incoming flaming painted warhead!
    const warheadArt = sprites.getArt('ord_mortar');
    for (const m of state.meteors) {
      const progress = 1 - Math.max(0, m.timer / m.maxTimer);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = `rgba(255, 106, 38, ${0.12 + progress * 0.24})`;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.fill();

      // Dark-backed military target reticle
      ctx.strokeStyle = '#180d0a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ff6a26';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Expanding inner detonation fill
      ctx.strokeStyle = '#fff0b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * progress, 0, Math.PI * 2);
      ctx.stroke();

      // Growing drop shadow beneath descending artillery warhead
      ctx.fillStyle = `rgba(0, 0, 0, ${0.18 + progress * 0.42})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + progress * 14, 5 + progress * 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Descending flaming artillery shell streaking from sky onto target!
      if (progress > 0.12) {
        const dropFrac = Math.pow(1 - progress, 1.55);
        const sx = dropFrac * 150;
        const sy = -dropFrac * 290;
        const streakAng = Math.atan2(-sy, -sx);

        // Fiery re-entry plume behind falling shell
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(streakAng);
        const tailLen = 36 + progress * 24;
        const flameG = ctx.createLinearGradient(-tailLen, 0, 10, 0);
        flameG.addColorStop(0, 'rgba(255, 92, 34, 0)');
        flameG.addColorStop(0.55, 'rgba(255, 146, 46, 0.78)');
        flameG.addColorStop(1, '#fff6cc');
        ctx.fillStyle = flameG;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-tailLen, -10);
        ctx.lineTo(-tailLen * 0.75, 0);
        ctx.lineTo(-tailLen, 10);
        ctx.closePath();
        ctx.fill();

        if (warheadArt) {
          ctx.rotate(Math.PI / 2);
          const sz = 28 + progress * 10;
          ctx.drawImage(warheadArt, -sz / 2, -sz / 2, sz, sz);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // Phantom Blink exploding phase-beacon decoys (painted deploy_blink_beacon.png + fuse countdown!)
    const beaconArt = sprites.getArt('deploy_blink_beacon');
    const beaconShadow = sprites.getShadow('deploy_blink_beacon');
    for (const d of state.decoys) {
      const progress = Math.min(1, d.age / d.maxAge);
      const pulse = 0.65 + 0.35 * Math.sin(state.realTime * (12 + progress * 24));
      ctx.save();
      ctx.translate(d.x, d.y);

      ctx.globalAlpha = 0.44 + progress * 0.36;
      ctx.drawImage(sprites.get('glow_magenta'), -38, -38, 76, 76);

      // Fuse countdown ring filling toward detonation
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#cf7dff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = progress > 0.72 ? '#ffe0f8' : '#cf7dff';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();

      const rot = -state.realTime * (1.2 + progress * 2.4);
      const sz = 36 * (0.96 + pulse * 0.08);
      if (beaconShadow) {
        ctx.save();
        ctx.translate(4, 7);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.72;
        ctx.drawImage(beaconShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      if (beaconArt) {
        ctx.save();
        ctx.rotate(rot);
        ctx.globalAlpha = 1;
        ctx.drawImage(beaconArt, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      // Glitch-pulse unstable holographic ring flicker right before detonation
      if (progress > 0.55) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ff98ff';
        ctx.globalAlpha = (progress - 0.55) * 1.6 * pulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Phase Echo bespoke rotary defense turrets (uses painted turret_echo.png + laser sightline + muzzle flash!)
    const turretArt = sprites.getTurretEchoArt();
    const turretShadow = sprites.getTurretEchoShadow();
    for (const ec of state.echoes) {
      const fade = Math.min(1, (ec.maxAge - ec.age) * 2.2);
      const remain = Math.max(0, 1 - ec.age / ec.maxAge);
      const recoil = (ec.muzzleFlash ?? 0) * 3.2;

      // Subtle emerald targeting laser sightline toward locked hostile
      if (ec.targetX !== undefined && ec.targetY !== undefined) {
        ctx.save();
        ctx.strokeStyle = 'rgba(92, 214, 141, 0.34)';
        ctx.globalAlpha = fade;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(ec.x + Math.cos(ec.angle) * 16, ec.y + Math.sin(ec.angle) * 16);
        ctx.lineTo(ec.targetX, ec.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(ec.x, ec.y);
      ctx.globalAlpha = fade;

      // Grounded stabilizer field & remaining-life arc
      ctx.drawImage(sprites.get('glow_emerald'), -26, -26, 52, 52);
      ctx.strokeStyle = 'rgba(92, 214, 141, 0.24)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#5cd68d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
      ctx.stroke();

      // Grounded turret hover shadow
      const rot = ec.angle + Math.PI / 2;
      if (turretShadow) {
        ctx.save();
        ctx.translate(4, 7);
        ctx.rotate(rot);
        ctx.globalAlpha = fade * 0.7;
        ctx.drawImage(turretShadow, -22, -22, 44, 44);
        ctx.restore();
      }

      // Bespoke painted rotary defense turret sprite (kicks back slightly on shot!)
      ctx.save();
      ctx.rotate(rot);
      ctx.translate(0, recoil);
      if (turretArt) {
        ctx.drawImage(turretArt, -22, -22, 44, 44);
      } else {
        ctx.fillStyle = '#2d3632';
        ctx.strokeStyle = '#5cd68d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Crisp twin-barrel muzzle flash glow!
      if ((ec.muzzleFlash ?? 0) > 0.08) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ec.muzzleFlash * fade;
        for (const bx of [-4.5, 4.5]) {
          const mg = ctx.createRadialGradient(bx, -21, 0.5, bx, -21, 8.5);
          mg.addColorStop(0, '#ffffff');
          mg.addColorStop(0.45, '#5cd68d');
          mg.addColorStop(1, 'rgba(92,214,141,0)');
          ctx.fillStyle = mg;
          ctx.beginPath();
          ctx.arc(bx, -21, 8.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.restore();
    }

    // Wake Mines: painted 6-prong industrial proximity mines with sensor sweep pulse
    const mineArt = sprites.getArt('deploy_mine');
    const mineShadow = sprites.getShadow('deploy_mine');
    for (const m of state.mines) {
      const blink = 0.55 + 0.45 * Math.sin(state.realTime * 14 + m.id);
      const sweep = (state.realTime * 1.4 + m.id * 0.31) % 1;
      const rot = state.realTime * (m.armed ? 0.75 : 0.3) + m.id;
      ctx.save();
      ctx.translate(m.x, m.y);

      if (m.armed) {
        ctx.strokeStyle = `rgba(224, 99, 43, ${(1 - sweep) * 0.48})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 12 + sweep * (m.radius * 0.52), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = m.armed ? `rgba(224, 99, 43, ${0.24 + blink * 0.22})` : 'rgba(224, 178, 74, 0.22)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * 0.54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const sz = 28;
      if (mineShadow) {
        ctx.save();
        ctx.translate(3.5, 6);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(mineShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      if (mineArt) {
        ctx.save();
        ctx.rotate(rot);
        ctx.drawImage(mineArt, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      // Armed glowing core pulse
      if (m.armed) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 + blink * 0.35;
        ctx.drawImage(sprites.get('glow_coral'), -15, -15, 30, 30);
      }
      ctx.restore();
    }
  }

  private drawMissileLockReticles(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const counts = new Map<number, number>();
    for (const id of state.player.missileLocks) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, cnt] of counts) {
      const e = state.enemies.find((x) => x.id === id && x.hp > 0);
      if (!e) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(state.realTime * 2.5);
      const r = e.radius + 10;
      ctx.strokeStyle = '#ff7b47';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(r - 5, -r);
        ctx.lineTo(r, -r);
        ctx.lineTo(r, -r + 5);
        ctx.stroke();
      }
      if (cnt > 1) {
        ctx.rotate(-state.realTime * 2.5);
        ctx.fillStyle = '#f6c453';
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`×${cnt}`, 0, -r - 4);
      }
      ctx.restore();
    }
  }

  private drawPylons(
    ctx: CanvasRenderingContext2D,
    pylons: RailPylon[],
    enemies: Enemy[],
    realTime: number
  ): void {
    const pylonArt = sprites.getArt('deploy_rail_pylon');
    const pylonShadow = sprites.getShadow('deploy_rail_pylon');
    for (const py of pylons) {
      const pulse = 0.72 + 0.28 * Math.sin(realTime * 9 + py.id);
      const accent = py.evolved ? '#45e8d8' : '#e5b34c';
      const tgt = findNearestEnemy(py.x, py.y, enemies, 460, true);
      const rot = tgt ? Math.atan2(tgt.y - py.y, tgt.x - py.x) + Math.PI / 2 : 0;

      ctx.save();
      ctx.translate(py.x, py.y);

      // Soft energy base glow + rotating induction ring
      ctx.globalAlpha = 0.36 + pulse * 0.24;
      ctx.drawImage(sprites.get(py.evolved ? 'glow_cyan' : 'glow_gold'), -26, -26, 52, 52);
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.rotate(realTime * 2.2 + py.id);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.arc(0, 0, 19, k * Math.PI, k * Math.PI + 1.15);
        ctx.stroke();
      }
      ctx.restore();

      const sz = 40;
      if (pylonShadow) {
        ctx.save();
        ctx.translate(4, 7);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.72;
        ctx.drawImage(pylonShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      if (pylonArt) {
        ctx.save();
        ctx.rotate(rot);
        ctx.drawImage(pylonArt, -sz / 2, -sz / 2, sz, sz);
        if (py.evolved) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.45 + pulse * 0.3;
          ctx.fillStyle = '#45e8d8';
          ctx.beginPath();
          ctx.arc(0, -3, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], realTime: number): void {
    const medArt = sprites.getArt('pickup_medkit');
    const medShadow = sprites.getShadow('pickup_medkit');
    const chestArt = sprites.getArt('pickup_relic_chest');
    const chestShadow = sprites.getShadow('pickup_relic_chest');
    const magArt = sprites.getArt('pickup_magnet');
    const magShadow = sprites.getShadow('pickup_magnet');
    const cellArt = sprites.getArt('pickup_xp_cell');
    const shardArt = sprites.getArt('icon_shard');

    for (const p of pickups) {
      const bob = Math.sin(realTime * 5.5 + p.id) * 1.8;
      if (p.kind === 'heal' && medArt) {
        if (medShadow) ctx.drawImage(medShadow, p.x - 14, p.y - 11 + bob, 32, 32);
        ctx.drawImage(medArt, p.x - 16, p.y - 16 + bob, 32, 32);
        continue;
      }
      if (p.kind === 'chest' && chestArt) {
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.2 * Math.sin(realTime * 6 + p.id);
        ctx.drawImage(sprites.get('glow_gold'), p.x - 26, p.y - 26 + bob, 52, 52);
        ctx.restore();
        if (chestShadow) ctx.drawImage(chestShadow, p.x - 17, p.y - 13 + bob, 38, 38);
        ctx.drawImage(chestArt, p.x - 19, p.y - 19 + bob, 38, 38);
        continue;
      }
      if (p.kind === 'magnet' && magArt) {
        if (magShadow) ctx.drawImage(magShadow, p.x - 14, p.y - 11 + bob, 32, 32);
        ctx.drawImage(magArt, p.x - 16, p.y - 16 + bob, 32, 32);
        continue;
      }
      if (p.kind === 'shard' && shardArt) {
        ctx.drawImage(shardArt, p.x - 11, p.y - 11 + bob, 22, 22);
        continue;
      }
      if ((p.kind === 'xp_small' || p.kind === 'xp_mid' || p.kind === 'xp_large') && cellArt) {
        const sz = p.kind === 'xp_large' ? 25 : p.kind === 'xp_mid' ? 20 : 15;
        ctx.drawImage(cellArt, p.x - sz / 2, p.y - sz / 2 + bob, sz, sz);
        continue;
      }

      let key: Parameters<typeof sprites.get>[0] = 'xp_small';
      let size = 16;
      if (p.kind === 'xp_mid') {
        key = 'xp_mid';
        size = 21;
      } else if (p.kind === 'xp_large') {
        key = 'xp_large';
        size = 27;
      } else if (p.kind === 'heal') {
        key = 'pickup_heal';
        size = 28;
      } else if (p.kind === 'blood_cell') {
        key = 'pickup_blood';
        size = 26;
      } else if (p.kind === 'shard') {
        key = 'pickup_shard';
        size = 26;
      } else if (p.kind === 'magnet') {
        key = 'pickup_magnet';
        size = 28;
      } else if (p.kind === 'chest') {
        key = 'pickup_chest';
        size = 34;
      }
      ctx.drawImage(sprites.get(key), p.x - size / 2, p.y - size / 2 + bob, size, size);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: RenderState, skin: SkinDef): void {
    const { player, vesselId, coating, realTime } = state;
    const blend = player.stillpointBlend;
    const chargeRatio = Math.max(0, Math.min(1, player.kineticCharge / player.maxKineticCharge));
    const coreReady = player.coreCooldown <= 0 && player.kineticCharge >= 16;
    const auraOuter = state.auraOuter;
    const auraInner = state.auraInner;

    // 1. Rolled Thruster Exhaust wake (8 distinct geometric trail styles + seed/wear)
    drawEffectTrailWake(ctx, player.trail, state.trailItem, realTime);

    ctx.save();
    ctx.translate(player.x, player.y);

    // 2. Rolled Stillpoint Aura (only visible while slowed!) + Surge glow
    if (player.surgeTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.52;
      ctx.drawImage(sprites.get('glow_gold'), -46, -46, 92, 92);
      ctx.restore();
    }

    if (blend > 0.08) {
      const auraR = state.coreId === 'siphon' ? 68 : state.coreId === 'aegis_dome' ? 58 : 46;
      const coreTint =
        state.coreId === 'siphon'
          ? '#e08538'
          : state.coreId === 'berserk'
            ? '#d94842'
            : state.coreId === 'overclock'
              ? '#e2a93b'
              : state.coreId === 'singularity_lance'
                ? '#ff7b47'
                : undefined;
      drawEffectStillpointAura(ctx, state.auraItem, auraR, blend, realTime, coreTint);

      // Rail Collapse Core: show charging directional beam sightline aimed at nearest boss/elite!
      if (state.coreId === 'singularity_lance' && player.railChargeTime > 0.02) {
        const chargePct = Math.min(1, player.railChargeTime / 1.4);
        const tgt = findNearestEnemy(player.x, player.y, state.enemies, 680, true);
        const aimAng = tgt ? Math.atan2(tgt.y - player.y, tgt.x - player.x) : player.facingAngle;
        ctx.save();
        ctx.strokeStyle = chargePct >= 0.85 ? '#fff2cc' : '#ff7b47';
        ctx.globalAlpha = 0.35 + chargePct * 0.55;
        ctx.lineWidth = 1.5 + chargePct * 6;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(aimAng) * 620, Math.sin(aimAng) * 620);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 3. Single Clean Diegetic Focus Ring (pulses hazard-red when Reactor Stalled!)
    const ringR = 28 + blend * 4;
    if (player.stallTimer > 0) {
      const stallRatio = Math.max(
        0,
        Math.min(1, player.stallTimer / Math.max(0.1, player.stallMaxTimer))
      );
      const flash = 0.55 + 0.45 * Math.sin(realTime * 24);
      ctx.strokeStyle = 'rgba(255, 86, 64, 0.22)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 86, 64, ${0.45 + flash * 0.5})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * stallRatio);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(235, 231, 220, 0.14)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      if (chargeRatio > 0.01) {
        ctx.strokeStyle =
          player.freeFocusTimer > 0
            ? '#7bf7ff'
            : blend > 0.25
              ? auraInner
              : coreReady
                ? auraOuter
                : 'rgba(235,231,220,0.45)';
        ctx.lineWidth = coreReady ? 2.8 : 2.1;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio);
        ctx.stroke();
      }
    }

    const shipArt = sprites.getCoatedShipArt(vesselId, coating);
    const shipShadow = sprites.getShipShadow(vesselId);
    const shipSize =
      vesselId === 'aegis' || vesselId === 'nova' || vesselId === 'pyre' || vesselId === 'bastion'
        ? 50
        : 48;
    const rot = player.facingAngle + Math.PI / 2; // PNGs point straight UP (-PI/2)

    // 5. Exact Silhouette Grounded Hover Shadow!
    if (shipShadow) {
      ctx.save();
      ctx.translate(7, 12);
      ctx.rotate(rot);
      ctx.drawImage(shipShadow, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      ctx.restore();
    }

    // 6. Rendered Hover-Rig Sprite (with baked CS:GO pattern & float wear!) + Rolled Thruster Plume!
    ctx.save();
    ctx.rotate(rot);
    const invulnBlink = player.invulnTimer > 0 && Math.floor(realTime * 22) % 2 === 0;
    ctx.globalAlpha = invulnBlink ? 0.35 : 1 - blend * 0.42;

    if (Math.hypot(player.vx, player.vy) > 20 && !player.inStillpoint) {
      drawEffectThrusterPlume(ctx, vesselId, state.trailItem, realTime, 1);
    }

    if (shipArt) {
      ctx.drawImage(shipArt, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      if (player.hitFlash > 0.15) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = player.hitFlash * 0.55;
        ctx.drawImage(shipArt, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      }
    } else {
      ctx.fillStyle = skin.hullFill;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(13, 14);
      ctx.lineTo(0, 8);
      ctx.lineTo(-13, 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 7. Pinpoint Core Hitbox (illuminates crisply in Stillpoint!)
    if (blend > 0.12) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, blend * 1.2);
      const coreR = 4.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -coreR * 1.45);
      ctx.lineTo(coreR * 1.45, 0);
      ctx.lineTo(0, coreR * 1.45);
      ctx.lineTo(-coreR * 1.45, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = auraOuter;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 8.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawPlayerHealthBar(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { player, realTime } = state;
    const blend = player.stillpointBlend;
    const hpRatio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp)));
    const totalShield = Math.max(0, player.shield + player.kineticOvershield);
    const maxShieldTotal = Math.max(
      1,
      player.maxShield + (player.modules.includes('kinetic_shield') ? 18 : 0)
    );
    const shieldRatio = totalShield > 0 ? Math.max(0, Math.min(1, totalShield / maxShieldTotal)) : 0;
    const hasShieldStrip = totalShield > 0.25;

    const barW = 46;
    const hpH = 4.5;
    const shH = hasShieldStrip ? 2.5 : 0;
    const gap = hasShieldStrip ? 1 : 0;
    const totalH = hpH + shH + gap;
    const bx = player.x - barW / 2;
    const by = player.y + 37 + blend * 4;

    ctx.save();
    // Dark gunmetal recessed housing + warm oxidized rim
    ctx.fillStyle = 'rgba(11, 10, 8, 0.88)';
    ctx.fillRect(bx - 1.5, by - 1.5, barW + 3, totalH + 3);
    ctx.strokeStyle =
      hpRatio <= 0.3
        ? `rgba(255, 92, 71, ${0.55 + 0.35 * Math.sin(realTime * 14)})`
        : 'rgba(236, 227, 211, 0.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 1.5, by - 1.5, barW + 3, totalH + 3);

    // Shield + overshield strip perched cleanly above Hull track when active
    let hpY = by;
    if (hasShieldStrip) {
      ctx.fillStyle = 'rgba(28, 36, 42, 0.9)';
      ctx.fillRect(bx, by, barW, shH);
      ctx.fillStyle = '#9be0f8';
      ctx.fillRect(bx, by, barW * shieldRatio, shH);
      hpY = by + shH + gap;
    }

    // Hull integrity bar
    ctx.fillStyle = 'rgba(32, 18, 16, 0.92)';
    ctx.fillRect(bx, hpY, barW, hpH);
    if (hpRatio > 0) {
      const lowPulse = hpRatio <= 0.3 ? 0.5 + 0.5 * Math.sin(realTime * 14) : 0;
      ctx.fillStyle =
        player.hitFlash > 0.28
          ? '#f5efe2'
          : hpRatio <= 0.3
            ? lowPulse > 0.5
              ? '#ff6148'
              : '#c73228'
            : '#df4b42';
      ctx.fillRect(bx, hpY, barW * hpRatio, hpH);
    }
    ctx.restore();
  }

  private drawOrbitalWeapons(ctx: CanvasRenderingContext2D, state: RenderState): void {
    // 1. Halo Sawblades: painted industrial rotary saw-discs with silhouette shadow
    const bladeArt = sprites.getArt('deploy_halo_blade');
    const bladeShadow = sprites.getShadow('deploy_halo_blade');
    const blades = getHaloBladesPositions(state.player);
    for (const b of blades) {
      const edgeCol = b.evolved ? '#f5c84c' : '#4effb4';
      const spin = b.angle * 6.5;
      const sz = b.radius * 2.55;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = b.isStillpoint ? 0.58 : 0.36;
      ctx.drawImage(
        sprites.get(b.evolved ? 'glow_gold' : 'glow_emerald'),
        -b.radius * 1.9,
        -b.radius * 1.9,
        b.radius * 3.8,
        b.radius * 3.8
      );
      ctx.globalAlpha = 1;

      if (bladeShadow) {
        ctx.save();
        ctx.translate(3.5, 6);
        ctx.rotate(spin);
        ctx.globalAlpha = 0.65;
        ctx.drawImage(bladeShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      if (bladeArt) {
        ctx.save();
        ctx.rotate(spin);
        ctx.drawImage(bladeArt, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      // Crisp spinning energy slash ring during Stillpoint or Evolution
      if (b.isStillpoint || b.evolved) {
        ctx.strokeStyle = edgeCol;
        ctx.globalAlpha = b.isStillpoint ? 0.72 : 0.45;
        ctx.lineWidth = b.isStillpoint ? 2.2 : 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 1.15, spin, spin + Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Prism Drones: painted autonomous wingman combat rigs with grounded shadows & exhaust
    const droneArt = sprites.getArt('deploy_prism_drone');
    const droneShadow = sprites.getShadow('deploy_prism_drone');
    const drones = getPrismDronePositions(state.player);
    for (const d of drones) {
      const rot = d.angle + Math.PI / 2;
      const sz = d.evolved ? 30 : 26;
      ctx.save();
      ctx.translate(d.x, d.y);

      if (droneShadow) {
        ctx.save();
        ctx.translate(4, 7);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.68;
        ctx.drawImage(droneShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      ctx.rotate(rot);
      // Tiny glowing thruster spark at rear
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = d.evolved ? '#f6c453' : '#45e8d8';
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(0, sz * 0.44, 2.5, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      if (droneArt) {
        ctx.drawImage(droneArt, -sz / 2, -sz / 2, sz, sz);
      }
      ctx.restore();
    }

    // 3. Gravity Flail: forged dark-inked heavy chain + painted spiked gravity mace head
    const flailArt = sprites.getArt('deploy_grav_flail');
    const flailShadow = sprites.getShadow('deploy_grav_flail');
    const flails = getGravityFlailPositions(state.player);
    for (const f of flails) {
      const accent = f.evolved ? '#f5d256' : '#f08a38';
      const dx = f.x - state.player.x;
      const dy = f.y - state.player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const chainAng = Math.atan2(dy, dx);
      const perpX = -dy / dist;
      const perpY = dx / dist;

      ctx.save();
      // Kinetic swing arc blur behind the mace
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = f.radius * 0.72;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, dist, chainAng - 0.54, chainAng);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Interlocking dark-inked forged gunmetal & bronze chain links
      const linkCount = Math.max(5, Math.floor(dist / 13));
      for (let i = 1; i < linkCount; i++) {
        const t = i / linkCount;
        const bow = Math.sin(t * Math.PI) * -9;
        const lx = state.player.x + dx * t + perpX * bow;
        const ly = state.player.y + dy * t + perpY * bow;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(chainAng + Math.cos(t * Math.PI) * -0.16);
        const isBronze = i % 2 === 0;
        ctx.strokeStyle = '#121110';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, isBronze ? 3.1 : 2.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = isBronze ? '#b89452' : '#7d8286';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, isBronze ? 3.1 : 2.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const sz = f.radius * 2.55;
      const spin = f.angle * 3.6;
      if (flailShadow) {
        ctx.save();
        ctx.translate(f.x + 5, f.y + 8);
        ctx.rotate(spin);
        ctx.globalAlpha = 0.72;
        ctx.drawImage(flailShadow, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      ctx.translate(f.x, f.y);
      ctx.globalAlpha = 0.48;
      ctx.drawImage(sprites.get('glow_gold'), -f.radius * 1.9, -f.radius * 1.9, f.radius * 3.8, f.radius * 3.8);
      ctx.globalAlpha = 1;

      if (flailArt) {
        ctx.rotate(spin);
        ctx.drawImage(flailArt, -sz / 2, -sz / 2, sz, sz);
      }
      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], realTime: number): void {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (e.isBoss) {
        this.drawBoss(ctx, e, realTime);
        continue;
      }

      const art = sprites.getEnemyArt(e.kind);
      const shadow = sprites.getEnemyShadow(e.kind);
      const scaleRecoil = 1 + e.hitFlash * 0.14;
      const drawSize = e.radius * 2.85 * scaleRecoil;
      const rot = e.angle + Math.PI / 2;

      // Exact Silhouette Grounded Shadow
      if (shadow) {
        ctx.save();
        ctx.translate(e.x + 5, e.y + 9);
        ctx.rotate(rot);
        ctx.drawImage(shadow, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(e.x, e.y);

      if (art) {
        ctx.save();
        ctx.rotate(rot);
        ctx.drawImage(art, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        if (e.hitFlash > 0.15) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = e.hitFlash * 0.55;
          ctx.drawImage(art, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = e.accent;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.chillTimer && e.chillTimer > 0) {
        ctx.strokeStyle = '#7ee8ff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.corrodeTimer && e.corrodeTimer > 0) {
        ctx.strokeStyle = '#78d65c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.primedTimer && e.primedTimer > 0) {
        ctx.strokeStyle = '#e05fa8';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 6, realTime * 3, realTime * 3 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (e.catalystMark && e.catalystMark > 0) {
        ctx.strokeStyle = '#ff66cc';
        ctx.lineWidth = 1.8;
        const r = e.radius + 8;
        ctx.save();
        ctx.rotate(-realTime * 2.4);
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI * 2) / 3;
          if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      if (e.stunTimer && e.stunTimer > 0) {
        ctx.strokeStyle = '#82c4e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 4, realTime * 9, realTime * 9 + Math.PI * 1.1);
        ctx.stroke();
      }

      if (e.kind === 'hauler') {
        ctx.strokeStyle = '#f6c453';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (e.isElite || e.kind === 'hauler') {
        if (e.isElite) {
          ctx.strokeStyle = '#e5b34c';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        const bw = e.radius * 2.3;
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(-bw / 2, e.radius + 10, bw, 3.5);
        ctx.fillStyle = '#e5b34c';
        ctx.fillRect(-bw / 2, e.radius + 10, bw * ratio, 3.5);
      }
      ctx.restore();
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, boss: Enemy, realTime: number): void {
    // Articulated painted Metal Slug armored carapace segments for Void Leviathan!
    if (boss.kind === 'boss_leviathan' && boss.segments) {
      const segArt = sprites.getArt('deploy_leviathan_seg');
      const segShadow = sprites.getShadow('deploy_leviathan_seg');
      for (let i = boss.segments.length - 1; i >= 0; i--) {
        const seg = boss.segments[i];
        const prev = i === 0 ? boss : boss.segments[i - 1];
        const segAng = Math.atan2(prev.y - seg.y, prev.x - seg.x);
        const segR = boss.radius * (0.86 - i * 0.055);
        const sz = segR * 2.5;
        const rot = segAng + Math.PI / 2;
        ctx.save();
        if (segShadow) {
          ctx.save();
          ctx.translate(seg.x + 7, seg.y + 11);
          ctx.rotate(rot);
          ctx.globalAlpha = 0.7;
          ctx.drawImage(segShadow, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.translate(seg.x, seg.y);
        ctx.rotate(rot);
        if (segArt) {
          ctx.drawImage(segArt, -sz / 2, -sz / 2, sz, sz);
        }
        ctx.restore();
      }
    }

    const art = sprites.getEnemyArt(boss.kind);
    const shadow = sprites.getEnemyShadow(boss.kind);
    const pulse = 1 + Math.sin(realTime * 4) * 0.02 + boss.hitFlash * 0.06;
    const size = boss.radius * 3.15 * pulse;
    const rot =
      boss.kind === 'boss_seraph'
        ? Math.sin(realTime * 1.4) * 0.1
        : boss.kind === 'boss_leviathan'
          ? boss.angle + Math.PI / 2
          : boss.angle;

    if (shadow) {
      ctx.save();
      ctx.translate(boss.x + 10, boss.y + 16);
      ctx.rotate(rot);
      ctx.drawImage(shadow, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Subtle glowing reactor aura beneath boss
    const glowKey =
      boss.kind === 'boss_archon'
        ? 'glow_gold'
        : boss.kind === 'boss_seraph'
          ? 'glow_magenta'
          : boss.kind === 'boss_leviathan'
            ? 'glow_emerald'
            : 'glow_coral';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(sprites.get(glowKey), -size * 0.72, -size * 0.72, size * 1.44, size * 1.44);
    ctx.globalAlpha = 1;

    if (art) {
      ctx.save();
      ctx.rotate(rot);
      ctx.drawImage(art, -size / 2, -size / 2, size, size);
      if (boss.hitFlash > 0.15) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = boss.hitFlash * 0.45;
        ctx.drawImage(art, -size / 2, -size / 2, size, size);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = boss.accent;
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLasers(
    ctx: CanvasRenderingContext2D,
    lasers: LaserBeam[],
    enemies: Enemy[],
    realTime: number
  ): void {
    for (const e of enemies) {
      if (e.telegraphTimer !== undefined && e.telegraphTimer > 0 && e.telegraphAngle !== undefined) {
        const ang = e.telegraphAngle;
        const urgency = 1 - e.telegraphTimer / 0.95;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 59, 92, ${0.4 + urgency * 0.55})`;
        ctx.lineWidth = 1.5 + urgency * 2.2;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ang) * 520, e.y + Math.sin(ang) * 520);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    for (const l of lasers) {
      const ratio = Math.max(0, l.life / l.maxLife);
      ctx.save();
      if (l.isTelegraph) {
        const urgency = 1 - ratio;
        const flash = 0.5 + 0.5 * Math.sin(realTime * 34);
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = 0.28 + urgency * 0.62 * flash;
        ctx.lineWidth = 2 + urgency * 3;
        ctx.setLineDash([14, 9]);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Roaring 5-layer Metal Slug arcade laser beam (dark ink edge + bloom + scrolling energy chevrons + muzzle/impact flares!)
        const dx = l.x2 - l.x1;
        const dy = l.y2 - l.y1;
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx);
        const wNow = l.width * (0.72 + ratio * 0.52);

        ctx.save();
        ctx.translate(l.x1, l.y1);
        ctx.rotate(ang);
        ctx.lineCap = 'round';

        // 1. Soft heat-haze thermal bloom (no harsh cartoon outline)
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ratio * 0.48;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = wNow * 1.95;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();

        // 2. Dense saturated plasma beam shaft
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, ratio * 1.05);
        ctx.strokeStyle = l.color;
        ctx.lineWidth = wNow * 0.88;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();

        // 3. Animated scrolling energy pulse chevrons rushing down the beam
        const step = Math.max(24, wNow * 1.9);
        const scroll = (realTime * 540) % step;
        const halfW = wNow * 0.46;
        ctx.strokeStyle = '#fff5cf';
        ctx.globalAlpha = ratio * 0.72;
        ctx.lineWidth = Math.max(1.4, wNow * 0.13);
        ctx.beginPath();
        for (let sx = scroll; sx < len - 10; sx += step) {
          ctx.moveTo(sx - halfW * 0.85, -halfW);
          ctx.lineTo(sx + halfW * 0.5, 0);
          ctx.lineTo(sx - halfW * 0.85, halfW);
        }
        ctx.stroke();

        // 4. Incandescent white-hot inner plasma core
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, ratio * 1.1);
        ctx.lineWidth = Math.max(2.0, wNow * 0.34);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();

        // 5. Realistic thermal muzzle bloom & impact flare (no cartoon starburst!)
        ctx.globalCompositeOperation = 'lighter';
        const drawBeamGlow = (fx: number, baseR: number) => {
          const g = ctx.createRadialGradient(fx, 0, 1, fx, 0, baseR * 1.75);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.32, '#fff0c4');
          g.addColorStop(0.65, l.color + '88');
          g.addColorStop(1, l.color + '00');
          ctx.globalAlpha = ratio * 0.92;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(fx, 0, baseR * 1.75, 0, Math.PI * 2);
          ctx.fill();
        };

        drawBeamGlow(0, Math.max(7, wNow * 0.9));
        drawBeamGlow(len, Math.max(6, wNow * 0.75));
        ctx.restore();
      }
      ctx.restore();
    }
  }

  private drawArcs(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    for (const a of particles.arcs) {
      const alpha = Math.max(0, a.life / a.maxLife);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Crisp dark ink under-stroke so electric lightning snaps visibly on any surface
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = '#0d1118';
      ctx.lineWidth = a.width * 2.8 + 1.5;
      ctx.beginPath();
      a.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.width * 2.1;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, a.width * 0.78);
      ctx.stroke();

      // Bright electric spark node at arc endpoint
      const end = a.points[a.points.length - 1];
      if (end) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(end.x, end.y, a.width * 1.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPlayerBullets(
    ctx: CanvasRenderingContext2D,
    bullets: PlayerBullet[],
    realTime: number
  ): void {
    const missileArt = sprites.getArt('ord_missile');
    const missileShadow = sprites.getShadow('ord_missile');
    const mortarArt = sprites.getArt('ord_mortar');
    const mortarShadow = sprites.getShadow('ord_mortar');
    const daggerArt = sprites.getArt('ord_dagger');
    const scytheArt = sprites.getArt('ord_scythe');
    const scytheShadow = sprites.getShadow('ord_scythe');
    const mineArt = sprites.getArt('deploy_mine');
    const mineShadow = sprites.getShadow('deploy_mine');

    for (const b of bullets) {
      if (b.kind === 'scythe') {
        const spin = b.spinAngle ?? realTime * 15;
        const sz = b.radius * 2.5;
        ctx.save();
        if (scytheShadow) {
          ctx.save();
          ctx.translate(b.x + 4, b.y + 7);
          ctx.rotate(spin);
          ctx.globalAlpha = 0.6;
          ctx.drawImage(scytheShadow, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.translate(b.x, b.y);
        ctx.rotate(spin);
        // Trailing plasma slash crescent smear
        ctx.strokeStyle = b.evolved ? '#f6c453' : '#58f2ff';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = b.evolved ? 4.5 : 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.98, -1.3, 1.35);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (scytheArt) {
          ctx.drawImage(scytheArt, -sz / 2, -sz / 2, sz, sz);
        } else {
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, -1, 1.4);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      if (b.kind === 'ricochet') {
        // High-velocity incandescent kinetic ricochet dart + fading tracer streak
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        const wake = ctx.createLinearGradient(-26, 0, 10, 0);
        wake.addColorStop(0, 'rgba(92, 232, 224, 0)');
        wake.addColorStop(0.55, b.color);
        wake.addColorStop(1, '#ffffff');
        ctx.strokeStyle = wake;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(1, -2.2);
        ctx.lineTo(-7, 0);
        ctx.lineTo(1, 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (b.kind === 'acid_glob') {
        // Gritty sizzling caustic splash droplet (no cartoon border)
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        const r = b.radius * 1.25;
        const g = ctx.createRadialGradient(r * 0.15, 0, 0.5, 0, 0, r * 1.25);
        g.addColorStop(0, '#ecffe0');
        g.addColorStop(0.45, '#76d94c');
        g.addColorStop(0.85, 'rgba(42, 108, 24, 0.65)');
        g.addColorStop(1, 'rgba(20, 60, 12, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.3, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (b.kind === 'seeker_mine') {
        const pulse = 0.7 + 0.3 * Math.sin(realTime * 14 + b.id);
        const rot = realTime * 2.2 + b.id;
        const sz = b.radius * 2.85;
        ctx.save();
        if (mineShadow) {
          ctx.save();
          ctx.translate(b.x + 3.5, b.y + 6);
          ctx.rotate(rot);
          ctx.globalAlpha = 0.68;
          ctx.drawImage(mineShadow, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.translate(b.x, b.y);
        if (mineArt) {
          ctx.save();
          ctx.rotate(rot);
          ctx.drawImage(mineArt, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + pulse * 0.32;
        ctx.drawImage(sprites.get('glow_coral'), -sz * 0.55, -sz * 0.55, sz * 1.1, sz * 1.1);
        ctx.restore();
        continue;
      }

      if (b.kind === 'missile') {
        const ang = Math.atan2(b.vy, b.vx);
        const rot = ang + Math.PI / 2;
        const sz = 25;
        const flicker = 0.75 + 0.45 * Math.sin(realTime * 48 + b.id * 3);
        ctx.save();
        if (missileShadow) {
          ctx.save();
          ctx.translate(b.x + 4, b.y + 7);
          ctx.rotate(rot);
          ctx.globalAlpha = 0.6;
          ctx.drawImage(missileShadow, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.translate(b.x, b.y);
        ctx.rotate(rot);
        // Tight incandescent rocket nozzle spark (smoke puffs trail behind)
        ctx.fillStyle = '#ff9838';
        ctx.beginPath();
        ctx.arc(0, sz * 0.38, 2.6 * flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff5bd';
        ctx.beginPath();
        ctx.arc(0, sz * 0.36, 1.4, 0, Math.PI * 2);
        ctx.fill();

        if (missileArt) {
          ctx.drawImage(missileArt, -sz / 2, -sz / 2, sz, sz);
        } else {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      if (b.kind === 'mortar_shell') {
        const ang = Math.atan2(b.vy, b.vx);
        const rot = ang + Math.PI / 2;
        const sz = 28;
        ctx.save();
        if (mortarShadow) {
          ctx.save();
          ctx.translate(b.x + 5, b.y + 8);
          ctx.rotate(rot);
          ctx.globalAlpha = 0.62;
          ctx.drawImage(mortarShadow, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sprites.get('glow_magenta'), -20, -20, 40, 40);
        ctx.globalAlpha = 1;
        ctx.rotate(rot);
        if (mortarArt) {
          ctx.drawImage(mortarArt, -sz / 2, -sz / 2, sz, sz);
        } else {
          ctx.drawImage(sprites.get('bullet_violet'), -14, -14, 28, 28);
        }
        ctx.restore();
        continue;
      }

      if (b.kind === 'frost_bolt' || b.kind === 'shrapnel') {
        // Sharp metallic/cryo tracer splinter with hot trailing streak
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(1, -3.2);
        ctx.lineTo(-10, 0);
        ctx.lineTo(1, 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(1, -1.2);
        ctx.lineTo(-4, 0);
        ctx.lineTo(1, 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (b.kind === 'dagger_planted' || b.kind === 'dagger_homing') {
        const isHoming = b.kind === 'dagger_homing';
        const ang = isHoming ? Math.atan2(b.vy, b.vx) : realTime * 2.5 + b.id;
        const rot = ang + Math.PI / 2;
        const sz = isHoming ? 26 : 23;
        ctx.save();
        ctx.translate(b.x, b.y);
        if (isHoming) {
          ctx.save();
          ctx.rotate(ang);
          const streak = ctx.createLinearGradient(-24, 0, 0, 0);
          streak.addColorStop(0, 'rgba(255, 102, 229, 0)');
          streak.addColorStop(1, b.evolved ? '#f6c453' : '#ff66e5');
          ctx.strokeStyle = streak;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(-24, 0);
          ctx.lineTo(-4, 0);
          ctx.stroke();
          ctx.restore();
        }
        ctx.rotate(rot);
        if (daggerArt) {
          ctx.drawImage(daggerArt, -sz / 2, -sz / 2, sz, sz);
        } else {
          ctx.fillStyle = '#ff66e5';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      // Oriented inked Pulse Lance, Prism Drone Bolt & Parry Shards!
      const key =
        b.kind === 'parry_shard'
          ? 'bullet_shard'
          : b.kind === 'prism_bolt'
            ? 'bullet_prism'
            : 'bullet_cyan';
      const img = sprites.get(key);
      const size = b.radius * (b.kind === 'parry_shard' ? 4.5 : 4.1);
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  private drawEnemyBullets(
    ctx: CanvasRenderingContext2D,
    bullets: EnemyBullet[],
    realTime: number
  ): void {
    for (const b of bullets) {
      const key =
        b.kind === 'heavy_orb'
          ? 'bullet_heavy'
          : b.kind === 'diamond'
            ? 'bullet_amber'
            : b.kind === 'needle'
              ? 'bullet_crimson'
              : 'bullet_coral';
      const img = sprites.get(key);
      const pulse = b.kind === 'heavy_orb' ? 1 + Math.sin(realTime * 12 + b.id) * 0.08 : 1;
      const size = b.radius * (b.kind === 'heavy_orb' ? 4.8 : 4.5) * pulse;

      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.kind === 'heavy_orb') {
        ctx.rotate(realTime * 2.6 + b.id);
      } else {
        // Orient ALL molten tracer slugs, brass flechettes & crimson AP spikes along their flight trajectory!
        ctx.rotate(Math.atan2(b.vy, b.vx));
      }
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    // 1. Hand-painted 4-frame volumetric gritty military explosions!
    if (particles.explosions.length > 0) {
      const f0 = sprites.getArt('fx_exp_0');
      const f1 = sprites.getArt('fx_exp_1');
      const f2 = sprites.getArt('fx_exp_2');
      const f3 = sprites.getArt('fx_exp_3');
      for (const ex of particles.explosions) {
        if (ex.delay > 0) continue;
        const t = Math.max(0, Math.min(1, ex.age / Math.max(0.01, ex.duration)));
        const frame =
          t < 0.17 ? f0 : t < 0.44 ? f1 : t < 0.74 ? f2 : f3;
        if (!frame) continue;
        const scale =
          t < 0.17
            ? 0.66 + (t / 0.17) * 0.28
            : t < 0.44
              ? 0.94 + ((t - 0.17) / 0.27) * 0.16
              : 1.1 + ((t - 0.44) / 0.56) * 0.28;
        const alpha = t > 0.74 ? Math.max(0, (1 - t) / 0.26) : 1;
        const drawSz = ex.size * scale;
        ctx.save();
        ctx.translate(ex.x, ex.y);
        ctx.rotate(ex.rot + t * 0.35);
        ctx.globalAlpha = alpha;
        ctx.drawImage(frame, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
        ctx.restore();
      }
    }

    // 2. Soft dark exhaust smoke wisps, jagged armor debris & hot incandescent sparks
    for (const p of particles.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.shape === 'smoke') {
        const r = Math.max(2, p.size);
        const g = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, r * 1.3);
        g.addColorStop(0, 'rgba(42, 39, 36, 0.68)');
        g.addColorStop(0.6, 'rgba(30, 28, 26, 0.36)');
        g.addColorStop(1, 'rgba(20, 18, 18, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.0 * p.alpha + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, p.size * 0.78);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.042, p.y - p.vy * 0.042);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawCallouts(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of particles.texts) {
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.6);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${Math.round(13 * f.scale)}px "Chakra Petch", -apple-system, sans-serif`;
      ctx.fillStyle = '#09090d';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  private drawMinimalHint(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pulse = 0.58 + 0.38 * Math.sin(state.realTime * 4);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;
    ctx.font = '600 12px "Chakra Petch", -apple-system, sans-serif';
    ctx.fillStyle = '#ece3d3';
    const txt = state.input.hasInteracted ? 'Lift to slow time' : 'Drag to move';
    ctx.fillText(txt, state.player.x, state.player.y + 52);
    ctx.restore();
  }

  private drawAtmosphericAsh(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    halfW: number,
    halfH: number
  ): void {
    const cell = 135;
    const driftX = state.worldTime * 18;
    const driftY = state.worldTime * 11;
    const minX = Math.floor((state.cameraX - halfW - driftX) / cell);
    const maxX = Math.ceil((state.cameraX + halfW - driftX) / cell);
    const minY = Math.floor((state.cameraY - halfH - driftY) / cell);
    const maxY = Math.ceil((state.cameraY + halfH - driftY) / cell);

    const color =
      state.sectorId === 'furnace'
        ? 'rgba(255, 134, 66, 0.34)'
        : state.sectorId === 'helix'
          ? 'rgba(176, 232, 160, 0.25)'
          : state.sectorId === 'singularity'
            ? 'rgba(235, 198, 108, 0.26)'
            : 'rgba(225, 218, 205, 0.24)';

    ctx.fillStyle = color;
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const h1 = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
        const h2 = Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453;
        const fx = h1 - Math.floor(h1);
        const fy = h2 - Math.floor(h2);
        const mx = (cx + fx) * cell + driftX + Math.sin(state.worldTime + cy) * 6;
        const my = (cy + fy) * cell + driftY;
        const sz = fx > 0.72 ? 2.4 : 1.5;
        ctx.fillRect(mx, my, sz, sz);
      }
    }
  }

  private drawScreenAtmosphere(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: RenderState,
    skin: SkinDef
  ): void {
    const blend = state.player.stillpointBlend;
    const edgeAlpha = state.menuMode ? 0.62 : Math.round((0.42 + blend * 0.28) * 50) / 50;
    const vigKey = `${w}x${h}:${edgeAlpha}`;
    let grad = this.vignetteCache?.key === vigKey ? this.vignetteCache.grad : null;
    if (!grad) {
      grad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.48,
        Math.min(w, h) * 0.28,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.74
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(7, 7, 10, ${edgeAlpha})`);
      this.vignetteCache = { key: vigKey, grad };
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!state.menuMode && blend > 0.04 && !state.reduceFlash) {
      // Subtle military corner rangefinder ticks tinted with equipped Stillpoint Aura!
      const m = 12;
      const len = 18;
      ctx.strokeStyle = state.auraOuter;
      ctx.globalAlpha = blend * 0.6;
      ctx.lineWidth = 2;
      for (const [cx, cy, sx, sy] of [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1]
      ]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    void skin;
  }

  private drawOffscreenNodePips(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: RenderState
  ): void {
    const pad = 20;
    const targets: Array<{ x: number; y: number; color: string; big?: boolean }> = [];
    for (const n of state.nodes) {
      targets.push({ x: n.x, y: n.y, color: n.accent });
    }
    for (const e of state.enemies) {
      if (e.hp > 0 && e.kind === 'hauler') {
        targets.push({ x: e.x, y: e.y, color: '#f6c453', big: true });
      }
    }
    for (const pk of state.pickups) {
      if (pk.kind === 'chest') {
        targets.push({ x: pk.x, y: pk.y, color: '#e5b34c', big: true });
      }
    }
    if (targets.length === 0) return;

    for (const t of targets) {
      const sx = w * 0.5 + (t.x - state.cameraX) * this.worldScale;
      const sy = h * 0.5 + (t.y - state.cameraY) * this.worldScale;
      if (sx > pad && sx < w - pad && sy > pad + 40 && sy < h - pad) continue;

      const ang = Math.atan2(sy - h * 0.5, sx - w * 0.5);
      const ex = Math.max(pad, Math.min(w - pad, sx));
      const ey = Math.max(pad + 54, Math.min(h - pad, sy));
      const sz = t.big ? 9 : 7;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ang);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(sz, 0);
      ctx.lineTo(-sz * 0.72, -sz * 0.72);
      ctx.lineTo(-sz * 0.72, sz * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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
    const maxR = 50;
    const clamped = Math.min(maxR, dist);
    const kx = dist > 0.1 ? ox + (dx / dist) * clamped : ox;
    const ky = dist > 0.1 ? oy + (dy / dist) * clamped : oy;

    ctx.save();
    ctx.strokeStyle = 'rgba(235, 231, 220, 0.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox, oy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(kx, ky);
    ctx.stroke();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ebe7dc';
    ctx.beginPath();
    ctx.arc(kx, ky, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
