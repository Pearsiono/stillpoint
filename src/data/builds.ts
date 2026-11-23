import { CoreDef, CoreId, DraftCurseId, HeatId, RelicDef, RelicId } from '../types';

export const CORES: Record<CoreId, CoreDef> = {
  deflector: {
    id: 'deflector',
    name: 'DEFLECTOR',
    shortDesc: 'PARRY WAVE · HOMING SHARDS',
    accent: '#4cb5ab',
    unlockCost: 0
  },
  blink: {
    id: 'blink',
    name: 'PHANTOM BLINK',
    shortDesc: 'WARP FORWARD · DECOY BLAST',
    accent: '#a974e8',
    unlockCost: 110
  },
  siphon: {
    id: 'siphon',
    name: 'GRAVITY SIPHON',
    shortDesc: 'VORTEX PULL · SHRAPNEL EXIT',
    accent: '#e08538',
    unlockCost: 170
  },
  overclock: {
    id: 'overclock',
    name: 'OVERCLOCK',
    shortDesc: '2.3× ROF · AUTO-CRIT STANCE',
    accent: '#e2a93b',
    unlockCost: 230
  },
  berserk: {
    id: 'berserk',
    name: 'RAZOR REFLEX',
    shortDesc: 'EXEC <30% HP · SHIELD SLASH',
    accent: '#d94842',
    unlockCost: 290
  }
};

export const CORE_ORDER: CoreId[] = ['deflector', 'blink', 'siphon', 'overclock', 'berserk'];

export const DRAFT_CURSES: Record<DraftCurseId, { id: DraftCurseId; label: string }> = {
  fragile_hull: { id: 'fragile_hull', label: '-16 MAX HP' },
  fast_hostiles: { id: 'fast_hostiles', label: '+18% ENEMY SHOT SPD' },
  heavy_drain: { id: 'heavy_drain', label: '+25% FOCUS DRAIN' },
  slow_rig: { id: 'slow_rig', label: '-12% MOVE SPD' },
  blood_tax: { id: 'blood_tax', label: '-22% CURRENT HP' }
};

export const DRAFT_CURSE_IDS = Object.keys(DRAFT_CURSES) as DraftCurseId[];

// Wildcard Relics — high-impact build warpers, top-tier ones carry real tradeoffs!
export const RELICS: Record<RelicId, RelicDef> = {
  glass_prism: {
    id: 'glass_prism',
    name: 'GLASS PRISM',
    line: 'PARRY SPLITS ×3 · -18% MAX HP',
    accent: '#52b8c9',
    iconKey: 'ricochet_shard'
  },
  volatile_shrapnel: {
    id: 'volatile_shrapnel',
    name: 'SHRAPNEL CORE',
    line: 'KILLS BURST 5 PIERCING SPLINTERS',
    accent: '#e0632b',
    iconKey: 'nova_pulse'
  },
  time_bank: {
    id: 'time_bank',
    name: 'TIME BANK',
    line: 'FULL FOCUS GRAZE → 2× WAVE · +22% DRAIN',
    accent: '#e2a93b',
    iconKey: 'chrono_capacitor'
  },
  blood_engine: {
    id: 'blood_engine',
    name: 'BLOOD ENGINE',
    line: '20 KILLS → 4s FRENZY +3 HP · -15% SHIELD',
    accent: '#d94842',
    iconKey: 'chrono_scythe'
  },
  chain_parry: {
    id: 'chain_parry',
    name: 'CHAIN PARRY',
    line: '5× PARRY RESETS CD +30% FOCUS',
    accent: '#4cb5ab',
    iconKey: 'arc_tether'
  },
  ghost_step: {
    id: 'ghost_step',
    name: 'GHOST STEP',
    line: 'STILLPOINT ARCS LIGHTNING ALONG TRAIL',
    accent: '#a974e8',
    iconKey: 'phase_daggers'
  },
  executioner: {
    id: 'executioner',
    name: 'EXECUTIONER',
    line: 'CRITS <35% HP DETONATE CHAIN ARCS',
    accent: '#e2b24a',
    iconKey: 'momentum_edge'
  },
  bullet_alchemy: {
    id: 'bullet_alchemy',
    name: 'SCRAP ALCHEMY',
    line: '8 PARRIES DROP BONUS SHARDS',
    accent: '#d6689e',
    iconKey: 'shard'
  },
  orbital_overdrive: {
    id: 'orbital_overdrive',
    name: 'ORBITAL DRIVE',
    line: '+45% ORBITAL, DRONE, PYLON & SCYTHE',
    accent: '#68c97a',
    iconKey: 'halo_blades'
  },
  last_stand: {
    id: 'last_stand',
    name: 'AEGIS PROTOCOL',
    line: '1× CHEAT DEATH · CLEAR SHOTS +45% HP',
    accent: '#82c4e8',
    iconKey: 'reactive_plating'
  },
  double_tap: {
    id: 'double_tap',
    name: 'TWIN TRIGGER',
    line: '+1 SHOT ALL WEAPONS · -14% ROF',
    accent: '#e08538',
    iconKey: 'swarm_missiles'
  },
  magnetic_storm: {
    id: 'magnetic_storm',
    name: 'STATIC HARVEST',
    line: 'XP PICKUPS ZAP NEARBY HOSTILES',
    accent: '#6a9be8',
    iconKey: 'prism_drones'
  }
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export const HEAT_MODS: Record<
  HeatId,
  { id: HeatId; name: string; shortDesc: string; shardBonus: number; accent: string }
> = {
  swarm: {
    id: 'swarm',
    name: 'SWARM +40%',
    shortDesc: '+40% HOSTILE DENSITY',
    shardBonus: 0.25,
    accent: '#e0632b'
  },
  hyper_fire: {
    id: 'hyper_fire',
    name: 'HYPER FIRE',
    shortDesc: '+25% HOSTILE SHOT SPD',
    shardBonus: 0.25,
    accent: '#d94842'
  },
  ironclad: {
    id: 'ironclad',
    name: 'IRONCLAD',
    shortDesc: '+35% BOSS / ELITE HP',
    shardBonus: 0.25,
    accent: '#e2a93b'
  },
  fragile: {
    id: 'fragile',
    name: 'GLASS EDGE',
    shortDesc: '-25% HP · +25% DMG',
    shardBonus: 0.25,
    accent: '#a974e8'
  },
  cursed_void: {
    id: 'cursed_void',
    name: 'CURSED VOID',
    shortDesc: 'MORE PACTS & VOID SHOTS',
    shardBonus: 0.25,
    accent: '#4cb5ab'
  }
};

export const HEAT_ORDER: HeatId[] = ['swarm', 'hyper_fire', 'ironclad', 'fragile', 'cursed_void'];
