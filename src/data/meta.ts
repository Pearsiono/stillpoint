import { bridge } from '../bridge';
import {
  CoreId,
  HeatId,
  MetaSave,
  MetaUpgradeDef,
  MetaUpgradeId,
  MilestoneDef,
  SectorId,
  SkinId,
  VesselId
} from '../types';

export const SAVE_STORAGE_KEY = 'stillpoint_save_v1';

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'hull_integrity',
    name: 'Hull Frame',
    maxLevel: 5,
    baseCost: 35,
    costStep: 35,
    perLevelShort: '+14 HP'
  },
  {
    id: 'kinetic_core',
    name: 'Kinetic Core',
    maxLevel: 5,
    baseCost: 40,
    costStep: 40,
    perLevelShort: '+10% Charge'
  },
  {
    id: 'parry_resonance',
    name: 'Parry Resonance',
    maxLevel: 5,
    baseCost: 45,
    costStep: 45,
    perLevelShort: '+8% Wave · +12% DMG'
  },
  {
    id: 'time_lattice',
    name: 'Time Lattice',
    maxLevel: 5,
    baseCost: 45,
    costStep: 45,
    perLevelShort: '-7% Drain'
  },
  {
    id: 'crit_calibration',
    name: 'Crit Optics',
    maxLevel: 5,
    baseCost: 50,
    costStep: 45,
    perLevelShort: '+5% Crit'
  },
  {
    id: 'magnet_field',
    name: 'Magnet Field',
    maxLevel: 5,
    baseCost: 30,
    costStep: 30,
    perLevelShort: '+20 Pull'
  },
  {
    id: 'shard_harvester',
    name: 'Shard Matrix',
    maxLevel: 5,
    baseCost: 55,
    costStep: 50,
    perLevelShort: '+12% Shards'
  },
  {
    id: 'reroll_module',
    name: 'Draft Rerolls',
    maxLevel: 4,
    baseCost: 70,
    costStep: 70,
    perLevelShort: '+1 Reroll'
  }
];

