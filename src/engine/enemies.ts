import { SECTORS } from '../data/sectors';
import { PACT_IDS } from '../data/upgrades';
import {
  BossEnclosure,
  Enemy,
  EnemyBullet,
  EnemyBulletKind,
  EnemyKind,
  LaserBeam,
  PlayerState,
  SectorId,
  WorldNode
} from '../types';
import { ParticleSystem } from './particles';

export interface EnemyWorldContext {
  player: PlayerState;
  sectorId: SectorId;
  activeHeat: string[];
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  lasers: LaserBeam[];
  nodes: WorldNode[];
  enclosure: BossEnclosure;
  particles: ParticleSystem;
  elapsed: number;
  endlessMode: boolean;
  nextId: () => number;
}

export const BOSS_SCHEDULE = [
  { time: 105, kind: 'boss_weaver' as EnemyKind, name: 'VORTEX WEAVER' },
  { time: 225, kind: 'boss_seraph' as EnemyKind, name: 'PRISM SERAPH' },
  { time: 345, kind: 'boss_archon' as EnemyKind, name: 'CHRONO ARCHON' },
  { time: 450, kind: 'boss_leviathan' as EnemyKind, name: 'VOID LEVIATHAN' }
];

export function spawnEnemy(
  ctx: EnemyWorldContext,
  kind: EnemyKind,
  x: number,
  y: number,
  isElite = false,
  difficultyScale = 1
): Enemy {
  const sector = SECTORS[ctx.sectorId];
  const bloodlustSpeed = ctx.player.pacts.includes('bloodlust') ? 1.22 : 1.0;
  const ironcladMult = ctx.activeHeat.includes('ironclad') && (isElite || kind.startsWith('boss_')) ? 1.35 : 1.0;
  const hpMult = difficultyScale * sector.difficultyMult * ironcladMult * 1.28 * (isElite ? 3.4 : 1);

  let radius = 13;
  let hp = 26;
  let speed = 82;
  let xpValue = 8;
  let scoreValue = 25;
  let accent = '#ff4d6d';
  let isBoss = false;
  let bossName: string | undefined;
  let segments: Array<{ x: number; y: number }> | undefined;

  switch (kind) {
    case 'swarmer':
      radius = isElite ? 16 : 11;
      hp = 22 * hpMult;
      speed = 98 + Math.random() * 18;
      xpValue = isElite ? 28 : 7;
      scoreValue = isElite ? 120 : 20;
      accent = '#ff5470';
      break;
    case 'dart':
      radius = isElite ? 16 : 12;
      hp = 34 * hpMult;
      speed = 116;
      xpValue = isElite ? 36 : 11;
      scoreValue = isElite ? 150 : 35;
      accent = '#ffb703';
      break;
    case 'turret':
      radius = isElite ? 20 : 15;
      hp = 54 * hpMult;
      speed = 54;
      xpValue = isElite ? 45 : 15;
      scoreValue = isElite ? 200 : 50;
      accent = '#ff3864';
      break;
    case 'splitter':
      radius = isElite ? 21 : 16;
      hp = 68 * hpMult;
      speed = 62;
      xpValue = isElite ? 50 : 16;
      scoreValue = isElite ? 220 : 55;
      accent = '#ff7b00';
      break;
    case 'ring_caster':
      radius = isElite ? 22 : 17;
      hp = 78 * hpMult;
      speed = 52;
      xpValue = isElite ? 58 : 20;
      scoreValue = isElite ? 260 : 75;
      accent = '#ff2a85';
      break;
    case 'sniper':
      radius = isElite ? 19 : 14;
      hp = 52 * hpMult;
      speed = 64;
      xpValue = isElite ? 52 : 18;
      scoreValue = isElite ? 240 : 70;
      accent = '#e040fb';
      break;
    case 'bulwark':
      radius = isElite ? 28 : 22;
      hp = 160 * hpMult;
      speed = 42;
      xpValue = isElite ? 75 : 32;
      scoreValue = isElite ? 350 : 110;
      accent = '#ff4d94';
      break;
    case 'spinner':
      radius = isElite ? 23 : 18;
      hp = 96 * hpMult;
      speed = 48;
      xpValue = isElite ? 64 : 24;
      scoreValue = isElite ? 300 : 90;
      accent = '#ff5e5b';
      break;
    case 'reflector':
      radius = isElite ? 22 : 16;
      hp = 84 * hpMult;
      speed = 66;
      xpValue = isElite ? 60 : 22;
      scoreValue = isElite ? 280 : 85;
      accent = '#ff66f5';
      break;
    case 'mine':
      radius = isElite ? 20 : 15;
      hp = 44 * hpMult;
      speed = 76;
      xpValue = isElite ? 48 : 17;
      scoreValue = isElite ? 210 : 65;
      accent = '#ff9f1c';
      break;
    case 'leech':
      radius = isElite ? 20 : 15;
      hp = 64 * hpMult;
      speed = 86;
      xpValue = isElite ? 55 : 22;
      scoreValue = isElite ? 240 : 85;
      accent = '#d946ef';
      break;
    case 'bomber':
      radius = isElite ? 24 : 18;
      hp = 104 * hpMult;
      speed = 74;
      xpValue = isElite ? 66 : 26;
      scoreValue = isElite ? 290 : 95;
      accent = '#f59e0b';
      break;
    case 'aegis_bot':
      radius = isElite ? 26 : 20;
      hp = 138 * hpMult;
      speed = 56;
      xpValue = isElite ? 72 : 28;
      scoreValue = isElite ? 320 : 105;
      accent = '#60a5fa';
      break;
    case 'carrier':
      radius = isElite ? 30 : 24;
      hp = 195 * hpMult;
      speed = 40;
      xpValue = isElite ? 95 : 42;
      scoreValue = isElite ? 420 : 150;
      accent = '#fb923c';
      break;
    case 'hauler':
      radius = 23;
      hp = 155 * difficultyScale * sector.difficultyMult;
      speed = 112;
      xpValue = 80;
      scoreValue = 650;
      accent = '#f6c453';
      break;
    case 'boss_weaver':
      isBoss = true;
      radius = 34;
      hp = 2300 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 68;
      xpValue = 160;
      scoreValue = 2500;
      accent = '#ff3366';
      bossName = 'VORTEX WEAVER';
      break;
    case 'boss_seraph':
      isBoss = true;
      radius = 36;
      hp = 4600 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 82;
      xpValue = 240;
      scoreValue = 4500;
      accent = '#ff4de8';
      bossName = 'PRISM SERAPH';
      break;
    case 'boss_archon':
      isBoss = true;
      radius = 40;
      hp = 8200 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 76;
      xpValue = 400;
      scoreValue = 9000;
      accent = '#f6c453';
      bossName = 'CHRONO ARCHON';
      break;
    case 'boss_leviathan':
      isBoss = true;
      radius = 36;
      hp = 11500 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 118;
      xpValue = 500;
      scoreValue = 14000;
      accent = '#4effb4';
      bossName = 'VOID LEVIATHAN';
      segments = Array.from({ length: 8 }, (_, idx) => ({ x, y: y - idx * 24 }));
      break;
  }

  const enemy: Enemy = {
    id: ctx.nextId(),
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    radius,
    hp,
    maxHp: hp,
    speed: speed * bloodlustSpeed,
    xpValue,
    scoreValue,
    isElite,
    isBoss,
    fireTimer: 0.65 + Math.random() * 1.0,
    stateTimer: 0,
    phase: 1,
    patternIndex: 0,
    hitFlash: 0,
    accent,
    bossName,
    segments
  };
  ctx.enemies.push(enemy);
  return enemy;
}

