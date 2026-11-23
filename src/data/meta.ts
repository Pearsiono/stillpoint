import { bridge } from '../bridge';
import { MetaSave, MetaUpgradeDef, MetaUpgradeId, VesselId } from '../types';

export const SAVE_STORAGE_KEY = 'stillpoint_save_v1';

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'hull_integrity',
    name: 'Hull Integrity',
    desc: 'Reinforces vessel core frame.',
    maxLevel: 5,
    baseCost: 40,
    costStep: 35,
    perLevelText: '+14 Max HP'
  },
  {
    id: 'kinetic_core',
    name: 'Kinetic Core',
    desc: 'Improves charge recovery while moving & grazing.',
    maxLevel: 5,
    baseCost: 45,
    costStep: 40,
    perLevelText: '+9% Charge Gain'
  },
  {
    id: 'parry_resonance',
    name: 'Parry Resonance',
    desc: 'Amplifies Parry Shockwave reach & reflected shard damage.',
    maxLevel: 5,
    baseCost: 50,
    costStep: 45,
    perLevelText: '+7% Parry Radius & +12% Shard DMG'
  },
  {
    id: 'time_lattice',
    name: 'Time Lattice',
    desc: 'Reduces Stillpoint energy drain while thumb is lifted.',
    maxLevel: 5,
    baseCost: 50,
    costStep: 45,
    perLevelText: '-7% Stillpoint Drain'
  },
  {
    id: 'magnet_field',
    name: 'Magnet Field',
    desc: 'Widens automatic XP & shard pickup radius.',
    maxLevel: 5,
    baseCost: 35,
    costStep: 30,
    perLevelText: '+18px Pickup Pull'
  },
  {
    id: 'reroll_module',
    name: 'Draft Rerolls',
    desc: 'Start each run with extra upgrade draft rerolls.',
    maxLevel: 3,
    baseCost: 75,
    costStep: 75,
    perLevelText: '+1 Reroll per run'
  }
];

export function createDefaultSave(): MetaSave {
  return {
    shards: 0,
    bestTimeSec: 0,
    bestScore: 0,
    totalRuns: 0,
    totalParries: 0,
    bossesCleared: 0,
    unlockedVessels: ['vesper'],
    selectedVessel: 'vesper',
    upgrades: {
      hull_integrity: 0,
      kinetic_core: 0,
      parry_resonance: 0,
      time_lattice: 0,
      magnet_field: 0,
      reroll_module: 0
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
      unlockedVessels: Array.isArray(parsed.unlockedVessels) && parsed.unlockedVessels.length > 0
        ? (Array.from(new Set(['vesper', ...parsed.unlockedVessels])) as VesselId[])
        : ['vesper']
    };
    if (!merged.unlockedVessels.includes(merged.selectedVessel)) {
      merged.selectedVessel = 'vesper';
    }
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
    // Ignore quota/storage errors
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
