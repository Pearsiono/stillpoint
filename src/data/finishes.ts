import {
  CoatingItem,
  CoatingRarity,
  FinishId,
  ParryFxId,
  TrailId,
  WearGrade
} from '../types';

export interface FinishDef {
  id: FinishId;
  name: string;
  rarity: CoatingRarity;
  accent: string;
  minFloat: number;
  maxFloat: number;
  animated?: boolean;
}

export const RARITY_META: Record<
  CoatingRarity,
  { label: string; color: string; scrapValue: number; order: number }
> = {
  milspec: { label: 'Mil-Spec', color: '#5b82d6', scrapValue: 35, order: 0 },
  restricted: { label: 'Restricted', color: '#9c6ae6', scrapValue: 80, order: 1 },
  classified: { label: 'Classified', color: '#d64eb8', scrapValue: 165, order: 2 },
  covert: { label: 'Covert', color: '#d9483b', scrapValue: 340, order: 3 },
  contraband: { label: 'Relic ★', color: '#e2a93b', scrapValue: 700, order: 4 }
};

export const RARITY_NEXT: Partial<Record<CoatingRarity, CoatingRarity>> = {
  milspec: 'restricted',
  restricted: 'classified',
  classified: 'covert',
  covert: 'contraband'
};

export const FINISHES: Record<FinishId, FinishDef> = {
  factory_issue: {
    id: 'factory_issue',
    name: 'Standard Issue',
    rarity: 'milspec',
    accent: '#8a949e',
    minFloat: 0.12,
    maxFloat: 0.25
  },
  dune_splinter: {
    id: 'dune_splinter',
    name: 'Dune Splinter',
    rarity: 'milspec',
    accent: '#c9a66b',
    minFloat: 0.0,
    maxFloat: 0.95
  },
  oxide_hazard: {
    id: 'oxide_hazard',
    name: 'Oxide Hazard',
    rarity: 'milspec',
    accent: '#d99e26',
    minFloat: 0.0,
    maxFloat: 0.98
  },
  ash_topo: {
    id: 'ash_topo',
    name: 'Ash Topo',
    rarity: 'milspec',
    accent: '#9ca8a3',
    minFloat: 0.0,
    maxFloat: 0.92
  },
  slag_carbon: {
    id: 'slag_carbon',
    name: 'Slag Carbon',
    rarity: 'milspec',
    accent: '#d95f2b',
    minFloat: 0.0,
    maxFloat: 0.85
  },
  copper_patina: {
    id: 'copper_patina',
    name: 'Verdigris',
    rarity: 'restricted',
    accent: '#4cb59c',
    minFloat: 0.0,
    maxFloat: 0.99
  },
  tiger_rust: {
    id: 'tiger_rust',
    name: 'Tiger Oxide',
    rarity: 'restricted',
    accent: '#e06d2b',
    minFloat: 0.0,
    maxFloat: 0.78
  },
  damascus: {
    id: 'damascus',
    name: 'Damascus',
    rarity: 'restricted',
    accent: '#b8c4cc',
    minFloat: 0.0,
    maxFloat: 0.65
  },
  case_hardened: {
    id: 'case_hardened',
    name: 'Case Hardened',
    rarity: 'classified',
    accent: '#4a98e8',
    minFloat: 0.0,
    maxFloat: 0.99
  },
  crimson_web: {
    id: 'crimson_web',
    name: 'Crimson Web',
    rarity: 'classified',
    accent: '#d6333a',
    minFloat: 0.06,
    maxFloat: 0.82
  },
  kintsugi: {
    id: 'kintsugi',
    name: 'Kintsugi',
    rarity: 'classified',
    accent: '#e2b24a',
    minFloat: 0.0,
    maxFloat: 0.75
  },
  fade: {
    id: 'fade',
    name: 'Solar Fade',
    rarity: 'covert',
    accent: '#e05fa8',
    minFloat: 0.0,
    maxFloat: 0.14
  },
  doppler: {
    id: 'doppler',
    name: 'Doppler',
    rarity: 'covert',
    accent: '#6f5ce8',
    minFloat: 0.0,
    maxFloat: 0.12
  },
  marble_fade: {
    id: 'marble_fade',
    name: 'Fire & Ice',
    rarity: 'covert',
    accent: '#e0533c',
    minFloat: 0.0,
    maxFloat: 0.16
  },
  aurelia_gold: {
    id: 'aurelia_gold',
    name: 'Monolith Gold',
    rarity: 'contraband',
    accent: '#f0bc42',
    minFloat: 0.0,
    maxFloat: 0.22,
    animated: true
  }
};