export function fireEnemyBullet(
  ctx: EnemyWorldContext,
  x: number,
  y: number,
  angle: number,
  speed: number,
  kind: EnemyBulletKind = 'orb',
  damage = 17,
  radius = 5.5
): void {
  if (ctx.enemyBullets.length >= 480) {
    ctx.enemyBullets.shift();
  }
  const pactFast = ctx.player.pacts.includes('bullet_magnet') ? 1.25 : 1.0;
  const heatFast = ctx.activeHeat.includes('hyper_fire') ? 1.25 : 1.0;
  const curseStacks = ctx.player.curses.filter((c) => c === 'fast_hostiles').length;
  const curseFast = Math.pow(1.18, curseStacks);
  const spd = speed * 1.12 * pactFast * heatFast * curseFast;
  const isParryBonus = kind === 'parry_orb';
  const isUnparryable = kind === 'void_unparryable';
  ctx.enemyBullets.push({
    id: ctx.nextId(),
    kind,
    x,
    y,
    vx: Math.cos(angle) * spd,
    vy: Math.sin(angle) * spd,
    radius: isParryBonus ? 8.5 : isUnparryable ? 7.2 : radius,
    damage: isUnparryable ? Math.round(damage * 1.35) : isParryBonus ? damage + 4 : Math.round(damage * 1.2),
    age: 0,
    maxAge: 7.5,
    grazed: false,
    parryable: !isUnparryable,
    isParryBonus,
    color:
      isUnparryable
        ? '#ff2442'
        : kind === 'parry_orb'
          ? '#ff4df0'
          : kind === 'diamond'
            ? '#ffb703'
            : kind === 'needle'
              ? '#ff2e63'
              : '#ff4d6d'
  });
}

