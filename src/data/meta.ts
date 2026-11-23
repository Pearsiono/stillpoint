import { bridge } from '../bridge';
import { HEAT_ORDER } from './builds';
import {
  CRATE_COSTS,
  createStarterCoating,
  FINISHES,
  forgeTradeUpCoating,
  getCoatingScrapValue,
  PARRY_FX,
  TRAILS
} from './finishes';
import {
  CoatingItem,
  CoreId,
  HeatId,
  MetaSave,
  MetaUpgradeDef,
  MetaUpgradeId,
  MilestoneDef,
  ParryFxId,
  SectorId,
  SkinId,
  TrailId,
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
    perLevelShort: '+14 max HP'
  },
  {
    id: 'kinetic_core',
    name: 'Kinetic Core',
    maxLevel: 5,
    baseCost: 40,
    costStep: 40,
    perLevelShort: '+10% focus charge'
  },
  {
    id: 'parry_resonance',
    name: 'Core Amplifier',
    maxLevel: 5,
    baseCost: 45,
    costStep: 45,
    perLevelShort: '+8% core area, +12% damage'
  },
  {
    id: 'time_lattice',
    name: 'Time Lattice',
    maxLevel: 5,
    baseCost: 45,
    costStep: 45,
    perLevelShort: '-7% slow-mo drain'
  },
  {
    id: 'crit_calibration',
    name: 'Crit Optics',
    maxLevel: 5,
    baseCost: 50,
    costStep: 45,
    perLevelShort: '+5% crit chance'
  },
  {
    id: 'magnet_field',
    name: 'Magnet Field',
    maxLevel: 5,
    baseCost: 30,
    costStep: 30,
    perLevelShort: '+20 pickup pull'
  },
  {
    id: 'shard_harvester',
    name: 'Shard Matrix',
    maxLevel: 5,
    baseCost: 55,
    costStep: 50,
    perLevelShort: '+12% shards earned'
  },
  {
    id: 'reroll_module',
    name: 'Draft Rerolls',
    maxLevel: 4,
    baseCost: 70,
    costStep: 70,
    perLevelShort: '+1 reroll per run'
  }
];

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
    rewardLabel: 'Volt',
    check: (s) => ({ current: s.totalGrazes, target: 350, done: s.totalGrazes >= 350 })
  },
  {
    id: 'parry_burst_8',
    name: 'Graze Streak',
    goalText: '12× graze combo',
    rewardShards: 110,
    rewardLabel: '+1 crate',
    check: (s) => ({ current: s.bestSingleParry, target: 12, done: s.bestSingleParry >= 12 })
  },
  {
    id: 'graze_200',
    name: 'Razor Edge',
    goalText: '200 grazes',
    rewardShards: 100,
    rewardLabel: '+1 crate',
    check: (s) => ({ current: s.totalGrazes, target: 200, done: s.totalGrazes >= 200 })
  },
  {
    id: 'evo_1',
    name: 'Catalyst',
    goalText: '1 evolution',
    rewardShards: 80,
    check: (s) => ({
      current: s.evolutionsCrafted,
      target: 1,
      done: s.evolutionsCrafted >= 1
    })
  },
  {
    id: 'evo_5',
    name: 'Alchemist',
    goalText: '5 evolutions',
    rewardShards: 180,
    check: (s) => ({
      current: s.evolutionsCrafted,
      target: 5,
      done: s.evolutionsCrafted >= 5
    })
  },
  {
    id: 'boss_1',
    name: 'Weaver Fall',
    goalText: '1 boss cleared',
    rewardShards: 90,
    rewardLabel: 'Aegis',
    check: (s) => ({ current: s.bossesCleared, target: 1, done: s.bossesCleared >= 1 })
  },
  {
    id: 'boss_2',
    name: 'Seraph Fall',
    goalText: '2 bosses cleared',
    rewardShards: 130,
    rewardLabel: 'Phantom',
    check: (s) => ({ current: s.bossesCleared, target: 2, done: s.bossesCleared >= 2 })
  },
  {
    id: 'boss_3',
    name: 'Archon Fall',
    goalText: '3 bosses cleared',
    rewardShards: 220,
    rewardLabel: 'Seraph',
    check: (s) => ({ current: s.bossesCleared, target: 3, done: s.bossesCleared >= 3 })
  },
  {
    id: 'no_hit_boss',
    name: 'Untouched',
    goalText: 'No-hit boss clear',
    rewardShards: 200,
    rewardLabel: '+2 classified',
    check: (s) => ({ current: s.noHitBossClears, target: 1, done: s.noHitBossClears >= 1 })
  },
  {
    id: 'sector_drift',
    name: 'Ash Clear',
    goalText: 'Clear Ash Flats',
    rewardShards: 150,
    rewardLabel: 'Nova',
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
    id: 'score_50k',
    name: 'High Signal',
    goalText: '50,000 score',
    rewardShards: 160,
    check: (s) => ({ current: s.bestScore, target: 50000, done: s.bestScore >= 50000 })
  },
  {
    id: 'trophies_8',
    name: 'Ascendant',
    goalText: '8 trials complete',
    rewardShards: 300,
    rewardLabel: '+3 classified',
    check: (s) => ({
      current: s.claimedMilestones.length,
      target: 8,
      done: s.claimedMilestones.length >= 8
    })
  }
];