export const ROLLABLE_FINISHES_BY_RARITY: Record<CoatingRarity, FinishId[]> = {
  milspec: ['dune_splinter', 'oxide_hazard', 'ash_topo', 'slag_carbon'],
  restricted: ['copper_patina', 'tiger_rust', 'damascus'],
  classified: ['case_hardened', 'crimson_web', 'kintsugi'],
  covert: ['fade', 'doppler', 'marble_fade'],
  contraband: ['aurelia_gold']
};

export const ALL_ROLLABLE_FINISHES: FinishId[] = [
  ...ROLLABLE_FINISHES_BY_RARITY.milspec,
  ...ROLLABLE_FINISHES_BY_RARITY.restricted,
  ...ROLLABLE_FINISHES_BY_RARITY.classified,
  ...ROLLABLE_FINISHES_BY_RARITY.covert,
  ...ROLLABLE_FINISHES_BY_RARITY.contraband
];

export const CRATE_COSTS = {
  standard: 120,
  relic: 240
} as const;

export function getWearGrade(floatVal: number): { code: WearGrade; label: string; color: string } {
  if (floatVal < 0.07) return { code: 'FN', label: 'Factory New', color: '#5cd68d' };
  if (floatVal < 0.15) return { code: 'MW', label: 'Minimal Wear', color: '#8fd660' };
  if (floatVal < 0.38) return { code: 'FT', label: 'Field-Tested', color: '#e2b24a' };
  if (floatVal < 0.45) return { code: 'WW', label: 'Well-Worn', color: '#e07a38' };
  return { code: 'BS', label: 'Battle-Scarred', color: '#c94942' };
}

export function getDopplerVariant(seed: number): {
  tag: string;
  primary: string;
  secondary: string;
  highlight: string;
} {
  if (seed >= 975) {
    return { tag: 'Black Pearl', primary: '#1e162e', secondary: '#59337d', highlight: '#a475d9' };
  }
  if (seed >= 940) {
    return { tag: 'Sapphire', primary: '#13328a', secondary: '#2466e0', highlight: '#78baff' };
  }
  if (seed >= 905) {
    return { tag: 'Ruby', primary: '#6e0d1c', secondary: '#cf1f39', highlight: '#ff7082' };
  }
  const phase = (seed % 4) + 1;
  if (phase === 1) return { tag: 'Phase 1', primary: '#1e162b', secondary: '#7d2252', highlight: '#cc4178' };
  if (phase === 2) return { tag: 'Phase 2', primary: '#3d1536', secondary: '#b82c78', highlight: '#f27ac0' };
  if (phase === 3) return { tag: 'Phase 3', primary: '#13242b', secondary: '#236675', highlight: '#52b89a' };
  return { tag: 'Phase 4', primary: '#122245', secondary: '#285db5', highlight: '#6ba8f2' };
}