export function updateWaveDirector(
  ctx: EnemyWorldContext,
  dtWorld: number,
  spawnAccum: { value: number },
  eliteTimer: { value: number },
  nodeTimer: { value: number }
): void {
  if (ctx.enclosure.active || ctx.enclosure.warningTimer > 0) return;

  const t = ctx.elapsed;
  const swarmHeat = ctx.activeHeat.includes('swarm') ? 1.4 : 1.0;
  const greedEliteRate = ctx.player.pacts.includes('greed') ? 1.35 : 1.0;
  const diffScale = 1 + t / 82 + (ctx.endlessMode ? Math.max(0.45, (t - 240) / 70) : 0);
  const maxEnemies = Math.min(104, Math.round((22 + Math.floor(t * 0.24)) * swarmHeat));
  const rate = Math.min(7.2, (2.35 + t * 0.017) * swarmHeat);

  spawnAccum.value += dtWorld * rate;
  eliteTimer.value += dtWorld * greedEliteRate;
  nodeTimer.value += dtWorld * (ctx.activeHeat.includes('cursed_void') ? 1.55 : 1.0);

  while (spawnAccum.value >= 1 && ctx.enemies.length < maxEnemies) {
    spawnAccum.value -= 1;
    const isElite = eliteTimer.value >= 19 && t > 12;
    if (isElite) eliteTimer.value = 0;

    const kind = pickWaveEnemy(t, isElite, ctx.sectorId);
    const angle = Math.random() * Math.PI * 2;
    const dist = 320 + Math.random() * 110;
    spawnEnemy(
      ctx,
      kind,
      ctx.player.x + Math.cos(angle) * dist,
      ctx.player.y + Math.sin(angle) * dist,
      isElite,
      diffScale
    );
  }

  // Spawn interactive World Nodes (Overclock Rings, Resonance Shrines, Cursed Pact Altars!)
  if (nodeTimer.value >= 24 && ctx.nodes.length < 3) {
    nodeTimer.value = 0;
    const ang = Math.random() * Math.PI * 2;
    const dist = 250 + Math.random() * 90;
    const nx = ctx.player.x + Math.cos(ang) * dist;
    const ny = ctx.player.y + Math.sin(ang) * dist;
    const cursedHeat = ctx.activeHeat.includes('cursed_void');
    const ringCut = cursedHeat ? 0.28 : 0.44;
    const shrineCut = cursedHeat ? 0.54 : 0.76;
    const roll = Math.random();

    const availablePacts = PACT_IDS.filter((p) => !ctx.player.pacts.includes(p));
    if (roll < ringCut) {
      ctx.nodes.push({
        id: ctx.nextId(),
        kind: 'overclock_ring',
        x: nx,
        y: ny,
        radius: 64,
        hp: 1,
        maxHp: 1,
        age: 0,
        maxAge: 22,
        progress: 0,
        accent: '#4effb4'
      });
    } else if (roll < shrineCut || availablePacts.length === 0) {
      ctx.nodes.push({
        id: ctx.nextId(),
        kind: 'shrine',
        x: nx,
        y: ny,
        radius: 22,
        hp: 140 * diffScale,
        maxHp: 140 * diffScale,
        age: 0,
        maxAge: 34,
        progress: 0,
        accent: '#f6c453'
      });
    } else {
      const pactId = availablePacts[Math.floor(Math.random() * availablePacts.length)];
      ctx.nodes.push({
        id: ctx.nextId(),
        kind: 'pact_altar',
        x: nx,
        y: ny,
        radius: 42,
        hp: 1,
        maxHp: 1,
        age: 0,
        maxAge: 28,
        progress: 0,
        pactId,
        accent: '#ff3b5c'
      });
    }
  }
}