export function createDefaultSave(): MetaSave {
  const starter = createStarterCoating();
  return {
    shards: 0,
    standardCrates: 1,
    relicCrates: 0,
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
    coatings: [starter],
    equippedCoatingUid: starter.uid,
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
      coatings:
        Array.isArray(parsed.coatings) && parsed.coatings.length > 0
          ? parsed.coatings.filter((c) => c && c.finishId in FINISHES)
          : fallback.coatings,
      equippedCoatingUid:
        typeof parsed.equippedCoatingUid === 'string'
          ? parsed.equippedCoatingUid
          : fallback.equippedCoatingUid,
      unlockedTrails: Array.isArray(parsed.unlockedTrails)
        ? (Array.from(new Set(['ion_ash', ...parsed.unlockedTrails])) as TrailId[])
        : ['ion_ash'],
      selectedTrail:
        parsed.selectedTrail && parsed.selectedTrail in TRAILS
          ? parsed.selectedTrail
          : 'ion_ash',
      unlockedParryFx: Array.isArray(parsed.unlockedParryFx)
        ? (Array.from(new Set(['steel_ring', ...parsed.unlockedParryFx])) as ParryFxId[])
        : ['steel_ring'],
      selectedParryFx:
        parsed.selectedParryFx && parsed.selectedParryFx in PARRY_FX
          ? parsed.selectedParryFx
          : 'steel_ring',
      standardCrates:
        typeof parsed.standardCrates === 'number' && Number.isFinite(parsed.standardCrates)
          ? Math.max(0, Math.floor(parsed.standardCrates))
          : 1,
      relicCrates:
        typeof parsed.relicCrates === 'number' && Number.isFinite(parsed.relicCrates)
          ? Math.max(0, Math.floor(parsed.relicCrates))
          : 0,
      unlockedSectors: Array.isArray(parsed.unlockedSectors)
        ? (Array.from(new Set(['drift', ...parsed.unlockedSectors])) as SectorId[])
        : ['drift'],
      activeHeat: Array.isArray(parsed.activeHeat)
        ? (Array.from(new Set(parsed.activeHeat)).filter((h) =>
            HEAT_ORDER.includes(h as HeatId)
          ) as HeatId[])
        : [],
      sectorsCleared: Array.isArray(parsed.sectorsCleared) ? parsed.sectorsCleared : [],
      claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : []
    };
    if (merged.coatings.length === 0) merged.coatings = [createStarterCoating()];
    if (!merged.coatings.some((c) => c.uid === merged.equippedCoatingUid)) {
      merged.equippedCoatingUid = merged.coatings[0].uid;
    }
    if (!Number.isFinite(merged.shards) || merged.shards < 0) merged.shards = 0;
    if (!merged.unlockedVessels.includes(merged.selectedVessel)) merged.selectedVessel = 'vesper';
    if (!merged.unlockedCores.includes(merged.selectedCore)) merged.selectedCore = 'deflector';
    if (!merged.unlockedSkins.includes(merged.selectedSkin)) merged.selectedSkin = 'cyanide';
    if (!merged.unlockedTrails.includes(merged.selectedTrail)) merged.selectedTrail = 'ion_ash';
    if (!merged.unlockedParryFx.includes(merged.selectedParryFx)) merged.selectedParryFx = 'steel_ring';
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

export function getEquippedCoating(save: MetaSave): CoatingItem {
  return (
    save.coatings.find((c) => c.uid === save.equippedCoatingUid) ??
    save.coatings[0] ??
    createStarterCoating()
  );
}

export function equipCoating(save: MetaSave, uid: string): boolean {
  if (!save.coatings.some((c) => c.uid === uid)) return false;
  save.equippedCoatingUid = uid;
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

export function buyCrate(save: MetaSave, kind: 'standard' | 'relic'): boolean {
  const cost = CRATE_COSTS[kind];
  if (save.shards < cost) return false;
  save.shards -= cost;
  if (kind === 'standard') save.standardCrates++;
  else save.relicCrates++;
  persistMetaSave(save);
  return true;
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
      notices.push(`${m.name} (+${m.rewardShards})`);

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
      if (m.id === 'graze_200') {
        save.standardCrates += 1;
      }
      if (m.id === 'parry_burst_8') {
        save.standardCrates += 1;
      }
      if (m.id === 'sector_helix') {
        save.relicCrates += 1;
      }
      if (m.id === 'no_hit_boss') {
        save.relicCrates += 2;
      }
      if (m.id === 'trophies_8') {
        save.relicCrates += 3;
      }
    }
  }
  if (notices.length > 0) persistMetaSave(save);
  return notices;
}
