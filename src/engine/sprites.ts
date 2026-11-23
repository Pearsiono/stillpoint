import { SKINS } from '../data/skins';
import { CoatingItem, EnemyKind, SectorId, SkinId, VesselId } from '../types';
import { bakeCoatedShipCanvas } from './patternBaker';

export type SpriteKey =
  | 'bullet_coral'
  | 'bullet_amber'
  | 'bullet_crimson'
  | 'bullet_heavy'
  | 'bullet_cyan'
  | 'bullet_shard'
  | 'bullet_prism'
  | 'bullet_violet'
  | 'xp_small'
  | 'xp_mid'
  | 'xp_large'
  | 'pickup_heal'
  | 'pickup_blood'
  | 'pickup_shard'
  | 'pickup_magnet'
  | 'pickup_chest'
  | 'glow_cyan'
  | 'glow_magenta'
  | 'glow_coral'
  | 'glow_gold'
  | 'glow_emerald';

export type RuinPropKey = 'slab' | 'girder' | 'gear' | 'pillar' | 'hazard_plate';

const SHIP_ART_KEYS: VesselId[] = [
  'vesper',
  'aegis',
  'reaper',
  'prism',
  'phantom',
  'volt',
  'pyre',
  'bastion',
  'nova',
  'glacier',
  'seraph',
  'valkyrie'
];

const ENEMY_ART_MAP: Partial<Record<EnemyKind, string>> = {
  swarmer: 'enemy_swarmer',
  dart: 'enemy_dart',
  turret: 'enemy_turret',
  splitter: 'enemy_splitter',
  ring_caster: 'enemy_ring_caster',
  sniper: 'enemy_sniper',
  bulwark: 'enemy_bulwark',
  spinner: 'enemy_spinner',
  reflector: 'enemy_reflector',
  mine: 'enemy_mine',
  leech: 'enemy_leech',
  bomber: 'enemy_bomber',
  aegis_bot: 'enemy_aegis_bot',
  carrier: 'enemy_carrier',
  hauler: 'enemy_hauler',
  boss_weaver: 'boss_weaver',
  boss_seraph: 'boss_seraph',
  boss_archon: 'boss_archon',
  boss_leviathan: 'boss_leviathan'
};

class SpriteBank {
  private bank = new Map<SpriteKey, HTMLCanvasElement>();
  private biomeTiles = new Map<SectorId, HTMLCanvasElement>();
  private ruinProps = new Map<RuinPropKey, HTMLCanvasElement>();

  // High-detail rendered PNG art assets loaded from ./art/
  private artImages = new Map<string, HTMLImageElement>();
  private artReady = new Set<string>();
  private shadowCache = new Map<string, HTMLCanvasElement>();
  private skinShipCache = new Map<string, HTMLCanvasElement>();
  private coatingShipCache = new Map<string, HTMLCanvasElement>();
  private onArtLoadedCallbacks: Array<() => void> = [];
  private initialized = false;