export const MILESTONES: MilestoneDef[] = [
  {
    id: 'first_blood',
    name: 'INITIATE',
    goalText: '50 Kills',
    rewardShards: 40,
    check: (s) => ({ current: s.totalKills, target: 50, done: s.totalKills >= 50 })
  },
  {
    id: 'slayer_500',
    name: 'REAPER',
    goalText: '500 Kills',
    rewardShards: 120,
    check: (s) => ({ current: s.totalKills, target: 500, done: s.totalKills >= 500 })
  },
  {
    id: 'parry_25',
    name: 'REFLECTOR',
    goalText: '25 Parries',
    rewardShards: 50,
    check: (s) => ({ current: s.totalParries, target: 25, done: s.totalParries >= 25 })
  },
  {
    id: 'parry_150',
    name: 'TEMPEST',
    goalText: '150 Parries',
    rewardShards: 140,
    rewardLabel: 'VOLT',
    check: (s) => ({ current: s.totalParries, target: 150, done: s.totalParries >= 150 })
  },
  {
    id: 'parry_burst_8',
    name: 'SHATTER',
    goalText: '8× Single Parry',
    rewardShards: 110,
    rewardLabel: 'AMETHYST',
    check: (s) => ({ current: s.bestSingleParry, target: 8, done: s.bestSingleParry >= 8 })
  },
  {
    id: 'graze_200',
    name: 'RAZOR EDGE',
    goalText: '200 Grazes',
    rewardShards: 100,
    rewardLabel: 'FROSTGLASS',
    check: (s) => ({ current: s.totalGrazes, target: 200, done: s.totalGrazes >= 200 })
  },
  {
    id: 'evo_1',
    name: 'CATALYST',
    goalText: '1 Evolution',
    rewardShards: 80,
    check: (s) => ({
      current: s.evolutionsCrafted,
      target: 1,
      done: s.evolutionsCrafted >= 1
    })
  },
  {
    id: 'evo_5',
    name: 'ALCHEMIST',
    goalText: '5 Evolutions',
    rewardShards: 180,
    check: (s) => ({
      current: s.evolutionsCrafted,
      target: 5,
      done: s.evolutionsCrafted >= 5
    })
  },
  {
    id: 'boss_1',
    name: 'WEAVER FALL',
    goalText: '1 Boss Cleared',
    rewardShards: 90,
    rewardLabel: 'AEGIS',
    check: (s) => ({ current: s.bossesCleared, target: 1, done: s.bossesCleared >= 1 })
  },
  {
    id: 'boss_2',
    name: 'SERAPH FALL',
    goalText: '2 Bosses Cleared',
    rewardShards: 130,
    rewardLabel: 'PHANTOM',
    check: (s) => ({ current: s.bossesCleared, target: 2, done: s.bossesCleared >= 2 })
  },
  {
    id: 'boss_3',
    name: 'ARCHON FALL',
    goalText: '3 Bosses Cleared',
    rewardShards: 220,
    rewardLabel: 'SERAPH',
    check: (s) => ({ current: s.bossesCleared, target: 3, done: s.bossesCleared >= 3 })
  },
  {
    id: 'no_hit_boss',
    name: 'UNTOUCHED',
    goalText: 'No-Hit Boss',
    rewardShards: 200,
    rewardLabel: 'SLAG CORE',
    check: (s) => ({ current: s.noHitBossClears, target: 1, done: s.noHitBossClears >= 1 })
  },
  {
    id: 'sector_drift',
    name: 'ASH CLEAR',
    goalText: 'Clear 01 Ash Flats',
    rewardShards: 150,
    rewardLabel: 'NOVA',
    check: (s) => ({
      current: s.sectorsCleared.includes('drift') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('drift')
    })
  },
  {
    id: 'sector_helix',
    name: 'METRO CLEAR',
    goalText: 'Clear 02 Sunken Metro',
    rewardShards: 200,
    rewardLabel: 'SUMI BONE',
    check: (s) => ({
      current: s.sectorsCleared.includes('helix') ? 1 : 0,
      target: 1,
      done: s.sectorsCleared.includes('helix')
    })
  },
  {
    id: 'score_50k',
    name: 'HIGH SIGNAL',
    goalText: '50,000 Score',
    rewardShards: 160,
    check: (s) => ({ current: s.bestScore, target: 50000, done: s.bestScore >= 50000 })
  },
  {
    id: 'trophies_8',
    name: 'ASCENDANT',
    goalText: '8 Trophies',
    rewardShards: 300,
    rewardLabel: 'AURELIA',
    check: (s) => ({
      current: s.claimedMilestones.length,
      target: 8,
      done: s.claimedMilestones.length >= 8
    })
  }
];

export function createDefaultSave(): MetaSave {
  return {
    shards: 0,
    bestTimeSec: 0,
    bestScore: 0,
    bestSingleParry: 0,
    totalRuns: 0,
    totalKills: 0,
    totalParries: 0,
    totalGrazes: 0,
    bossesCleared: 0,
    evolutionsCrafted: 0,
    noHitBossClears: 0,
    sectorsCleared: [],
    unlockedVessels: ['vesper'],
    selectedVessel: 'vesper',
    unlockedCores: ['deflector'],
    selectedCore: 'deflector',
    unlockedSkins: ['cyanide'],
    selectedSkin: 'cyanide',
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
    settings: {
      music: true,
      sfx: true,
      haptics: true,
      reduceFlash: false
    }
  };
}

export function getMetaUpgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return def.baseCost + currentLevel * def.costStep;
}

