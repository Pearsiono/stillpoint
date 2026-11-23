import { sound } from '../audio';
import {
  Enemy,
  EnemyBullet,
  HazardZone,
  LaserBeam,
  OwnedWeapon,
  PlayerBullet,
  PlayerState,
  RailPylon,
  VesselId,
  WorldNode
} from '../types';
import { ParticleSystem } from './particles';

export interface WeaponWorldContext {
  player: PlayerState;
  vesselId: VesselId;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  pylons: RailPylon[];
  hazards: HazardZone[];
  nodes: WorldNode[];
  lasers: LaserBeam[];
  particles: ParticleSystem;
  accentColor: string;
  nextId: () => number;
  damageEnemy: (enemy: Enemy, dmg: number, color: string, isCrit?: boolean) => void;
  damageShrinesInRadius: (x: number, y: number, radius: number, dmg: number) => void;
  damageShrinesAlongLine: (x1: number, y1: number, x2: number, y2: number, halfWidth: number, dmg: number) => void;
  spawnXp: (x: number, y: number, value: number) => void;
  time: number;
  justEnteredStillpoint: boolean;
  justExitedStillpoint: boolean;
}

export interface HaloBladeRender {
  x: number;
  y: number;
  radius: number;
  angle: number;
  isStillpoint: boolean;
  evolved: boolean;
}

export interface PrismDroneRender {
  x: number;
  y: number;
  angle: number;
  evolved: boolean;
}

export interface FlailRender {
  x: number;
  y: number;
  radius: number;
  angle: number;
  evolved: boolean;
}

export function getGravityFlailPositions(player: PlayerState): FlailRender[] {
  const w = player.weapons.find((item) => item.id === 'grav_flail');
  if (!w) return [];
  const blend = player.stillpointBlend;
  const count = w.evolved ? 2 : 1;
  const armLen = (82 + w.level * 9 + blend * 22) * player.areaMult;
  const ballR = (15 + w.level * 1.6 + (w.evolved ? 4 : 0)) * Math.min(1.45, player.areaMult);
  const res: FlailRender[] = [];
  for (let i = 0; i < count; i++) {
    const a = player.flailAngle + (i * Math.PI * 2) / count;
    res.push({
      x: player.x + Math.cos(a) * armLen,
      y: player.y + Math.sin(a) * armLen,
      radius: ballR,
      angle: a,
      evolved: w.evolved
    });
  }
  return res;
}