function pickWaveEnemy(t: number, isElite: boolean, sectorId: SectorId): EnemyKind {
  if (t < 24) {
    if (sectorId === 'singularity') return Math.random() < 0.5 ? 'reflector' : 'ring_caster';
    const r = Math.random();
    if (r < 0.52) return 'swarmer';
    if (r < 0.8) return 'turret';
    return 'dart';
  }
  if (t < 75) {
    const r = Math.random();
    if (r < 0.34) return 'swarmer';
    if (r < 0.54) return 'dart';
    if (r < 0.74) return 'turret';
    if (r < 0.88) return 'mine';
    return 'splitter';
  }
  if (t < 165) {
    const r = Math.random();
    if (isElite) return r < 0.34 ? 'ring_caster' : r < 0.62 ? 'aegis_bot' : r < 0.85 ? 'bulwark' : 'carrier';
    if (r < 0.18) return 'swarmer';
    if (r < 0.32) return 'dart';
    if (r < 0.46) return 'turret';
    if (r < 0.58) return 'ring_caster';
    if (r < 0.7) return 'leech';
    if (r < 0.8) return 'bomber';
    if (r < 0.9) return 'aegis_bot';
    return 'splitter';
  }
  const r = Math.random();
  if (isElite) return r < 0.28 ? 'carrier' : r < 0.56 ? 'aegis_bot' : r < 0.8 ? 'bulwark' : 'spinner';
  if (r < 0.13) return 'dart';
  if (r < 0.25) return 'ring_caster';
  if (r < 0.37) return 'sniper';
  if (r < 0.49) return 'spinner';
  if (r < 0.6) return 'leech';
  if (r < 0.72) return 'bomber';
  if (r < 0.84) return 'aegis_bot';
  if (r < 0.92) return 'reflector';
  return 'carrier';
}

