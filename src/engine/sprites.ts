import { EnemyKind, SectorId } from '../types';

export type SpriteKey =
  | 'bullet_coral'
  | 'bullet_amber'
  | 'bullet_crimson'
  | 'bullet_parry'
  | 'bullet_cyan'
  | 'bullet_shard'
  | 'bullet_prism'
  | 'bullet_violet'
  | 'xp_small'
  | 'xp_mid'
  | 'xp_large'
  | 'pickup_heal'
  | 'pickup_shard'
  | 'pickup_magnet'
  | 'pickup_chest'
  | 'glow_cyan'
  | 'glow_magenta'
  | 'glow_coral'
  | 'glow_gold'
  | 'glow_emerald';

export type RuinPropKey = 'slab' | 'girder' | 'gear' | 'pillar' | 'hazard_plate';

class SpriteBank {
  private bank = new Map<SpriteKey, HTMLCanvasElement>();
  private enemySprites = new Map<EnemyKind, HTMLCanvasElement>();
  private biomeTiles = new Map<SectorId, HTMLCanvasElement>();
  private ruinProps = new Map<RuinPropKey, HTMLCanvasElement>();
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // High-contrast molten & relic projectiles (razor-readable over textured wasteland terrain!)
    this.bank.set('bullet_coral', this.makeEnemyShot(44, '#ff4d4d', '#b81d24', '#fff5e6'));
    this.bank.set('bullet_amber', this.makeEnemyShot(44, '#ff9f1c', '#b34700', '#fff8db'));
    this.bank.set('bullet_crimson', this.makeEnemyShot(48, '#ff2a55', '#8a0826', '#ffffff'));
    this.bank.set('bullet_parry', this.makeParryOrb(60));

    // Player relic shots
    this.bank.set('bullet_cyan', this.makeOrb(38, '#45e8d8', '#0f766e', '#eafffd'));
    this.bank.set('bullet_shard', this.makeDiamond(42, '#5ef2e6', '#0d9488', '#ffffff'));
    this.bank.set('bullet_prism', this.makeDiamond(38, '#9be8ff', '#4f46e5', '#ffffff'));
    this.bank.set('bullet_violet', this.makeOrb(46, '#d387ff', '#6b21a8', '#fdf4ff'));

    // Pickups
    this.bank.set('xp_small', this.makeDiamond(24, '#45e8d8', '#115e59', '#eafffd'));
    this.bank.set('xp_mid', this.makeDiamond(30, '#72d2ff', '#1d4ed8', '#ffffff'));
    this.bank.set('xp_large', this.makeDiamond(38, '#e5b34c', '#b45309', '#fffbe6'));
    this.bank.set('pickup_heal', this.makeMedCell(40));
    this.bank.set('pickup_shard', this.makeDiamond(38, '#f472b6', '#9d174d', '#fff0f7'));
    this.bank.set('pickup_magnet', this.makeRingOrb(38, '#45e8d8', '#0f766e'));
    this.bank.set('pickup_chest', this.makeRelicChest(44));

    // Soft ambient radial glows
    this.bank.set('glow_cyan', this.makeGlow(128, 'rgba(69,232,216,0.58)', 'rgba(15,118,110,0)'));
    this.bank.set('glow_magenta', this.makeGlow(128, 'rgba(232,96,255,0.62)', 'rgba(130,30,190,0)'));
    this.bank.set('glow_coral', this.makeGlow(128, 'rgba(255,82,66,0.58)', 'rgba(180,20,20,0)'));
    this.bank.set('glow_gold', this.makeGlow(128, 'rgba(229,179,76,0.62)', 'rgba(180,100,20,0)'));
    this.bank.set('glow_emerald', this.makeGlow(128, 'rgba(142,224,108,0.56)', 'rgba(40,140,60,0)'));

    // Pre-bake 4 Post-Apocalyptic Biome Ground Tiles (256x256 seamless)
    this.biomeTiles.set('drift', this.makeBiomeTile('drift'));
    this.biomeTiles.set('helix', this.makeBiomeTile('helix'));
    this.biomeTiles.set('furnace', this.makeBiomeTile('furnace'));
    this.biomeTiles.set('singularity', this.makeBiomeTile('singularity'));

    // Pre-bake Grounded Ruin Props
    this.ruinProps.set('slab', this.makeRuinSlab());
    this.ruinProps.set('girder', this.makeRuinGirder());
    this.ruinProps.set('gear', this.makeRuinGear());
    this.ruinProps.set('pillar', this.makeRuinPillar());
    this.ruinProps.set('hazard_plate', this.makeHazardPlate());