export function findNearestEnemy(
  x: number,
  y: number,
  enemies: Enemy[],
  maxDist = 520,
  preferBoss = false,
  excludeId?: number
): Enemy | null {
  let best: Enemy | null = null;
  let bestScore = maxDist * maxDist;
  for (const e of enemies) {
    if (e.hp <= 0 || e.id === excludeId) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxDist * maxDist) continue;
    const score = preferBoss && (e.isBoss || e.isElite) ? d2 * 0.25 : d2;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export function getHaloBladesPositions(player: PlayerState): HaloBladeRender[] {
  const w = player.weapons.find((item) => item.id === 'halo_blades');
  if (!w) return [];

  const result: HaloBladeRender[] = [];
  const blend = player.stillpointBlend;
  const baseCount = w.evolved ? 5 : 2 + Math.floor((w.level + 1) / 2);
  const orbitRadius = (56 + blend * 30) * player.areaMult;
  const bladeRadius = (13 + w.level * 1.4 + blend * 5) * Math.min(1.5, player.areaMult);

  for (let i = 0; i < baseCount; i++) {
    const ang = player.haloOrbitAngle + (i * Math.PI * 2) / baseCount;
    result.push({
      x: player.x + Math.cos(ang) * orbitRadius,
      y: player.y + Math.sin(ang) * orbitRadius,
      radius: bladeRadius,
      angle: ang,
      isStillpoint: blend > 0.35,
      evolved: w.evolved
    });
  }

  if (w.evolved) {
    const outerRadius = (96 + blend * 22) * player.areaMult;
    for (let i = 0; i < 4; i++) {
      const ang = -player.haloOrbitAngle * 0.72 + (i * Math.PI * 2) / 4;
      result.push({
        x: player.x + Math.cos(ang) * outerRadius,
        y: player.y + Math.sin(ang) * outerRadius,
        radius: bladeRadius * 1.12,
        angle: ang,
        isStillpoint: blend > 0.35,
        evolved: true
      });
    }
  }

  return result;
}

export function getPrismDronePositions(player: PlayerState): PrismDroneRender[] {
  const w = player.weapons.find((item) => item.id === 'prism_drones');
  if (!w) return [];
  const count = w.evolved ? 6 : 1 + Math.ceil(w.level / 2);
  const blend = player.stillpointBlend;
  const dist = (46 - blend * 14) * Math.min(1.3, player.areaMult);
  const result: PrismDroneRender[] = [];
  for (let i = 0; i < count; i++) {
    const ang = player.droneOrbitAngle + (i * Math.PI * 2) / count;
    result.push({
      x: player.x + Math.cos(ang) * dist,
      y: player.y + Math.sin(ang) * dist,
      angle: ang,
      evolved: w.evolved
    });
  }
  return result;
}

export function updateWeapons(ctx: WeaponWorldContext, dtWorld: number, dtReal: number): void {
  const { player, enemies, playerBullets, hazards, particles } = ctx;
  const inStillpoint = player.inStillpoint;
  const startBulletLen = playerBullets.length;
  const overclockMult = player.inOverclockRing ? 1.85 : 1;
  const surgeMult = player.surgeTimer > 0 ? 1.32 : 1;
  const frenzyMult = player.frenzyTimer > 0 ? 1.4 : 1;
  const berserkMult = 1 + Math.min(0.6, player.berserkStacks * 0.08);
  const momentumMult = player.modules.includes('momentum_drive')
    ? 0.85 + player.momentumMoveTime * 0.55
    : 1;
  const bastionStillMult = ctx.vesselId === 'bastion' && inStillpoint ? 1.25 : 1;
  const syncBase = player.modules.includes('deadeye_sync') ? 1.46 : 1.28;
  const syncStreak = Math.max(0, player.syncStreak - 1) * 0.04;
  const syncMult = player.syncBuffTimer > 0 ? syncBase + syncStreak : 1;
  const overclockCarryMult = player.syncOverclockCarry > 0 && !inStillpoint ? 1.35 : 1;
  const totalRateMult =
    player.fireRateMult *
    overclockMult *
    surgeMult *
    frenzyMult *
    berserkMult *
    momentumMult *
    bastionStillMult *
    syncMult *
    overclockCarryMult;

  // Integrate continuous orbital phases so Stillpoint transitions never snap blade/drone angles
  const orbSpin = player.relics.includes('orbital_overdrive') ? 1.35 : 1.0;
  const haloW = player.weapons.find((item) => item.id === 'halo_blades');
  if (haloW) {
    const haloSpeed = (2.8 + haloW.level * 0.35 + player.stillpointBlend * 3.8) * orbSpin;
    player.haloOrbitAngle = (player.haloOrbitAngle + haloSpeed * dtReal) % (Math.PI * 200);
  }
  const droneW = player.weapons.find((item) => item.id === 'prism_drones');
  if (droneW) {
    const droneSpeed = (1.8 + player.stillpointBlend * 2.2) * orbSpin;
    player.droneOrbitAngle = (player.droneOrbitAngle + droneSpeed * dtReal) % (Math.PI * 200);
  }
  const flailW = player.weapons.find((item) => item.id === 'grav_flail');
  if (flailW) {
    const flailSpeed = (2.4 + flailW.level * 0.25 + player.stillpointBlend * 4.2) * orbSpin;
    player.flailAngle = (player.flailAngle + flailSpeed * dtReal) % (Math.PI * 200);
  }

  if (ctx.justEnteredStillpoint) {
    // Seeker Mines: entering Stillpoint remotely detonates every active mine at 2x blast radius!
    const blastLv = player.passives.find((p) => p.id === 'blast_capacitor')?.level ?? 0;
    const blastMult = 1 + blastLv * 0.18;
    let minesDetonated = 0;
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      if (b.kind !== 'seeker_mine') continue;
      minesDetonated++;
      const r = (b.blastRadius ?? 72) * 1.85 * blastMult;
      const dmg = b.damage * 1.45 * blastMult;
      particles.shatter(b.x, b.y, '#ff5c38', 10, 1.3);
      particles.ripple(b.x, b.y, r * 1.2, 13, '#ff5c38', 0.36);
      for (const e of [...enemies]) {
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) <= r + e.radius) {
          ctx.damageEnemy(e, dmg, '#ff5c38', true);
        }
      }
      ctx.damageShrinesInRadius(b.x, b.y, r, dmg);
      if (b.evolved) {
        for (let k = 0; k < 3; k++) {
          const ang = (k * Math.PI * 2) / 3 + Math.random() * 0.6;
          playerBullets.push({
            id: ctx.nextId(),
            kind: 'missile',
            x: b.x,
            y: b.y,
            vx: Math.cos(ang) * 380,
            vy: Math.sin(ang) * 380,
            radius: 5,
            damage: b.damage * 0.65,
            pierce: 1,
            age: 0,
            maxAge: 1.4,
            color: '#f6c453',
            homing: 9,
            hitSet: new Set(),
            blastRadius: 36 * player.areaMult
          });
        }
      }
      playerBullets.splice(i, 1);
    }
    if (minesDetonated > 0) {
      sound.playCoreBurst(Math.min(6, 2 + minesDetonated), true);
      particles.callout(player.x, player.y - 38, `DETONATE ×${minesDetonated}`, '#ff5c38', 1.1, 0.75);
    }
    for (const h of hazards) {
      if (h.kind === 'crater') {
        h.kind = 'singularity';
        h.collapsed = true;
        h.pullStrength = 250;
        particles.ring(h.x, h.y, '#d96bff', h.radius * 0.4, 0.25);
      }
    }
    let launched = 0;
    for (const b of playerBullets) {
      if (b.kind === 'dagger_planted') {
        b.kind = 'dagger_homing';
        b.age = 0;
        b.maxAge = 2.2;
        b.homing = 11.5;
        const target = findNearestEnemy(b.x, b.y, enemies, 720, true);
        const ang = target
          ? Math.atan2(target.y - b.y, target.x - b.x)
          : Math.atan2(b.y - player.y, b.x - player.x);
        const spd = 490 * player.projectileSpeedMult;
        b.vx = Math.cos(ang) * spd;
        b.vy = Math.sin(ang) * spd;
        b.targetId = target?.id;
        launched++;
      }
    }
    if (launched > 0) {
      sound.playShoot('dagger');
      particles.callout(player.x, player.y - 34, `×${launched}`, '#ff66e5', 1.0, 0.65);
    }
  }

  if (ctx.justExitedStillpoint) {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.kind === 'singularity' && h.collapsed) {
        const blastR = h.radius * (h.evolved ? 1.55 : 1.35);
        const burstDmg = h.damagePerSec * (h.evolved ? 2.6 : 2.1);
        particles.burst(h.x, h.y, '#d96bff', 18, 80, 260, 4, 0.45);
        particles.ripple(h.x, h.y, blastR * 1.4, 14, '#d96bff', 0.4);
        sound.playShoot('mortar');
        for (const e of [...enemies]) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - h.x, e.y - h.y) <= blastR + e.radius) {
            ctx.damageEnemy(e, burstDmg, '#e09eff', true);
          }
        }
        if (!h.evolved) hazards.splice(i, 1);
        else h.collapsed = false;
      }
    }

    // Nova Pulse: Stillpoint implosion release mega-blast!
    const nova = player.weapons.find((w) => w.id === 'nova_pulse');
    if (nova && player.stillpointTimeHeld > 0.2) {
      const radius = (140 + nova.level * 18 + (nova.evolved ? 40 : 0)) * player.areaMult;
      const dmg = (42 + nova.level * 14 + (nova.evolved ? 40 : 0)) * player.damageMult;
      fireNovaWave(ctx, radius, dmg, nova.evolved, true);
    }

    // Swarm Missiles: unleash Macross lock-on barrage on touch-down!
    const swarm = player.weapons.find((w) => w.id === 'swarm_missiles');
    if (swarm && player.missileLocks.length > 0) {
      launchLockedMissiles(ctx, swarm);
    }
  }

  // Update Rail Pylons continuously
  updateActivePylons(ctx, dtWorld, dtReal);

  for (const w of player.weapons) {
    // Stillpoint slows weapon cadence moderately (Overclock core boosts weaponDtReal separately)
    const dtWeapon = inStillpoint ? dtReal * 0.54 : dtWorld;
    w.cooldown -= dtWeapon * totalRateMult;
    w.auxTimer += dtReal;
    const readyBefore = w.cooldown <= 0;

    const runWeapon = () => {
      switch (w.id) {
        case 'pulse_lance':
          updatePulseLance(ctx, w);
          break;
        case 'halo_blades':
          updateHaloBlades(ctx, w);
          break;
        case 'arc_tether':
          updateArcTether(ctx, w);
          break;
        case 'prism_drones':
          updatePrismDrones(ctx, w);
          break;
        case 'void_mortars':
          updateVoidMortars(ctx, w);
          break;
        case 'phase_daggers':
          updatePhaseDaggers(ctx, w);
          break;
        case 'chrono_scythe':
          updateChronoScythe(ctx, w);
          break;
        case 'ricochet_shard':
          updateRicochetShard(ctx, w);
          break;
        case 'nova_pulse':
          updateNovaPulse(ctx, w);
          break;
        case 'rail_turret':
          updateRailTurret(ctx, w);
          break;
        case 'frost_nova':
          updateFrostNova(ctx, w);
          break;
        case 'swarm_missiles':
          updateSwarmMissiles(ctx, w);
          break;
        case 'grav_flail':
          updateGravFlail(ctx, w);
          break;
        case 'acid_sprayer':
          updateAcidSprayer(ctx, w);
          break;
        case 'mirror_beam':
          updateMirrorBeam(ctx, w);
          break;
        case 'shatter_mine':
          updateShatterMine(ctx, w);
          break;
      }
    };

    runWeapon();
    // Echo Matrix relic: every 4th fired weapon cycle triggers an instant bonus volley!
    if (readyBefore && w.cooldown > 0 && player.relics.includes('echo_salvo')) {
      player.echoSalvoCounter++;
      if (player.echoSalvoCounter >= 4) {
        player.echoSalvoCounter = 0;
        const savedCd = w.cooldown;
        w.cooldown = 0;
        runWeapon();
        w.cooldown = savedCd;
      }
    }
  }

  // Heavy Ordnance module: newly fired shots gain +1 pierce and wider profile
  if (player.modules.includes('heavy_ordnance') && playerBullets.length > startBulletLen) {
    for (let i = startBulletLen; i < playerBullets.length; i++) {
      const b = playerBullets[i];
      if (b.kind !== 'mortar_shell' && b.kind !== 'scythe') {
        b.pierce += 1;
        b.radius = Math.min(11, b.radius * 1.25);
      }
    }
  }
}

