import { sound } from '../audio';
import {
  Enemy,
  EnemyBullet,
  HazardZone,
  LaserBeam,
  OwnedWeapon,
  PlayerBullet,
  PlayerState
} from '../types';
import { ParticleSystem } from './particles';

export interface WeaponWorldContext {
  player: PlayerState;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  playerBullets: PlayerBullet[];
  hazards: HazardZone[];
  lasers: LaserBeam[];
  particles: ParticleSystem;
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
  preferBoss = false
): Enemy | null {
  let best: Enemy | null = null;
  let bestScore = maxDist * maxDist;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
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

export function getHaloBladesPositions(
  player: PlayerState,
  time: number
): HaloBladeRender[] {
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

  // Evolved ECLIPSE GYRO: second counter-rotating outer solar ring!
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

export function getPrismDronePositions(
  player: PlayerState,
  time: number
): PrismDroneRender[] {
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
  const { player, enemies, enemyBullets, playerBullets, hazards, lasers, particles } = ctx;
  const inStillpoint = player.inStillpoint;

  // Handle Void Mortar collapse/supernova transitions cleanly
  if (ctx.justEnteredStillpoint) {
    for (const h of hazards) {
      if (h.kind === 'crater') {
        h.kind = 'singularity';
        h.collapsed = true;
        h.pullStrength = 240;
        particles.ring(h.x, h.y, '#d96bff', h.radius * 0.4, 0.25);
      }
    }
    // Recall all planted Phase Daggers into homing missiles!
    let launched = 0;
    for (const b of playerBullets) {
      if (b.kind === 'dagger_planted') {
        b.kind = 'dagger_homing';
        b.age = 0;
        b.maxAge = 2.2;
        b.homing = 11.5;
        const target = findNearestEnemy(b.x, b.y, enemies, 700, true);
        const ang = target ? Math.atan2(target.y - b.y, target.x - b.x) : Math.atan2(b.y - player.y, b.x - player.x);
        const spd = 480;
        b.vx = Math.cos(ang) * spd;
        b.vy = Math.sin(ang) * spd;
        b.targetId = target?.id;
        launched++;
      }
    }
    if (launched > 0) {
      sound.playShoot('dagger');
      particles.callout(player.x, player.y - 34, `RECALL ×${launched}`, '#ff66e5', 0.95, 0.7);
    }
  }

  if (ctx.justExitedStillpoint) {
    // Supernova-detonate collapsed Void Mortar singularities when time snaps back!
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
          const d = Math.hypot(e.x - h.x, e.y - h.y);
          if (d <= blastR + e.radius) {
            ctx.damageEnemy(e, burstDmg, '#e09eff', true);
          }
        }
        if (!h.evolved) {
          hazards.splice(i, 1);
        } else {
          h.collapsed = false;
        }
      }
    }
  }

  // Update each owned weapon
  for (const w of player.weapons) {
    // Weapons cycle partially in real time during Stillpoint so Focus feels empowering!
    const dtWeapon = inStillpoint ? dtReal * 0.85 : dtWorld;
    w.cooldown -= dtWeapon * player.fireRateMult;
    w.auxTimer += dtReal;

    switch (w.id) {
      case 'pulse_lance':
        updatePulseLance(ctx, w);
        break;
      case 'halo_blades':
        updateHaloBlades(ctx, w, dtReal);
        break;
      case 'arc_tether':
        updateArcTether(ctx, w);
        break;
      case 'prism_drones':
        updatePrismDrones(ctx, w, dtReal);
        break;
      case 'void_mortars':
        updateVoidMortars(ctx, w);
        break;
      case 'phase_daggers':
        updatePhaseDaggers(ctx, w);
        break;
    }
  }
}

function updatePulseLance(ctx: WeaponWorldContext, w: OwnedWeapon): void {
  const { player, enemies, playerBullets, hazards, lasers, particles } = ctx;

  // Immediate railbeam shot right when entering Stillpoint if cooldown almost ready
  if (ctx.justEnteredStillpoint && w.cooldown < 0.25) {
    w.cooldown = 0;
  }

  if (w.cooldown > 0) return;

  const target = findNearestEnemy(player.x, player.y, enemies, 560, player.inStillpoint);
  const aimAngle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.facingAngle;

  if (player.inStillpoint) {
    // STILLPOINT MODE: Piercing Chrono Railbeam!
    w.cooldown = w.evolved ? 0.36 : Math.max(0.38, 0.56 - w.level * 0.03);
    const beamLen = 540;
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
        color: w.evolved ? '#ffe680' : '#22e6ff',
        alpha: 1,
        life: 0.2,
        maxLife: 0.2,
        isEnemy: false
      });

      // Line-circle collision against all enemies
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dist = pointToSegmentDist(e.x, e.y, sx, sy, ex, ey);
        if (dist <= e.radius + beamWidth * 0.65) {
          ctx.damageEnemy(e, dmg, w.evolved ? '#ffd166' : '#5ef2ff', true);
          particles.burst(e.x, e.y, '#22e6ff', 4, 40, 120, 2.5, 0.25);
        }
      }

      // Evolved SINGULARITY RAIL leaves gravity rifts along the beam!
      if (w.evolved && off === offsets[0]) {
        const rx = player.x + Math.cos(aimAngle) * 190;
        const ry = player.y + Math.sin(aimAngle) * 190;
        hazards.push({
          id: ctx.nextId(),
          kind: 'rift',
          x: rx,
          y: ry,
          radius: 54 * player.areaMult,
          damagePerSec: 46 * player.damageMult,
          age: 0,
          maxAge: 2.0,
          color: '#22e6ff',
          collapsed: false,
          evolved: true,
          pullStrength: 130
        });
      }
    }
    return;
  }

  // NORMAL TIME: Rapid auto-aim cyan bolt volley
  w.cooldown = w.evolved ? 0.16 : Math.max(0.2, 0.38 - w.level * 0.032);
  const shots = w.evolved ? 4 : w.level >= 4 ? 3 : w.level >= 2 ? 2 : 1;
  const spread = shots === 1 ? 0 : 0.14;
  const baseDmg = (w.evolved ? 28 : 13 + w.level * 4) * player.damageMult;
  const speed = 520;

  sound.playShoot('pulse');
  for (let i = 0; i < shots; i++) {
    const offsetAng = (i - (shots - 1) / 2) * spread;
    const ang = aimAngle + offsetAng;
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
      color: w.evolved ? '#ffd166' : '#22e6ff',
      homing: 0,
      hitSet: new Set(),
      evolved: w.evolved
    });
  }
}

