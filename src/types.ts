export type GamePhase =
  | 'menu'
  | 'playing'
  | 'levelup'
  | 'paused'
  | 'gameover'
  | 'victory';

export type VesselId = 'vesper' | 'aegis' | 'phantom';

export type WeaponId =
  | 'pulse_lance'
  | 'halo_blades'
  | 'arc_tether'
  | 'prism_drones'
  | 'void_mortars'
  | 'phase_daggers';

export type PassiveId =
  | 'chrono_capacitor'
  | 'kinetic_thrusters'
  | 'flux_coil'
  | 'aether_lens'
  | 'singularity_core'
  | 'graze_conduit';

export type MetaUpgradeId =
  | 'hull_integrity'
  | 'kinetic_core'
  | 'parry_resonance'
  | 'time_lattice'
  | 'magnet_field'
  | 'reroll_module';

export interface Vec2 {
  x: number;
  y: number;
}

export interface VesselDef {
  id: VesselId;
  name: string;
  codename: string;
  tagline: string;
  accent: string;
  glow: string;
  starterWeapon: WeaponId;
  unlockCost: number;
  unlockBossHint: string;
  stats: {
    maxHp: number;
    moveSpeed: number;
    maxCharge: number;
    chargeRateMult: number;
    parryRadiusMult: number;
    grazeRadius: number;
    armor: number;
  };
  perk: string;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  evolvedName: string;
  catalystPassive: PassiveId;
  accent: string;
  icon: string;
  normalDesc: string;
  stillpointDesc: string;
  evolvedDesc: string;
  maxLevel: number;
}

export interface PassiveDef {
  id: PassiveId;
  name: string;
  pairsWith: WeaponId;
  accent: string;
  icon: string;
  desc: string;
  perLevelLabel: string;
  maxLevel: number;
}

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  perLevelText: string;
}

export interface MetaSave {
  shards: number;
  bestTimeSec: number;
  bestScore: number;
  totalRuns: number;
  totalParries: number;
  bossesCleared: number;
  unlockedVessels: VesselId[];
  selectedVessel: VesselId;
  upgrades: Record<MetaUpgradeId, number>;
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
    reduceFlash: boolean;
  };
}

export interface OwnedWeapon {
  id: WeaponId;
  level: number;
  evolved: boolean;
  cooldown: number;
  auxTimer: number;
}

export interface OwnedPassive {
  id: PassiveId;
  level: number;
}

export interface UpgradeChoice {
  kind: 'weapon' | 'passive' | 'evolution' | 'heal';
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: string;
  badge: string;
  normalNote?: string;
  stillpointNote?: string;
  nextLevel?: number;
  weaponId?: WeaponId;
  passiveId?: PassiveId;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  invulnTimer: number;
  hitFlash: number;
  // Stillpoint / Kinetic system
  kineticCharge: number;
  maxKineticCharge: number;
  inStillpoint: boolean;
  stillpointBlend: number; // 0 = normal time, 1 = full stillpoint
  stillpointTimeHeld: number;
  parryCooldown: number;
  parryCooldownMax: number;
  // Progression
  level: number;
  xp: number;
  xpToNext: number;
  rerolls: number;
  // Graze combo
  grazeCombo: number;
  grazeComboTimer: number;
  // Stats derived from vessel + passives + meta
  moveSpeed: number;
  damageMult: number;
  fireRateMult: number;
  areaMult: number;
  parryMult: number;
  chargeRateMult: number;
  stillpointDrainMult: number;
  grazeRadius: number;
  magnetRadius: number;
  armor: number;
  // Loadout
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
  // Trail for afterimages & phase daggers
  trail: Array<{ x: number; y: number; alpha: number }>;
  distanceMovedSinceDagger: number;
}

export type EnemyKind =
  | 'swarmer'
  | 'dart'
  | 'turret'
  | 'splitter'
  | 'ring_caster'
  | 'sniper'
  | 'bulwark'
  | 'spinner'
  | 'boss_weaver'
  | 'boss_seraph'
  | 'boss_archon';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  xpValue: number;
  scoreValue: number;
  isElite: boolean;
  isBoss: boolean;
  fireTimer: number;
  stateTimer: number;
  phase: number;
  patternIndex: number;
  hitFlash: number;
  telegraphAngle?: number;
  telegraphTimer?: number;
  accent: string;
  // Boss display
  bossName?: string;
  bossTitle?: string;
}

export type EnemyBulletKind = 'orb' | 'needle' | 'diamond' | 'parry_orb' | 'ring_pellet';

export interface EnemyBullet {
  id: number;
  kind: EnemyBulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  age: number;
  maxAge: number;
  grazed: boolean;
  parryable: boolean;
  isParryBonus: boolean; // Magenta ringed orb -> mega counter + charge refund!
  color: string;
  spin?: number;
}

export type PlayerBulletKind =
  | 'pulse'
  | 'parry_shard'
  | 'prism_bolt'
  | 'dagger_planted'
  | 'dagger_homing'
  | 'mortar_shell';

export interface PlayerBullet {
  id: number;
  kind: PlayerBulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  age: number;
  maxAge: number;
  color: string;
  homing: number;
  targetId?: number;
  hitSet: Set<number>;
  evolved?: boolean;
  blastRadius?: number;
}

export interface HazardZone {
  id: number;
  kind: 'crater' | 'singularity' | 'rift';
  x: number;
  y: number;
  radius: number;
  damagePerSec: number;
  age: number;
  maxAge: number;
  color: string;
  collapsed: boolean;
  evolved: boolean;
  pullStrength: number;
}

export interface LaserBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isEnemy: boolean;
  isTelegraph?: boolean;
  damage?: number;
  ownerId?: number;
}

export interface ParryWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  duration: number;
  parryCount: number;
  bonusParryCount: number;
  color: string;
}

export interface Pickup {
  id: number;
  kind: 'xp_small' | 'xp_mid' | 'xp_large' | 'heal' | 'shard' | 'magnet';
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  age: number;
  magnetized: boolean;
}

export interface BossEnclosure {
  active: boolean;
  warningTimer: number;
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  targetHalfW: number;
  targetHalfH: number;
  bossIndex: number; // 0, 1, 2
  bossId: number | null;
  pulse: number;
}

export interface RunStats {
  elapsed: number;
  score: number;
  kills: number;
  parries: number;
  bestSingleParry: number;
  grazes: number;
  bossesDefeated: number;
  shardsEarned: number;
  endlessMode: boolean;
  victory: boolean;
}

export interface InputSnapshot {
  moveX: number; // -1..1
  moveY: number; // -1..1
  isMoving: boolean;
  wantsStillpoint: boolean;
  hasInteracted: boolean;
  joystickActive: boolean;
  joyOriginX: number;
  joyOriginY: number;
  joyCurrentX: number;
  joyCurrentY: number;
  mode: 'touch' | 'keyboard';
}