function updatePulseLance(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets, hazards, lasers, particles } = ctx;
  if (ctx.justEnteredStillpoint && w.cooldown < 0.25) w.cooldown = 0;
  if (w.cooldown > 0) return;

  const target = findNearestEnemy(player.x, player.y, enemies, 580, player.inStillpoint);
  const aimAngle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.facingAngle;

  if (player.inStillpoint) {
    w.cooldown = w.evolved ? 0.35 : Math.max(0.38, 0.56 - w.level * 0.03);
    const beamLen = 560;
    const beamWidth = (w.evolved ? 18 : 11 + w.level * 1.4) * player.areaMult;
    const dmg = (w.evolved ? 64 : 28 + w.level * 9) * player.damageMult;
    const offsets = w.evolved ? [-14, 14] : [0];
    const perpX = -Math.sin(aimAngle);
    const perpY = Math.cos(aimAngle);

    sound.playShoot('rail');
    for (const off of offsets) {
      const sx = player.x + perpX * off;
      const sy = player.y + perpY * off;
      const ex = sx + Math.cos(aimAngle) * beamLen;
      const ey = sy + Math.sin(aimAngle) * beamLen;

      lasers.push({
        x1: sx,
        y1: sy,
        x2: ex,
        y2: ey,
        width: beamWidth,
        color: w.evolved ? '#f6c453' : ctx.accentColor,
        alpha: 1,
        life: 0.2,
        maxLife: 0.2,
        isEnemy: false
      });

      for (const e of [...enemies]) {
        if (e.hp <= 0) continue;
        if (pointToSegmentDist(e.x, e.y, sx, sy, ex, ey) <= e.radius + beamWidth * 0.65) {
          ctx.damageEnemy(e, dmg, w.evolved ? '#f6c453' : ctx.accentColor, true);
          particles.burst(e.x, e.y, ctx.accentColor, 4, 40, 120, 2.5, 0.25);
        }
      }
      ctx.damageShrinesAlongLine(sx, sy, ex, ey, beamWidth * 0.65, dmg);

      if (w.evolved && off === offsets[0]) {
        hazards.push({
          id: ctx.nextId(),
          kind: 'rift',
          x: player.x + Math.cos(aimAngle) * 190,
          y: player.y + Math.sin(aimAngle) * 190,
          radius: 54 * player.areaMult,
          damagePerSec: 48 * player.damageMult,
          age: 0,
          maxAge: 2.0,
          color: ctx.accentColor,
          collapsed: false,
          evolved: true,
          pullStrength: 135
        });
      }
    }
    return;
  }

  w.cooldown = w.evolved ? 0.16 : Math.max(0.2, 0.37 - w.level * 0.03);
  const shots =
    (w.evolved ? 4 : w.level >= 4 ? 3 : w.level >= 2 ? 2 : 1) + player.bonusProjectiles;
  const spread = shots === 1 ? 0 : 0.13;
  const baseDmg = (w.evolved ? 28 : 13 + w.level * 4) * player.damageMult;
  const speed = 530 * player.projectileSpeedMult;

  sound.playShoot('pulse');
  for (let i = 0; i < shots; i++) {
    const ang = aimAngle + (i - (shots - 1) / 2) * spread;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'pulse',
      x: player.x + Math.cos(ang) * 12,
      y: player.y + Math.sin(ang) * 12,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius: 5.5,
      damage: baseDmg,
      pierce: w.evolved ? 3 : w.level >= 5 ? 2 : 1,
      age: 0,
      maxAge: 1.15,
      color: w.evolved ? '#f6c453' : ctx.accentColor,
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved
    });
  }
}