export function updateEnemies(ctx: EnemyWorldContext, dtWorld: number): void {
  const { player, enemies, enclosure } = ctx;

  for (const e of [...enemies]) {
    if (e.hp <= 0) continue;
    e.stateTimer += dtWorld;
    e.fireTimer -= dtWorld;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dtWorld * 6);
    if (e.chillTimer && e.chillTimer > 0) {
      e.chillTimer = Math.max(0, e.chillTimer - dtWorld);
    }
    const chillMult = e.chillTimer && e.chillTimer > 0 ? Math.max(0.38, 1 - player.slowPower) : 1.0;
    const stepDt = dtWorld * chillMult;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const toPlayer = Math.atan2(dy, dx);

    if (e.isBoss) {
      updateBossBehavior(ctx, e, dtWorld, toPlayer);
      continue;
    }

    switch (e.kind) {
      case 'swarmer':
        e.angle = toPlayer;
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        break;
      case 'dart': {
        const cycle = e.stateTimer % 2.4;
        if (cycle < 1.35) {
          e.angle = toPlayer;
          e.vx = (dx / dist) * e.speed * 0.65;
          e.vy = (dy / dist) * e.speed * 0.65;
        } else if (cycle < 1.7) {
          e.angle = toPlayer;
          e.vx *= 0.85;
          e.vy *= 0.85;
        } else {
          e.vx = Math.cos(e.angle) * e.speed * 2.35;
          e.vy = Math.sin(e.angle) * e.speed * 2.35;
        }
        break;
      }
      case 'turret': {
        e.angle += dtWorld * 1.4;
        const factor = dist > 175 ? 1 : dist < 110 ? -0.5 : 0.15;
        e.vx = (dx / dist) * e.speed * factor;
        e.vy = (dy / dist) * e.speed * factor;
        if (e.fireTimer <= 0 && dist < 420) {
          e.fireTimer = e.isElite ? 1.35 : 1.85;
          const fan = e.isElite ? [-0.34, -0.17, 0, 0.17, 0.34] : [-0.24, 0, 0.24];
          fan.forEach((off, idx) => {
            const kind: EnemyBulletKind =
              e.isElite && (idx === 0 || idx === 4)
                ? 'void_unparryable'
                : e.isElite && idx === 2
                  ? 'parry_orb'
                  : 'orb';
            fireEnemyBullet(ctx, e.x, e.y, toPlayer + off, 148, kind, 15, 5.2);
          });
        }
        break;
      }
      case 'splitter':
        e.angle += dtWorld * 1.8;
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        break;
      case 'ring_caster': {
        e.angle -= dtWorld * 2.0;
        const factor = dist > 155 ? 1 : 0.2;
        e.vx = (dx / dist) * e.speed * factor;
        e.vy = (dy / dist) * e.speed * factor;
        if (e.fireTimer <= 0 && dist < 430) {
          e.fireTimer = e.isElite ? 1.9 : 2.45;
          const pellets = e.isElite ? 12 : 9;
          const hasVoid = ctx.elapsed > 45 || ctx.activeHeat.includes('cursed_void') || e.isElite;
          for (let i = 0; i < pellets; i++) {
            const ang = e.angle + (i * Math.PI * 2) / pellets;
            const kind: EnemyBulletKind =
              hasVoid && i % 4 === 2
                ? 'void_unparryable'
                : e.isElite && i % 4 === 0
                  ? 'parry_orb'
                  : 'orb';
            fireEnemyBullet(ctx, e.x, e.y, ang, 126, kind, 15, 5.2);
          }
        }
        break;
      }
      case 'reflector': {
        // Orbits player at mid-range firing pairs of magenta Parry Orbs!
        e.angle = toPlayer + Math.PI / 2;
        const orbit = dist > 190 ? 0.8 : -0.35;
        const tx = -dy / dist;
        const ty = dx / dist;
        e.vx = ((dx / dist) * orbit + tx * 0.85) * e.speed;
        e.vy = ((dy / dist) * orbit + ty * 0.85) * e.speed;
        if (e.fireTimer <= 0 && dist < 410) {
          e.fireTimer = e.isElite ? 1.85 : 2.5;
          fireEnemyBullet(ctx, e.x, e.y, toPlayer - 0.16, 122, 'parry_orb', 14, 8);
          fireEnemyBullet(ctx, e.x, e.y, toPlayer + 0.16, 122, 'parry_orb', 14, 8);
        }
        break;
      }
      case 'mine': {
        e.angle += dtWorld * 3.4;
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        if (dist < 115 && e.fireTimer <= 0) {
          // Detonates in a readable 10-way bullet flower!
          const pellets = e.isElite ? 12 : 8;
          for (let i = 0; i < pellets; i++) {
            const ang = (i * Math.PI * 2) / pellets + e.angle;
            fireEnemyBullet(
              ctx,
              e.x,
              e.y,
              ang,
              124,
              i % 4 === 0 ? 'parry_orb' : 'diamond',
              13,
              5.2
            );
          }
          ctx.particles.shatter(e.x, e.y, e.accent, 8, 1);
          e.hp = 0;
        }
        break;
      }
      case 'sniper': {
        const factor = dist > 230 ? 1 : dist < 140 ? -0.6 : 0.1;
        e.vx = (dx / dist) * e.speed * factor;
        e.vy = (dy / dist) * e.speed * factor;
        if (e.telegraphTimer !== undefined && e.telegraphTimer > 0) {
          e.telegraphTimer -= dtWorld;
          e.vx *= 0.2;
          e.vy *= 0.2;
          if (e.telegraphTimer <= 0 && e.telegraphAngle !== undefined) {
            const ang = e.telegraphAngle;
            ctx.lasers.push({
              x1: e.x,
              y1: e.y,
              x2: e.x + Math.cos(ang) * 520,
              y2: e.y + Math.sin(ang) * 520,
              width: 9,
              color: '#ff2e63',
              alpha: 1,
              life: 0.24,
              maxLife: 0.24,
              isEnemy: true,
              damage: 18
            });
            fireEnemyBullet(ctx, e.x, e.y, ang, 215, 'void_unparryable', 17, 7.2);
            e.telegraphAngle = undefined;
            e.fireTimer = 2.75;
          }
        } else {
          e.angle = toPlayer;
          if (e.fireTimer <= 0 && dist < 410) {
            e.telegraphAngle = toPlayer;
            e.telegraphTimer = 0.95;
          }
        }
        break;
      }
      case 'bulwark': {
        e.angle += dtWorld * 0.7;
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        if (e.fireTimer <= 0 && dist < 380) {
          e.fireTimer = 2.4;
          for (let i = -1; i <= 1; i++) {
            fireEnemyBullet(ctx, e.x, e.y, toPlayer + i * 0.32, 108, 'parry_orb', 15, 8);
          }
        }
        break;
      }
      case 'spinner': {
        e.angle += dtWorld * 2.9;
        const factor = dist > 165 ? 0.9 : 0.25;
        e.vx = (dx / dist) * e.speed * factor;
        e.vy = (dy / dist) * e.speed * factor;
        if (e.fireTimer <= 0 && dist < 440) {
          e.fireTimer = e.isElite ? 0.36 : 0.5;
          const arms = e.isElite ? 4 : 3;
          for (let i = 0; i < arms; i++) {
            fireEnemyBullet(
              ctx,
              e.x,
              e.y,
              e.angle + (i * Math.PI * 2) / arms,
              134,
              i === 0 && (e.isElite || ctx.elapsed > 70) ? 'void_unparryable' : 'diamond',
              14,
              5
            );
          }
        }
        break;
      }
      case 'leech': {
        // Orbits mid-range & siphons player's Kinetic Charge with visible crimson-violet beam!
        e.angle = toPlayer;
        const factor = dist > 180 ? 0.95 : dist < 120 ? -0.45 : 0.1;
        const tx = -dy / dist;
        const ty = dx / dist;
        e.vx = ((dx / dist) * factor + tx * 0.5) * e.speed;
        e.vy = ((dy / dist) * factor + ty * 0.5) * e.speed;
        if (dist < 230 && !player.inStillpoint) {
          player.kineticCharge = Math.max(0, player.kineticCharge - 11 * dtWorld);
          if (e.fireTimer <= 0) {
            e.fireTimer = 0.22;
            ctx.particles.arc(e.x, e.y, player.x, player.y, '#d946ef', 1.8, 0.2);
          }
        }
        break;
      }
      case 'bomber': {
        // Sweeps past player dropping armed cluster mines!
        e.angle = toPlayer + 0.35;
        e.vx = Math.cos(e.angle) * e.speed;
        e.vy = Math.sin(e.angle) * e.speed;
        if (e.fireTimer <= 0 && dist < 380 && ctx.enemies.length < 90) {
          e.fireTimer = 3.2;
          const m = spawnEnemy(ctx, 'mine', e.x, e.y, false, 0.75);
          m.fireTimer = 0.8;
        }
        break;
      }
      case 'aegis_bot': {
        // Marches steadily facing player with armored frontal shield!
        e.angle = toPlayer;
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        if (e.fireTimer <= 0 && dist < 370) {
          e.fireTimer = 2.25;
          fireEnemyBullet(ctx, e.x, e.y, toPlayer - 0.19, 134, 'void_unparryable', 16, 6.2);
          fireEnemyBullet(ctx, e.x, e.y, toPlayer + 0.19, 134, 'void_unparryable', 16, 6.2);
        }
        break;
      }
      case 'carrier': {
        e.angle = toPlayer;
        e.vx = (dx / dist) * e.speed * (dist > 190 ? 1 : 0.15);
        e.vy = (dy / dist) * e.speed * (dist > 190 ? 1 : 0.15);
        if (e.fireTimer <= 0 && dist < 440 && ctx.enemies.length < 92) {
          e.fireTimer = 3.6;
          for (let i = -1; i <= 1; i += 2) {
            const drone = spawnEnemy(ctx, 'swarmer', e.x + i * 16, e.y, false, 0.6);
            drone.radius = 9.5;
          }
          fireEnemyBullet(ctx, e.x, e.y, toPlayer, 118, 'parry_orb', 14, 8);
        }
        break;
      }
      case 'hauler': {
        // Golden Treasure Hauler races laterally across arena; hunt it down before it escapes!
        if (e.vx === 0 && e.vy === 0) {
          const dir = e.x < player.x ? 1 : -1;
          e.vx = dir * e.speed;
          e.vy = (Math.random() - 0.5) * 40;
          e.angle = Math.atan2(e.vy, e.vx);
        }
        if (e.stateTimer > 15) {
          e.hp = 0; // Escaped!
        }
        break;
      }
    }

    e.x += e.vx * stepDt;
    e.y += e.vy * stepDt;

    if (!enclosure.active && dist > 640 && e.kind !== 'hauler') {
      e.x = player.x - (dx / dist) * 440;
      e.y = player.y - (dy / dist) * 440;
    }
  }

  // Prune self-detonated mines & escaped haulers so zero zombie entities linger
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) enemies.splice(i, 1);
  }
}