  onArtLoaded(cb: () => void): void {
    this.onArtLoadedCallbacks.push(cb);
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Preload all high-detail rendered PNG sprites
    for (const v of SHIP_ART_KEYS) {
      this.loadArt(`ship_${v}`, `./art/ship_${v}.png`);
    }
    for (const fileKey of Object.values(ENEMY_ART_MAP)) {
      if (fileKey) this.loadArt(fileKey, `./art/${fileKey}.png`);
    }
    this.loadArt('node_shrine', './art/node_shrine.png');
    this.loadArt('node_pact', './art/node_pact.png');

    // Preload painterly seamless terrain floor tiles & rendered wreckage props!
    for (const sec of ['drift', 'helix', 'furnace', 'singularity']) {
      this.loadArt(`tile_${sec}`, `./art/tile_${sec}.jpg`, false);
    }
    for (const prop of ['slab', 'gear', 'grate', 'monolith']) {
      this.loadArt(`prop_${prop}`, `./art/prop_${prop}.png`, false);
    }

    // Warm browser image cache for menu banners & painted weapon icons so tabs render instantaneously
    for (const src of [
      './art/sector_drift.jpg',
      './art/sector_helix.jpg',
      './art/sector_furnace.jpg',
      './art/sector_singularity.jpg',
      './art/icon_pulse_lance.png',
      './art/icon_halo_blades.png',
      './art/icon_arc_tether.png',
      './art/icon_prism_drones.png',
      './art/icon_void_mortars.png',
      './art/icon_phase_daggers.png',
      './art/icon_chrono_scythe.png',
      './art/icon_ricochet_shard.png',
      './art/icon_nova_pulse.png',
      './art/icon_rail_turret.png',
      './art/icon_frost_nova.png',
      './art/icon_swarm_missiles.png',
      './art/icon_core.png',
      './art/icon_shield.png',
      './art/icon_shard.png'
    ]) {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = src;
    }

    // Projectiles & pickups
    this.bank.set('bullet_coral', this.makeEnemyShot(44, '#ff4d4d', '#b81d24', '#fff5e6'));
    this.bank.set('bullet_amber', this.makeEnemyShot(44, '#ff9f1c', '#b34700', '#fff8db'));
    this.bank.set('bullet_crimson', this.makeEnemyShot(48, '#ff2a55', '#8a0826', '#ffffff'));
    this.bank.set('bullet_heavy', this.makeHeavyOrb(60));

    this.bank.set('bullet_cyan', this.makeOrb(38, '#45e8d8', '#0f766e', '#eafffd'));
    this.bank.set('bullet_shard', this.makeDiamond(42, '#5ef2e6', '#0d9488', '#ffffff'));
    this.bank.set('bullet_prism', this.makeDiamond(38, '#9be8ff', '#4f46e5', '#ffffff'));
    this.bank.set('bullet_violet', this.makeOrb(46, '#d387ff', '#6b21a8', '#fdf4ff'));

    this.bank.set('xp_small', this.makeDiamond(24, '#45e8d8', '#115e59', '#eafffd'));
    this.bank.set('xp_mid', this.makeDiamond(30, '#72d2ff', '#1d4ed8', '#ffffff'));
    this.bank.set('xp_large', this.makeDiamond(38, '#e5b34c', '#b45309', '#fffbe6'));
    this.bank.set('pickup_heal', this.makeMedCell(40));
    this.bank.set('pickup_blood', this.makeDiamond(36, '#e03e4a', '#78141c', '#ffe6ea'));
    this.bank.set('pickup_shard', this.makeDiamond(38, '#f472b6', '#9d174d', '#fff0f7'));
    this.bank.set('pickup_magnet', this.makeRingOrb(38, '#45e8d8', '#0f766e'));
    this.bank.set('pickup_chest', this.makeRelicChest(44));

    this.bank.set('glow_cyan', this.makeGlow(128, 'rgba(69,232,216,0.58)', 'rgba(15,118,110,0)'));
    this.bank.set('glow_magenta', this.makeGlow(128, 'rgba(232,96,255,0.62)', 'rgba(130,30,190,0)'));
    this.bank.set('glow_coral', this.makeGlow(128, 'rgba(255,82,66,0.58)', 'rgba(180,20,20,0)'));
    this.bank.set('glow_gold', this.makeGlow(128, 'rgba(229,179,76,0.62)', 'rgba(180,100,20,0)'));
    this.bank.set('glow_emerald', this.makeGlow(128, 'rgba(142,224,108,0.56)', 'rgba(40,140,60,0)'));

    // Biome tiles & grounded ruin props
    this.biomeTiles.set('drift', this.makeBiomeTile('drift'));
    this.biomeTiles.set('helix', this.makeBiomeTile('helix'));
    this.biomeTiles.set('furnace', this.makeBiomeTile('furnace'));
    this.biomeTiles.set('singularity', this.makeBiomeTile('singularity'));

    this.ruinProps.set('slab', this.makeRuinSlab());
    this.ruinProps.set('girder', this.makeRuinGirder());
    this.ruinProps.set('gear', this.makeRuinGear());
    this.ruinProps.set('pillar', this.makeRuinPillar());
    this.ruinProps.set('hazard_plate', this.makeHazardPlate());
  }