function updateHaloBlades(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  const blades = getHaloBladesPositions(player);
  const tickInterval = player.inStillpoint ? 0.095 : 0.16;

  // Evolved ECLIPSE GYRO periodically launches homing solar razor flares!
  if (w.evolved && w.cooldown <= 0) {
    w.cooldown = player.inStillpoint ? 0.55 : 0.9;
    const target = findNearestEnemy(player.x, player.y, enemies, 540, true);
    const baseAng = target
      ? Math.atan2(target.y - player.y, target.x - player.x)
      : player.facingAngle;
    for (let i = -1; i <= 1; i++) {
      const ang = baseAng + i * 0.24;
      playerBullets.push({
        id: ctx.nextId(),
        kind: 'parry_shard',
        x: player.x + Math.cos(ang) * 24,
        y: player.y + Math.sin(ang) * 24,
        vx: Math.cos(ang) * 480,
        vy: Math.sin(ang) * 480,
        radius: 6,
        damage: 32 * player.damageMult,
        pierce: 2,
        age: 0,
        maxAge: 1.4,
        color: '#8ee06c',
        homing: 7,
        hitSet: new Set(),
        evolved: true
      });
    }
  }

  if (w.auxTimer < tickInterval) return;
  w.auxTimer = 0;

  const orbDmg = player.relics.includes('orbital_overdrive') ? 1.45 : 1.0;
  const dmg =
    (w.evolved ? 36 : 15 + w.level * 5.2) * (player.inStillpoint ? 1.45 : 1) * player.damageMult * orbDmg;
  const snap = [...enemies];
  for (const blade of blades) {
    for (const e of snap) {
      if (e.hp <= 0) continue;
      const dx = e.x - blade.x;
      const dy = e.y - blade.y;
      if (dx * dx + dy * dy <= (blade.radius + e.radius) ** 2) {
        ctx.damageEnemy(e, dmg, '#4effb4');
      }
    }
    ctx.damageShrinesInRadius(blade.x, blade.y, blade.radius, dmg);
  }
}

function updateArcTether(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, particles, nodes } = ctx;
  if (w.cooldown > 0) return;

  const inFocus = player.inStillpoint;
  w.cooldown = inFocus
    ? w.evolved ? 0.16 : 0.24
    : w.evolved ? 0.42 : Math.max(0.48, 0.88 - w.level * 0.08);

  const range = (255 + w.level * 20) * player.areaMult;
  const maxChains = (w.evolved ? 8 : 3 + w.level) + (inFocus ? 3 : 0) + player.bonusProjectiles;
  const dmg = (w.evolved ? 38 : 17 + w.level * 6) * (inFocus ? 1.1 : 1.15) * player.damageMult;

  const first = findNearestEnemy(player.x, player.y, enemies, range, false);
  let lastX = player.x;
  let lastY = player.y;
  if (first) {
    sound.playShoot('zap');
    const visited = new Set<number>([first.id]);
    let curr: Enemy = first;
    particles.arc(
      player.x,
      player.y,
      curr.x,
      curr.y,
      w.evolved ? '#9cf6ff' : '#6fa8ff',
      inFocus ? 3.2 : 2.2,
      inFocus ? 0.22 : 0.16
    );
    ctx.damageEnemy(curr, dmg, '#6fa8ff');

    for (let c = 1; c < maxChains; c++) {
      let next: Enemy | null = null;
      let bestD2 = (180 * player.areaMult) ** 2;
      for (const e of enemies) {
        if (e.hp <= 0 || visited.has(e.id)) continue;
        const d2 = (e.x - curr.x) ** 2 + (e.y - curr.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          next = e;
        }
      }
      if (!next) break;
      visited.add(next.id);
      particles.arc(
        curr.x,
        curr.y,
        next.x,
        next.y,
        w.evolved ? '#b8f7ff' : '#6fa8ff',
        inFocus ? 2.6 : 1.8,
        inFocus ? 0.22 : 0.15
      );
      ctx.damageEnemy(next, dmg * Math.pow(0.92, c), '#6fa8ff');
      curr = next;
    }
    lastX = curr.x;
    lastY = curr.y;
  }

  // Also arc to nearby Resonance Shrines so Volt / Arc Tether builds can shatter them!
  const nearbyShrine = nodes.find(
    (n) => n.kind === 'shrine' && Math.hypot(n.x - player.x, n.y - player.y) <= range + n.radius
  );
  if (nearbyShrine) {
    if (!first) sound.playShoot('zap');
    const sx = Math.hypot(nearbyShrine.x - lastX, nearbyShrine.y - lastY) <= range ? lastX : player.x;
    const sy = sx === lastX ? lastY : player.y;
    particles.arc(sx, sy, nearbyShrine.x, nearbyShrine.y, '#6fa8ff', inFocus ? 2.8 : 2.0, 0.18);
    ctx.damageShrinesInRadius(nearbyShrine.x, nearbyShrine.y, 4, dmg);
  }
}

function updatePrismDrones(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets, particles } = ctx;
  if (w.evolved && w.auxTimer >= 4.0) {
    w.auxTimer = 0;
    if (player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + 7);
      particles.ring(player.x, player.y, '#7bf7ff', 14, 0.28);
    }
  }

  if (w.cooldown > 0) return;
  const drones = getPrismDronePositions(player);
  const inFocus = player.inStillpoint;
  w.cooldown = inFocus
    ? w.evolved ? 0.24 : 0.34
    : w.evolved ? 0.32 : Math.max(0.36, 0.62 - w.level * 0.05);

  const dmg = (w.evolved ? 22 : 10 + w.level * 3.5) * player.damageMult;
  for (const d of drones) {
    const target = findNearestEnemy(d.x, d.y, enemies, 480, inFocus);
    if (!target) continue;
    const baseAng = Math.atan2(target.y - d.y, target.x - d.x);
    const rays = inFocus ? (w.evolved ? [-0.14, 0, 0.14] : [-0.11, 0.11]) : [0];
    for (const off of rays) {
      const ang = baseAng + off;
      const spd = (inFocus ? 560 : 450) * player.projectileSpeedMult;
      playerBullets.push({
        id: ctx.nextId(),
        kind: 'prism_bolt',
        x: d.x,
        y: d.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 4.5,
        damage: dmg * (inFocus ? 0.85 : 1),
        pierce: inFocus || w.evolved ? 2 : 1,
        age: 0,
        maxAge: 1.05,
        color: '#7bf7ff',
        homing: w.evolved ? 3.5 : 1.5,
        hitSet: new Set(),
        evolved: w.evolved
      });
    }
  }
}

