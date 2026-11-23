import { SECTORS } from '../data/sectors';
import { resolveSkinColors, SKINS } from '../data/skins';
import { PACTS } from '../data/upgrades';
import {
  BlinkDecoy,
  BossEnclosure,
  CoatingItem,
  CoreId,
  Enemy,
  EnemyBullet,
  HazardZone,
  InputSnapshot,
  LaserBeam,
  MeteorStrike,
  ParryWave,
  Pickup,
  PlayerBullet,
  PlayerState,
  RailPylon,
  SectorId,
  SkinDef,
  SkinId,
  VesselId,
  WorldNode
} from '../types';
import { ParticleSystem } from './particles';
import { RuinPropKey, sprites } from './sprites';
import { getHaloBladesPositions, getPrismDronePositions } from './weapons';

export interface RenderState {
  player: PlayerState;
  vesselId: VesselId;
  coreId: CoreId;
  skinId: SkinId;
  coating: CoatingItem;
  trailColor: string;
  trailCoreColor: string;
  accentColor: string;
  sectorId: SectorId;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  pylons: RailPylon[];
  hazards: HazardZone[];
  nodes: WorldNode[];
  decoys: BlinkDecoy[];
  meteors: MeteorStrike[];
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
      this.drawPylons(ctx, state.pylons, state.realTime);
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
      this.drawParryWaves(ctx, state.parryWaves);
      this.drawParticles(ctx, state.particles);
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
      this.drawFloatingJoystick(ctx, state.input, skin.accent);
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

