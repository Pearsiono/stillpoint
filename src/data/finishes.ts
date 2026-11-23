import {
  CoatingItem,
  CoatingRarity,
  CrateDrop,
  EffectItem,
  EffectSlot,
  FinishId,
  ParryFxId,
  TrailId,
  VesselId,
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
  milspec: { label: 'Mil-Spec', color: '#5b82d6', scrapValue: 30, order: 0 },
  restricted: { label: 'Restricted', color: '#9c6ae6', scrapValue: 70, order: 1 },
  classified: { label: 'Classified', color: '#d64eb8', scrapValue: 140, order: 2 },
  covert: { label: 'Covert', color: '#d9483b', scrapValue: 260, order: 3 },
  contraband: { label: 'Relic ★', color: '#e2a93b', scrapValue: 500, order: 4 }
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
  rust_circuit: {
    id: 'rust_circuit',
    name: 'Circuit Etch',
    rarity: 'milspec',
    accent: '#68b89a',
    minFloat: 0.0,
    maxFloat: 0.95
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
  cobalt_hex: {
    id: 'cobalt_hex',
    name: 'Hex Mesh',
    rarity: 'restricted',
    accent: '#5a8ee8',
    minFloat: 0.0,
    maxFloat: 0.85
  },
  blood_marble: {
    id: 'blood_marble',
    name: 'Magma Vein',
    rarity: 'restricted',
    accent: '#e0582b',
    minFloat: 0.0,
    maxFloat: 0.82
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
  pearl_mother: {
    id: 'pearl_mother',
    name: 'Nacre',
    rarity: 'classified',
    accent: '#d68ae0',
    minFloat: 0.0,
    maxFloat: 0.45
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
  gamma_doppler: {
    id: 'gamma_doppler',
    name: 'Gamma Doppler',
    rarity: 'covert',
    accent: '#48e08e',
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
  },
  void_starlight: {
    id: 'void_starlight',
    name: 'Starforge',
    rarity: 'contraband',
    accent: '#8a7bff',
    minFloat: 0.0,
    maxFloat: 0.18,
    animated: true
  }
};

export const ROLLABLE_FINISHES_BY_RARITY: Record<CoatingRarity, FinishId[]> = {
  milspec: ['dune_splinter', 'oxide_hazard', 'ash_topo', 'slag_carbon', 'rust_circuit'],
  restricted: ['copper_patina', 'tiger_rust', 'damascus', 'cobalt_hex', 'blood_marble'],
  classified: ['case_hardened', 'crimson_web', 'kintsugi', 'pearl_mother'],
  covert: ['fade', 'doppler', 'gamma_doppler', 'marble_fade'],
  contraband: ['aurelia_gold', 'void_starlight']
};

export const ALL_ROLLABLE_FINISHES: FinishId[] = [
  ...ROLLABLE_FINISHES_BY_RARITY.milspec,
  ...ROLLABLE_FINISHES_BY_RARITY.restricted,
  ...ROLLABLE_FINISHES_BY_RARITY.classified,
  ...ROLLABLE_FINISHES_BY_RARITY.covert,
  ...ROLLABLE_FINISHES_BY_RARITY.contraband
];

// Scarce economy: keys take multiple solid runs to earn
export const CRATE_KEY_COST = 350;

export const DUPLICATE_SHARD_VALUE: Record<CoatingRarity, number> = {
  milspec: 50,
  restricted: 95,
  classified: 170,
  covert: 290,
  contraband: 480
};

export const SHIP_RARITY: Record<VesselId, CoatingRarity> = {
  vesper: 'milspec',
  aegis: 'restricted',
  reaper: 'restricted',
  prism: 'restricted',
  phantom: 'classified',
  volt: 'classified',
  pyre: 'classified',
  bastion: 'classified',
  nova: 'covert',
  glacier: 'covert',
  seraph: 'contraband',
  valkyrie: 'contraband'
};

// ---------- ROLLED THRUSTER EXHAUST & STILLPOINT AURA EFFECTS ----------

export type TrailStyle =
  | 'ion_jet'
  | 'afterburner'
  | 'acid_vortex'
  | 'blade_chevron'
  | 'tesla_wake'
  | 'chromatic_helix'
  | 'rift_tear'
  | 'solar_wings';

export interface TrailDef {
  id: TrailId;
  name: string;
  style: TrailStyle;
  rarity: CoatingRarity;
  color: string;
  secondary: string;
  coreColor: string;
  minFloat: number;
  maxFloat: number;
  cost: number;
}

export const TRAILS: Record<TrailId, TrailDef> = {
  ion_ash: {
    id: 'ion_ash',
    name: 'Ion Jet',
    style: 'ion_jet',
    rarity: 'milspec',
    color: '#4cb8b0',
    secondary: '#267878',
    coreColor: '#e8fffb',
    minFloat: 0.0,
    maxFloat: 0.96,
    cost: 0
  },
  slag_flame: {
    id: 'slag_flame',
    name: 'Mach Afterburner',
    style: 'afterburner',
    rarity: 'milspec',
    color: '#e0632b',
    secondary: '#f2b84b',
    coreColor: '#fff1cc',
    minFloat: 0.0,
    maxFloat: 0.98,
    cost: 90
  },
  verdigris_mist: {
    id: 'verdigris_mist',
    name: 'Venom Plume',
    style: 'acid_vortex',
    rarity: 'restricted',
    color: '#6fd160',
    secondary: '#2d9e8a',
    coreColor: '#ebffe0',
    minFloat: 0.0,
    maxFloat: 0.96,
    cost: 130
  },
  crimson_burn: {
    id: 'crimson_burn',
    name: 'Slag Chevrons',
    style: 'blade_chevron',
    rarity: 'classified',
    color: '#e03e4a',
    secondary: '#f29538',
    coreColor: '#ffe6dc',
    minFloat: 0.0,
    maxFloat: 0.88,
    cost: 180
  },
  void_arc: {
    id: 'void_arc',
    name: 'Tesla Wake',
    style: 'tesla_wake',
    rarity: 'classified',
    color: '#7a9cff',
    secondary: '#b26bff',
    coreColor: '#eef6ff',
    minFloat: 0.0,
    maxFloat: 0.84,
    cost: 240
  },
  prism_ribbon: {
    id: 'prism_ribbon',
    name: 'Chromatic Helix',
    style: 'chromatic_helix',
    rarity: 'covert',
    color: '#e05fa8',
    secondary: '#52d6e8',
    coreColor: '#ffffff',
    minFloat: 0.0,
    maxFloat: 0.32,
    cost: 300
  },
  singularity_wake: {
    id: 'singularity_wake',
    name: 'Rift Tears',
    style: 'rift_tear',
    rarity: 'covert',
    color: '#9e54f0',
    secondary: '#3bd6c6',
    coreColor: '#140c1f',
    minFloat: 0.0,
    maxFloat: 0.38,
    cost: 320
  },
  monolith_gold: {
    id: 'monolith_gold',
    name: 'Solar Wings',
    style: 'solar_wings',
    rarity: 'contraband',
    color: '#e8b343',
    secondary: '#52e0d2',
    coreColor: '#fff9de',
    minFloat: 0.0,
    maxFloat: 0.24,
    cost: 340
  }
};

export const TRAIL_ORDER: TrailId[] = [
  'ion_ash',
  'slag_flame',
  'verdigris_mist',
  'crimson_burn',
  'void_arc',
  'prism_ribbon',
  'singularity_wake',
  'monolith_gold'
];

export const TRAIL_RARITY: Record<TrailId, CoatingRarity> = {
  ion_ash: 'milspec',
  slag_flame: 'milspec',
  verdigris_mist: 'restricted',
  crimson_burn: 'classified',
  void_arc: 'classified',
  prism_ribbon: 'covert',
  singularity_wake: 'covert',
  monolith_gold: 'contraband'
};

export type AuraStyle =
  | 'astrolabe'
  | 'sunburst'
  | 'sawtooth'
  | 'tesla_cage'
  | 'mandala'
  | 'event_horizon'
  | 'prism_array'
  | 'clockwork';

export interface ParryFxDef {
  id: ParryFxId;
  name: string;
  style: AuraStyle;
  rarity: CoatingRarity;
  outer: string;
  inner: string;
  minFloat: number;
  maxFloat: number;
  cost: number;
}

export const PARRY_FX: Record<ParryFxId, ParryFxDef> = {
  steel_ring: {
    id: 'steel_ring',
    name: 'Relic Astrolabe',
    style: 'astrolabe',
    rarity: 'milspec',
    outer: '#52bfb5',
    inner: '#e0b35c',
    minFloat: 0.0,
    maxFloat: 0.96,
    cost: 0
  },
  shatter_gold: {
    id: 'shatter_gold',
    name: 'Sunburst Halo',
    style: 'sunburst',
    rarity: 'milspec',
    outer: '#e8b143',
    inner: '#fff0bf',
    minFloat: 0.0,
    maxFloat: 0.98,
    cost: 120
  },
  blood_slash: {
    id: 'blood_slash',
    name: 'Sawtooth Vortex',
    style: 'sawtooth',
    rarity: 'restricted',
    outer: '#e03e44',
    inner: '#f29f4b',
    minFloat: 0.0,
    maxFloat: 0.92,
    cost: 160
  },
  arc_pulse: {
    id: 'arc_pulse',
    name: 'Tesla Cage',
    style: 'tesla_cage',
    rarity: 'classified',
    outer: '#62a4f5',
    inner: '#d9f2ff',
    minFloat: 0.0,
    maxFloat: 0.85,
    cost: 220
  },
  fractal_bloom: {
    id: 'fractal_bloom',
    name: 'Sacred Mandala',
    style: 'mandala',
    rarity: 'classified',
    outer: '#5cd6a8',
    inner: '#e8c468',
    minFloat: 0.0,
    maxFloat: 0.78,
    cost: 240
  },
  obsidian_wave: {
    id: 'obsidian_wave',
    name: 'Event Horizon',
    style: 'event_horizon',
    rarity: 'covert',
    outer: '#b064eb',
    inner: '#52bfb5',
    minFloat: 0.0,
    maxFloat: 0.34,
    cost: 300
  },
  prism_shatter: {
    id: 'prism_shatter',
    name: 'Prism Array',
    style: 'prism_array',
    rarity: 'covert',
    outer: '#64d8f5',
    inner: '#e678c4',
    minFloat: 0.0,
    maxFloat: 0.3,
    cost: 320
  },
  chrono_crown: {
    id: 'chrono_crown',
    name: 'Monolith Clockwork',
    style: 'clockwork',
    rarity: 'contraband',
    outer: '#f0bc42',
    inner: '#4ce6d8',
    minFloat: 0.0,
    maxFloat: 0.24,
    cost: 360
  }
};

export const PARRY_FX_ORDER: ParryFxId[] = [
  'steel_ring',
  'shatter_gold',
  'blood_slash',
  'arc_pulse',
  'fractal_bloom',
  'obsidian_wave',
  'prism_shatter',
  'chrono_crown'
];

export const AURA_RARITY: Record<ParryFxId, CoatingRarity> = {
  steel_ring: 'milspec',
  shatter_gold: 'milspec',
  blood_slash: 'restricted',
  arc_pulse: 'classified',
  fractal_bloom: 'classified',
  obsidian_wave: 'covert',
  prism_shatter: 'covert',
  chrono_crown: 'contraband'
};

export const ROLLABLE_EFFECTS_BY_RARITY: Record<
  CoatingRarity,
  Array<{ slot: EffectSlot; effectId: TrailId | ParryFxId }>
> = {
  milspec: [
    { slot: 'trail', effectId: 'slag_flame' },
    { slot: 'aura', effectId: 'shatter_gold' }
  ],
  restricted: [
    { slot: 'trail', effectId: 'verdigris_mist' },
    { slot: 'aura', effectId: 'blood_slash' }
  ],
  classified: [
    { slot: 'trail', effectId: 'crimson_burn' },
    { slot: 'trail', effectId: 'void_arc' },
    { slot: 'aura', effectId: 'arc_pulse' },
    { slot: 'aura', effectId: 'fractal_bloom' }
  ],
  covert: [
    { slot: 'trail', effectId: 'prism_ribbon' },
    { slot: 'trail', effectId: 'singularity_wake' },
    { slot: 'aura', effectId: 'obsidian_wave' },
    { slot: 'aura', effectId: 'prism_shatter' }
  ],
  contraband: [
    { slot: 'trail', effectId: 'monolith_gold' },
    { slot: 'aura', effectId: 'chrono_crown' }
  ]
};

export function getEffectMeta(
  slot: EffectSlot,
  effectId: TrailId | ParryFxId
): { name: string; rarity: CoatingRarity; primary: string; secondary: string; core: string; minFloat: number; maxFloat: number } {
  if (slot === 'trail') {
    const t = TRAILS[effectId as TrailId] ?? TRAILS.ion_ash;
    return {
      name: t.name,
      rarity: t.rarity,
      primary: t.color,
      secondary: t.secondary,
      core: t.coreColor,
      minFloat: t.minFloat,
      maxFloat: t.maxFloat
    };
  }
  const a = PARRY_FX[effectId as ParryFxId] ?? PARRY_FX.steel_ring;
  return {
    name: a.name,
    rarity: a.rarity,
    primary: a.outer,
    secondary: a.inner,
    core: a.inner,
    minFloat: a.minFloat,
    maxFloat: a.maxFloat
  };
}

export function isStarterEffect(item: EffectItem): boolean {
  return item.uid === 'starter_trail_ion_ash' || item.uid === 'starter_aura_steel_ring';
}

function shiftHexHue(hex: string, degShift: number, satScale = 1, lumScale = 1): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const r0 = ((n >> 16) & 255) / 255;
  const g0 = ((n >> 8) & 255) / 255;
  const b0 = (n & 255) / 255;
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r0) h = ((g0 - b0) / d + (g0 < b0 ? 6 : 0)) * 60;
    else if (max === g0) h = ((b0 - r0) / d + 2) * 60;
    else h = ((r0 - g0) / d + 4) * 60;
  }
  h = ((h + degShift) % 360 + 360) % 360;
  s = Math.max(0, Math.min(1, s * satScale));
  const ll = Math.max(0.06, Math.min(0.95, l * lumScale));

  const c = (1 - Math.abs(2 * ll - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(255, (v + m) * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface EffectVisualParams {
  primary: string;
  secondary: string;
  core: string;
  symmetry: number; // e.g. 5, 6, 8, or rare 12-point geometry / strand count
  twist: number; // pattern rotation / ribbon wave frequency modifier
  intensity: number; // 0.65..1.25 (FN = bright crisp bloom, BS = gritty weathered)
  sputter: number; // 0..1 (higher float = unstable crackle / gaps / soot wisps)
  overburn: boolean; // >= 0.94 coveted dark-soot overburn roll
  phaseTag?: string;
}

export function getEffectVisualParams(item: EffectItem): EffectVisualParams {
  const meta = getEffectMeta(item.slot, item.effectId);
  const seed = item.seed;
  const f = Math.max(0, Math.min(1, item.floatVal));
  const overburn = f >= 0.94;

  let primary = meta.primary;
  let secondary = meta.secondary;
  let core = meta.core;
  let phaseTag: string | undefined;

  if (overburn) {
    primary = '#2a2220';
    secondary = '#d95a2b';
    core = '#ffad5c';
    phaseTag = 'Overburn';
  } else if (seed >= 975) {
    primary = '#7f4ae8';
    secondary = '#291a45';
    core = '#d6b8ff';
    phaseTag = 'Black Pearl';
  } else if (seed >= 945) {
    primary = '#2a78f0';
    secondary = '#6ec8ff';
    core = '#e8f7ff';
    phaseTag = 'Sapphire Shift';
  } else if (seed >= 915) {
    primary = '#e0243d';
    secondary = '#ff7066';
    core = '#ffe8ec';
    phaseTag = 'Ruby Shift';
  } else if (seed >= 885) {
    primary = '#28c47a';
    secondary = '#7af0b2';
    core = '#e8fff3';
    phaseTag = 'Emerald Shift';
  } else if (seed >= 855) {
    primary = '#f0ba3c';
    secondary = '#ffe082';
    core = '#fffbe6';
    phaseTag = 'Solar Shift';
  } else {
    // Seed-driven deterministic palette variation (-42..+42 deg hue shift + secondary offset)
    const hueShift = (((seed * 73) % 85) - 42);
    const secShift = (((seed * 131) % 69) - 34);
    const satScale = f > 0.45 ? 0.78 : f < 0.07 ? 1.15 : 1.0;
    const lumScale = f > 0.5 ? 0.88 : f < 0.07 ? 1.08 : 1.0;
    primary = shiftHexHue(meta.primary, hueShift, satScale, lumScale);
    secondary = shiftHexHue(meta.secondary, secShift, satScale, lumScale);
  }

  // Deterministic geometric pattern layout from seed
  const symTable = [5, 6, 6, 8, 8, 10];
  const symmetry = seed % 29 === 0 ? 12 : symTable[seed % symTable.length];
  const twist = 0.78 + ((seed * 37) % 100) / 145;
  const intensity = f < 0.07 ? 1.2 : f < 0.15 ? 1.08 : f < 0.38 ? 0.96 : 0.8;
  const sputter = Math.max(0, Math.min(1, (f - 0.14) / 0.8));

  return { primary, secondary, core, symmetry, twist, intensity, sputter, overburn, phaseTag };
}

export function computeEffectSpecialTag(
  slot: EffectSlot,
  effectId: TrailId | ParryFxId,
  seed: number,
  floatVal: number
): string | undefined {
  if (floatVal >= 0.94) return 'Overburn';
  if (floatVal <= 0.0099) return '0.00× pure';
  if (seed >= 975) return 'Black Pearl';
  if (seed >= 945) return 'Sapphire Shift';
  if (seed >= 915) return 'Ruby Shift';
  if (seed >= 885) return 'Emerald Shift';
  if (seed >= 855) return 'Solar Shift';
  if (seed % 29 === 0) return slot === 'aura' ? '12-Point Crown' : 'Triple Helix';
  if (effectId === 'prism_ribbon' && seed % 11 === 0) return 'Full Spectrum';
  if (effectId === 'chrono_crown' || effectId === 'monolith_gold') return 'Ancient Relic';
  return undefined;
}

export function createEffectItem(
  slot: EffectSlot,
  effectId: TrailId | ParryFxId,
  forcedSeed?: number,
  forcedFloat?: number,
  striker = false
): EffectItem {
  const meta = getEffectMeta(slot, effectId);
  const seed = forcedSeed ?? Math.floor(Math.random() * 1000);
  const skewed = Math.pow(Math.random(), 1.25);
  const floatVal =
    forcedFloat !== undefined
      ? Number(forcedFloat.toFixed(4))
      : Number((meta.minFloat + skewed * (meta.maxFloat - meta.minFloat)).toFixed(4));

  return {
    uid: `fx_${slot[0]}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    slot,
    effectId,
    seed,
    floatVal,
    striker,
    statCount: 0,
    specialTag: computeEffectSpecialTag(slot, effectId, seed, floatVal),
    acquiredAt: Date.now()
  };
}

export function createStarterTrailItem(): EffectItem {
  return {
    uid: 'starter_trail_ion_ash',
    slot: 'trail',
    effectId: 'ion_ash',
    seed: 108,
    floatVal: 0.145,
    striker: false,
    statCount: 0,
    acquiredAt: 0
  };
}

export function createStarterAuraItem(): EffectItem {
  return {
    uid: 'starter_aura_steel_ring',
    slot: 'aura',
    effectId: 'steel_ring',
    seed: 108,
    floatVal: 0.145,
    striker: false,
    statCount: 0,
    acquiredAt: 0
  };
}

export function getEffectScrapValue(item: EffectItem): number {
  const rarity = getEffectMeta(item.slot, item.effectId).rarity;
  const base = RARITY_META[rarity].scrapValue;
  const wearMult = item.floatVal < 0.07 ? 1.35 : item.floatVal < 0.15 ? 1.15 : 1.0;
  const strikerMult = item.striker ? 1.45 : 1.0;
  return Math.round(base * wearMult * strikerMult);
}

export function forgeTradeUpEffect(inputs: EffectItem[]): EffectItem | null {
  if (inputs.length !== 5) return null;
  const baseRarity = getEffectMeta(inputs[0].slot, inputs[0].effectId).rarity;
  if (!inputs.every((i) => !isStarterEffect(i) && getEffectMeta(i.slot, i.effectId).rarity === baseRarity)) {
    return null;
  }
  const nextRarity = RARITY_NEXT[baseRarity];
  if (!nextRarity) return null;
  const pool = ROLLABLE_EFFECTS_BY_RARITY[nextRarity];
  if (!pool || pool.length === 0) return null;

  const avgNormFloat = inputs.reduce((s, i) => s + i.floatVal, 0) / inputs.length;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const meta = getEffectMeta(picked.slot, picked.effectId);
  const mappedFloat = Math.max(
    0.0001,
    Math.min(0.9999, meta.minFloat + avgNormFloat * (meta.maxFloat - meta.minFloat))
  );
  const allSt = inputs.every((i) => i.striker);
  const anySt = inputs.some((i) => i.striker);
  const striker = allSt || (anySt && Math.random() < 0.35);
  return createEffectItem(picked.slot, picked.effectId, undefined, mappedFloat, striker);
}

// ---------- COATING WEAR / SPECIAL TAGS / CRATE ROLLS ----------

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

export function getGammaDopplerVariant(seed: number): {
  tag: string;
  primary: string;
  secondary: string;
  highlight: string;
} {
  if (seed >= 930) {
    return { tag: 'Emerald Gem', primary: '#0c522d', secondary: '#1fc46b', highlight: '#8affbd' };
  }
  const phase = (seed % 4) + 1;
  if (phase === 1) return { tag: 'Gamma P1', primary: '#0f2424', secondary: '#1c786e', highlight: '#52e0c4' };
  if (phase === 2) return { tag: 'Gamma P2', primary: '#133022', secondary: '#26a866', highlight: '#84f2a8' };
  if (phase === 3) return { tag: 'Gamma P3', primary: '#10242e', secondary: '#1e829c', highlight: '#6ef0e8' };
  return { tag: 'Gamma P4', primary: '#182b18', secondary: '#5aa828', highlight: '#c6f26b' };
}

export function computeSpecialTag(finishId: FinishId, seed: number, floatVal: number): string | undefined {
  if (floatVal >= 0.94) return 'Blacksteel';
  if (floatVal <= 0.0099) return '0.00× low float';

  if (finishId === 'case_hardened') {
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
  if (finishId === 'gamma_doppler') {
    return getGammaDopplerVariant(seed).tag;
  }
  if (finishId === 'crimson_web') {
    const centerCheck = seed % 17;
    if (centerCheck === 0) return 'Triple Web';
    if (centerCheck <= 3) return 'Center Web';
    return undefined;
  }
  if (finishId === 'blood_marble') {
    if (seed % 19 === 0) return 'Core Rift';
    return undefined;
  }
  if (finishId === 'pearl_mother') {
    if (seed % 15 === 0) return 'Iridescent Pearl';
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
  if (finishId === 'void_starlight') {
    return 'Celestial Relic';
  }
  return undefined;
}

export function getCaseHardenedBluePct(seed: number): number {
  if (seed === 661 || seed === 670 || seed === 321 || seed === 387) return 92;
  const h = Math.sin(seed * 12.9898) * 43758.5453;
  const f = h - Math.floor(h);
  if (f > 0.92) return Math.round(74 + (f - 0.92) * 210);
  if (f < 0.1) return Math.round(8 + f * 90);
  return Math.round(22 + f * 52);
}

export function rollCrateDrop(crateType: 'standard' | 'relic'): CrateDrop {
  const r = Math.random();
  let rarity: CoatingRarity;
  if (crateType === 'relic') {
    // Classified crate: 2.2% Relic ★, 8.8% Covert, 23% Classified, 38% Restricted, 28% Mil-Spec
    if (r < 0.022) rarity = 'contraband';
    else if (r < 0.11) rarity = 'covert';
    else if (r < 0.34) rarity = 'classified';
    else if (r < 0.72) rarity = 'restricted';
    else rarity = 'milspec';
  } else {
    // Salvage crate: 0.8% Relic ★, 3.7% Covert, 10.5% Classified, 25% Restricted, 60% Mil-Spec
    if (r < 0.008) rarity = 'contraband';
    else if (r < 0.045) rarity = 'covert';
    else if (r < 0.15) rarity = 'classified';
    else if (r < 0.40) rarity = 'restricted';
    else rarity = 'milspec';
  }

  const pickKind = Math.random();
  const strikerChance = crateType === 'relic' ? 0.18 : 0.10;

  const makeCoating = (): CrateDrop => {
    const pool = ROLLABLE_FINISHES_BY_RARITY[rarity];
    const finishId = pool[Math.floor(Math.random() * pool.length)];
    return {
      kind: 'coating',
      rarity,
      coating: createCoatingItem(finishId, undefined, undefined, Math.random() < strikerChance)
    };
  };

  const makeEffect = (): CrateDrop => {
    const pool = ROLLABLE_EFFECTS_BY_RARITY[rarity];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return {
      kind: 'effect',
      rarity,
      effect: createEffectItem(picked.slot, picked.effectId, undefined, undefined, Math.random() < strikerChance)
    };
  };

  // Crates contain ONLY cosmetics: Pattern Coatings (60%) & Rolled Effects (40%)
  if (pickKind < 0.42) {
    return makeEffect();
  }
  return makeCoating();
}

export function forgeTradeUpCoating(inputs: CoatingItem[]): CoatingItem | null {
  if (inputs.length !== 5) return null;
  const baseRarity = FINISHES[inputs[0].finishId].rarity;
  if (!inputs.every((i) => FINISHES[i.finishId].rarity === baseRarity)) return null;
  const nextRarity = RARITY_NEXT[baseRarity];
  if (!nextRarity) return null;

  const avgNormFloat = inputs.reduce((sum, item) => sum + item.floatVal, 0) / inputs.length;
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
  const skewed = Math.pow(Math.random(), 1.25);
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