function updateVoidMortars(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 1.15 : Math.max(1.35, 2.2 - w.level * 0.16);
  const count = (w.evolved ? 2 : w.level >= 4 ? 2 : 1) + Math.min(1, player.bonusProjectiles);
  const dmg = (w.evolved ? 48 : 22 + w.level * 7) * player.damageMult;
  const blastR = (68 + w.level * 7 + (w.evolved ? 18 : 0)) * player.areaMult;

  const nearby = enemies.filter(
    (e) => e.hp > 0 && (e.x - player.x) ** 2 + (e.y - player.y) ** 2 <= 460 * 460
  );
  nearby.sort(
    (a, b) =>
      (a.x - player.x) ** 2 +
      (a.y - player.y) ** 2 -
      ((b.x - player.x) ** 2 + (b.y - player.y) ** 2)
  );
  const pool = nearby.slice(0, 8);
  const fallbackTarget = pool.length === 0 ? findNearestEnemy(player.x, player.y, enemies, 680, true) : null;

  sound.playShoot('mortar');
  for (let i = 0; i < count; i++) {
    const target =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : fallbackTarget;
    const tx = target ? target.x + (Math.random() - 0.5) * 45 : player.x + (Math.random() - 0.5) * 180;
    const ty = target ? target.y + (Math.random() - 0.5) * 45 : player.y + (Math.random() - 0.5) * 180;
    const flightTime = 0.42;

    playerBullets.push({
      id: ctx.nextId(),
      kind: 'mortar_shell',
      x: player.x,
      y: player.y,
      vx: (tx - player.x) / flightTime,
      vy: (ty - player.y) / flightTime,
      radius: 7,
      damage: dmg,
      pierce: 99,
      age: 0,
      maxAge: flightTime,
      color: '#d96bff',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved,
      blastRadius: blastR
    });
  }
}

function updatePhaseDaggers(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, playerBullets } = ctx;
  if (player.inStillpoint) return;

  const spacing = w.evolved ? 34 : Math.max(38, 60 - w.level * 4);
  if (player.distanceMovedSinceDagger < spacing) return;
  player.distanceMovedSinceDagger = 0;

  const maxPlanted = w.evolved ? 22 : 6 + w.level * 2;
  let currentPlanted = 0;
  for (const b of playerBullets) {
    if (b.kind === 'dagger_planted') currentPlanted++;
  }
  if (currentPlanted >= maxPlanted) return;

  spawnPlantedDagger(ctx, w, player.x, player.y);
}

// NEW WEAPON 7: Chrono Scythe — Boomerang blades that lock into spinning bullet-shredding saws in Stillpoint!
function updateChronoScythe(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 0.78 : Math.max(0.95, 1.55 - w.level * 0.11);
  const count = (w.evolved ? 3 : w.level >= 4 ? 2 : 1) + player.bonusProjectiles;
  const target = findNearestEnemy(player.x, player.y, enemies, 500);
  const baseAng = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.facingAngle;
  const dmg = (w.evolved ? 44 : 18 + w.level * 7) * player.damageMult;
  const speed = 380 * player.projectileSpeedMult;

  sound.playShoot('dagger');
  for (let i = 0; i < count; i++) {
    const ang = baseAng + (i - (count - 1) / 2) * 0.42;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'scythe',
      x: player.x,
      y: player.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius: (w.evolved ? 20 : 14 + w.level * 1.2) * Math.min(1.4, player.areaMult),
      damage: dmg,
      pierce: 99,
      age: 0,
      maxAge: 2.1,
      color: w.evolved ? '#f6c453' : '#ff5c8a',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved,
      spinAngle: 0,
      returnPhase: false
    });
  }
}

// NEW WEAPON 8: Ricochet Shard — Bouncing needles that split on hit in Stillpoint!
function updateRicochetShard(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 0.28 : Math.max(0.36, 0.65 - w.level * 0.055);
  const count = (w.evolved ? 3 : w.level >= 3 ? 2 : 1) + player.bonusProjectiles;
  const target = findNearestEnemy(player.x, player.y, enemies, 540);
  const baseAng = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.facingAngle;
  const dmg = (w.evolved ? 30 : 14 + w.level * 4.5) * player.damageMult;
  const speed = 560 * player.projectileSpeedMult;

  sound.playShoot('pulse');
  for (let i = 0; i < count; i++) {
    const ang = baseAng + (i - (count - 1) / 2) * 0.22;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'ricochet',
      x: player.x,
      y: player.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius: 5.5,
      damage: dmg,
      pierce: 1,
      bounces: w.evolved ? 6 : 2 + w.level,
      age: 0,
      maxAge: 1.9,
      color: w.evolved ? '#f6c453' : '#5ce1e6',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved
    });
  }
}

// NEW WEAPON 9: Nova Pulse — Thermal shockwave aura; charges mega burst during Stillpoint!
function updateNovaPulse(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player } = ctx;
  if (player.inStillpoint) return; // Charges silently for release burst!
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 1.15 : Math.max(1.35, 2.35 - w.level * 0.2);
  const radius = (95 + w.level * 12 + (w.evolved ? 28 : 0)) * player.areaMult;
  const dmg = (w.evolved ? 48 : 18 + w.level * 7) * player.damageMult;
  fireNovaWave(ctx, radius, dmg, w.evolved, false);
}

function fireNovaWave(
  ctx: WeaponWorldContext,
  radius: number,
  dmg: number,
  evolved: boolean,
  isStillpointBurst: boolean
): void {
  const { player, enemies, hazards, particles } = ctx;
  const color = isStillpointBurst || evolved ? '#e2a93b' : '#e08538';
  sound.playShoot('mortar');
  particles.ripple(player.x, player.y, radius * 1.15, isStillpointBurst ? 16 : 9, color, 0.42);
  hazards.push({
    id: ctx.nextId(),
    kind: 'nova_wave',
    x: player.x,
    y: player.y,
    radius: 18,
    maxRadius: radius,
    damagePerSec: 0,
    age: 0,
    maxAge: 0.28,
    color,
    collapsed: false,
    evolved,
    pullStrength: 0
  });

  for (const e of [...enemies]) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= radius + e.radius) {
      ctx.damageEnemy(e, dmg * (evolved ? 1.25 : 1), color, isStillpointBurst);
      if (!e.isBoss) {
        const push = isStillpointBurst ? 56 : 32;
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      }
    }
  }
  ctx.damageShrinesInRadius(player.x, player.y, radius, dmg * (evolved ? 1.25 : 1));
}

