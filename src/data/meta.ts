import { bridge } from '../bridge';
import { CORE_ORDER, HEAT_ORDER } from './builds';
import {
  CRATE_KEY_COST,
  createEffectItem,
  createStarterAuraItem,
  createStarterCoating,
  createStarterTrailItem,
  FINISHES,
  forgeTradeUpCoating,
  forgeTradeUpEffect,
  getCoatingScrapValue,
  getEffectScrapValue,
  isStarterEffect,
  PARRY_FX,
  TRAILS
} from './finishes';
import {
  canToggleModule,
  DEFAULT_PRESETS,
  LEGACY_MODULE_COSTS,
  MODULES,
  STARTER_UNLOCKED_MODULES
} from './loadout';
import { SECTOR_ORDER } from './sectors';
import { SKINS } from './skins';
import { WEAPON_ORDER } from './upgrades';
import { VESSEL_ORDER, VESSELS } from './vessels';
import {
  CoatingItem,
  CoreId,
  CrateDrop,
  EffectItem,
  HeatId,
  LoadoutPresetIndex,
  MetaSave,
  MetaUpgradeDef,
  MilestoneDef,
  ModuleId,
  ParryFxId,
  SectorId,
  SkinId,
  TrailId,
  VesselId,
  WeaponId
} from '../types';

export const SAVE_STORAGE_KEY = 'stillpoint_save_v1';
export const MAX_AD_BOOSTS_PER_DAY = 2;
export const AD_BOOST_RUN_COUNT = 3;
export const AD_BOOST_CRATE_MULT = 1.5;

export function getLocalDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRemainingAdBoostsToday(save: MetaSave): number {
  const today = getLocalDayKey();
  const used = save.adBoostDayKey === today ? save.adBoostsUsedToday : 0;
  return Math.max(0, MAX_AD_BOOSTS_PER_DAY - used);
}

export function grantCrateBoost(save: MetaSave): boolean {
  const today = getLocalDayKey();
  if (save.adBoostDayKey !== today) {
    save.adBoostDayKey = today;
    save.adBoostsUsedToday = 0;
  }
  if (save.adBoostsUsedToday >= MAX_AD_BOOSTS_PER_DAY) return false;
  save.adBoostsUsedToday += 1;
  save.crateBoostRunsLeft = Math.min(AD_BOOST_RUN_COUNT, save.crateBoostRunsLeft + AD_BOOST_RUN_COUNT);
  persistMetaSave(save);
  return true;
}

export function consumeCrateBoostRun(save: MetaSave): void {
  if (save.crateBoostRunsLeft <= 0) return;
  save.crateBoostRunsLeft = Math.max(0, save.crateBoostRunsLeft - 1);
  persistMetaSave(save);
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'hull_integrity', name: 'Hull Frame', maxLevel: 5, baseCost: 35, costStep: 35, perLevelShort: '+14 max HP' },
  { id: 'kinetic_core', name: 'Kinetic Core', maxLevel: 5, baseCost: 40, costStep: 40, perLevelShort: '+10% focus charge' },
  { id: 'parry_resonance', name: 'Core Amplifier', maxLevel: 5, baseCost: 45, costStep: 45, perLevelShort: '+8% core area, +12% damage' },
  { id: 'time_lattice', name: 'Time Lattice', maxLevel: 5, baseCost: 45, costStep: 45, perLevelShort: '-7% slow-mo drain' },
  { id: 'crit_calibration', name: 'Crit Optics', maxLevel: 5, baseCost: 50, costStep: 45, perLevelShort: '+5% crit chance' },
  { id: 'magnet_field', name: 'Magnet Field', maxLevel: 5, baseCost: 30, costStep: 30, perLevelShort: '+20 pickup pull' },
  { id: 'shard_harvester', name: 'Shard Matrix', maxLevel: 5, baseCost: 55, costStep: 50, perLevelShort: '+12% shards earned' },
  { id: 'reroll_module', name: 'Draft Rerolls', maxLevel: 4, baseCost: 70, costStep: 70, perLevelShort: '+1 reroll per run' }
];

