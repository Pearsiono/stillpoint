import { sound } from '../audio';
import {
  Enemy,
  EnemyBullet,
  HazardZone,
  LaserBeam,
  OwnedWeapon,
  PlayerBullet,
  PlayerState,
  RailPylon
} from '../types';
import { ParticleSystem } from './particles';

export interface WeaponWorldContext {
  player: PlayerState;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  pylons: RailPylon[];
  hazards: HazardZone[];
  lasers: LaserBeam[];
  particles: ParticleSystem;
  accentColor: string;
  nextId: () => number;
  damageEnemy: (enemy: Enemy, dmg: number, color: string, isCrit?: boolean) => void;
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

export function getHaloBladesPositions(player: PlayerState, time: number): HaloBladeRender[] {
  const w = player.weapons.find((item) => item.id === 'halo_blades');
  if (!w) return [];

  const result: HaloBladeRender[] = [];
  const blend = player.stillpointBlend;
  const baseCount = w.evolved ? 5 : 2 + Math.floor((w.level + 1) / 2);
  const orbitRadius = (56 + blend * 30) * player.areaMult;
  const speed = 2.8 + w.level * 0.35 + blend * 3.8;
  const bladeRadius = (13 + w.level * 1.4 + blend * 5) * Math.min(1.5, player.areaMult);

  for (let i = 0; i < baseCount; i++) {
    const ang = time * speed + (i * Math.PI * 2) / baseCount;
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
      const ang = -time * (speed * 0.72) + (i * Math.PI * 2) / 4;
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

export function getPrismDronePositions(player: PlayerState, time: number): PrismDroneRender[] {
  const w = player.weapons.find((item) => item.id === 'prism_drones');
  if (!w) return [];
  const count = w.evolved ? 6 : 1 + Math.ceil(w.level / 2);
  const blend = player.stillpointBlend;
  const dist = (46 - blend * 14) * Math.min(1.3, player.areaMult);
  const result: PrismDroneRender[] = [];
  for (let i = 0; i < count; i++) {
    const ang = time * (1.8 + blend * 2.2) + (i * Math.PI * 2) / count;
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
  const overclockMult = player.inOverclockRing ? 1.85 : 1;

  if (ctx.justEnteredStillpoint) {
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
        for (const e of enemies) {
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
  }

  // Update Rail Pylons continuously
  updateActivePylons(ctx, dtWorld, dtReal);

  for (const w of player.weapons) {
    const dtWeapon = inStillpoint ? dtReal * 0.85 : dtWorld;
    w.cooldown -= dtWeapon * player.fireRateMult * overclockMult;
    w.auxTimer += dtReal;

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

      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (pointToSegmentDist(e.x, e.y, sx, sy, ex, ey) <= e.radius + beamWidth * 0.65) {
          ctx.damageEnemy(e, dmg, w.evolved ? '#f6c453' : ctx.accentColor, true);
          particles.burst(e.x, e.y, ctx.accentColor, 4, 40, 120, 2.5, 0.25);
        }
      }

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
  const { player, enemies, enemyBullets, particles } = ctx;
  const blades = getHaloBladesPositions(player, ctx.time);
  const tickInterval = player.inStillpoint ? 0.1 : 0.16;

  if (player.stillpointBlend > 0.35 || w.evolved) {
    for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
      const eb = enemyBullets[bi];
      if (!eb.parryable) continue;
      for (const blade of blades) {
        const dx = eb.x - blade.x;
        const dy = eb.y - blade.y;
        const r = blade.radius + eb.radius + 4;
        if (dx * dx + dy * dy <= r * r) {
          particles.burst(eb.x, eb.y, '#4effb4', 4, 40, 130, 2.2, 0.25);
          enemyBullets.splice(bi, 1);
          break;
        }
      }
    }
  }

  if (w.auxTimer < tickInterval) return;
  w.auxTimer = 0;

  const dmg =
    (w.evolved ? 34 : 14 + w.level * 5) * (player.inStillpoint ? 1.35 : 1) * player.damageMult;
  for (const blade of blades) {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - blade.x;
      const dy = e.y - blade.y;
      if (dx * dx + dy * dy <= (blade.radius + e.radius) ** 2) {
        ctx.damageEnemy(e, dmg, '#4effb4');
      }
    }
  }
}

function updateArcTether(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, enemyBullets, particles } = ctx;
  if (w.cooldown > 0) return;

  const inFocus = player.inStillpoint;
  w.cooldown = inFocus
    ? w.evolved ? 0.18 : 0.26
    : w.evolved ? 0.44 : Math.max(0.5, 0.9 - w.level * 0.08);

  const range = (245 + w.level * 20) * player.areaMult;
  const maxChains = (w.evolved ? 8 : 3 + w.level) + player.bonusProjectiles;
  const dmg = (w.evolved ? 36 : 16 + w.level * 6) * (inFocus ? 0.85 : 1.15) * player.damageMult;

  const first = findNearestEnemy(player.x, player.y, enemies, range, false);
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
      let bestD2 = (170 * player.areaMult) ** 2;
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
  }

  if (inFocus) {
    let zapped = 0;
    const maxZap = w.evolved ? 5 : 2 + Math.floor(w.level / 2);
    const zapRange2 = (165 * player.areaMult) ** 2;
    for (let i = enemyBullets.length - 1; i >= 0 && zapped < maxZap; i--) {
      const b = enemyBullets[i];
      if (!b.parryable) continue;
      if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= zapRange2) {
        particles.arc(player.x, player.y, b.x, b.y, '#9ef7ff', 2, 0.14);
        particles.burst(b.x, b.y, '#7bf7ff', 3, 30, 100, 2, 0.2);
        enemyBullets.splice(i, 1);
        zapped++;
      }
    }
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
  const drones = getPrismDronePositions(player, ctx.time);
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

  sound.playShoot('mortar');
  for (let i = 0; i < count; i++) {
    const target =
      enemies.length > 0
        ? enemies[Math.floor(Math.random() * Math.min(enemies.length, 10))]
        : null;
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
  const { player, enemies, enemyBullets, hazards, particles } = ctx;
  const color = isStillpointBurst || evolved ? '#f6c453' : '#ff9f43';
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

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= radius + e.radius) {
      ctx.damageEnemy(e, dmg, color, isStillpointBurst);
      if (!e.isBoss) {
        const push = isStillpointBurst ? 46 : 26;
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      }
    }
  }

