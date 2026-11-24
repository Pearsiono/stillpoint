import { CoreDef, CoreId, DraftCurseId, HeatId, RelicDef, RelicId } from '../types';

export const CORES: Record<CoreId, CoreDef> = {
  deflector: {
    id: 'deflector',
    name: 'Kinetic Nova',
    shortDesc: 'Blasts and pushes nearby enemies on slow-mo',
    accent: '#4cb5ab',
    unlockCost: 0
  },
  blink: {
    id: 'blink',
    name: 'Phantom Blink',
    shortDesc: 'Warps forward and leaves an exploding decoy',
    accent: '#a974e8',
    unlockCost: 110
  },
  aegis_dome: {
    id: 'aegis_dome',
    name: 'Stasis Dome',
    shortDesc: 'Erases nearby enemy shots on slow-mo, returning homing sparks',
    accent: '#62a4f5',
    unlockCost: 150
  },
  siphon: {
    id: 'siphon',
    name: 'Gravity Siphon',
    shortDesc: 'Pulls enemies inward, shatters them on resume',
    accent: '#e08538',
    unlockCost: 180
  },
  chrono_echo: {
    id: 'chrono_echo',
    name: 'Phase Echo',
    shortDesc: 'Deploys a holographic turret that fires your primary weapon',
    accent: '#5cd68d',
    unlockCost: 220
  },
  overclock: {
    id: 'overclock',
    name: 'Overclock',
    shortDesc: '2× fire rate and guaranteed crits in slow-mo',
    accent: '#e2a93b',
    unlockCost: 250
  },
  singularity_lance: {
    id: 'singularity_lance',
    name: 'Rail Collapse',
    shortDesc: 'Charges a heavy railbeam in slow-mo, fires on resume',
    accent: '#ff7b47',
    unlockCost: 290
  },
  berserk: {
    id: 'berserk',
    name: 'Razor Reflex',
    shortDesc: 'Executes foes under 32% HP (2× vs bosses) for shield and haste',
    accent: '#d94842',
    unlockCost: 310
  },
  catalyst_surge: {
    id: 'catalyst_surge',
    name: 'Chain Catalyst',
    shortDesc: 'Marks nearby foes (+15% dmg taken) to chain-detonate on death',
    accent: '#e05fa8',
    unlockCost: 350
  }
};

export const CORE_ORDER: CoreId[] = [
  'deflector',
  'blink',
  'aegis_dome',
  'siphon',
  'chrono_echo',
  'overclock',
  'singularity_lance',
  'berserk',
  'catalyst_surge'
];

export const DRAFT_CURSES: Record<DraftCurseId, { id: DraftCurseId; label: string }> = {
  fragile_hull: { id: 'fragile_hull', label: '-16 max HP' },
  fast_hostiles: { id: 'fast_hostiles', label: '+18% enemy shot speed' },
  heavy_drain: { id: 'heavy_drain', label: '+25% focus drain' },
  slow_rig: { id: 'slow_rig', label: '-12% move speed' },
  blood_tax: { id: 'blood_tax', label: '-22% current HP' }
};

export const DRAFT_CURSE_IDS = Object.keys(DRAFT_CURSES) as DraftCurseId[];