// Rare, skill-gated trials: ships and effects stay genuine crate chases
export const MILESTONES: MilestoneDef[] = [
  {
    id: 'first_blood',
    name: 'Initiate',
    goalText: '50 kills',
    rewardShards: 40,
    check: (s) => ({ current: s.totalKills, target: 50, done: s.totalKills >= 50 })
  },
  {
    id: 'slayer_500',
    name: 'Reaper',
    goalText: '500 kills',
    rewardShards: 120,
    check: (s) => ({ current: s.totalKills, target: 500, done: s.totalKills >= 500 })
  },
  {
    id: 'parry_25',
    name: 'Close Call',
    goalText: '60 grazes',
    rewardShards: 50,
    check: (s) => ({ current: s.totalGrazes, target: 60, done: s.totalGrazes >= 60 })
  },
  {
    id: 'parry_150',
    name: 'Tempest',
    goalText: '350 grazes',
    rewardShards: 140,
    check: (s) => ({ current: s.totalGrazes, target: 350, done: s.totalGrazes >= 350 })
  },
  {
    id: 'parry_burst_8',
    name: 'Graze Streak',
    goalText: '12× graze combo',
    rewardShards: 110,
    check: (s) => ({ current: s.bestSingleParry, target: 12, done: s.bestSingleParry >= 12 })
  },
  {
    id: 'graze_200',
    name: 'Razor Edge',
    goalText: '200 grazes',
    rewardShards: 90,
    check: (s) => ({ current: s.totalGrazes, target: 200, done: s.totalGrazes >= 200 })
  },
  {
    id: 'evo_1',
    name: 'Catalyst',
    goalText: '1 evolution',
    rewardShards: 80,
    check: (s) => ({ current: s.evolutionsCrafted, target: 1, done: s.evolutionsCrafted >= 1 })
  },
  {
    id: 'evo_5',
    name: 'Alchemist',
    goalText: '5 evolutions',
    rewardShards: 180,
    check: (s) => ({ current: s.evolutionsCrafted, target: 5, done: s.evolutionsCrafted >= 5 })
  },
  {
    id: 'boss_1',
    name: 'Weaver Fall',
    goalText: '1 boss cleared',
    rewardShards: 90,
    check: (s) => ({ current: s.bossesCleared, target: 1, done: s.bossesCleared >= 1 })
  },
  {
    id: 'boss_2',
    name: 'Seraph Fall',
    goalText: '2 bosses cleared',
    rewardShards: 130,
    check: (s) => ({ current: s.bossesCleared, target: 2, done: s.bossesCleared >= 2 })
  },
  {
    id: 'boss_3',
    name: 'Archon Fall',
    goalText: '3 bosses cleared',
    rewardShards: 220,
    check: (s) => ({ current: s.bossesCleared, target: 3, done: s.bossesCleared >= 3 })
  },
  {
    id: 'no_hit_boss',
    name: 'Untouched',
    goalText: 'No-hit boss clear',
    rewardShards: 220,
    rewardLabel: '+1 crate',
    check: (s) => ({ current: s.noHitBossClears, target: 1, done: s.noHitBossClears >= 1 })
  },
  {
    id: 'sector_drift',
    name: 'Ash Clear',
    goalText: 'Clear Ash Flats',
    rewardShards: 150,
    check: (s) => ({
      current: s.sectorsCleared.includes('drift') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('drift')
    })
  },
  {
    id: 'sector_helix',
    name: 'Metro Clear',
    goalText: 'Clear Sunken Metro',
    rewardShards: 200,
    rewardLabel: '+1 classified',
    check: (s) => ({
      current: s.sectorsCleared.includes('helix') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('helix')
    })
  },
  {
    id: 'sector_furnace',
    name: 'Foundry Clear',
    goalText: 'Clear Slag Foundry',
    rewardShards: 260,
    rewardLabel: '+1 classified',
    check: (s) => ({
      current: s.sectorsCleared.includes('furnace') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('furnace')
    })
  },
  {
    id: 'sector_singularity',
    name: 'Monolith Clear',
    goalText: 'Clear The Monolith',
    rewardShards: 400,
    rewardLabel: '+1 classified',
    check: (s) => ({
      current: s.sectorsCleared.includes('singularity') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('singularity')
    })
  },
  {
    id: 'graze_20',
    name: 'Untouchable',
    goalText: '20× graze combo',
    rewardShards: 140,
    check: (s) => ({ current: s.bestSingleParry, target: 20, done: s.bestSingleParry >= 20 })
  },
  {
    id: 'slayer_2000',
    name: 'Wasteland Scourge',
    goalText: '2,000 kills',
    rewardShards: 180,
    rewardLabel: '+1 crate',
    check: (s) => ({ current: s.totalKills, target: 2000, done: s.totalKills >= 2000 })
  },
  {
    id: 'heat_clear_2',
    name: 'Pressure Test',
    goalText: 'Clear at 2+ Heat',
    rewardShards: 250,
    rewardLabel: '+1 classified',
    check: (s) => ({ current: s.heatClears, target: 1, done: s.heatClears >= 1 })
  },
  {
    id: 'score_50k',
    name: 'High Signal',
    goalText: '50,000 score',
    rewardShards: 160,
    check: (s) => ({ current: s.bestScore, target: 50000, done: s.bestScore >= 50000 })
  },
  {
    id: 'trophies_8',
    name: 'Ascendant',
    goalText: '12 trials complete',
    rewardShards: 320,
    rewardLabel: '+1 classified',
    check: (s) => ({
      current: s.claimedMilestones.length,
      target: 12,
      done: s.claimedMilestones.length >= 12
    })
  }
];