        ctx.strokeStyle = `rgba(142, 224, 108, ${0.45 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 7]);
        ctx.save();
        ctx.rotate(realTime * 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(216, 255, 200, 0.82)';
        ctx.font = '800 9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('2× OVERCLOCK', 0, 4);
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
        ctx.font = '800 9px -apple-system, sans-serif';
        ctx.fillStyle = pact.accent;
        ctx.fillText(pact.name, 0, -n.radius - 14);
        ctx.fillStyle = '#ebe7dc';
        ctx.font = '700 8.5px -apple-system, sans-serif';
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
        const t = Math.min(1, h.age / h.maxAge);
        const rad = 18 + ((h.maxRadius ?? 110) - 18) * (1 - Math.pow(1 - t, 2.5));
        ctx.save();
        ctx.strokeStyle = h.color;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.lineWidth = (h.kind === 'frost_burst' ? 3.5 : 5) * (1 - t) + 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      const fade = Math.min(1, (h.maxAge - h.age) * 2);
      ctx.save();
      ctx.translate(h.x, h.y);
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
    // Meteor Barrage red-amber ground telegraph circles
    for (const m of state.meteors) {
      const progress = 1 - Math.max(0, m.timer / m.maxTimer);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = `rgba(255, 106, 38, ${0.12 + progress * 0.22})`;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6a26';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Expanding inner detonation fill
      ctx.strokeStyle = '#fff0b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Phantom Blink exploding decoys
    const shipArt = sprites.getCoatedShipArt(state.vesselId, state.coating);
    for (const d of state.decoys) {
      const ratio = 1 - d.age / d.maxAge;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.strokeStyle = '#cf7dff';
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 26 + (1 - ratio) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (shipArt) {
        ctx.globalAlpha = 0.45 + Math.sin(state.realTime * 28) * 0.15;
        ctx.drawImage(shipArt, -22, -22, 44, 44);
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
        ctx.font = '900 10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`×${cnt}`, 0, -r - 4);
      }
      ctx.restore();
    }
  }

  private drawPylons(ctx: CanvasRenderingContext2D, pylons: RailPylon[], realTime: number): void {
    for (const py of pylons) {
      ctx.save();
      ctx.translate(py.x, py.y);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(4, 7, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2c2924';
      ctx.strokeStyle = py.evolved ? '#45e8d8' : '#e5b34c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 2);
      ctx.lineTo(0, 11);
      ctx.lineTo(-10, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.8 + Math.sin(realTime * 10 + py.id) * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], realTime: number): void {
    for (const p of pickups) {
      const bob = Math.sin(realTime * 5.5 + p.id) * 1.6;
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
    const parryReady = player.parryCooldown <= 0 && player.kineticCharge >= 18;
    const accent = state.accentColor;

    // 1. Thruster exhaust wake
    for (const t of player.trail) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.globalAlpha = t.alpha * 0.45;
      ctx.fillStyle = state.trailColor;
      ctx.beginPath();
      ctx.arc(0, 0, 5.2 * t.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // 2. Subtle Graze Halo
    ctx.save();
    ctx.rotate(realTime * (0.35 + blend * 1.2));
    ctx.strokeStyle = player.grazeCombo > 0 ? accent : 'rgba(235, 231, 220, 0.14)';
    ctx.globalAlpha = player.grazeCombo > 0 ? 0.52 : 1;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, player.grazeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Chrono-Relic Astrolabe Ring during Stillpoint (+ Gravity Siphon / Surge aura!)
    if (player.surgeTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sprites.get('glow_gold'), -46, -46, 92, 92);
      ctx.restore();
    }

    if (blend > 0.08) {
      ctx.save();
      ctx.globalAlpha = blend * 0.78;
      ctx.rotate(-realTime * (state.coreId === 'siphon' ? 2.4 : 0.9));
      ctx.strokeStyle =
        state.coreId === 'siphon'
          ? '#e08538'
          : state.coreId === 'berserk'
            ? '#d94842'
            : state.coreId === 'overclock'
              ? '#e2a93b'
              : accent;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([12, 8, 2, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, state.coreId === 'siphon' ? 68 : 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 38, Math.sin(a) * 38);
        ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Diegetic Kinetic Charge Ring around vessel
    const ringR = 28 + blend * 4;
    ctx.strokeStyle = 'rgba(235, 231, 220, 0.14)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (chargeRatio > 0.01) {
      ctx.strokeStyle = player.overchargeReady
        ? '#f6c453'
        : player.focusStallTimer > 0
          ? '#8c5349'
          : blend > 0.25
            ? '#ffffff'
            : parryReady
              ? accent
              : 'rgba(235,231,220,0.45)';
      ctx.lineWidth = player.overchargeReady ? 3.8 : parryReady ? 3 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio);
      ctx.stroke();
    }

    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(235, 245, 255, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.stroke();
    }

    const shipArt = sprites.getCoatedShipArt(vesselId, coating);
    const shipShadow = sprites.getShipShadow(vesselId);
    const shipSize = vesselId === 'aegis' || vesselId === 'nova' ? 50 : 48;
    const rot = player.facingAngle + Math.PI / 2; // PNGs point straight UP (-PI/2)

    // 5. Exact Silhouette Grounded Hover Shadow!
    if (shipShadow) {
      ctx.save();
      ctx.translate(7, 12);
      ctx.rotate(rot);
      ctx.drawImage(shipShadow, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      ctx.restore();
    }

    // 6. Rendered Hover-Rig Sprite (with baked CS:GO pattern & float wear!) + Custom Thruster Jet Plumes!
    ctx.save();
    ctx.rotate(rot);
    const invulnBlink = player.invulnTimer > 0 && Math.floor(realTime * 22) % 2 === 0;
    ctx.globalAlpha = invulnBlink ? 0.35 : 1 - blend * 0.42;

    if (Math.hypot(player.vx, player.vy) > 20 && !player.inStillpoint) {
      this.drawThrusterPlumeVertical(ctx, vesselId, state.trailColor, state.trailCoreColor, 0.8 + Math.random() * 0.3);
    }

    if (shipArt) {
      ctx.drawImage(shipArt, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      if (player.hitFlash > 0.1) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = player.hitFlash * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
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

      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 8.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawThrusterPlumeVertical(
    ctx: CanvasRenderingContext2D,
    vesselId: VesselId,
    color: string,
    coreColor: string,
    intensity: number
  ): void {
    const len = 10 + intensity * 12;
    const drawJet = (x: number, y: number, w: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + len);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.45, y);
      ctx.lineTo(x, y + len * 0.55);
      ctx.lineTo(x + w * 0.45, y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    if (vesselId === 'aegis' || vesselId === 'nova' || vesselId === 'volt') {
      drawJet(-7, 17, 3.2);
      drawJet(7, 17, 3.2);
    } else {
      drawJet(0, 17, 3.8);
    }
  }

  private drawOrbitalWeapons(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const blades = getHaloBladesPositions(state.player, state.realTime);
    for (const b of blades) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle * 4.2);
      ctx.fillStyle = '#25292e';
      ctx.strokeStyle = b.evolved ? '#e5b34c' : '#4effb4';
      ctx.lineWidth = b.isStillpoint ? 3 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ebe7dc';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-b.radius * 0.72, 0);
      ctx.lineTo(b.radius * 0.72, 0);
      ctx.moveTo(0, -b.radius * 0.72);
      ctx.lineTo(0, b.radius * 0.72);
      ctx.stroke();
      ctx.restore();
    }

    const drones = getPrismDronePositions(state.player, state.realTime);
    for (const d of drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle + Math.PI / 2);
      ctx.fillStyle = '#2d333d';
      ctx.strokeStyle = d.evolved ? '#e5b34c' : '#45e8d8';
      ctx.lineWidth = 1.6;
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
        if (e.hitFlash > 0.1) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = e.hitFlash * 0.65;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 0.88, 0, Math.PI * 2);
          ctx.fill();
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
        ctx.strokeStyle = '#e5b34c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();

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
    // Articulated armored tail segments for Void Leviathan
    if (boss.kind === 'boss_leviathan' && boss.segments) {
      for (let i = boss.segments.length - 1; i >= 0; i--) {
        const seg = boss.segments[i];
        const segR = boss.radius * (0.82 - i * 0.055);
        ctx.save();
        ctx.translate(seg.x, seg.y);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(6, 10, segR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d312f';
        ctx.strokeStyle = '#758279';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, segR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4effb4';
        ctx.beginPath();
        ctx.arc(0, 0, segR * 0.3, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, boss.radius * 1.05, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ratio;
        ctx.lineCap = 'round';
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.width * (0.7 + ratio * 0.55);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, l.width * 0.36 * ratio);
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
      if (b.kind === 'scythe') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spinAngle ?? realTime * 14);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.evolved ? 4 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, -0.9, 1.5);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.88, -0.6, 1.1);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (b.kind === 'ricochet') {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.color;
        ctx.fillRect(-9, -2, 18, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-5, -1, 12, 2);
        ctx.restore();
        continue;
      }

      if (b.kind === 'missile') {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff5d6';
        ctx.fillRect(-10, -1.5, 5, 3);
        ctx.restore();
        continue;
      }

      if (b.kind === 'frost_bolt' || b.kind === 'shrapnel') {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(0, -3.5);
        ctx.lineTo(-7, 0);
        ctx.lineTo(0, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (b.kind === 'dagger_planted' || b.kind === 'dagger_homing') {
        const ang = b.kind === 'dagger_homing' ? Math.atan2(b.vy, b.vx) : realTime * 2.5 + b.id;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = b.evolved ? '#e5b34c' : '#ff66e5';
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
        ctx.lineTo(-2, -1.8);
        ctx.lineTo(-2, 1.8);
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
      if (b.kind === 'void_unparryable') {
        const img = sprites.get('bullet_void');
        const pulse = 1 + Math.sin(realTime * 18 + b.id) * 0.1;
        const size = b.radius * 4.7 * pulse;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(realTime * 4.5 + b.id);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
        continue;
      }
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const w of waves) {
      const t = Math.min(1, w.age / w.duration);
      const alpha = (1 - t) * 0.95;

      ctx.strokeStyle = w.colorInner;
      ctx.globalAlpha = alpha * 0.65;
      ctx.lineWidth = 4 * (1 - t) + 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Math.max(4, w.radius - 4), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = w.colorOuter;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 6.5 * (1 - t) + 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
    for (const p of particles.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.shape === 'shard') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#141418';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.size, 0);
        ctx.lineTo(-p.size * 0.6, -p.size * 0.55);
        ctx.lineTo(-p.size * 0.35, p.size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'ring') {
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
      ctx.font = `900 ${Math.round(13 * f.scale)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#09090d';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  private drawMinimalHint(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pulse = 0.55 + 0.4 * Math.sin(state.realTime * 4);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;
    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ebe7dc';
    const txt = state.input.hasInteracted ? 'LIFT → STILLPOINT' : 'DRAG · LIFT';
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
    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.48,
      Math.min(w, h) * 0.28,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.74
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(7, 7, 10, ${state.menuMode ? 0.62 : 0.42 + blend * 0.28})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!state.menuMode && blend > 0.04 && !state.reduceFlash) {
      // Subtle military corner rangefinder ticks instead of a neon screen-edge box!
      const m = 12;
      const len = 18;
      ctx.strokeStyle = state.accentColor;
      ctx.globalAlpha = blend * 0.55;
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