export function computeSpecialTag(finishId: FinishId, seed: number, floatVal: number): string | undefined {
  if (floatVal >= 0.94) return 'Blacksteel';
  if (floatVal <= 0.0099) return '0.00× low float';

  if (finishId === 'case_hardened') {
    // Deterministic blue-coverage score aligned with patternBaker's blue-gem seed windows
    const bluePct = getCaseHardenedBluePct(seed);
    if (bluePct >= 72) return `Blue Gem ${bluePct}%`;
    if (bluePct <= 18) return `Gold Gem ${100 - bluePct}%`;
    return `${bluePct}% Blue`;
  }
  if (finishId === 'fade') {
    const fadePct = 80 + Math.round(((seed * 37) % 101) * 0.2);
    return fadePct >= 97 ? `${fadePct}% Full Fade` : `${fadePct}% Fade`;
  }
  if (finishId === 'doppler') {
    return getDopplerVariant(seed).tag;
  }
  if (finishId === 'crimson_web') {
    const centerCheck = seed % 17;
    if (centerCheck === 0) return 'Triple Web';
    if (centerCheck <= 3) return 'Center Web';
    return undefined;
  }
  if (finishId === 'marble_fade') {
    if (seed % 23 === 0) return 'True Fire & Ice';
    if (seed % 9 === 0) return 'Max Red Tip';
    return undefined;
  }
  if (finishId === 'aurelia_gold') {
    return 'Ancient Alloy';
  }
  return undefined;
}

export function getCaseHardenedBluePct(seed: number): number {
  // Iconic blue gem pattern index cluster (e.g. #661, #670, #321, plus deterministic roll curve)
  if (seed === 661 || seed === 670 || seed === 321 || seed === 387) return 92;
  const h = Math.sin(seed * 12.9898) * 43758.5453;
  const f = h - Math.floor(h);
  // Skewed bell with rare 72-91% gems
  if (f > 0.92) return Math.round(74 + (f - 0.92) * 210);
  if (f < 0.1) return Math.round(8 + f * 90);
  return Math.round(22 + f * 52);
}

export function rollCoatingFromCrate(crateType: 'standard' | 'relic'): CoatingItem {
  const r = Math.random();
  let rarity: CoatingRarity;
  if (crateType === 'relic') {
    // Classified Relic Crate: zero filler-heavy odds, strong Classified/Covert/Gold odds!
    if (r < 0.032) rarity = 'contraband';
    else if (r < 0.15) rarity = 'covert';
    else if (r < 0.42) rarity = 'classified';
    else if (r < 0.80) rarity = 'restricted';
    else rarity = 'milspec';
  } else {
    // Standard Salvage Crate
    if (r < 0.014) rarity = 'contraband';
    else if (r < 0.068) rarity = 'covert';
    else if (r < 0.20) rarity = 'classified';
    else if (r < 0.48) rarity = 'restricted';
    else rarity = 'milspec';
  }

  const pool = ROLLABLE_FINISHES_BY_RARITY[rarity];
  const finishId = pool[Math.floor(Math.random() * pool.length)];
  const strikerChance = crateType === 'relic' ? 0.22 : 0.12;
  return createCoatingItem(finishId, undefined, undefined, Math.random() < strikerChance);
}

export function forgeTradeUpCoating(inputs: CoatingItem[]): CoatingItem | null {
  if (inputs.length !== 5) return null;
  const baseRarity = FINISHES[inputs[0].finishId].rarity;
  if (!inputs.every((i) => FINISHES[i.finishId].rarity === baseRarity)) return null;
  const nextRarity = RARITY_NEXT[baseRarity];
  if (!nextRarity) return null;

  const avgNormFloat =
    inputs.reduce((sum, item) => sum + item.floatVal, 0) / inputs.length;
  const pool = ROLLABLE_FINISHES_BY_RARITY[nextRarity];
  const finishId = pool[Math.floor(Math.random() * pool.length)];
  const def = FINISHES[finishId];
  const mappedFloat = Math.max(
    0.0001,
    Math.min(0.9999, def.minFloat + avgNormFloat * (def.maxFloat - def.minFloat))
  );
  const allStriker = inputs.every((i) => i.striker);
  const anyStriker = inputs.some((i) => i.striker);
  const striker = allStriker || (anyStriker && Math.random() < 0.35);
  return createCoatingItem(finishId, undefined, mappedFloat, striker);
}