export function loadMetaSave(): MetaSave {
  const fallback = createDefaultSave();
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY) || bridge.getInitialNativeSave();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    const merged: MetaSave = {
      ...fallback,
      ...parsed,
      upgrades: {
        ...fallback.upgrades,
        ...(parsed.upgrades ?? {})
      },
      settings: {
        ...fallback.settings,
        ...(parsed.settings ?? {})
      },
      unlockedVessels: Array.isArray(parsed.unlockedVessels)
        ? (Array.from(new Set(['vesper', ...parsed.unlockedVessels])) as VesselId[])
        : ['vesper'],
      unlockedCores: Array.isArray(parsed.unlockedCores)
        ? (Array.from(new Set(['deflector', ...parsed.unlockedCores])) as CoreId[])
        : ['deflector'],
      unlockedSkins: Array.isArray(parsed.unlockedSkins)
        ? (Array.from(new Set(['cyanide', ...parsed.unlockedSkins])) as SkinId[])
        : ['cyanide'],
      unlockedSectors: Array.isArray(parsed.unlockedSectors)
        ? (Array.from(new Set(['drift', ...parsed.unlockedSectors])) as SectorId[])
        : ['drift'],
      activeHeat: Array.isArray(parsed.activeHeat) ? (parsed.activeHeat as HeatId[]) : [],
      sectorsCleared: Array.isArray(parsed.sectorsCleared) ? parsed.sectorsCleared : [],
      claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : []
    };
    if (!merged.unlockedVessels.includes(merged.selectedVessel)) merged.selectedVessel = 'vesper';
    if (!merged.unlockedCores.includes(merged.selectedCore)) merged.selectedCore = 'deflector';
    if (!merged.unlockedSkins.includes(merged.selectedSkin)) merged.selectedSkin = 'cyanide';
    if (!merged.unlockedSectors.includes(merged.selectedSector)) merged.selectedSector = 'drift';
    return merged;
  } catch {
    return fallback;
  }
}

export function persistMetaSave(save: MetaSave): void {
  try {
    const raw = JSON.stringify(save);
    localStorage.setItem(SAVE_STORAGE_KEY, raw);
    bridge.syncSaveToNative(SAVE_STORAGE_KEY, raw);
  } catch {
    // Ignore storage errors
  }
}

export function buyMetaUpgrade(save: MetaSave, id: MetaUpgradeId): boolean {
  const def = META_UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const lv = save.upgrades[id] ?? 0;
  if (lv >= def.maxLevel) return false;
  const cost = getMetaUpgradeCost(def, lv);
  if (save.shards < cost) return false;
  save.shards -= cost;
  save.upgrades[id] = lv + 1;
  persistMetaSave(save);
  return true;
}

export function evaluateMilestones(save: MetaSave): string[] {
  const notices: string[] = [];
  // Two passes so meta-milestones like "8 Trophies" trigger cleanly in the same check
  for (let pass = 0; pass < 2; pass++) {
    for (const m of MILESTONES) {
      if (save.claimedMilestones.includes(m.id)) continue;
      if (!m.check(save).done) continue;
      save.claimedMilestones.push(m.id);
      save.shards += m.rewardShards;
      notices.push(`${m.name} · +${m.rewardShards}`);

      // Grant milestone vessel/skin unlocks automatically!
      if (m.id === 'boss_1' && !save.unlockedVessels.includes('aegis')) {
        save.unlockedVessels.push('aegis');
      }
      if (m.id === 'boss_2' && !save.unlockedVessels.includes('phantom')) {
        save.unlockedVessels.push('phantom');
      }
      if (m.id === 'parry_150' && !save.unlockedVessels.includes('volt')) {
        save.unlockedVessels.push('volt');
      }
      if (m.id === 'sector_drift' && !save.unlockedVessels.includes('nova')) {
        save.unlockedVessels.push('nova');
      }
      if (m.id === 'boss_3' && !save.unlockedVessels.includes('seraph')) {
        save.unlockedVessels.push('seraph');
      }
      if (m.id === 'graze_200' && !save.unlockedSkins.includes('monolith')) {
        save.unlockedSkins.push('monolith');
      }
      if (m.id === 'parry_burst_8' && !save.unlockedSkins.includes('ultraviolet')) {
        save.unlockedSkins.push('ultraviolet');
      }
      if (m.id === 'sector_helix' && !save.unlockedSkins.includes('ink')) {
        save.unlockedSkins.push('ink');
      }
      if (m.id === 'no_hit_boss' && !save.unlockedSkins.includes('eclipse')) {
        save.unlockedSkins.push('eclipse');
      }
      if (m.id === 'trophies_8' && !save.unlockedSkins.includes('prismatic')) {
        save.unlockedSkins.push('prismatic');
      }
    }
  }
  if (notices.length > 0) persistMetaSave(save);
  return notices;
}