  private loadArt(key: string, src: string, withShadow = true): void {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.artReady.add(key);
      if (withShadow) {
        this.buildShadow(key, img);
      }
      if (key.startsWith('ship_')) {
        for (const cb of this.onArtLoadedCallbacks) cb();
      }
    };
    img.src = src;
    this.artImages.set(key, img);
  }

  private buildShadow(key: string, img: HTMLImageElement): void {
    const size = Math.min(160, Math.max(64, img.naturalWidth || 128));
    const [c, ctx] = this.createCanvas(size);
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.fillRect(0, 0, size, size);
    this.shadowCache.set(key, c);
  }

  get(key: SpriteKey): HTMLCanvasElement {
    if (!this.initialized) this.init();
    return this.bank.get(key)!;
  }

  getCoatedShipArt(
    vesselId: VesselId,
    coating: CoatingItem,
    size = 192
  ): HTMLCanvasElement | HTMLImageElement | null {
    if (!this.initialized) this.init();
    const baseKey = `ship_${vesselId}`;
    if (!this.artReady.has(baseKey)) return null;
    const baseImg = this.artImages.get(baseKey)!;
    if (coating.finishId === 'factory_issue') return baseImg;

    const cacheKey = `${vesselId}:${coating.finishId}:${coating.seed}:${coating.floatVal.toFixed(4)}:${size}`;
    const existing = this.coatingShipCache.get(cacheKey);
    if (existing) {
      // Refresh LRU position so active locker thumbnails never evict on repeated taps
      this.coatingShipCache.delete(cacheKey);
      this.coatingShipCache.set(cacheKey, existing);
      return existing;
    }

    const baked = bakeCoatedShipCanvas(baseImg, coating, size);
    if (this.coatingShipCache.size >= 180) {
      const oldest = this.coatingShipCache.keys().next().value;
      if (oldest) this.coatingShipCache.delete(oldest);
    }
    this.coatingShipCache.set(cacheKey, baked);
    return baked;
  }

  getPaintedBiomeTile(sector: SectorId): HTMLImageElement | null {
    if (!this.initialized) this.init();
    const key = `tile_${sector}`;
    return this.artReady.has(key) ? this.artImages.get(key) ?? null : null;
  }

  getPaintedProp(key: 'slab' | 'gear' | 'grate' | 'monolith'): HTMLImageElement | null {
    if (!this.initialized) this.init();
    const full = `prop_${key}`;
    return this.artReady.has(full) ? this.artImages.get(full) ?? null : null;
  }

  getShipArt(vesselId: VesselId, skinId: SkinId): HTMLCanvasElement | HTMLImageElement | null {
    if (!this.initialized) this.init();
    const baseKey = `ship_${vesselId}`;
    if (!this.artReady.has(baseKey)) return null;
    const baseImg = this.artImages.get(baseKey)!;
    if (skinId === 'cyanide') return baseImg;

    const cacheKey = `${vesselId}:${skinId}`;
    const existing = this.skinShipCache.get(cacheKey);
    if (existing) return existing;

    const skin = SKINS[skinId];
    const S = 192;
    const [c, ctx] = this.createCanvas(S);
    ctx.drawImage(baseImg, 0, 0, S, S);

    // Luminance-preserving chassis finish tinting (keeps rivets, metal scratches & highlights!)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    if (skinId === 'ink') {
      // Stark monochrome weathered bone & ink look
      ctx.fillStyle = 'rgba(20, 20, 24, 0.45)';
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillRect(0, 0, S, S);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(240, 236, 224, 0.22)';
      ctx.fillRect(0, 0, S, S);
    } else if (skinId === 'ronin') {
      // Cream & crimson oxide armor glaze
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(208, 62, 54, 0.58)';
      ctx.fillRect(0, 0, S, S);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(236, 224, 204, 0.16)';
      ctx.fillRect(0, 0, S, S);
    } else {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = skin.accent;
      ctx.globalAlpha = skinId === 'gilded' || skinId === 'sakura' ? 0.58 : 0.48;
      ctx.fillRect(0, 0, S, S);

      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = skin.hullTrim;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(0, 0, S, S);
    }
    ctx.restore();

    // Restore original crisp alpha channel so zero edge bleed happens
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(baseImg, 0, 0, S, S);

    this.skinShipCache.set(cacheKey, c);
    return c;
  }

  getShipShadow(vesselId: VesselId): HTMLCanvasElement | null {
    return this.shadowCache.get(`ship_${vesselId}`) ?? null;
  }

  getEnemyArt(kind: EnemyKind): HTMLImageElement | null {
    if (!this.initialized) this.init();
    const key = ENEMY_ART_MAP[kind];
    if (!key || !this.artReady.has(key)) return null;
    return this.artImages.get(key) ?? null;
  }

  getEnemyShadow(kind: EnemyKind): HTMLCanvasElement | null {
    const key = ENEMY_ART_MAP[kind];
    if (!key) return null;
    return this.shadowCache.get(key) ?? null;
  }

  getNodeArt(kind: 'shrine' | 'pact_altar'): HTMLImageElement | null {
    if (!this.initialized) this.init();
    const key = kind === 'shrine' ? 'node_shrine' : 'node_pact';
    if (!this.artReady.has(key)) return null;
    return this.artImages.get(key) ?? null;
  }

  getBiomeTile(sector: SectorId): HTMLCanvasElement {
    if (!this.initialized) this.init();
    return this.biomeTiles.get(sector)!;
  }

  getRuinProp(key: RuinPropKey): HTMLCanvasElement {
    if (!this.initialized) this.init();
    return this.ruinProps.get(key)!;
  }

  private createCanvas(size: number, h = size): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = h;
    const ctx = c.getContext('2d')!;
    return [c, ctx];
  }

  private seededRand(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  private makeBiomeTile(sector: SectorId): HTMLCanvasElement {
    const S = 256;
    const [c, ctx] = this.createCanvas(S);
    const rand = this.seededRand(
      sector === 'drift' ? 101 : sector === 'helix' ? 202 : sector === 'furnace' ? 303 : 404
    );

    const baseColor =
      sector === 'drift'
        ? '#1b1b20'
        : sector === 'helix'
          ? '#151e1c'
          : sector === 'furnace'
            ? '#201514'
            : '#17161c';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, S, S);

    for (let i = 0; i < 24; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 18 + rand() * 44;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      if (sector === 'drift') {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(98, 90, 78, 0.14)' : 'rgba(8, 8, 12, 0.22)');
      } else if (sector === 'helix') {
        g.addColorStop(0, i % 2 === 0 ? 'rgba(64, 114, 78, 0.16)' : 'rgba(10, 16, 15, 0.24)');
      } else if (sector === 'furnace') {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(145, 58, 28, 0.16)' : 'rgba(10, 6, 6, 0.26)');
      } else {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(154, 126, 70, 0.12)' : 'rgba(9, 8, 14, 0.22)');
      }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }

    ctx.strokeStyle =
      sector === 'furnace'
        ? 'rgba(0, 0, 0, 0.44)'
        : sector === 'singularity'
          ? 'rgba(229, 179, 76, 0.09)'
          : 'rgba(0, 0, 0, 0.34)';
    ctx.lineWidth = 2;

    if (sector === 'drift') {
      ctx.strokeRect(1, 1, 126, 126);
      ctx.strokeRect(129, 1, 126, 126);
      ctx.strokeRect(1, 129, 126, 126);
      ctx.strokeRect(129, 129, 126, 126);
      ctx.fillStyle = 'rgba(218, 200, 158, 0.065)';
      ctx.fillRect(124, 18, 6, 54);
      ctx.fillRect(124, 148, 6, 54);
    } else if (sector === 'helix') {
      for (let gx = 0; gx < S; gx += 64) {
        for (let gy = 0; gy < S; gy += 64) {
          ctx.strokeRect(gx + 1, gy + 1, 62, 62);
        }
      }
      ctx.strokeStyle = 'rgba(130, 110, 92, 0.24)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(86, 0);
      ctx.lineTo(86, S);
      ctx.moveTo(170, 0);
      ctx.lineTo(170, S);
      ctx.stroke();
      ctx.fillStyle = 'rgba(16, 14, 13, 0.35)';
      for (let ry = 8; ry < S; ry += 32) {
        ctx.fillRect(74, ry, 108, 6);
      }
    } else if (sector === 'furnace') {
      for (let gx = 0; gx < S; gx += 128) {
        for (let gy = 0; gy < S; gy += 128) {
          ctx.strokeRect(gx + 2, gy + 2, 124, 124);
          ctx.fillStyle = 'rgba(255, 195, 165, 0.11)';
          for (const [rx, ry] of [
            [10, 10],
            [118, 10],
            [10, 118],
            [118, 118]
          ]) {
            ctx.beginPath();
            ctx.arc(gx + rx, gy + ry, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.strokeStyle = 'rgba(255, 106, 38, 0.24)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 92);
      ctx.lineTo(66, 118);
      ctx.lineTo(110, 108);
      ctx.lineTo(154, 142);
      ctx.stroke();
    } else {
      ctx.strokeRect(2, 2, 124, 124);
      ctx.strokeRect(130, 2, 124, 124);
      ctx.strokeRect(2, 130, 124, 124);
      ctx.strokeRect(130, 130, 124, 124);
      ctx.strokeStyle = 'rgba(229, 179, 76, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(128, 128, 56, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.44)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      let cx = rand() * S;
      let cy = rand() * S;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let seg = 0; seg < 4; seg++) {
        cx += (rand() - 0.5) * 34;
        cy += (rand() - 0.5) * 34;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    for (let p = 0; p < 520; p++) {
      const px = Math.floor(rand() * S);
      const py = Math.floor(rand() * S);
      ctx.fillStyle = rand() > 0.52 ? 'rgba(235, 228, 212, 0.055)' : 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(px, py, 2, 2);
    }
    return c;
  }

  private makeRuinSlab(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(110, 74);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(18, 22, 74, 42);
    ctx.fillStyle = '#2d2d33';
    ctx.beginPath();
    ctx.moveTo(14, 16);
    ctx.lineTo(84, 14);
    ctx.lineTo(90, 52);
    ctx.lineTo(54, 58);
    ctx.lineTo(16, 52);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#47464e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#7c432c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(82, 24);
    ctx.lineTo(104, 21);
    ctx.moveTo(84, 38);
    ctx.lineTo(101, 41);
    ctx.moveTo(15, 32);
    ctx.lineTo(4, 34);
    ctx.stroke();
    return c;
  }

  private makeRuinGirder(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(130, 44);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(10, 18, 114, 18);
    ctx.fillStyle = '#4a3128';
    ctx.fillRect(6, 12, 116, 18);
    ctx.fillStyle = '#694334';
    ctx.fillRect(6, 12, 116, 4);
    ctx.fillStyle = '#2e1d18';
    ctx.fillRect(6, 26, 116, 4);
    ctx.fillStyle = '#18181c';
    for (let x = 18; x < 108; x += 22) {
      ctx.fillRect(x, 18, 12, 6);
    }
    return c;
  }

  private makeRuinGear(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(96, 96);
    ctx.save();
    ctx.translate(48, 48);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(4, 5, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#383229';
    ctx.strokeStyle = '#695c46';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      const r = i % 2 === 0 ? 35 : 27;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a191d';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return c;
  }

  private makeRuinPillar(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(72, 72);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.arc(40, 42, 22, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(30, 30, 4, 36, 36, 22);
    g.addColorStop(0, '#44444c');
    g.addColorStop(1, '#232329');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(36, 36, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c5a63';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return c;
  }

  private makeHazardPlate(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(90, 90);
    ctx.fillStyle = '#25262b';
    ctx.fillRect(10, 10, 70, 70);
    ctx.strokeStyle = '#3e4047';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 70, 70);
    ctx.save();
    ctx.beginPath();
    ctx.rect(12, 66, 66, 12);
    ctx.clip();
    ctx.fillStyle = 'rgba(218, 165, 42, 0.36)';
    for (let x = 0; x < 96; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 66);
      ctx.lineTo(x + 7, 66);
      ctx.lineTo(x + 1, 78);
      ctx.lineTo(x - 6, 78);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return c;
  }

  private makeGlow(size: number, inner: string, outer: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, inner.replace(/0\.\d+\)/, '0.2)'));
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  private makeEnemyShot(size: number, mid: string, outer: string, core: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    ctx.fillStyle = 'rgba(10, 4, 6, 0.55)';
    ctx.beginPath();
    ctx.arc(half, half, half * 0.62, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, core);
    g.addColorStop(0.3, core);
    g.addColorStop(0.5, mid);
    g.addColorStop(0.76, outer + '88');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private makeOrb(size: number, mid: string, outer: string, core: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, core);
    g.addColorStop(0.3, core);
    g.addColorStop(0.5, mid);
    g.addColorStop(0.75, outer + '77');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private makeHeavyOrb(size: number): HTMLCanvasElement {
    // High-contrast molten crimson-gold heavy ordnance orb
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    ctx.fillStyle = 'rgba(20, 6, 8, 0.58)';
    ctx.beginPath();
    ctx.arc(half, half, half * 0.7, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, '#fff7dc');
    g.addColorStop(0.28, '#ffbe4f');
    g.addColorStop(0.52, '#ff3b30');
    g.addColorStop(0.78, 'rgba(180, 22, 24, 0.38)');
    g.addColorStop(1, 'rgba(140, 12, 16, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffcf70';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  }

  private makeDiamond(size: number, mid: string, outer: string, core: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, mid + 'aa');
    g.addColorStop(0.55, outer + '44');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(half, half);
    ctx.fillStyle = mid;
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.62);
    ctx.lineTo(half * 0.44, 0);
    ctx.lineTo(0, half * 0.62);
    ctx.lineTo(-half * 0.44, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.32);
    ctx.lineTo(half * 0.2, 0);
    ctx.lineTo(0, half * 0.32);
    ctx.lineTo(-half * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return c;
  }

  private makeMedCell(size: number): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    ctx.fillStyle = '#1f2924';
    ctx.strokeStyle = '#8ee06c';
    ctx.lineWidth = 2;
    ctx.fillRect(half - 10, half - 10, 20, 20);
    ctx.strokeRect(half - 10, half - 10, 20, 20);
    ctx.fillStyle = '#eaffea';
    ctx.fillRect(half - 2, half - 6, 4, 12);
    ctx.fillRect(half - 6, half - 2, 12, 4);
    return c;
  }

  private makeRelicChest(size: number): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    ctx.fillStyle = '#332818';
    ctx.strokeStyle = '#e5b34c';
    ctx.lineWidth = 2.2;
    ctx.fillRect(half - 12, half - 9, 24, 18);
    ctx.strokeRect(half - 12, half - 9, 24, 18);
    ctx.fillStyle = '#e5b34c';
    ctx.fillRect(half - 12, half - 2, 24, 4);
    ctx.fillStyle = '#45e8d8';
    ctx.fillRect(half - 3, half - 4, 6, 8);
    return c;
  }

  private makeRingOrb(size: number, color: string, outer: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color + 'aa');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  }
}

export const sprites = new SpriteBank();