export function createDefaultSave(): MetaSave {
  const starter = createStarterCoating();
  const starterTrail = createStarterTrailItem();
  const starterAura = createStarterAuraItem();
  return {
    shards: 0,
    keys: 1,
    standardCrates: 0,
    relicCrates: 0,
    bestTimeSec: 0,
    bestScore: 0,
    bestSingleParry: 0,
    totalRuns: 0,
    totalKills: 0,
    totalParries: 0,
    totalGrazes: 0,
    heatClears: 0,
    bossesCleared: 0,
    evolutionsCrafted: 0,
    noHitBossClears: 0,
    sectorsCleared: [],
    bestScoreBySector: {},
    bestTimeBySector: {},
    unlockedVessels: ['vesper'],
    selectedVessel: 'vesper',
    unlockedWeapons: ['pulse_lance'],
    selectedWeapon: 'pulse_lance',
    unlockedCores: ['deflector'],
    selectedCore: 'deflector',
    unlockedSkins: ['cyanide'],
    selectedSkin: 'cyanide',
    coatings: [starter],
    equippedCoatingUid: starter.uid,
    effectItems: [starterTrail, starterAura],
    equippedTrailUid: starterTrail.uid,
    equippedAuraUid: starterAura.uid,
    unlockedTrails: ['ion_ash'],
    selectedTrail: 'ion_ash',
    unlockedParryFx: ['steel_ring'],
    selectedParryFx: 'steel_ring',
    unlockedSectors: ['drift'],
    selectedSector: 'drift',
    activeHeat: [],
    claimedMilestones: [],
    upgrades: {
      hull_integrity: 0,
      kinetic_core: 0,
      parry_resonance: 0,
      time_lattice: 0,
      magnet_field: 0,
      reroll_module: 0,
      crit_calibration: 0,
      shard_harvester: 0
    },
    unlockedModules: [...STARTER_UNLOCKED_MODULES],
    loadoutPresets: [
      [...DEFAULT_PRESETS[0]],
      [...DEFAULT_PRESETS[1]],
      [...DEFAULT_PRESETS[2]]
    ],
    activePreset: 0,
    migratedToLoadout: true,
    migratedToTheoryLoadout: true,
    tutorialSeen: false,
    lastSeenNewsId: '',
    crateBoostRunsLeft: 0,
    adBoostsUsedToday: 0,
    adBoostDayKey: getLocalDayKey(),
    savedAt: Date.now(),
    settings: {
      music: true,
      sfx: true,
      haptics: true,
      reduceFlash: false,
      controlMode: 'joystick'
    }
  };
}

export function getMetaUpgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return def.baseCost + currentLevel * def.costStep;
}

function isValidEffectItem(x: unknown): x is EffectItem {
  if (!x || typeof x !== 'object') return false;
  const e = x as Partial<EffectItem>;
  if (e.slot === 'trail') return typeof e.effectId === 'string' && e.effectId in TRAILS && typeof e.uid === 'string';
  if (e.slot === 'aura') return typeof e.effectId === 'string' && e.effectId in PARRY_FX && typeof e.uid === 'string';
  return false;
}