export function createCoatingItem(
  finishId: FinishId,
  forcedSeed?: number,
  forcedFloat?: number,
  striker = false
): CoatingItem {
  const def = FINISHES[finishId];
  const seed = forcedSeed ?? Math.floor(Math.random() * 1000);
  // Slightly curved float distribution so FN feels coveted but genuinely rollable!
  const rawU = Math.random();
  const skewed = rawU < 0.22 ? rawU * 0.55 : rawU;
  const floatVal =
    forcedFloat !== undefined
      ? Number(forcedFloat.toFixed(4))
      : Number((def.minFloat + skewed * (def.maxFloat - def.minFloat)).toFixed(4));

  return {
    uid: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    finishId,
    seed,
    floatVal,
    striker,
    kills: 0,
    specialTag: computeSpecialTag(finishId, seed, floatVal),
    acquiredAt: Date.now()
  };
}

export function createStarterCoating(): CoatingItem {
  return {
    uid: 'starter_factory_issue',
    finishId: 'factory_issue',
    seed: 101,
    floatVal: 0.142,
    striker: false,
    kills: 0,
    acquiredAt: 0
  };
}

export function getCoatingScrapValue(item: CoatingItem): number {
  const base = RARITY_META[FINISHES[item.finishId].rarity].scrapValue;
  const wearMult = item.floatVal < 0.07 ? 1.35 : item.floatVal < 0.15 ? 1.15 : 1.0;
  const strikerMult = item.striker ? 1.45 : 1.0;
  return Math.round(base * wearMult * strikerMult);
}

// ---------- INDEPENDENT THRUSTER TRAIL & PARRY FX CUSTOMIZATION ----------

export interface TrailDef {
  id: TrailId;
  name: string;
  color: string;
  coreColor: string;
  cost: number;
}

export const TRAILS: Record<TrailId, TrailDef> = {
  ion_ash: { id: 'ion_ash', name: 'Ion Ash', color: '#4cb8b0', coreColor: '#e8fffb', cost: 0 },
  slag_flame: { id: 'slag_flame', name: 'Slag Jet', color: '#e0632b', coreColor: '#ffe3a8', cost: 90 },
  verdigris_mist: { id: 'verdigris_mist', name: 'Acid Mist', color: '#78c95b', coreColor: '#e6ffd6', cost: 130 },
  crimson_burn: { id: 'crimson_burn', name: 'Oxide Burn', color: '#d93d44', coreColor: '#ffd6d6', cost: 180 },
  void_arc: { id: 'void_arc', name: 'Phase Arc', color: '#a862e8', coreColor: '#f2deff', cost: 240 },
  monolith_gold: { id: 'monolith_gold', name: 'Solar Gold', color: '#e2a93b', coreColor: '#fff6d1', cost: 340 }
};

export const TRAIL_ORDER: TrailId[] = [
  'ion_ash',
  'slag_flame',
  'verdigris_mist',
  'crimson_burn',
  'void_arc',
  'monolith_gold'
];

export interface ParryFxDef {
  id: ParryFxId;
  name: string;
  outer: string;
  inner: string;
  cost: number;
}

export const PARRY_FX: Record<ParryFxId, ParryFxDef> = {
  steel_ring: { id: 'steel_ring', name: 'Relic Ring', outer: '#52bfb5', inner: '#e0b35c', cost: 0 },
  shatter_gold: { id: 'shatter_gold', name: 'Gilded Pulse', outer: '#e2a93b', inner: '#fff2cc', cost: 120 },
  blood_slash: { id: 'blood_slash', name: 'Oxide Flare', outer: '#d93d44', inner: '#f29f4b', cost: 160 },
  arc_pulse: { id: 'arc_pulse', name: 'Arc Lattice', outer: '#62a4f5', inner: '#d9f2ff', cost: 220 },
  obsidian_wave: { id: 'obsidian_wave', name: 'Void Halo', outer: '#b064eb', inner: '#52bfb5', cost: 300 }
};

export const PARRY_FX_ORDER: ParryFxId[] = [
  'steel_ring',
  'shatter_gold',
  'blood_slash',
  'arc_pulse',
  'obsidian_wave'
];