    // Pre-bake Shaded Corrupted War-Automaton Sprites
    const kinds: EnemyKind[] = [
      'swarmer',
      'dart',
      'turret',
      'splitter',
      'ring_caster',
      'sniper',
      'bulwark',
      'spinner',
      'reflector',
      'mine'
    ];
    for (const k of kinds) {
      this.enemySprites.set(k, this.makeEnemySprite(k));
    }
  }

  get(key: SpriteKey): HTMLCanvasElement {
    if (!this.initialized) this.init();
    return this.bank.get(key)!;
  }

  getEnemy(kind: EnemyKind): HTMLCanvasElement | undefined {
    if (!this.initialized) this.init();
    return this.enemySprites.get(kind);
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

  // ---------- POST-APOCALYPTIC BIOME FLOOR TILES ----------
  private makeBiomeTile(sector: SectorId): HTMLCanvasElement {
    const S = 256;
    const [c, ctx] = this.createCanvas(S);
    const rand = this.seededRand(
      sector === 'drift' ? 101 : sector === 'helix' ? 202 : sector === 'furnace' ? 303 : 404
    );

    // Base weathered earth/stone color
    const baseColor =
      sector === 'drift'
        ? '#1a1a1e'
        : sector === 'helix'
          ? '#141c1a'
          : sector === 'furnace'
            ? '#1e1413'
            : '#16151a';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, S, S);

    // Organic blotches (ash patches, damp moss, soot, ancient dust)
    for (let i = 0; i < 24; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 18 + rand() * 44;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      if (sector === 'drift') {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(92, 84, 74, 0.14)' : 'rgba(8, 8, 12, 0.22)');
      } else if (sector === 'helix') {
        g.addColorStop(0, i % 2 === 0 ? 'rgba(64, 110, 74, 0.16)' : 'rgba(10, 16, 15, 0.24)');
      } else if (sector === 'furnace') {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(140, 56, 28, 0.15)' : 'rgba(10, 6, 6, 0.26)');
      } else {
        g.addColorStop(0, i % 3 === 0 ? 'rgba(148, 122, 68, 0.11)' : 'rgba(9, 8, 14, 0.22)');
      }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }

    // Architectural concrete / flagstone / steel plate joints
    ctx.strokeStyle =
      sector === 'furnace'
        ? 'rgba(0, 0, 0, 0.42)'
        : sector === 'singularity'
          ? 'rgba(229, 179, 76, 0.08)'
          : 'rgba(0, 0, 0, 0.34)';
    ctx.lineWidth = 2;

    if (sector === 'drift') {
      // Cracked highway concrete slabs (128x128) + faint faded road stripe
      ctx.strokeRect(1, 1, 126, 126);
      ctx.strokeRect(129, 1, 126, 126);
      ctx.strokeRect(1, 129, 126, 126);
      ctx.strokeRect(129, 129, 126, 126);
      ctx.fillStyle = 'rgba(218, 200, 158, 0.065)';
      ctx.fillRect(124, 18, 6, 54);
      ctx.fillRect(124, 148, 6, 54);
    } else if (sector === 'helix') {
      // Subway concrete tiles (64x64) + corroded rail tracks
      for (let gx = 0; gx < S; gx += 64) {
        for (let gy = 0; gy < S; gy += 64) {
          ctx.strokeRect(gx + 1, gy + 1, 62, 62);
        }
      }
      // Subtle weathered rail lines
      ctx.strokeStyle = 'rgba(130, 110, 92, 0.22)';
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
      // Riveted iron foundry floor plates + smoldering crack glow
      for (let gx = 0; gx < S; gx += 128) {
        for (let gy = 0; gy < S; gy += 128) {
          ctx.strokeRect(gx + 2, gy + 2, 124, 124);
          // Corner rivets
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
      // Thin glowing ember seam
      ctx.strokeStyle = 'rgba(255, 106, 38, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 92);
      ctx.lineTo(66, 118);
      ctx.lineTo(110, 108);
      ctx.lineTo(154, 142);
      ctx.stroke();
    } else {
      // Ancient carved basalt flagstones with recessed gold chrono-inlays
      ctx.strokeRect(2, 2, 124, 124);
      ctx.strokeRect(130, 2, 124, 124);
      ctx.strokeRect(2, 130, 124, 124);
      ctx.strokeRect(130, 130, 124, 124);
      ctx.strokeStyle = 'rgba(229, 179, 76, 0.11)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(128, 128, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(128, 44);
      ctx.lineTo(128, 212);
      ctx.moveTo(44, 128);
      ctx.lineTo(212, 128);
      ctx.stroke();
    }

    // Hairline concrete cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
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

    // Tactile surface grit / sand / ash grain (handcrafted painted feel!)
    for (let p = 0; p < 520; p++) {
      const px = Math.floor(rand() * S);
      const py = Math.floor(rand() * S);
      const bright = rand() > 0.52;
      ctx.fillStyle = bright ? 'rgba(235, 228, 212, 0.055)' : 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(px, py, 2, 2);
    }

    return c;
  }

  // ---------- GROUNDED WASTELAND RUIN PROPS ----------
  private makeRuinSlab(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(110, 74);
    // Ground drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(18, 22, 74, 42);
    // Cracked concrete block
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
    // Exposed rusted rebar rods sticking out
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
    // Surface crack
    ctx.strokeStyle = '#141418';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(42, 15);
    ctx.lineTo(48, 34);
    ctx.lineTo(58, 44);
    ctx.stroke();
    return c;
  }

  private makeRuinGirder(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(130, 44);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(10, 18, 114, 18);
    // Rusted steel I-beam
    ctx.fillStyle = '#4a3128';
    ctx.fillRect(6, 12, 116, 18);
    ctx.fillStyle = '#694334';
    ctx.fillRect(6, 12, 116, 4);
    ctx.fillStyle = '#2e1d18';
    ctx.fillRect(6, 26, 116, 4);
    // Truss cutouts
    ctx.fillStyle = '#18181c';
    for (let x = 18; x < 108; x += 22) {
      ctx.fillRect(x, 18, 12, 6);
    }
    return c;
  }

  private makeRuinGear(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(96, 96);
    const half = 48;
    ctx.save();
    ctx.translate(half, half);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(4, 5, 34, 0, Math.PI * 2);
    ctx.fill();

    // Half-buried ancient corroded brass gear
    ctx.fillStyle = '#383229';
    ctx.strokeStyle = '#695c46';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const teeth = 10;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i * Math.PI) / teeth;
      const r = i % 2 === 0 ? 35 : 27;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a191d';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(69, 232, 216, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
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

    // Moss patch
    ctx.fillStyle = 'rgba(92, 138, 86, 0.45)';
    ctx.beginPath();
    ctx.arc(28, 42, 8, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private makeHazardPlate(): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(90, 90);
    ctx.fillStyle = '#25262b';
    ctx.fillRect(10, 10, 70, 70);
    ctx.strokeStyle = '#3e4047';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 70, 70);
    // Faded yellow-ochre warning stripes along bottom edge
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

  // ---------- HANDCRAFTED SHADED CORRUPTED WAR-AUTOMATON SPRITES ----------
  private makeEnemySprite(kind: EnemyKind): HTMLCanvasElement {
    const S = 96;
    const [c, ctx] = this.createCanvas(S);
    const half = S / 2;
    ctx.save();
    ctx.translate(half, half);

    const metalGrad = (c1: string, c2: string, r = 34) => {
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      return g;
    };

    const drawEye = (x: number, y: number, r: number, color = '#ff3b3b') => {
      ctx.fillStyle = '#12080a';
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3e6';
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    };

    switch (kind) {
      case 'swarmer': {
        // Scrap Hound: rusted iron twin-pincer drone
        ctx.fillStyle = metalGrad('#6e554e', '#2d2322');
        ctx.strokeStyle = '#b58d7f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(6, -12);
        ctx.lineTo(22, -24);
        ctx.lineTo(-22, -20);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-22, 20);
        ctx.lineTo(22, 24);
        ctx.lineTo(6, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Armor seam + red sensor eye
        ctx.fillStyle = '#241c1d';
        ctx.fillRect(-10, -8, 16, 16);
        drawEye(8, 0, 5.5, '#ff4545');
        break;
      }
      case 'dart': {
        // Rust Striker: oxidized bronze interceptor wedge
        ctx.fillStyle = metalGrad('#9e683b', '#3b2416');
        ctx.strokeStyle = '#e3b27d';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(36, 0);
        ctx.lineTo(-18, -26);
        ctx.lineTo(-28, -14);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-28, 14);
        ctx.lineTo(-18, 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Central dorsal ridge + amber optic
        ctx.strokeStyle = '#1f130d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(26, 0);
        ctx.stroke();
        drawEye(12, 0, 5, '#ffaa2b');
        break;
      }
      case 'turret': {
        // Bunker Pod: riveted hexagonal gunmetal turret + hazard band
        ctx.fillStyle = metalGrad('#5a626b', '#262a30');
        ctx.strokeStyle = '#9ca6b0';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = Math.cos(a) * 30;
          const py = Math.sin(a) * 30;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Gun barrel
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(12, -7, 22, 14);
        ctx.strokeStyle = '#7d8791';
        ctx.strokeRect(12, -7, 22, 14);
        // Rust stripe + rivets
        ctx.fillStyle = '#c94c38';
        ctx.fillRect(-16, -20, 8, 40);
        drawEye(2, 0, 7, '#ff385c');
        break;
      }
      case 'splitter': {
        // Cargo Mimic: cracked salvage cube leaking molten seams
        ctx.fillStyle = metalGrad('#5e5346', '#29241e');
        ctx.strokeStyle = '#a6947c';
        ctx.lineWidth = 2.4;
        ctx.fillRect(-26, -26, 52, 52);
        ctx.strokeRect(-26, -26, 52, 52);
        // Glowing orange unstable fissure cross
        ctx.strokeStyle = '#ff8c2b';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-24, -4);
        ctx.lineTo(0, 2);
        ctx.lineTo(24, -6);
        ctx.moveTo(-4, -24);
        ctx.lineTo(2, 24);
        ctx.stroke();
        drawEye(0, 0, 6.5, '#ffae33');
        break;
      }
      case 'ring_caster': {
        // Relic Bell: corroded bronze octagon with 8 emission ports
        ctx.fillStyle = metalGrad('#755d47', '#2b221c');
        ctx.strokeStyle = '#c4a682';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const px = Math.cos(a) * 31;
          const py = Math.sin(a) * 31;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 8 radial firing nozzles
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.fillStyle = '#ff3877';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 23, Math.sin(a) * 23, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        drawEye(0, 0, 8, '#ff3377');
        break;
      }
      case 'sniper': {
        // Rail Stalker: elongated carbon barrel frame + crimson rangefinder
        ctx.fillStyle = metalGrad('#4e4a5e', '#1e1c26');
        ctx.strokeStyle = '#a99ec2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(38, -4);
        ctx.lineTo(38, 4);
        ctx.lineTo(-6, 16);
        ctx.lineTo(-28, 12);
        ctx.lineTo(-22, 0);
        ctx.lineTo(-28, -12);
        ctx.lineTo(-6, -16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        drawEye(8, 0, 5.5, '#f03cff');
        break;
      }
      case 'bulwark': {
        // Siege Crawler: massive armored iron tank frame with frontal blast shields
        ctx.fillStyle = '#25262b';
        ctx.fillRect(-30, -34, 60, 12);
        ctx.fillRect(-30, 22, 60, 12);
        ctx.fillStyle = metalGrad('#6e5858', '#2e2224');
        ctx.strokeStyle = '#b89797';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(30, -24);
        ctx.lineTo(36, 0);
        ctx.lineTo(30, 24);
        ctx.lineTo(-28, 24);
        ctx.lineTo(-32, 0);
        ctx.lineTo(-28, -24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Heavy front armor plates
        ctx.strokeStyle = '#e3b27d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(16, -22);
        ctx.lineTo(24, 0);
        ctx.lineTo(16, 22);
        ctx.stroke();
        drawEye(0, 0, 8.5, '#ff4d94');
        break;
      }
      case 'spinner': {
        // Turbine Saw: 4-blade rusted industrial gyro-rotor
        ctx.fillStyle = metalGrad('#7a4b44', '#2e1d1c');
        ctx.strokeStyle = '#d1988c';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 2);
          ctx.beginPath();
          ctx.moveTo(6, -6);
          ctx.lineTo(34, -12);
          ctx.lineTo(30, 8);
          ctx.lineTo(6, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        drawEye(0, 0, 8, '#ff5e5b');
        break;
      }
      case 'reflector': {
        // Mirror Sentinel: polished alloy shield-wing drone with violet relic crystal
        ctx.fillStyle = metalGrad('#868d9e', '#323642');
        ctx.strokeStyle = '#e5e9f5';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(0, -28);
        ctx.lineTo(-26, -14);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-26, 14);
        ctx.lineTo(0, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        drawEye(4, 0, 7.5, '#ff52f0');
        break;
      }
      case 'mine': {
        // Slag Charge: spiked rusted land/hover mine
        ctx.strokeStyle = '#a3673c';
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
          ctx.lineTo(Math.cos(a) * 33, Math.sin(a) * 33);
          ctx.stroke();
        }
        ctx.fillStyle = metalGrad('#594438', '#211916');
        ctx.strokeStyle = '#c49068';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawEye(0, 0, 8, '#ff9f1c');
        break;
      }
      default:
        break;
    }

    ctx.restore();
    return c;
  }

  // ---------- HIGH-CONTRAST PROJECTILES & PICKUPS ----------
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
    // Crisp dark rim halo so molten shots pop unmistakably over textured stone!
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

  private makeParryOrb(size: number): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    ctx.fillStyle = 'rgba(18, 6, 24, 0.58)';
    ctx.beginPath();
    ctx.arc(half, half, half * 0.72, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.28, '#ffd6ff');
    g.addColorStop(0.52, '#ff45eb');
    g.addColorStop(0.78, 'rgba(180, 30, 240, 0.35)');
    g.addColorStop(1, 'rgba(180, 30, 240, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff9ef8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.44, 0, Math.PI * 2);
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