export function parseMetaSaveJson(raw: string): MetaSave | null {
  const fallback = createDefaultSave();
  try {
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    if (!parsed || typeof parsed !== 'object') return null;
    const validMod = (id: unknown): id is ModuleId => typeof id === 'string' && id in MODULES;

    // Refund any old pre-v1.0.13 stat-stick loadout modules once so players can buy new theory-craft modules freely
    let legacyModRefund = 0;
    const needsTheoryMigration = !parsed.migratedToTheoryLoadout && Array.isArray(parsed.unlockedModules);
    if (needsTheoryMigration && Array.isArray(parsed.unlockedModules)) {
      for (const oldId of parsed.unlockedModules as string[]) {
        if (!(oldId in MODULES) && oldId in LEGACY_MODULE_COSTS) {
          legacyModRefund += LEGACY_MODULE_COSTS[oldId];
        }
      }
    }

    const remapMod = (id: unknown): unknown =>
      id === 'deadeye_sync' || id === 'brink_capacitor'
        ? 'emergency_vent'
        : id === 'shock_sync' || id === 'pressure_vent'
          ? 'surge_capacitor'
          : id;

    const unlockedModules = Array.isArray(parsed.unlockedModules)
      ? Array.from(
          new Set([...STARTER_UNLOCKED_MODULES, ...parsed.unlockedModules.map(remapMod).filter(validMod)])
        )
      : [...STARTER_UNLOCKED_MODULES];

    const rawPresets = Array.isArray(parsed.loadoutPresets) ? parsed.loadoutPresets : null;
    const sanitizePreset = (arr: unknown, idx: number): ModuleId[] => {
      if (!Array.isArray(arr)) return [...DEFAULT_PRESETS[idx]];
      const kept = Array.from(
        new Set(arr.map(remapMod).filter((m): m is ModuleId => validMod(m) && unlockedModules.includes(m)))
      );
      if (needsTheoryMigration && kept.length === 0) return [...DEFAULT_PRESETS[idx]];
      return kept;
    };
    const loadoutPresets: [ModuleId[], ModuleId[], ModuleId[]] = [
      sanitizePreset(rawPresets?.[0], 0),
      sanitizePreset(rawPresets?.[1], 1),
      sanitizePreset(rawPresets?.[2], 2)
    ];

    const activePreset: LoadoutPresetIndex =
      parsed.activePreset === 1 || parsed.activePreset === 2 ? parsed.activePreset : 0;

    // Migrate legacy unlockedTrails/unlockedParryFx arrays into rolled EffectItems!
    const starterTrail = createStarterTrailItem();
    const starterAura = createStarterAuraItem();
    let effectItems: EffectItem[] = Array.isArray(parsed.effectItems)
      ? parsed.effectItems.filter(isValidEffectItem)
      : [];

    if (!effectItems.some((e) => e.uid === starterTrail.uid)) {
      effectItems.push(starterTrail);
    }
    if (!effectItems.some((e) => e.uid === starterAura.uid)) {
      effectItems.push(starterAura);
    }
    if (!Array.isArray(parsed.effectItems)) {
      if (Array.isArray(parsed.unlockedTrails)) {
        for (const tid of parsed.unlockedTrails) {
          if (tid !== 'ion_ash' && tid in TRAILS && !effectItems.some((e) => e.slot === 'trail' && e.effectId === tid)) {
            effectItems.push(createEffectItem('trail', tid));
          }
        }
      }
      if (Array.isArray(parsed.unlockedParryFx)) {
        for (const pid of parsed.unlockedParryFx) {
          if (pid !== 'steel_ring' && pid in PARRY_FX && !effectItems.some((e) => e.slot === 'aura' && e.effectId === pid)) {
            effectItems.push(createEffectItem('aura', pid));
          }
        }
      }
    }

    const equippedTrailUid =
      typeof parsed.equippedTrailUid === 'string' && effectItems.some((e) => e.uid === parsed.equippedTrailUid && e.slot === 'trail')
        ? parsed.equippedTrailUid
        : effectItems.find((e) => e.slot === 'trail' && e.effectId === parsed.selectedTrail)?.uid ?? starterTrail.uid;

    const equippedAuraUid =
      typeof parsed.equippedAuraUid === 'string' && effectItems.some((e) => e.uid === parsed.equippedAuraUid && e.slot === 'aura')
        ? parsed.equippedAuraUid
        : effectItems.find((e) => e.slot === 'aura' && e.effectId === parsed.selectedParryFx)?.uid ?? starterAura.uid;

    const rawCtrl = parsed.settings?.controlMode;
    const controlMode = rawCtrl === 'direct' ? 'direct' : 'joystick';

    const unlockedVessels: VesselId[] = Array.isArray(parsed.unlockedVessels)
      ? (Array.from(
          new Set([
            'vesper',
            ...parsed.unlockedVessels.filter((v) => VESSEL_ORDER.includes(v as VesselId))
          ])
        ) as VesselId[])
      : ['vesper'];

    const selectedVessel: VesselId =
      typeof parsed.selectedVessel === 'string' && unlockedVessels.includes(parsed.selectedVessel as VesselId)
        ? (parsed.selectedVessel as VesselId)
        : 'vesper';

    // Backward-compatible migration: legacy saves inherit starting weapons from every already-unlocked ship
    const hasWeaponField = Array.isArray(parsed.unlockedWeapons);
    const unlockedWeapons: WeaponId[] = hasWeaponField
      ? (Array.from(
          new Set([
            'pulse_lance',
            ...parsed.unlockedWeapons!.filter((w) => WEAPON_ORDER.includes(w as WeaponId))
          ])
        ) as WeaponId[])
      : (Array.from(
          new Set(['pulse_lance', ...unlockedVessels.map((v) => VESSELS[v].starterWeapon)])
        ) as WeaponId[]);

    const selectedWeapon: WeaponId =
      typeof parsed.selectedWeapon === 'string' && unlockedWeapons.includes(parsed.selectedWeapon as WeaponId)
        ? (parsed.selectedWeapon as WeaponId)
        : !hasWeaponField
          ? VESSELS[selectedVessel].starterWeapon
          : 'pulse_lance';

    const merged: MetaSave = {
      ...fallback,
      ...parsed,
      upgrades: {
        ...fallback.upgrades,
        ...(parsed.upgrades ?? {})
      },
      unlockedModules,
      loadoutPresets,
      activePreset,
      migratedToTheoryLoadout: true,
      tutorialSeen:
        typeof parsed.tutorialSeen === 'boolean'
          ? parsed.tutorialSeen
          : Boolean(parsed.totalRuns && parsed.totalRuns > 0),
      lastSeenNewsId: typeof parsed.lastSeenNewsId === 'string' ? parsed.lastSeenNewsId : '',
      crateBoostRunsLeft:
        typeof parsed.crateBoostRunsLeft === 'number' && Number.isFinite(parsed.crateBoostRunsLeft)
          ? Math.max(0, Math.min(AD_BOOST_RUN_COUNT, Math.floor(parsed.crateBoostRunsLeft)))
          : 0,
      adBoostsUsedToday:
        typeof parsed.adBoostsUsedToday === 'number' && Number.isFinite(parsed.adBoostsUsedToday)
          ? Math.max(0, Math.min(MAX_AD_BOOSTS_PER_DAY, Math.floor(parsed.adBoostsUsedToday)))
          : 0,
      adBoostDayKey:
        typeof parsed.adBoostDayKey === 'string' && parsed.adBoostDayKey.length >= 8
          ? parsed.adBoostDayKey
          : getLocalDayKey(),
      savedAt:
        typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
          ? parsed.savedAt
          : Date.now(),
      heatClears:
        typeof parsed.heatClears === 'number' && Number.isFinite(parsed.heatClears)
          ? Math.max(0, Math.floor(parsed.heatClears))
          : 0,
      bestScoreBySector:
        parsed.bestScoreBySector && typeof parsed.bestScoreBySector === 'object'
          ? { ...parsed.bestScoreBySector }
          : {},
      bestTimeBySector:
        parsed.bestTimeBySector && typeof parsed.bestTimeBySector === 'object'
          ? { ...parsed.bestTimeBySector }
          : {},
      settings: {
        ...fallback.settings,
        ...(parsed.settings ?? {}),
        controlMode
      },
      unlockedVessels,
      selectedVessel,
      unlockedWeapons,
      selectedWeapon,
      unlockedCores: Array.isArray(parsed.unlockedCores)
        ? (Array.from(
            new Set([
              'deflector',
              ...parsed.unlockedCores.filter((c) => CORE_ORDER.includes(c as CoreId))
            ])
          ) as CoreId[])
        : ['deflector'],
      unlockedSkins: Array.isArray(parsed.unlockedSkins)
        ? (Array.from(
            new Set([
              'cyanide',
              ...parsed.unlockedSkins.filter((s) => typeof s === 'string' && s in SKINS)
            ])
          ) as SkinId[])
        : ['cyanide'],
      coatings:
        Array.isArray(parsed.coatings) && parsed.coatings.length > 0
          ? parsed.coatings.filter((c) => c && c.finishId in FINISHES)
          : fallback.coatings,
      equippedCoatingUid:
        typeof parsed.equippedCoatingUid === 'string'
          ? parsed.equippedCoatingUid
          : fallback.equippedCoatingUid,
      effectItems,
      equippedTrailUid,
      equippedAuraUid,
      unlockedTrails: Array.from(
        new Set(effectItems.filter((e) => e.slot === 'trail').map((e) => e.effectId as TrailId))
      ),
      selectedTrail: (effectItems.find((e) => e.uid === equippedTrailUid)?.effectId as TrailId) ?? 'ion_ash',
      unlockedParryFx: Array.from(
        new Set(effectItems.filter((e) => e.slot === 'aura').map((e) => e.effectId as ParryFxId))
      ),
      selectedParryFx: (effectItems.find((e) => e.uid === equippedAuraUid)?.effectId as ParryFxId) ?? 'steel_ring',
      keys:
        typeof parsed.keys === 'number' && Number.isFinite(parsed.keys)
          ? Math.max(0, Math.floor(parsed.keys))
          : 1,
      standardCrates:
        typeof parsed.standardCrates === 'number' && Number.isFinite(parsed.standardCrates)
          ? Math.max(0, Math.floor(parsed.standardCrates))
          : 0,
      relicCrates:
        typeof parsed.relicCrates === 'number' && Number.isFinite(parsed.relicCrates)
          ? Math.max(0, Math.floor(parsed.relicCrates))
          : 0,
      unlockedSectors: Array.isArray(parsed.unlockedSectors)
        ? (Array.from(
            new Set([
              'drift',
              ...parsed.unlockedSectors.filter((s) => SECTOR_ORDER.includes(s as SectorId))
            ])
          ) as SectorId[])
        : ['drift'],
      activeHeat: Array.isArray(parsed.activeHeat)
        ? (Array.from(new Set(parsed.activeHeat)).filter((h) =>
            HEAT_ORDER.includes(h as HeatId)
          ) as HeatId[])
        : [],
      sectorsCleared: Array.isArray(parsed.sectorsCleared) ? parsed.sectorsCleared : [],
      claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : []
    };

    if (!parsed.migratedToLoadout) {
      let refund = 0;
      for (const def of META_UPGRADES) {
        const lv = Math.max(0, Math.min(def.maxLevel, merged.upgrades[def.id] ?? 0));
        for (let i = 0; i < lv; i++) refund += getMetaUpgradeCost(def, i);
        merged.upgrades[def.id] = 0;
      }
      if (refund > 0) merged.shards += refund;
      merged.migratedToLoadout = true;
    }

    if (legacyModRefund > 0) {
      merged.shards += legacyModRefund;
    }

    if (merged.coatings.length === 0) merged.coatings = [createStarterCoating()];
    if (!merged.coatings.some((c) => c.uid === merged.equippedCoatingUid)) {
      merged.equippedCoatingUid = merged.coatings[0].uid;
    }
    if (!Number.isFinite(merged.shards) || merged.shards < 0) merged.shards = 0;
    if (!merged.unlockedVessels.includes(merged.selectedVessel)) merged.selectedVessel = 'vesper';
    if (!merged.unlockedWeapons.includes(merged.selectedWeapon)) merged.selectedWeapon = 'pulse_lance';
    if (!merged.unlockedCores.includes(merged.selectedCore)) merged.selectedCore = 'deflector';
    if (!merged.unlockedSkins.includes(merged.selectedSkin)) merged.selectedSkin = 'cyanide';
    if (!merged.unlockedSectors.includes(merged.selectedSector)) merged.selectedSector = 'drift';
    return merged;
  } catch {
    return null;
  }
}