function updateHaloBlades(ctx: WeaponWorldContext, w: OwnedWeapon, dtReal: number): void {
  const { player, enemies, enemyBullets, particles } = ctx;
  const blades = getHaloBladesPositions(player, ctx.time);
  const tickInterval = player.inStillpoint ? 0.1 : 0.16;

  // In Stillpoint (or Evolved), Halo Sawblades shred incoming enemy bullets!
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

  const dmg = (w.evolved ? 34 : 14 + w.level * 5) * (player.inStillpoint ? 1.35 : 1) * player.damageMult;
  for (const blade of blades) {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - blade.x;
      const dy = e.y - blade.y;
      const hitR = blade.radius + e.radius;
      if (dx * dx + dy * dy <= hitR * hitR) {
        ctx.damageEnemy(e, dmg, '#4effb4');
        if (Math.random() < 0.35) {
          particles.burst(blade.x, blade.y, '#4effb4', 2, 30, 90, 2, 0.18);
        }
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
    : w.evolved ? 0.45 : Math.max(0.52, 0.92 - w.level * 0.08);

  const range = (240 + w.level * 20) * player.areaMult;
  const maxChains = w.evolved ? 8 : 3 + w.level;
  const dmg = (w.evolved ? 36 : 16 + w.level * 6) * (inFocus ? 0.85 : 1.15) * player.damageMult;

  const first = findNearestEnemy(player.x, player.y, enemies, range, false);
  if (first) {
    sound.playShoot('zap');
    const visited = new Set<number>([first.id]);
    let curr: Enemy = first;
    particles.arc(player.x, player.y, curr.x, curr.y, w.evolved ? '#9cf6ff' : '#6fa8ff', inFocus ? 3.2 : 2.2, inFocus ? 0.22 : 0.16);
    ctx.damageEnemy(curr, dmg, '#6fa8ff');

    for (let c = 1; c < maxChains; c++) {
      let next: Enemy | null = null;
      let bestD2 = (165 * player.areaMult) ** 2;
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
      particles.arc(curr.x, curr.y, next.x, next.y, w.evolved ? '#b8f7ff' : '#6fa8ff', inFocus ? 2.6 : 1.8, inFocus ? 0.22 : 0.15);
      ctx.damageEnemy(next, dmg * Math.pow(0.92, c), '#6fa8ff');
      curr = next;
    }
  }

  // STILLPOINT BONUS: Arc Tether zaps nearby enemy bullets out of the sky!
  if (inFocus) {
    let zapped = 0;
    const maxZap = w.evolved ? 5 : 2 + Math.floor(w.level / 2);
    const zapRange2 = (160 * player.areaMult) ** 2;
    for (let i = enemyBullets.length - 1; i >= 0 && zapped < maxZap; i--) {
      const b = enemyBullets[i];
      if (!b.parryable) continue;
      const d2 = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
      if (d2 <= zapRange2) {
        particles.arc(player.x, player.y, b.x, b.y, '#9ef7ff', 2, 0.14);
        particles.burst(b.x, b.y, '#7bf7ff', 3, 30, 100, 2, 0.2);
        enemyBullets.splice(i, 1);
        zapped++;
      }
    }
  }
}

function updatePrismDrones(ctx: WeaponWorldContext, w: OwnedWeapon, dtReal: number): void {
  const { player, enemies, playerBullets, particles } = ctx;
  // Evolved SERAPHIM ARRAY slowly recharges protective shield
  if (w.evolved && w.auxTimer >= 4.0) {
    w.auxTimer = 0;
    if (player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + 6);
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
      const spd = inFocus ? 560 : 440;
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
  const count = w.evolved ? 2 : w.level >= 4 ? 2 : 1;
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
    const dx = tx - player.x;
    const dy = ty - player.y;
    const flightTime = 0.42;

    playerBullets.push({
      id: ctx.nextId(),
      kind: 'mortar_shell',
      x: player.x,
      y: player.y,
      vx: dx / flightTime,
      vy: dy / flightTime,
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
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}
