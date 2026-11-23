export type GamePhase =
  | 'menu'
  | 'playing'
  | 'levelup'
  | 'paused'
  | 'gameover'
  | 'victory';

export type VesselId =
  | 'vesper'
  | 'aegis'
  | 'phantom'
  | 'volt'
  | 'nova'
  | 'seraph'
  | 'reaper'
  | 'prism'
  | 'pyre'
  | 'bastion'
  | 'glacier'
  | 'valkyrie';

export type CoreId =
  | 'deflector'
  | 'blink'
  | 'siphon'
  | 'overclock'
  | 'berserk'
  | 'aegis_dome'
  | 'chrono_echo'
  | 'singularity_lance'
  | 'catalyst_surge';

export type RelicId =
  | 'glass_prism'
  | 'volatile_shrapnel'
  | 'time_bank'
  | 'blood_engine'
  | 'chain_parry'
  | 'ghost_step'
  | 'executioner'
  | 'bullet_alchemy'
  | 'orbital_overdrive'
  | 'last_stand'
  | 'double_tap'
  | 'magnetic_storm'
  | 'echo_salvo'
  | 'chrono_leech'
  | 'overcharge_shield'
  | 'volatile_xp'
  | 'berserk_heart'
  | 'ricochet_aura'
  | 'frost_shatter_relic'
  | 'golden_greed';

export type HeatId = 'swarm' | 'hyper_fire' | 'ironclad' | 'fragile' | 'cursed_void';

export type CoatingRarity = 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband';

export type WearGrade = 'FN' | 'MW' | 'FT' | 'WW' | 'BS';

export type FinishId =
  | 'factory_issue'
  | 'dune_splinter'
  | 'oxide_hazard'
  | 'ash_topo'
  | 'slag_carbon'
  | 'rust_circuit'
  | 'copper_patina'
  | 'tiger_rust'
  | 'damascus'
  | 'cobalt_hex'
  | 'blood_marble'
  | 'case_hardened'
  | 'crimson_web'
  | 'kintsugi'
  | 'pearl_mother'
  | 'fade'
  | 'doppler'
  | 'gamma_doppler'
  | 'marble_fade'
  | 'aurelia_gold'
  | 'void_starlight';

export type TrailId =
  | 'ion_ash'
  | 'slag_flame'
  | 'verdigris_mist'
  | 'crimson_burn'
  | 'void_arc'
  | 'prism_ribbon'
  | 'singularity_wake'
  | 'monolith_gold';

export type ParryFxId =
  | 'steel_ring'
  | 'shatter_gold'
  | 'blood_slash'
  | 'arc_pulse'
  | 'fractal_bloom'
  | 'obsidian_wave'
  | 'prism_shatter'
  | 'chrono_crown';

export type EffectSlot = 'trail' | 'aura';

export interface EffectItem {
  uid: string;
  slot: EffectSlot;
  effectId: TrailId | ParryFxId;
  seed: number; // 0..999 deterministic pattern geometry/phase seed
  floatVal: number; // 0.0000..0.9999 wear condition (FN -> BS)
  striker: boolean; // ST counter (kills for trails, grazes for auras)
  statCount: number;
  specialTag?: string;
  acquiredAt: number;
}

export interface CoatingItem {
  uid: string;
  finishId: FinishId;
  seed: number; // 0..999 deterministic pattern layout seed
  floatVal: number; // 0.0000..0.9999 wear condition
  striker: boolean; // StatTrak-style confirmed kill tracker
  kills: number;
  specialTag?: string;
  acquiredAt: number;
}

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
  | 'rail_turret'
  | 'frost_nova'
  | 'swarm_missiles'
  | 'grav_flail'
  | 'acid_sprayer'
  | 'mirror_beam'
  | 'shatter_mine';

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
  | 'overclock_core'
  | 'cryo_core'
  | 'targeting_array'
  | 'heavy_frame'
  | 'corrosive_vat'
  | 'optic_relay'
  | 'blast_capacitor';

export type MetaUpgradeId =
  | 'hull_integrity'
  | 'kinetic_core'
  | 'parry_resonance'
  | 'time_lattice'
  | 'magnet_field'
  | 'reroll_module'
  | 'crit_calibration'
  | 'shard_harvester';

export type PactId =
  | 'bloodlust'
  | 'glass_cannon'
  | 'bullet_magnet'
  | 'greed'
  | 'chronos'
  | 'berserker'
  | 'colossus'
  | 'execution';

export interface CoreDef {
  id: CoreId;
  name: string;
  shortDesc: string;
  accent: string;
  unlockCost: number;
}

export interface RelicDef {
  id: RelicId;
  name: string;
  line: string;
  accent: string;
  iconKey: string;
}

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
  unlockBossRequired?: number;
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
    coreAreaMult: number;
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