function saveProgressWeight(s: MetaSave): number {
  return (
    s.totalRuns * 100 +
    s.totalKills +
    s.unlockedVessels.length * 250 +
    s.unlockedWeapons.length * 140 +
    s.unlockedCores.length * 250 +
    s.unlockedModules.length * 120 +
    s.coatings.length * 80 +
    s.effectItems.length * 80 +
    s.shards
  );
}

export function pickBetterSave(local: MetaSave, incoming: MetaSave): MetaSave {
  // Prefer whichever save has clearly more progression or a newer timestamp when tied
  const wLocal = saveProgressWeight(local);
  const wInc = saveProgressWeight(incoming);
  if (wInc > wLocal + 40) return incoming;
  if (wLocal > wInc + 40) return local;
  return incoming.savedAt > local.savedAt ? incoming : local;
}

export function loadMetaSave(): MetaSave {
  const fallback = createDefaultSave();
  let best: MetaSave | null = null;
  const candidates = [
    (() => {
      try {
        return localStorage.getItem(SAVE_STORAGE_KEY);
      } catch {
        return null;
      }
    })(),
    bridge.getInitialNativeSave(),
    bridge.getInitialCloudSave()
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const parsed = parseMetaSaveJson(raw);
    if (!parsed) continue;
    best = best ? pickBetterSave(best, parsed) : parsed;
  }
  return best ?? fallback;
}