// NEW WEAPON 10: Rail Pylons — Autonomous beacons linking with laser tripwires in Stillpoint!
function updateRailTurret(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, pylons } = ctx;
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 2.4 : Math.max(2.8, 4.4 - w.level * 0.32);
  const maxPylons = (w.evolved ? 5 : 2 + Math.floor(w.level / 2)) + (ctx.vesselId === 'bastion' ? 1 : 0);
  if (pylons.length >= maxPylons) {
    pylons.shift();
  }
  const ang = Math.random() * Math.PI * 2;
  const orbDmg = player.relics.includes('orbital_overdrive') ? 1.45 : 1.0;
  pylons.push({
    id: ctx.nextId(),
    x: player.x + Math.cos(ang) * 42,
    y: player.y + Math.sin(ang) * 42,
    age: 0,
    maxAge: w.evolved ? 14 : 10,
    fireTimer: 0.2,
    evolved: w.evolved,
    damage: (w.evolved ? 34 : 15 + w.level * 5) * player.damageMult * orbDmg
  });
  ctx.particles.ring(player.x + Math.cos(ang) * 42, player.y + Math.sin(ang) * 42, '#f6c453', 14, 0.26);
}

function updateActivePylons(ctx: WeaponWorldContext, dtWorld: number, dtReal: number): void {
  const { player, enemies, pylons, playerBullets, lasers } = ctx;

  for (let i = pylons.length - 1; i >= 0; i--) {
    const py = pylons[i];
    py.age += dtWorld;
    if (py.age >= py.maxAge) {
      pylons.splice(i, 1);
      continue;
    }

    py.fireTimer -= player.inStillpoint ? dtReal * 0.9 : dtWorld * player.fireRateMult;
    if (py.fireTimer <= 0) {
      if (player.inStillpoint && pylons.length >= 2) {
        // Tripwire beam between pylons!
        py.fireTimer = 0.28;
        const next = pylons[(i + 1) % pylons.length];
        lasers.push({
          x1: py.x,
          y1: py.y,
          x2: next.x,
          y2: next.y,
          width: py.evolved ? 11 : 7,
          color: '#f6c453',
          alpha: 1,
          life: 0.22,
          maxLife: 0.22,
          isEnemy: false
        });
        for (const e of [...enemies]) {
          if (e.hp <= 0) continue;
          if (pointToSegmentDist(e.x, e.y, py.x, py.y, next.x, next.y) <= e.radius + 10) {
            ctx.damageEnemy(e, py.damage * 1.4, '#f6c453', true);
          }
        }
        ctx.damageShrinesAlongLine(py.x, py.y, next.x, next.y, 10, py.damage * 1.4);
      } else {
        py.fireTimer = py.evolved ? 0.42 : 0.65;
        const target = findNearestEnemy(py.x, py.y, enemies, 420);
        if (target) {
          const ang = Math.atan2(target.y - py.y, target.x - py.x);
          const spd = 480 * player.projectileSpeedMult;
          playerBullets.push({
            id: ctx.nextId(),
            kind: 'pulse',
            x: py.x,
            y: py.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            radius: 4.5,
            damage: py.damage,
            pierce: py.evolved ? 2 : 1,
            age: 0,
            maxAge: 0.95,
            color: '#f6c453',
            homing: 0,
            hitSet: new Set(),
            evolved: py.evolved
          });
        }
      }
    }
  }
}

export function spawnPlantedDagger(
  ctx: WeaponWorldContext,
  w: OwnedWeapon,
  x: number,
  y: number
): void {
  const dmg = (w.evolved ? 42 : 20 + w.level * 6) * ctx.player.damageMult;
  ctx.playerBullets.push({
    id: ctx.nextId(),
    kind: 'dagger_planted',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 7,
    damage: dmg,
    pierce: w.evolved ? 3 : 2,
    age: 0,
    maxAge: 9.0,
    color: '#ff66e5',
    homing: 0,
    hitSet: new Set(),
    evolved: w.evolved
  });
}

// NEW WEAPON 11: Cryo Ring — Chills & slows enemies; Stillpoint shatters chilled enemies!
export function updateFrostNova(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets, hazards, particles } = ctx;
  if (ctx.justEnteredStillpoint) {
    // Shatter every chilled enemy within range!
    let shattered = 0;
    const range = (310 + w.level * 24) * player.areaMult;
    const shatterDmg = (w.evolved ? 82 : 34 + w.level * 11) * player.damageMult;
    for (const e of [...enemies]) {
      if (e.hp <= 0 || !(e.chillTimer && e.chillTimer > 0)) continue;
      if (Math.hypot(e.x - player.x, e.y - player.y) <= range) {
        shattered++;
        ctx.damageEnemy(e, shatterDmg, '#9be8ff', true);
        particles.shatter(e.x, e.y, '#9be8ff', 7, 1.15);
        hazards.push({
          id: ctx.nextId(),
          kind: 'frost_burst',
          x: e.x,
          y: e.y,
          radius: 14,
          maxRadius: (w.evolved ? 84 : 56) * player.areaMult,
          damagePerSec: 0,
          age: 0,
          maxAge: 0.25,
          color: '#7ee8ff',
          collapsed: false,
          evolved: w.evolved,
          pullStrength: 0
        });
      }
    }
    if (shattered > 0) {
      sound.playCoreBurst(shattered + 2, false);
      particles.callout(player.x, player.y - 42, `SHATTER ×${shattered}`, '#9be8ff', 1.15, 0.85);
    }
  }

  if (w.cooldown > 0) return;
  w.cooldown = w.evolved ? 0.55 : Math.max(0.68, 1.15 - w.level * 0.09);

  const count = (w.evolved ? 8 : 4 + Math.floor(w.level / 2)) + player.bonusProjectiles;
  const dmg = (w.evolved ? 28 : 12 + w.level * 4) * player.damageMult;
  const spd = 340 * player.projectileSpeedMult;
  const base = ctx.time * 1.3;

  sound.playShoot('pulse');
  for (let i = 0; i < count; i++) {
    const ang = base + (i * Math.PI * 2) / count;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'frost_bolt',
      x: player.x + Math.cos(ang) * 14,
      y: player.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      radius: 6,
      damage: dmg,
      pierce: w.evolved ? 4 : 2,
      age: 0,
      maxAge: 0.95,
      color: '#7ee8ff',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved
    });
  }
}