export type ModuleCategory = 'combat' | 'movement' | 'tactics' | 'risk';

export type ModuleId =
  | 'point_blank'
  | 'snap_focus'
  | 'brink_capacitor'
  | 'heavy_ordnance'
  | 'ricochet_rig'
  | 'specialist_lock'
  | 'afterburner_mines'
  | 'momentum_drive'
  | 'graze_spark'
  | 'exit_vortex'
  | 'focus_surge'
  | 'kinetic_shield'
  | 'pressure_vent'
  | 'emp_shell'
  | 'cryo_shatter'
  | 'blood_pact'
  | 'chain_detonate'
  | 'risk_glass'
  | 'risk_drain'
  | 'risk_strict';

export interface ModuleDef {
  id: ModuleId;
  name: string;
  category: ModuleCategory;
  /** Positive cost uses Pick-10 points; negative cost (Risk Trait) expands budget! */
  points: number;
  unlockCost: number;
  iconKey: string;
  accent: string;
  line: string;
}

export type LoadoutPresetIndex = 0 | 1 | 2;

export type CrateDrop =
  | { kind: 'coating'; rarity: CoatingRarity; coating: CoatingItem }
  | { kind: 'effect'; rarity: CoatingRarity; effect: EffectItem };

export interface MilestoneDef {
  id: string;
  name: string;
  goalText: string;
  rewardShards: number;
  rewardLabel?: string;
  check: (save: MetaSave) => { current: number; target: number; done: boolean };
}

export type ControlMode = 'joystick' | 'direct';