function updateBossBehavior(
  ctx: EnemyWorldContext,
  boss: Enemy,
  dt: number,
  toPlayer: number
): void {
  const { enclosure, particles } = ctx;
  const hpRatio = boss.hp / boss.maxHp;

  if (boss.kind === 'boss_archon' || boss.kind === 'boss_leviathan') {
    const newPhase = hpRatio < 0.34 ? 3 : hpRatio < 0.67 ? 2 : 1;
    if (newPhase > boss.phase) {
      boss.phase = newPhase;
      boss.fireTimer = 0.65;
      particles.ripple(boss.x, boss.y, 260, 22, boss.accent, 0.6);
      particles.callout(boss.x, boss.y - 44, `PHASE ${newPhase}`, '#f6c453', 1.3, 1.0);
    }
  } else {
    const newPhase = hpRatio < 0.55 ? 2 : 1;
    if (newPhase > boss.phase) {
      boss.phase = newPhase;
      boss.fireTimer = 0.65;
      particles.ripple(boss.x, boss.y, 240, 20, boss.accent, 0.55);
      particles.callout(boss.x, boss.y - 44, 'PHASE 2', '#f6c453', 1.25, 1.0);
    }
  }

  const t = boss.stateTimer;

  // Articulated serpent slithering for BOSS IV: VOID LEVIATHAN!
  if (boss.kind === 'boss_leviathan' && boss.segments) {
    const targetX = enclosure.cx + Math.cos(t * (0.9 + boss.phase * 0.2)) * (enclosure.halfW * 0.72);
    const targetY = enclosure.cy + Math.sin(t * (1.35 + boss.phase * 0.25)) * (enclosure.halfH * 0.58);
    const dx = targetX - boss.x;
    const dy = targetY - boss.y;
    boss.angle = Math.atan2(dy, dx);
    boss.x += dx * Math.min(1, dt * 2.5);
    boss.y += dy * Math.min(1, dt * 2.5);

    let prevX = boss.x;
    let prevY = boss.y;
    for (const seg of boss.segments) {
      const sdx = prevX - seg.x;
      const sdy = prevY - seg.y;
      const d = Math.hypot(sdx, sdy) || 1;
      const spacing = 24;
      if (d > spacing) {
        seg.x = prevX - (sdx / d) * spacing;
        seg.y = prevY - (sdy / d) * spacing;
      }
      prevX = seg.x;
      prevY = seg.y;
    }

    if (boss.fireTimer > 0) return;
    const pat = boss.patternIndex++;
    if (pat % 4 === 3) {
      // Every body segment emits a magenta parryable orb!
      boss.fireTimer = 1.05;
      boss.segments.forEach((seg, idx) => {
        if (idx % 2 === 0) {
          const ang = Math.atan2(ctx.player.y - seg.y, ctx.player.x - seg.x);
          fireEnemyBullet(ctx, seg.x, seg.y, ang, 125, 'parry_orb', 16, 8.5);
        }
      });
    } else {
      boss.fireTimer = boss.phase >= 3 ? 0.25 : 0.34;
      const arms = 4 + boss.phase;
      for (let i = 0; i < arms; i++) {
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          boss.angle + (i * Math.PI * 2) / arms,
          156,
          i === 0 ? 'void_unparryable' : i % 2 === 0 ? 'diamond' : 'orb',
          16,
          5.5
        );
      }
    }
    return;
  }

  boss.angle += dt * (1.2 + boss.phase * 0.5);
  const targetX = enclosure.cx + Math.sin(t * (0.75 + boss.phase * 0.18)) * (enclosure.halfW * 0.56);
  const targetY =
    enclosure.cy - enclosure.halfH * 0.34 + Math.sin(t * 1.4) * (enclosure.halfH * 0.22);

  boss.x += (targetX - boss.x) * Math.min(1, dt * 2.2);
  boss.y += (targetY - boss.y) * Math.min(1, dt * 2.2);

  if (boss.fireTimer > 0) return;
  const pat = boss.patternIndex++;

  if (boss.kind === 'boss_weaver') {
    if (pat % 4 === 3) {
      boss.fireTimer = boss.phase === 2 ? 0.85 : 1.05;
      const count = boss.phase === 2 ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const isEdgeVoid = i === 0 || i === count - 1;
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          toPlayer + (i - (count - 1) / 2) * 0.22,
          isEdgeVoid ? 148 : 134,
          isEdgeVoid ? 'void_unparryable' : 'parry_orb',
          17,
          8.2
        );
      }
    } else {
      boss.fireTimer = boss.phase === 2 ? 0.21 : 0.28;
      const arms = boss.phase === 2 ? 6 : 5;
      for (let i = 0; i < arms; i++) {
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          t * 2.1 + (i * Math.PI * 2) / arms,
          144,
          i === 0 ? 'void_unparryable' : i === 2 ? 'diamond' : 'orb',
          15,
          5.5
        );
      }
    }
    return;
  }

  if (boss.kind === 'boss_seraph') {
    if (pat % 5 === 0) {
      boss.fireTimer = 1.25;
      const angles =
        boss.phase === 2
          ? [toPlayer, toPlayer + Math.PI / 3, toPlayer - Math.PI / 3]
          : [toPlayer - 0.32, toPlayer + 0.32];
      for (const ang of angles) {
        ctx.lasers.push({
          x1: boss.x,
          y1: boss.y,
          x2: boss.x + Math.cos(ang) * 650,
          y2: boss.y + Math.sin(ang) * 650,
          width: 11,
          color: '#ff4de8',
          alpha: 1,
          life: 0.95,
          maxLife: 0.95,
          isEnemy: true,
          isTelegraph: true,
          damage: 20
        });
      }
    } else if (pat % 5 === 3) {
      boss.fireTimer = boss.phase === 2 ? 0.85 : 1.05;
      const total = boss.phase === 2 ? 16 : 12;
      for (let i = 0; i < total; i++) {
        const ang = (i * Math.PI * 2) / total + t * 0.6;
        const isParry = i % 3 === 0;
        fireEnemyBullet(ctx, boss.x, boss.y, ang, isParry ? 122 : 148 + (i % 2) * 32, isParry ? 'parry_orb' : 'diamond', 15, 5.5);
      }
    } else {
      boss.fireTimer = boss.phase === 2 ? 0.42 : 0.56;
      const spread = boss.phase === 2 ? 7 : 5;
      for (let i = 0; i < spread; i++) {
        const isEdge = i === 0 || i === spread - 1;
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          toPlayer + (i - (spread - 1) / 2) * 0.26,
          158,
          isEdge ? 'void_unparryable' : 'diamond',
          16,
          5.5
        );
      }
    }
    return;
  }

  // BOSS III: CHRONO ARCHON
  if (pat % 6 === 0) {
    boss.fireTimer = 1.15;
    const spokes = boss.phase >= 3 ? 4 : 3;
    for (let i = 0; i < spokes; i++) {
      const ang = toPlayer + (i * Math.PI * 2) / spokes + 0.25;
      ctx.lasers.push({
        x1: boss.x,
        y1: boss.y,
        x2: boss.x + Math.cos(ang) * 680,
        y2: boss.y + Math.sin(ang) * 680,
        width: 12,
        color: '#f6c453',
        alpha: 1,
        life: 0.9,
        maxLife: 0.9,
        isEnemy: true,
        isTelegraph: true,
        damage: 22
      });
    }
  } else if (pat % 6 === 3) {
    boss.fireTimer = boss.phase >= 3 ? 0.78 : 0.96;
    const total = boss.phase >= 3 ? 18 : 14;
    for (let i = 0; i < total; i++) {
      const ang = (i * Math.PI * 2) / total + boss.angle;
      const isParry = i % 2 === 0;
      fireEnemyBullet(ctx, boss.x, boss.y, ang, isParry ? 126 : 162, isParry ? 'parry_orb' : 'orb', 16, 5.8);
    }
  } else {
    boss.fireTimer = boss.phase >= 3 ? 0.22 : boss.phase === 2 ? 0.28 : 0.36;
    const arms = boss.phase >= 3 ? 8 : 6;
    const dir = pat % 2 === 0 ? 1 : -1;
    for (let i = 0; i < arms; i++) {
      fireEnemyBullet(
        ctx,
        boss.x,
        boss.y,
        t * 2.4 * dir + (i * Math.PI * 2) / arms,
        150 + boss.phase * 10,
        i % 4 === 1 ? 'void_unparryable' : i % 3 === 0 ? 'diamond' : 'orb',
        16,
        5.4
      );
    }
  }
}

export function onEnemyDeathSplit(ctx: EnemyWorldContext, dead: Enemy): void {
  if (dead.kind !== 'splitter') return;
  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3 + Math.random();
    const mini = spawnEnemy(
      ctx,
      'swarmer',
      dead.x + Math.cos(ang) * 14,
      dead.y + Math.sin(ang) * 14,
      false,
      0.65
    );
    mini.radius = 9;
    mini.hp = Math.max(10, dead.maxHp * 0.22);
    mini.maxHp = mini.hp;
  }
  for (let i = 0; i < 4; i++) {
    fireEnemyBullet(ctx, dead.x, dead.y, (i * Math.PI) / 2 + 0.4, 110, 'orb', 11, 4.8);
  }
}