// NEW WEAPON 12: Swarm Missiles — Curving rockets + Stillpoint lock-on Macross salvo!
function updateSwarmMissiles(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (player.inStillpoint) {
    // Paint lock-on reticles while in Stillpoint!
    if (w.cooldown > 0) return;
    const valkSpeed = ctx.vesselId === 'valkyrie' ? 0.5 : 1;
    w.cooldown = (w.evolved ? 0.11 : 0.17) * valkSpeed;
    const maxLocks = (w.evolved ? 14 : 4 + w.level * 2) + player.bonusProjectiles + (ctx.vesselId === 'valkyrie' ? 4 : 0);
    if (player.missileLocks.length < maxLocks) {
      const candidates = enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 520);
      if (candidates.length > 0) {
        const pick = candidates[player.missileLocks.length % candidates.length];
        player.missileLocks.push(pick.id);
        sound.playGraze(player.missileLocks.length);
      }
    }
    return;
  }

  if (w.cooldown > 0) return;
  w.cooldown = w.evolved ? 0.5 : Math.max(0.62, 1.05 - w.level * 0.08);
  const count = (w.evolved ? 4 : w.level >= 4 ? 3 : 2) + player.bonusProjectiles;
  const dmg = (w.evolved ? 36 : 16 + w.level * 5.5) * player.damageMult;
  const spd = 420 * player.projectileSpeedMult;

  sound.playShoot('mortar');
  for (let i = 0; i < count; i++) {
    const launchAng = player.facingAngle + (i % 2 === 0 ? 1 : -1) * (0.75 + Math.random() * 0.5);
    const target = findNearestEnemy(player.x, player.y, enemies, 580, true);
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'missile',
      x: player.x,
      y: player.y,
      vx: Math.cos(launchAng) * spd,
      vy: Math.sin(launchAng) * spd,
      radius: 6,
      damage: dmg,
      pierce: 1,
      age: 0,
      maxAge: 2.3,
      color: w.evolved ? '#f6c453' : '#ff7b47',
      homing: 8.5,
      targetId: target?.id,
      hitSet: new Set(),
      evolved: w.evolved,
      blastRadius: (w.evolved ? 54 : 36) * player.areaMult
    });
  }
}

function launchLockedMissiles(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, playerBullets } = ctx;
  const dmg = (w.evolved ? 46 : 22 + w.level * 7) * player.damageMult;
  const spd = 460 * player.projectileSpeedMult;
  sound.playShoot('mortar');
  player.missileLocks.forEach((tid, idx) => {
    const spread = (idx / Math.max(1, player.missileLocks.length)) * Math.PI * 2;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'missile',
      x: player.x,
      y: player.y,
      vx: Math.cos(spread) * spd,
      vy: Math.sin(spread) * spd,
      radius: 6.5,
      damage: dmg,
      pierce: 1,
      age: 0,
      maxAge: 2.5,
      color: '#f6c453',
      homing: 11.5,
      targetId: tid,
      hitSet: new Set(),
      evolved: w.evolved,
      blastRadius: (w.evolved ? 64 : 44) * player.areaMult
    });
  });
  ctx.particles.callout(player.x, player.y - 38, `SALVO ×${player.missileLocks.length}`, '#ff7b47', 1.15, 0.85);
  player.missileLocks.length = 0;
}

// NEW WEAPON 13: Gravity Flail — Tethered spiked wrecking orb smashing & knocking waves back!
function updateGravFlail(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, hazards, particles } = ctx;
  const tickInterval = player.inStillpoint ? 0.095 : 0.16;
  if (w.auxTimer < tickInterval) return;
  w.auxTimer = 0;

  const flails = getGravityFlailPositions(player);
  const orbDmg = player.relics.includes('orbital_overdrive') ? 1.45 : 1.0;
  const dmg =
    (w.evolved ? 48 : 22 + w.level * 7) * (player.inStillpoint ? 1.4 : 1) * player.damageMult * orbDmg;
  const heavyLv = player.passives.find((p) => p.id === 'heavy_frame')?.level ?? 0;
  const push = (26 + heavyLv * 6) * (player.inStillpoint ? 1.35 : 1);

  for (const fl of flails) {
    let slammed = false;
    for (const e of [...enemies]) {
      if (e.hp <= 0) continue;
      const dx = e.x - fl.x;
      const dy = e.y - fl.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist <= fl.radius + e.radius) {
        slammed = true;
        ctx.damageEnemy(e, dmg, fl.evolved ? '#f5d256' : '#e08538', player.inStillpoint);
        if (!e.isBoss && e.hp > 0) {
          e.x += (dx / dist) * push;
          e.y += (dy / dist) * push;
        }
      }
    }
    ctx.damageShrinesInRadius(fl.x, fl.y, fl.radius, dmg);
    if (slammed && fl.evolved && hazards.length < 18 && Math.random() < 0.28) {
      particles.ripple(fl.x, fl.y, 75 * player.areaMult, 9, '#f5d256', 0.3);
      hazards.push({
        id: ctx.nextId(),
        kind: 'crater',
        x: fl.x,
        y: fl.y,
        radius: 52 * player.areaMult,
        damagePerSec: dmg * 0.9,
        age: 0,
        maxAge: 2.2,
        color: '#e08538',
        collapsed: false,
        evolved: false,
        pullStrength: 0
      });
    }
  }
}