  // Evolved SUPERNOVA HEART or Stillpoint Mega-Blast vaporizes nearby regular enemy bullets!
  if (evolved || isStillpointBurst) {
    const clearR2 = (radius * 0.82) ** 2;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (!b.parryable || b.isParryBonus) continue;
      if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= clearR2) {
        particles.burst(b.x, b.y, color, 2, 20, 90, 2, 0.2);
        enemyBullets.splice(i, 1);
      }
    }
  }
}

// NEW WEAPON 10: Rail Pylons — Autonomous beacons linking with laser tripwires in Stillpoint!
function updateRailTurret(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, pylons } = ctx;
  if (w.cooldown > 0) return;

  w.cooldown = w.evolved ? 2.4 : Math.max(2.8, 4.4 - w.level * 0.32);
  const maxPylons = w.evolved ? 5 : 2 + Math.floor(w.level / 2);
  if (pylons.length >= maxPylons) {
    pylons.shift();
  }
  const ang = Math.random() * Math.PI * 2;
  pylons.push({
    id: ctx.nextId(),
    x: player.x + Math.cos(ang) * 42,
    y: player.y + Math.sin(ang) * 42,
    age: 0,
    maxAge: w.evolved ? 14 : 10,
    fireTimer: 0.2,
    evolved: w.evolved,
    damage: (w.evolved ? 34 : 15 + w.level * 5) * player.damageMult
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
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          if (pointToSegmentDist(e.x, e.y, py.x, py.y, next.x, next.y) <= e.radius + 10) {
            ctx.damageEnemy(e, py.damage * 1.4, '#f6c453', true);
          }
        }
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