// Wildcard Relics: build warpers with clean skill loops and real tradeoffs
export const RELICS: Record<RelicId, RelicDef> = {
  glass_prism: {
    id: 'glass_prism',
    name: 'Prism Split',
    line: 'Crits split 2 homing shards, -18% max HP',
    accent: '#52b8c9',
    iconKey: 'ricochet_shard'
  },
  volatile_shrapnel: {
    id: 'volatile_shrapnel',
    name: 'Shrapnel Core',
    line: 'Slain enemies burst into 5 piercing splinters',
    accent: '#e0632b',
    iconKey: 'nova_pulse'
  },
  time_bank: {
    id: 'time_bank',
    name: 'Chrono Overdrive',
    line: '+40% damage in slow-mo, +22% drain',
    accent: '#e2a93b',
    iconKey: 'chrono_capacitor'
  },
  blood_engine: {
    id: 'blood_engine',
    name: 'Blood Engine',
    line: 'Every 20 kills grants frenzy and +3 HP, -15% shield',
    accent: '#d94842',
    iconKey: 'chrono_scythe'
  },
  chain_parry: {
    id: 'chain_parry',
    name: 'Graze Surge',
    line: '8 grazes restore 28% focus and emit a blast',
    accent: '#4cb5ab',
    iconKey: 'arc_tether'
  },
  ghost_step: {
    id: 'ghost_step',
    name: 'Ghost Step',
    line: 'Slow-mo arcs lightning back along your trail',
    accent: '#a974e8',
    iconKey: 'phase_daggers'
  },
  executioner: {
    id: 'executioner',
    name: 'Executioner',
    line: 'Crits under 35% HP chain lightning to nearby foes',
    accent: '#e2b24a',
    iconKey: 'momentum_edge'
  },
  bullet_alchemy: {
    id: 'bullet_alchemy',
    name: 'Scrap Harvest',
    line: 'Every 10 grazes drops bonus shards',
    accent: '#d6689e',
    iconKey: 'shard'
  },
  orbital_overdrive: {
    id: 'orbital_overdrive',
    name: 'Orbital Drive',
    line: '+45% damage for orbitals, drones, pylons, and scythes',
    accent: '#68c97a',
    iconKey: 'halo_blades'
  },
  last_stand: {
    id: 'last_stand',
    name: 'Aegis Protocol',
    line: 'Survive lethal damage once with 45% HP',
    accent: '#82c4e8',
    iconKey: 'reactive_plating'
  },
  double_tap: {
    id: 'double_tap',
    name: 'Twin Trigger',
    line: '+1 shot on all weapons, -14% fire rate',
    accent: '#e08538',
    iconKey: 'swarm_missiles'
  },
  magnetic_storm: {
    id: 'magnetic_storm',
    name: 'Static Harvest',
    line: 'XP pickups zap nearby enemies',
    accent: '#6a9be8',
    iconKey: 'prism_drones'
  },
  echo_salvo: {
    id: 'echo_salvo',
    name: 'Echo Matrix',
    line: 'Every 4th shot cycle fires a bonus volley, -10% move speed',
    accent: '#5ce1e6',
    iconKey: 'mirror_beam'
  },
  chrono_leech: {
    id: 'chrono_leech',
    name: 'Time Thief',
    line: 'Slaying elites or bosses refills focus and restores 15% HP',
    accent: '#4cb5ab',
    iconKey: 'chrono_capacitor'
  },
  overcharge_shield: {
    id: 'overcharge_shield',
    name: 'Capacitor Burst',
    line: 'Taking damage arcs retaliation lightning to 8 nearby foes',
    accent: '#62a4f5',
    iconKey: 'arc_tether'
  },
  volatile_xp: {
    id: 'volatile_xp',
    name: 'Unstable Gems',
    line: 'Every 15 XP gems collected triggers a radial blast wave',
    accent: '#e2a93b',
    iconKey: 'shatter_mine'
  },
  berserk_heart: {
    id: 'berserk_heart',
    name: 'Redline Core',
    line: 'Up to +65% bonus damage as hull integrity drops',
    accent: '#d94842',
    iconKey: 'grav_flail'
  },
  ricochet_aura: {
    id: 'ricochet_aura',
    name: 'Deflection Field',
    line: 'Slow-mo halves nearby bullet speed and doubles graze focus',
    accent: '#7bf7ff',
    iconKey: 'aether_lens'
  },
  frost_shatter_relic: {
    id: 'frost_shatter_relic',
    name: 'Glacial Core',
    line: 'Chilled enemies burst on death for 30% max HP frost AoE',
    accent: '#7ee8ff',
    iconKey: 'frost_nova'
  },
  golden_greed: {
    id: 'golden_greed',
    name: 'Gilded Salvage',
    line: '+1% damage for every 35 shards earned this run',
    accent: '#f0bc42',
    iconKey: 'shard'
  }
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export const HEAT_MODS: Record<
  HeatId,
  { id: HeatId; name: string; shortDesc: string; shardBonus: number; accent: string }
> = {
  swarm: {
    id: 'swarm',
    name: 'Swarm',
    shortDesc: '+40% enemy count',
    shardBonus: 0.25,
    accent: '#e0632b'
  },
  hyper_fire: {
    id: 'hyper_fire',
    name: 'Hyper Fire',
    shortDesc: '+25% enemy shot speed',
    shardBonus: 0.25,
    accent: '#d94842'
  },
  ironclad: {
    id: 'ironclad',
    name: 'Ironclad',
    shortDesc: '+35% boss and elite HP',
    shardBonus: 0.25,
    accent: '#e2a93b'
  },
  fragile: {
    id: 'fragile',
    name: 'Glass Edge',
    shortDesc: '-25% HP, +25% damage',
    shardBonus: 0.25,
    accent: '#a974e8'
  },
  cursed_void: {
    id: 'cursed_void',
    name: 'Pact Surge',
    shortDesc: 'More pact altars spawn',
    shardBonus: 0.25,
    accent: '#4cb5ab'
  }
};

export const HEAT_ORDER: HeatId[] = ['swarm', 'hyper_fire', 'ironclad', 'fragile', 'cursed_void'];