export function persistMetaSave(save: MetaSave): void {
  try {
    save.savedAt = Date.now();
    const raw = JSON.stringify(save);
    localStorage.setItem(SAVE_STORAGE_KEY, raw);
    bridge.syncSaveToNative(SAVE_STORAGE_KEY, raw);
  } catch {
    // Ignore storage errors
  }
}

export function exportSaveCode(save: MetaSave): string {
  const json = JSON.stringify(save);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `SP1:${btoa(bin)}`;
}

export function importSaveCode(code: string): MetaSave | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    let rawJson = trimmed;
    if (trimmed.startsWith('SP1:')) {
      const bin = atob(trimmed.slice(4).replace(/\s+/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      rawJson = new TextDecoder().decode(bytes);
    }
    const parsed = parseMetaSaveJson(rawJson);
    if (!parsed) return null;
    persistMetaSave(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function resetMetaSave(): MetaSave {
  const fresh = createDefaultSave();
  persistMetaSave(fresh);
  return fresh;
}

export function getEquippedCoating(save: MetaSave): CoatingItem {
  return (
    save.coatings.find((c) => c.uid === save.equippedCoatingUid) ??
    save.coatings[0] ??
    createStarterCoating()
  );
}

export function getEquippedTrailItem(save: MetaSave): EffectItem {
  return (
    save.effectItems.find((e) => e.uid === save.equippedTrailUid && e.slot === 'trail') ??
    save.effectItems.find((e) => e.slot === 'trail') ??
    createStarterTrailItem()
  );
}

export function getEquippedAuraItem(save: MetaSave): EffectItem {
  return (
    save.effectItems.find((e) => e.uid === save.equippedAuraUid && e.slot === 'aura') ??
    save.effectItems.find((e) => e.slot === 'aura') ??
    createStarterAuraItem()
  );
}

export function equipCoating(save: MetaSave, uid: string): boolean {
  if (!save.coatings.some((c) => c.uid === uid)) return false;
  save.equippedCoatingUid = uid;
  persistMetaSave(save);
  return true;
}

export function equipEffectItem(save: MetaSave, uid: string): boolean {
  const item = save.effectItems.find((e) => e.uid === uid);
  if (!item) return false;
  if (item.slot === 'trail') {
    save.equippedTrailUid = item.uid;
    save.selectedTrail = item.effectId as TrailId;
  } else {
    save.equippedAuraUid = item.uid;
    save.selectedParryFx = item.effectId as ParryFxId;
  }
  persistMetaSave(save);
  return true;
}

export function scrapCoating(save: MetaSave, uid: string): number {
  const idx = save.coatings.findIndex((c) => c.uid === uid);
  if (idx < 0 || save.coatings[idx].finishId === 'factory_issue') return 0;
  const item = save.coatings[idx];
  const payout = getCoatingScrapValue(item);
  save.coatings.splice(idx, 1);
  if (save.equippedCoatingUid === uid) {
    save.equippedCoatingUid = save.coatings[0]?.uid ?? createStarterCoating().uid;
  }
  save.shards += payout;
  persistMetaSave(save);
  return payout;
}

export function scrapEffectItem(save: MetaSave, uid: string): number {
  const idx = save.effectItems.findIndex((e) => e.uid === uid);
  if (idx < 0 || isStarterEffect(save.effectItems[idx])) return 0;
  const item = save.effectItems[idx];
  const payout = getEffectScrapValue(item);
  save.effectItems.splice(idx, 1);
  if (item.slot === 'trail' && save.equippedTrailUid === uid) {
    const fallback = save.effectItems.find((e) => e.slot === 'trail') ?? createStarterTrailItem();
    save.equippedTrailUid = fallback.uid;
    save.selectedTrail = fallback.effectId as TrailId;
  } else if (item.slot === 'aura' && save.equippedAuraUid === uid) {
    const fallback = save.effectItems.find((e) => e.slot === 'aura') ?? createStarterAuraItem();
    save.equippedAuraUid = fallback.uid;
    save.selectedParryFx = fallback.effectId as ParryFxId;
  }
  save.shards += payout;
  persistMetaSave(save);
  return payout;
}

export function buyCrateKey(save: MetaSave): boolean {
  if (save.shards < CRATE_KEY_COST) return false;
  save.shards -= CRATE_KEY_COST;
  save.keys += 1;
  persistMetaSave(save);
  return true;
}

export function applyCrateDrop(
  save: MetaSave,
  drop: CrateDrop
): { isDuplicate: boolean; shardRefund: number } {
  if (drop.kind === 'coating') {
    save.coatings.unshift(drop.coating);
    persistMetaSave(save);
    return { isDuplicate: false, shardRefund: 0 };
  }
  save.effectItems.unshift(drop.effect);
  if (drop.effect.slot === 'trail' && !save.unlockedTrails.includes(drop.effect.effectId as TrailId)) {
    save.unlockedTrails.push(drop.effect.effectId as TrailId);
  } else if (drop.effect.slot === 'aura' && !save.unlockedParryFx.includes(drop.effect.effectId as ParryFxId)) {
    save.unlockedParryFx.push(drop.effect.effectId as ParryFxId);
  }
  persistMetaSave(save);
  return { isDuplicate: false, shardRefund: 0 };
}

export function executeTradeUp(save: MetaSave, uids: string[]): CoatingItem | null {
  if (uids.length !== 5) return null;
  const unique = Array.from(new Set(uids));
  if (unique.length !== 5) return null;
  const items = unique
    .map((id) => save.coatings.find((c) => c.uid === id))
    .filter((x): x is CoatingItem => Boolean(x && x.finishId !== 'factory_issue'));
  if (items.length !== 5) return null;
  const forged = forgeTradeUpCoating(items);
  if (!forged) return null;

  save.coatings = save.coatings.filter((c) => !unique.includes(c.uid));
  save.coatings.unshift(forged);
  if (unique.includes(save.equippedCoatingUid)) {
    save.equippedCoatingUid = forged.uid;
  }
  persistMetaSave(save);
  return forged;
}

export function executeEffectTradeUp(save: MetaSave, uids: string[]): EffectItem | null {
  if (uids.length !== 5) return null;
  const unique = Array.from(new Set(uids));
  if (unique.length !== 5) return null;
  const items = unique
    .map((id) => save.effectItems.find((e) => e.uid === id))
    .filter((x): x is EffectItem => Boolean(x && !isStarterEffect(x)));
  if (items.length !== 5) return null;
  const forged = forgeTradeUpEffect(items);
  if (!forged) return null;

  save.effectItems = save.effectItems.filter((e) => !unique.includes(e.uid));
  save.effectItems.unshift(forged);
  if (unique.includes(save.equippedTrailUid)) {
    const fb = save.effectItems.find((e) => e.slot === 'trail') ?? createStarterTrailItem();
    save.equippedTrailUid = fb.uid;
    save.selectedTrail = fb.effectId as TrailId;
  }
  if (unique.includes(save.equippedAuraUid)) {
    const fb = save.effectItems.find((e) => e.slot === 'aura') ?? createStarterAuraItem();
    save.equippedAuraUid = fb.uid;
    save.selectedParryFx = fb.effectId as ParryFxId;
  }
  persistMetaSave(save);
  return forged;
}

export function unlockLoadoutModule(save: MetaSave, id: ModuleId): boolean {
  const def = MODULES[id];
  if (!def || save.unlockedModules.includes(id)) return false;
  if (save.shards < def.unlockCost) return false;
  save.shards -= def.unlockCost;
  save.unlockedModules.push(id);
  persistMetaSave(save);
  return true;
}

export function toggleLoadoutModule(
  save: MetaSave,
  id: ModuleId
): { ok: boolean; reason?: string } {
  if (!save.unlockedModules.includes(id)) return { ok: false, reason: 'Locked' };
  const cur = save.loadoutPresets[save.activePreset];
  const check = canToggleModule(cur, id);
  if (!check.ok) return check;
  const idx = cur.indexOf(id);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(id);
  persistMetaSave(save);
  return { ok: true };
}

export function selectLoadoutPreset(save: MetaSave, idx: LoadoutPresetIndex): void {
  save.activePreset = idx;
  persistMetaSave(save);
}

export function clearActivePreset(save: MetaSave): void {
  save.loadoutPresets[save.activePreset] = [];
  persistMetaSave(save);
}

export function evaluateMilestones(save: MetaSave): string[] {
  const notices: string[] = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const m of MILESTONES) {
      if (save.claimedMilestones.includes(m.id)) continue;
      if (!m.check(save).done) continue;
      save.claimedMilestones.push(m.id);
      save.shards += m.rewardShards;
      notices.push(`${m.name} (+${m.rewardShards})`);

      if (m.id === 'no_hit_boss' || m.id === 'slayer_2000') {
        save.standardCrates += 1;
      }
      if (
        m.id === 'sector_helix' ||
        m.id === 'sector_furnace' ||
        m.id === 'sector_singularity' ||
        m.id === 'heat_clear_2' ||
        m.id === 'trophies_8'
      ) {
        save.relicCrates += 1;
      }
      bridge.reportAchievement(m.id, 100);
    }
  }
  if (notices.length > 0) persistMetaSave(save);
  return notices;
}