export interface MetaSave {
  shards: number;
  keys: number;
  standardCrates: number;
  relicCrates: number;
  bestTimeSec: number;
  bestScore: number;
  bestSingleParry: number;
  totalRuns: number;
  totalKills: number;
  totalParries: number;
  totalGrazes: number;
  totalBrinkShocks: number;
  totalPressureReleases: number;
  heatClears: number;
  bossesCleared: number;
  evolutionsCrafted: number;
  noHitBossClears: number;
  sectorsCleared: SectorId[];
  bestScoreBySector: Partial<Record<SectorId, number>>;
  bestTimeBySector: Partial<Record<SectorId, number>>;
  unlockedVessels: VesselId[];
  selectedVessel: VesselId;
  unlockedCores: CoreId[];
  selectedCore: CoreId;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  coatings: CoatingItem[];
  equippedCoatingUid: string;
  effectItems: EffectItem[];
  equippedTrailUid: string;
  equippedAuraUid: string;
  unlockedTrails: TrailId[];
  selectedTrail: TrailId;
  unlockedParryFx: ParryFxId[];
  selectedParryFx: ParryFxId;
  unlockedSectors: SectorId[];
  selectedSector: SectorId;
  activeHeat: HeatId[];
  claimedMilestones: string[];
  upgrades: Record<MetaUpgradeId, number>;
  unlockedModules: ModuleId[];
  loadoutPresets: [ModuleId[], ModuleId[], ModuleId[]];
  activePreset: LoadoutPresetIndex;
  migratedToLoadout?: boolean;
  migratedToTheoryLoadout?: boolean;
  tutorialSeen: boolean;
  lastSeenNewsId: string;
  crateBoostRunsLeft: number;
  adBoostsUsedToday: number;
  adBoostDayKey: string;
  savedAt: number;
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
    reduceFlash: boolean;
    controlMode: ControlMode;
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

export type DraftCurseId =
  | 'fragile_hull'
  | 'fast_hostiles'
  | 'heavy_drain'
  | 'slow_rig'
  | 'blood_tax';

export interface UpgradeChoice {
  kind: 'weapon' | 'passive' | 'evolution' | 'relic' | 'heal';
  id: string;
  title: string;
  line: string;
  accent: string;
  iconKey: string;
  level?: number;
  maxLevel?: number;
  isNew?: boolean;
  isSynergy?: boolean;
  pairIconKey?: string;
  isOverclocked?: boolean;
  curseId?: DraftCurseId;
  curseLine?: string;
  bonusLevels?: number;
  weaponId?: WeaponId;
  passiveId?: PassiveId;
  relicId?: RelicId;
}

export interface BlinkDecoy {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  radius: number;
}

export interface WakeMine {
  id: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  age: number;
  maxAge: number;
  armed: boolean;
}

export interface PhaseEcho {
  id: number;
  x: number;
  y: number;
  angle: number;
  age: number;
  maxAge: number;
  fireTimer: number;
  muzzleFlash: number;
  weaponId: WeaponId;
  targetX?: number;
  targetY?: number;
}

export interface MeteorStrike {
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
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
  contactInvulnTimer: number;
  hitSfxCooldown: number;
  hitFlash: number;
  kineticCharge: number;
  maxKineticCharge: number;
  inStillpoint: boolean;
  stillpointBlend: number;
  stillpointTimeHeld: number;
  coreCooldown: number;
  coreCooldownMax: number;
  level: number;
  xp: number;
  xpToNext: number;
  rerolls: number;
  grazeCombo: number;
  grazeComboTimer: number;
  grazeHealCounter: number;
  grazeBurstCounter: number;
  // Momentum / Surge Overdrive!
  momentum: number; // 0..100
  surgeTier: number; // 1..4
  surgeTimer: number; // >0 when in 6s MAX SURGE!
  frenzyTimer: number; // Blood Engine relic
  berserkStacks: number;
  berserkTimer: number;
  lastStandUsed: boolean;
  missileLocks: number[]; // enemy ids painted during Stillpoint!
  inOverclockRing: boolean;
  moveSpeed: number;
  damageMult: number;
  bossDmgMult: number;
  critChance: number;
  critMult: number;
  fireRateMult: number;
  areaMult: number;
  corePowerMult: number;
  chargeRateMult: number;
  stillpointDrainMult: number;
  grazeRadius: number;
  magnetRadius: number;
  xpMult: number;
  shardMult: number;
  bonusProjectiles: number;
  projectileSpeedMult: number;
  slowPower: number;
  slowDmgMult: number;
  armor: number;
  modules: ModuleId[];
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
  relics: RelicId[];
  pacts: PactId[];
  curses: DraftCurseId[];
  trail: Array<{ x: number; y: number; alpha: number }>;
  distanceMovedSinceDagger: number;
  distanceMovedSinceMine: number;
  momentumMoveTime: number;
  kineticOvershield: number;
  kineticShieldDelay: number;
  empCooldown: number;
  exitVortexCooldown: number;
  freeFocusTimer: number;
  shotCounter: number;
  bloodKillCounter: number;
  bloodSpeedTimer: number;
  grazeSparkCounter: number;
  valkyrieGrazeCounter: number;
  railChargeTime: number;
  flailAngle: number;
  xpNovaCounter: number;
  echoSalvoCounter: number;
  haloOrbitAngle: number;
  droneOrbitAngle: number;
  // Stillpoint spatial risk & skill expression: Brink Shockwave, Bullet Pressure, Reactor Stall
  brinkCooldown: number;
  brinkFlashTimer: number;
  pressureCharge: number; // 0..1 built while holding Stillpoint near live enemy bullets
  pressureActiveBullets: number;
  overpressureTimer: number;
  overpressurePower: number; // 0..1 scaled surge on clean Pressure exit
  stallTimer: number; // >0 Reactor Stall lockout after draining Focus to 0%
  stallMaxTimer: number;
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
  | 'leech'
  | 'bomber'
  | 'aegis_bot'
  | 'carrier'
  | 'hauler'
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
  chillTimer?: number;
  corrodeTimer?: number;
  primedTimer?: number;
  catalystMark?: number;
  stunTimer?: number;
  shardSpillCooldown?: number;
  telegraphAngle?: number;
  telegraphTimer?: number;
  accent: string;
  bossName?: string;
  segments?: Array<{ x: number; y: number }>;
}

export type EnemyBulletKind = 'orb' | 'needle' | 'diamond' | 'heavy_orb';

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
  | 'ricochet'
  | 'frost_bolt'
  | 'missile'
  | 'shrapnel'
  | 'acid_glob'
  | 'seeker_mine';

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
  hitResetTimer?: number;
  returnPhase?: boolean;
  banked?: boolean;
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
  kind: 'crater' | 'singularity' | 'rift' | 'nova_wave' | 'frost_burst' | 'acid_pool';
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
  progress: number;
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
  hitPlayer?: boolean;
}

export interface Pickup {
  id: number;
  kind: 'xp_small' | 'xp_mid' | 'xp_large' | 'heal' | 'blood_cell' | 'shard' | 'magnet' | 'chest';
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
  grazes: number;
  bestGrazeCombo: number;
  brinkShocks: number;
  pressureReleases: number;
  bossesDefeated: number;
  shardsEarned: number;
  cratesEarned: number;
  relicCratesEarned: number;
  sectorId: SectorId;
  vesselId: VesselId;
  coreId: CoreId;
  skinId: SkinId;
  heatCount: number;
  weapons: Array<{ id: WeaponId; level: number; evolved: boolean }>;
  relics: RelicId[];
  weaponDamage: Record<string, number>;
  endlessMode: boolean;
  victory: boolean;
  isNewBestScore?: boolean;
  isNewBestTime?: boolean;
  isNewBestGraze?: boolean;
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
  controlMode: ControlMode;
}
