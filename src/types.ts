export type GamePhase =
  | 'menu'
  | 'playing'
  | 'levelup'
  | 'paused'
  | 'gameover'
  | 'victory';

export type VesselId = 'vesper' | 'aegis' | 'phantom' | 'volt' | 'nova' | 'seraph';

export type SkinId =
  | 'cyanide'
  | 'ronin'
  | 'gilded'
  | 'sakura'
  | 'venom'
  | 'monolith'
  | 'ultraviolet'
  | 'ink'
  | 'eclipse'
  | 'prismatic';

export type SectorId = 'drift' | 'helix' | 'furnace' | 'singularity';

export type WeaponId =
  | 'pulse_lance'
  | 'halo_blades'
  | 'arc_tether'
  | 'prism_drones'
  | 'void_mortars'
  | 'phase_daggers'
  | 'chrono_scythe'
  | 'ricochet_shard'
  | 'nova_pulse'
  | 'rail_turret';

export type PassiveId =
  | 'chrono_capacitor'
  | 'kinetic_thrusters'
  | 'flux_coil'
  | 'aether_lens'
  | 'singularity_core'
  | 'graze_conduit'
  | 'momentum_edge'
  | 'echo_chamber'
  | 'reactive_plating'
  | 'overclock_core';

export type MetaUpgradeId =
  | 'hull_integrity'
  | 'kinetic_core'
  | 'parry_resonance'
  | 'time_lattice'
  | 'magnet_field'
  | 'reroll_module'
  | 'crit_calibration'
  | 'shard_harvester';

export type PactId = 'bloodlust' | 'glass_cannon' | 'bullet_magnet' | 'greed';

export interface SkinDef {
  id: SkinId;
  name: string;
  hullFill: string;
  hullTrim: string;
  hullCore: string;
  accent: string;
  trailColor: string;
  parryOuter: string;
  parryInner: string;
  rainbow?: boolean;
  unlockCost: number;
  unlockMilestone?: string;
}

export interface SectorDef {
  id: SectorId;
  code: string;
  name: string;
  accent: string;
  bgBase: string;
  bgGlow: string;
  gridColor: string;
  gridStyle: 'square' | 'hex' | 'diamond' | 'radial';
  shardMult: number;
  difficultyMult: number;
  bossIntervalScale: number;
  unlockCost: number;
  unlockBossRequired?: number; // 1 = Boss I, 2 = Boss II, 3 = Boss III
}

export interface VesselDef {
  id: VesselId;
  name: string;
  starterWeapon: WeaponId;
  unlockCost: number;
  unlockMilestone?: string;
  stats: {
    maxHp: number;
    moveSpeed: number;
    maxCharge: number;
    chargeRateMult: number;
    parryRadiusMult: number;
    grazeRadius: number;
    armor: number;
    shield: number;
  };
  perkShort: string;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  evolvedName: string;
  catalystPassive: PassiveId;
  accent: string;
  shortDesc: string;
  stillpointShort: string;
  evolvedShort: string;
  maxLevel: number;
}

export interface PassiveDef {
  id: PassiveId;
  name: string;
  pairsWith: WeaponId;
  accent: string;
  shortStat: string;
  maxLevel: number;
}

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  perLevelShort: string;
}

export interface MilestoneDef {
  id: string;
  name: string;
  goalText: string;
  rewardShards: number;
  rewardLabel?: string;
  check: (save: MetaSave) => { current: number; target: number; done: boolean };
}

export interface MetaSave {
  shards: number;
  bestTimeSec: number;
  bestScore: number;
  bestSingleParry: number;
  totalRuns: number;
  totalKills: number;
  totalParries: number;
  totalGrazes: number;
  bossesCleared: number;
  evolutionsCrafted: number;
  noHitBossClears: number;
  sectorsCleared: SectorId[];
  unlockedVessels: VesselId[];
  selectedVessel: VesselId;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  unlockedSectors: SectorId[];
  selectedSector: SectorId;
  claimedMilestones: string[];
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
  line: string;
  accent: string;
  iconKey: string;
  level?: number;
  maxLevel?: number;
  isNew?: boolean;
  isSynergy?: boolean;
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
  shieldRegenTimer: number;
  invulnTimer: number;
  hitFlash: number;
  kineticCharge: number;
  maxKineticCharge: number;
  inStillpoint: boolean;
  stillpointBlend: number;
  stillpointTimeHeld: number;
  parryCooldown: number;
  parryCooldownMax: number;
  level: number;
  xp: number;
  xpToNext: number;
  rerolls: number;
  grazeCombo: number;
  grazeComboTimer: number;
  inOverclockRing: boolean;
  moveSpeed: number;
  damageMult: number;
  critChance: number;
  fireRateMult: number;
  areaMult: number;
  parryMult: number;
  chargeRateMult: number;
  stillpointDrainMult: number;
  grazeRadius: number;
  magnetRadius: number;
  xpMult: number;
  shardMult: number;
  bonusProjectiles: number;
  projectileSpeedMult: number;
  armor: number;
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
  pacts: PactId[];
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
  | 'reflector'
  | 'mine'
  | 'boss_weaver'
  | 'boss_seraph'
  | 'boss_archon'
  | 'boss_leviathan';

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
  bossName?: string;
  segments?: Array<{ x: number; y: number }>; // Articulated tail for Void Leviathan
}

export type EnemyBulletKind = 'orb' | 'needle' | 'diamond' | 'parry_orb';

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
  isParryBonus: boolean;
  color: string;
}

export type PlayerBulletKind =
  | 'pulse'
  | 'parry_shard'
  | 'prism_bolt'
  | 'dagger_planted'
  | 'dagger_homing'
  | 'mortar_shell'
  | 'scythe'
  | 'ricochet';

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
  bounces?: number;
  age: number;
  maxAge: number;
  color: string;
  homing: number;
  targetId?: number;
  hitSet: Set<number>;
  evolved?: boolean;
  blastRadius?: number;
  spinAngle?: number;
  returnPhase?: boolean;
}

export interface RailPylon {
  id: number;
  x: number;
  y: number;
  age: number;
  maxAge: number;
  fireTimer: number;
  evolved: boolean;
  damage: number;
}

export interface HazardZone {
  id: number;
  kind: 'crater' | 'singularity' | 'rift' | 'nova_wave';
  x: number;
  y: number;
  radius: number;
  maxRadius?: number;
  damagePerSec: number;
  age: number;
  maxAge: number;
  color: string;
  collapsed: boolean;
  evolved: boolean;
  pullStrength: number;
}

export interface WorldNode {
  id: number;
  kind: 'overclock_ring' | 'shrine' | 'pact_altar';
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  age: number;
  maxAge: number;
  progress: number; // for pact hover activation
  pactId?: PactId;
  accent: string;
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
  colorOuter: string;
  colorInner: string;
}

export interface Pickup {
  id: number;
  kind: 'xp_small' | 'xp_mid' | 'xp_large' | 'heal' | 'shard' | 'magnet' | 'chest';
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
  bossIndex: number;
  bossId: number | null;
  playerHitDuringBoss: boolean;
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
  sectorId: SectorId;
  endlessMode: boolean;
  victory: boolean;
}

export interface InputSnapshot {
  moveX: number;
  moveY: number;
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
