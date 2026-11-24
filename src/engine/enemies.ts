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
  { time: 105, kind: 'boss_weaver' as EnemyKind, name: 'Vortex Weaver' },
  { time: 225, kind: 'boss_seraph' as EnemyKind, name: 'Prism Seraph' },
  { time: 345, kind: 'boss_archon' as EnemyKind, name: 'Chrono Archon' },
  { time: 450, kind: 'boss_leviathan' as EnemyKind, name: 'Void Leviathan' }
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
  const hpMult = difficultyScale * sector.difficultyMult * ironcladMult * 1.38 * (isElite ? 3.6 : 1);

  let radius = 13;
  let hp = 26;
  let speed = 82;
  let xpValue = 6;
  let scoreValue = 25;
  let accent = '#ff4d6d';
  let isBoss = false;
  let bossName: string | undefined;
  let segments: Array<{ x: number; y: number }> | undefined;

  switch (kind) {
    case 'swarmer':
      radius = isElite ? 16 : 11;
      hp = 24 * hpMult;
      speed = 104 + Math.random() * 20;
      xpValue = isElite ? 20 : 5;
      scoreValue = isElite ? 120 : 20;
      accent = '#ff5470';
      break;
    case 'dart':
      radius = isElite ? 16 : 12;
      hp = 38 * hpMult;
      speed = 122;
      xpValue = isElite ? 26 : 7;
      scoreValue = isElite ? 150 : 35;
      accent = '#ffb703';
      break;
    case 'turret':
      radius = isElite ? 20 : 15;
      hp = 60 * hpMult;
      speed = 58;
      xpValue = isElite ? 32 : 10;
      scoreValue = isElite ? 200 : 50;
      accent = '#ff3864';
      break;
    case 'splitter':
      radius = isElite ? 21 : 16;
      hp = 74 * hpMult;
      speed = 66;
      xpValue = isElite ? 34 : 11;
      scoreValue = isElite ? 220 : 55;
      accent = '#ff7b00';
      break;
    case 'ring_caster':
      radius = isElite ? 22 : 17;
      hp = 88 * hpMult;
      speed = 56;
      xpValue = isElite ? 40 : 13;
      scoreValue = isElite ? 260 : 75;
      accent = '#ff2a85';
      break;
    case 'sniper':
      radius = isElite ? 19 : 14;
      hp = 58 * hpMult;
      speed = 68;
      xpValue = isElite ? 36 : 12;
      scoreValue = isElite ? 240 : 70;
      accent = '#e040fb';
      break;
    case 'bulwark':
      radius = isElite ? 28 : 22;
      hp = 185 * hpMult;
      speed = 46;
      xpValue = isElite ? 50 : 20;
      scoreValue = isElite ? 350 : 110;
      accent = '#ff4d94';
      break;
    case 'spinner':
      radius = isElite ? 23 : 18;
      hp = 108 * hpMult;
      speed = 52;
      xpValue = isElite ? 44 : 16;
      scoreValue = isElite ? 300 : 90;
      accent = '#ff5e5b';
      break;
    case 'reflector':
      radius = isElite ? 22 : 16;
      hp = 94 * hpMult;
      speed = 70;
      xpValue = isElite ? 42 : 15;
      scoreValue = isElite ? 280 : 85;
      accent = '#ff66f5';
      break;
    case 'mine':
      radius = isElite ? 20 : 15;
      hp = 48 * hpMult;
      speed = 82;
      xpValue = isElite ? 32 : 11;
      scoreValue = isElite ? 210 : 65;
      accent = '#ff9f1c';
      break;
    case 'leech':
      radius = isElite ? 20 : 15;
      hp = 72 * hpMult;
      speed = 92;
      xpValue = isElite ? 38 : 15;
      scoreValue = isElite ? 240 : 85;
      accent = '#d946ef';
      break;
    case 'bomber':
      radius = isElite ? 24 : 18;
      hp = 116 * hpMult;
      speed = 78;
      xpValue = isElite ? 44 : 17;
      scoreValue = isElite ? 290 : 95;
      accent = '#f59e0b';
      break;
    case 'aegis_bot':
      radius = isElite ? 26 : 20;
      hp = 156 * hpMult;
      speed = 60;
      xpValue = isElite ? 48 : 19;
      scoreValue = isElite ? 320 : 105;
      accent = '#60a5fa';
      break;
    case 'carrier':
      radius = isElite ? 30 : 24;
      hp = 225 * hpMult;
      speed = 44;
      xpValue = isElite ? 62 : 26;
      scoreValue = isElite ? 420 : 150;
      accent = '#fb923c';
      break;
    case 'hauler':
      radius = 23;
      hp = 260 * difficultyScale * sector.difficultyMult;
      speed = 118;
      xpValue = 48;
      scoreValue = 650;
      accent = '#f6c453';
      break;
    case 'boss_weaver':
      isBoss = true;
      radius = 34;
      hp = 4900 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 74;
      xpValue = 105;
      scoreValue = 2500;
      accent = '#ff3366';
      bossName = 'Vortex Weaver';
      break;
    case 'boss_seraph':
      isBoss = true;
      radius = 36;
      hp = 9800 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 88;
      xpValue = 155;
      scoreValue = 4500;
      accent = '#ff4de8';
      bossName = 'Prism Seraph';
      break;
    case 'boss_archon':
      isBoss = true;
      radius = 40;
      hp = 17000 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 82;
      xpValue = 240;
      scoreValue = 9000;
      accent = '#f6c453';
      bossName = 'Chrono Archon';
      break;
    case 'boss_leviathan':
      isBoss = true;
      radius = 36;
      hp = 24500 * difficultyScale * sector.difficultyMult * ironcladMult;
      speed = 124;
      xpValue = 300;
      scoreValue = 14000;
      accent = '#4effb4';
      bossName = 'Void Leviathan';
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
    fireTimer: 0.55 + Math.random() * 0.85,
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
  damage = 18,
  radius = 5.5
): void {
  if (ctx.enemyBullets.length >= 520) {
    ctx.enemyBullets.shift();
  }
  const pactFast = ctx.player.pacts.includes('bullet_magnet') ? 1.25 : 1.0;
  const heatFast = ctx.activeHeat.includes('hyper_fire') ? 1.25 : 1.0;
  const curseStacks = ctx.player.curses.filter((c) => c === 'fast_hostiles').length;
  const curseFast = Math.pow(1.18, curseStacks);
  const spd = speed * 1.12 * pactFast * heatFast * curseFast;
  const isHeavy = kind === 'heavy_orb';
  ctx.enemyBullets.push({
    id: ctx.nextId(),
    kind,
    x,
    y,
    vx: Math.cos(angle) * spd,
    vy: Math.sin(angle) * spd,
    radius: isHeavy ? 8.2 : radius,
    damage: isHeavy ? Math.round(damage * 1.42) : Math.round(damage * 1.24),
    age: 0,
    maxAge: 7.5,
    grazed: false,
    color:
      isHeavy
        ? '#ff3b5c'
        : kind === 'diamond'
          ? '#ffb703'
          : kind === 'needle'
            ? '#ff2e63'
            : '#ff5252'
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
  const swarmHeat = (ctx.activeHeat.includes('swarm') ? 1.4 : 1.0) * (ctx.player.pacts.includes('colossus') ? 1.2 : 1.0);
  const greedEliteRate = ctx.player.pacts.includes('greed') ? 1.35 : 1.0;
  const diffScale = 1 + t / 66 + (ctx.endlessMode ? Math.max(0.5, (t - 240) / 64) : 0);
  const maxEnemies = Math.min(112, Math.round((24 + Math.floor(t * 0.26)) * swarmHeat));
  const rate = Math.min(7.5, (2.45 + t * 0.019) * swarmHeat);

  if (ctx.enemies.length < maxEnemies) {
    spawnAccum.value = Math.min(4, spawnAccum.value + dtWorld * rate);
  } else {
    spawnAccum.value = Math.min(1, spawnAccum.value);
  }
  eliteTimer.value += dtWorld * greedEliteRate;
  nodeTimer.value += dtWorld * (ctx.activeHeat.includes('cursed_void') ? 1.55 : 1.0);

  while (spawnAccum.value >= 1 && ctx.enemies.length < maxEnemies) {
    spawnAccum.value -= 1;
    const isElite = eliteTimer.value >= 19 && t > 12;
    if (isElite) eliteTimer.value = 0;

    const kind = pickWaveEnemy(t, isElite, ctx.sectorId);
    const angle = Math.random() * Math.PI * 2;
    const dist = 455 + Math.random() * 120;
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
        hp: 300 * diffScale,
        maxHp: 300 * diffScale,
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
    if (e.corrodeTimer && e.corrodeTimer > 0) {
      e.corrodeTimer = Math.max(0, e.corrodeTimer - dtWorld);
    }
    if (e.primedTimer && e.primedTimer > 0) {
      e.primedTimer = Math.max(0, e.primedTimer - dtWorld);
    }
    if (e.catalystMark && e.catalystMark > 0) {
      e.catalystMark = Math.max(0, e.catalystMark - dtWorld);
    }
    if (e.stunTimer && e.stunTimer > 0) {
      e.stunTimer = Math.max(0, e.stunTimer - dtWorld);
      if (!e.isBoss) {
        e.vx = 0;
        e.vy = 0;
        continue;
      }
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
            const kind: EnemyBulletKind = e.isElite && idx === 2 ? 'heavy_orb' : 'orb';
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
          for (let i = 0; i < pellets; i++) {
            const ang = e.angle + (i * Math.PI * 2) / pellets;
            const kind: EnemyBulletKind = e.isElite && i % 4 === 0 ? 'heavy_orb' : 'orb';
            fireEnemyBullet(ctx, e.x, e.y, ang, 126, kind, 15, 5.2);
          }
        }
        break;
      }
      case 'reflector': {
        // Orbits player at mid-range firing pairs of heavy plasma orbs!
        e.angle = toPlayer + Math.PI / 2;
        const orbit = dist > 190 ? 0.8 : -0.35;
        const tx = -dy / dist;
        const ty = dx / dist;
        e.vx = ((dx / dist) * orbit + tx * 0.85) * e.speed;
        e.vy = ((dy / dist) * orbit + ty * 0.85) * e.speed;
        if (e.fireTimer <= 0 && dist < 410) {
          e.fireTimer = e.isElite ? 1.85 : 2.5;
          fireEnemyBullet(ctx, e.x, e.y, toPlayer - 0.16, 130, 'heavy_orb', 15, 7.5);
          fireEnemyBullet(ctx, e.x, e.y, toPlayer + 0.16, 130, 'heavy_orb', 15, 7.5);
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
              i % 4 === 0 ? 'heavy_orb' : 'diamond',
              13,
              5.2
            );
          }
          ctx.particles.explode(e.x, e.y, e.isElite ? 1.2 : 1.0, '#ff7832');
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
            fireEnemyBullet(ctx, e.x, e.y, ang, 215, 'needle', 17, 6.2);
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
            fireEnemyBullet(ctx, e.x, e.y, toPlayer + i * 0.32, 114, 'heavy_orb', 15, 7.5);
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
              i === 0 ? 'needle' : 'diamond',
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
          fireEnemyBullet(ctx, e.x, e.y, toPlayer - 0.19, 134, 'heavy_orb', 16, 6.8);
          fireEnemyBullet(ctx, e.x, e.y, toPlayer + 0.19, 134, 'heavy_orb', 16, 6.8);
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
          fireEnemyBullet(ctx, e.x, e.y, toPlayer, 122, 'heavy_orb', 14, 7.5);
        }
        break;
      }
      case 'hauler': {
        // Golden Treasure Hauler races laterally across arena; initialize velocity once so stun never reverses it
        if (e.patternIndex === 0) {
          e.patternIndex = 1;
          const dir = e.x < player.x ? 1 : -1;
          e.vx = dir * e.speed;
          e.vy = (Math.random() - 0.5) * 40;
          e.angle = Math.atan2(e.vy, e.vx);
        } else if (e.vx === 0 && e.vy === 0) {
          e.vx = Math.cos(e.angle) * e.speed;
          e.vy = Math.sin(e.angle) * e.speed;
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
      boss.fireTimer = 1.05;
      boss.segments.forEach((seg, idx) => {
        if (idx % 2 === 0) {
          const ang = Math.atan2(ctx.player.y - seg.y, ctx.player.x - seg.x);
          fireEnemyBullet(ctx, seg.x, seg.y, ang, 132, 'heavy_orb', 16, 8);
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
          i === 0 ? 'needle' : i % 2 === 0 ? 'diamond' : 'orb',
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
      boss.fireTimer = boss.phase === 2 ? 0.72 : 0.92;
      const count = boss.phase === 2 ? 9 : 7;
      for (let i = 0; i < count; i++) {
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          toPlayer + (i - (count - 1) / 2) * 0.2,
          150,
          'heavy_orb',
          19,
          8
        );
      }
    } else {
      boss.fireTimer = boss.phase === 2 ? 0.18 : 0.24;
      const arms = boss.phase === 2 ? 7 : 6;
      for (let i = 0; i < arms; i++) {
        fireEnemyBullet(
          ctx,
          boss.x,
          boss.y,
          t * 2.3 + (i * Math.PI * 2) / arms,
          152,
          i === 0 ? 'diamond' : 'orb',
          17,
          5.5
        );
      }
      if (boss.phase === 2 && pat % 2 === 0) {
        fireEnemyBullet(ctx, boss.x, boss.y, toPlayer, 182, 'needle', 18, 5.4);
      }
    }
    return;
  }

  if (boss.kind === 'boss_seraph') {
    if (pat % 5 === 0) {
      boss.fireTimer = 1.05;
      const angles =
        boss.phase === 2
          ? [toPlayer, toPlayer + Math.PI / 3, toPlayer - Math.PI / 3, toPlayer + Math.PI / 6]
          : [toPlayer - 0.28, toPlayer + 0.28];
      for (const ang of angles) {
        ctx.lasers.push({
          x1: boss.x,
          y1: boss.y,
          x2: boss.x + Math.cos(ang) * 650,
          y2: boss.y + Math.sin(ang) * 650,
          width: 11,
          color: '#ff4de8',
          alpha: 1,
          life: 0.85,
          maxLife: 0.85,
          isEnemy: true,
          isTelegraph: true,
          damage: 28
        });
      }
    } else if (pat % 5 === 3) {
      boss.fireTimer = boss.phase === 2 ? 0.72 : 0.92;
      const total = boss.phase === 2 ? 20 : 14;
      for (let i = 0; i < total; i++) {
        const ang = (i * Math.PI * 2) / total + t * 0.6;
        const isHeavy = i % 3 === 0;
        fireEnemyBullet(ctx, boss.x, boss.y, ang, isHeavy ? 138 : 162 + (i % 2) * 32, isHeavy ? 'heavy_orb' : 'diamond', 17, 5.5);
      }
    } else {
      boss.fireTimer = boss.phase === 2 ? 0.36 : 0.48;
      const spread = boss.phase === 2 ? 9 : 6;
      for (let i = 0; i < spread; i++) {
        fireEnemyBullet(ctx, boss.x, boss.y, toPlayer + (i - (spread - 1) / 2) * 0.23, 168, 'diamond', 18, 5.5);
      }
    }
    return;
  }

  // BOSS III: CHRONO ARCHON
  if (pat % 6 === 0) {
    boss.fireTimer = 0.98;
    const spokes = boss.phase >= 3 ? 5 : 4;
    for (let i = 0; i < spokes; i++) {
      const ang = toPlayer + (i * Math.PI * 2) / spokes + 0.22;
      ctx.lasers.push({
        x1: boss.x,
        y1: boss.y,
        x2: boss.x + Math.cos(ang) * 680,
        y2: boss.y + Math.sin(ang) * 680,
        width: 12,
        color: '#f6c453',
        alpha: 1,
        life: 0.82,
        maxLife: 0.82,
        isEnemy: true,
        isTelegraph: true,
        damage: 30
      });
    }
  } else if (pat % 6 === 3) {
    boss.fireTimer = boss.phase >= 3 ? 0.68 : 0.84;
    const total = boss.phase >= 3 ? 22 : 16;
    for (let i = 0; i < total; i++) {
      const ang = (i * Math.PI * 2) / total + boss.angle;
      const isHeavy = i % 2 === 0;
      fireEnemyBullet(ctx, boss.x, boss.y, ang, isHeavy ? 144 : 174, isHeavy ? 'heavy_orb' : 'orb', 18, 5.8);
    }
  } else {
    boss.fireTimer = boss.phase >= 3 ? 0.19 : boss.phase === 2 ? 0.24 : 0.32;
    const arms = boss.phase >= 3 ? 9 : 7;
    const dir = pat % 2 === 0 ? 1 : -1;
    for (let i = 0; i < arms; i++) {
      fireEnemyBullet(
        ctx,
        boss.x,
        boss.y,
        t * 2.5 * dir + (i * Math.PI * 2) / arms,
        162 + boss.phase * 12,
        i % 3 === 0 ? 'diamond' : 'orb',
        18,
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