// NEW WEAPON 14: Caustic Jet — Corrosive acid spray leaving melt puddles (+25% dmg taken)
function updateAcidSprayer(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (w.cooldown > 0) return;

  const inFocus = player.inStillpoint;
  w.cooldown = inFocus
    ? w.evolved ? 0.14 : 0.2
    : w.evolved ? 0.24 : Math.max(0.28, 0.52 - w.level * 0.045);

  const tgt = findNearestEnemy(player.x, player.y, enemies, inFocus ? 520 : 320, inFocus);
  const baseAng = tgt ? Math.atan2(tgt.y - player.y, tgt.x - player.x) : player.facingAngle;
  const count = (w.evolved ? 4 : w.level >= 3 ? 3 : 2) + Math.min(2, player.bonusProjectiles);
  const corrLv = player.passives.find((p) => p.id === 'corrosive_vat')?.level ?? 0;
  const dmg = (w.evolved ? 26 : 11 + w.level * 3.8) * (1 + corrLv * 0.2) * player.damageMult;
  const spd = (inFocus ? 480 : 300) * player.projectileSpeedMult;

  sound.playShoot('pulse');
  for (let i = 0; i < count; i++) {
    const spread = inFocus ? 0.12 : 0.34;
    const ang = baseAng + (i - (count - 1) / 2) * spread + (Math.random() - 0.5) * 0.08;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'acid_glob',
      x: player.x + Math.cos(ang) * 14,
      y: player.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      radius: 6,
      damage: dmg,
      pierce: inFocus || w.evolved ? 2 : 1,
      age: 0,
      maxAge: inFocus ? 0.95 : 0.65,
      color: '#78d65c',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved,
      blastRadius: (44 + w.level * 5) * player.areaMult
    });
  }
}

// NEW WEAPON 15: Helios Prism — Refracting laser beams splitting into multi-way rays in Stillpoint!
function updateMirrorBeam(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, lasers, particles } = ctx;
  if (w.cooldown > 0) return;

  const inFocus = player.inStillpoint;
  w.cooldown = inFocus
    ? w.evolved ? 0.26 : 0.38
    : w.evolved ? 0.42 : Math.max(0.5, 0.85 - w.level * 0.065);

  const opticLv = player.passives.find((p) => p.id === 'optic_relay')?.level ?? 0;
  const beamW = (w.evolved ? 13 : 7 + w.level * 1.1) * player.areaMult * (1 + opticLv * 0.14);
  const beamLen = (inFocus ? 520 : 410) * (1 + opticLv * 0.1);
  const dmg = (w.evolved ? 48 : 22 + w.level * 7) * player.damageMult;
  const tgt = findNearestEnemy(player.x, player.y, enemies, beamLen, true);
  const baseAng = tgt ? Math.atan2(tgt.y - player.y, tgt.x - player.x) : player.facingAngle;

  const rayOffsets = w.evolved
    ? [-0.36, -0.18, 0, 0.18, 0.36]
    : inFocus
      ? [-0.24, 0, 0.24]
      : [0];

  sound.playShoot('rail');
  for (const off of rayOffsets) {
    const ang = baseAng + off;
    const ex = player.x + Math.cos(ang) * beamLen;
    const ey = player.y + Math.sin(ang) * beamLen;
    lasers.push({
      x1: player.x,
      y1: player.y,
      x2: ex,
      y2: ey,
      width: beamW,
      color: w.evolved ? '#ffe27a' : '#f0bc42',
      alpha: 1,
      life: 0.2,
      maxLife: 0.2,
      isEnemy: false
    });

    let firstHit: Enemy | null = null;
    for (const e of [...enemies]) {
      if (e.hp <= 0) continue;
      if (pointToSegmentDist(e.x, e.y, player.x, player.y, ex, ey) <= e.radius + beamW * 0.6) {
        if (!firstHit) firstHit = e;
        ctx.damageEnemy(e, dmg, '#f0bc42', inFocus);
        particles.burst(e.x, e.y, '#f0bc42', 3, 40, 110, 2.2, 0.2);
      }
    }
    ctx.damageShrinesAlongLine(player.x, player.y, ex, ey, beamW * 0.6, dmg);

    // Bounce off first struck target into a refracted secondary beam!
    if (firstHit && off === 0) {
      const next = findNearestEnemy(firstHit.x, firstHit.y, enemies, 260, false, firstHit.id);
      if (next) {
        lasers.push({
          x1: firstHit.x,
          y1: firstHit.y,
          x2: next.x,
          y2: next.y,
          width: beamW * 0.8,
          color: '#fff2b8',
          alpha: 1,
          life: 0.2,
          maxLife: 0.2,
          isEnemy: false
        });
        ctx.damageEnemy(next, dmg * 0.85, '#fff2b8', true);
      }
    }
  }
}

// NEW WEAPON 16: Seeker Mines — Hovering proximity mines that remotely double-blast on Stillpoint!
function updateShatterMine(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets } = ctx;
  if (player.inStillpoint || w.cooldown > 0) return;

  w.cooldown = w.evolved ? 0.72 : Math.max(0.88, 1.55 - w.level * 0.12);
  let activeMines = 0;
  for (const b of playerBullets) {
    if (b.kind === 'seeker_mine') activeMines++;
  }
  if (activeMines >= (w.evolved ? 12 : 7)) return;

  const blastLv = player.passives.find((p) => p.id === 'blast_capacitor')?.level ?? 0;
  const blastMult = 1 + blastLv * 0.18;
  const count = (w.evolved ? 2 : w.level >= 4 ? 2 : 1) + Math.min(1, player.bonusProjectiles);
  const dmg = (w.evolved ? 52 : 24 + w.level * 8) * blastMult * player.damageMult;
  const blastR = (62 + w.level * 6) * player.areaMult * blastMult;
  const tgt = findNearestEnemy(player.x, player.y, enemies, 480);

  sound.playShoot('mortar');
  for (let i = 0; i < count; i++) {
    const ang = tgt
      ? Math.atan2(tgt.y - player.y, tgt.x - player.x) + (i - (count - 1) / 2) * 0.45
      : Math.random() * Math.PI * 2;
    playerBullets.push({
      id: ctx.nextId(),
      kind: 'seeker_mine',
      x: player.x + Math.cos(ang) * 18,
      y: player.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * 145,
      vy: Math.sin(ang) * 145,
      radius: 8,
      damage: dmg,
      pierce: 1,
      age: 0,
      maxAge: 6.5,
      color: w.evolved ? '#f0bc42' : '#e0533c',
      homing: 2.2,
      targetId: tgt?.id,
      hitSet: new Set(),
      evolved: w.evolved,
      blastRadius: blastR
    });
  }
}

export function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
