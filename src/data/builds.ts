import { CoreDef, CoreId, HeatId, RelicDef, RelicId } from '../types';

export const CORES: Record<CoreId, CoreDef> = {
  deflector: {
    id: 'deflector',
    name: 'DEFLECTOR',
    shortDesc: 'Parry wave reflects bullets into homing shards',
    accent: '#45e8d8',
    unlockCost: 0
  },
  blink: {
    id: 'blink',
    name: 'PHANTOM BLINK',
    shortDesc: 'Lift blinks forward & leaves exploding decoy',
    accent: '#cf7dff',
    unlockCost: 110
  },
  siphon: {
    id: 'siphon',
    name: 'GRAVITY SIPHON',
    shortDesc: 'Pulls foes & bullets in, shatters on touch-down',
    accent: '#ff9f43',
    unlockCost: 170
  },
  overclock: {
    id: 'overclock',
    name: 'OVERCLOCK',
    shortDesc: '2.3× fire rate & auto-crit during Stillpoint',
    accent: '#e5b34c',
    unlockCost: 230
  },
  berserk: {
    id: 'berserk',
    name: 'RAZOR REFLEX',
    shortDesc: 'Counter-slash executes <30% HP & grants Shield',
    accent: '#ff4858',
    unlockCost: 290
  }
};

export const CORE_ORDER: CoreId[] = ['deflector', 'blink', 'siphon', 'overclock', 'berserk'];

export const RELICS: Record<RelicId, RelicDef> = {
  glass_prism: {
    id: 'glass_prism',
    name: 'Glass Prism',
    line: 'Parried shards split into 3 homing bolts',
    accent: '#5ce1e6',
    iconKey: 'ricochet_shard'
  },
  volatile_shrapnel: {
    id: 'volatile_shrapnel',
    name: 'Volatile Shrapnel',
    line: 'Kills burst into 5 piercing steel splinters',
    accent: '#ff6a26',
    iconKey: 'nova_pulse'
  },
  time_bank: {
    id: 'time_bank',
    name: 'Time Bank',
    line: 'Grazing at full Focus arms 2× mega Parry Wave',
    accent: '#e5b34c',
    iconKey: 'chrono_capacitor'
  },
  blood_engine: {
    id: 'blood_engine',
    name: 'Blood Engine',
    line: 'Every 20 kills triggers 4s Frenzy & +3 HP',
    accent: '#ff4858',
    iconKey: 'chrono_scythe'
  },
  chain_parry: {
    id: 'chain_parry',
    name: 'Chain Parry',
    line: '5× Parry resets cooldown & refunds +30% Focus',
    accent: '#45e8d8',
    iconKey: 'arc_tether'
  },
  ghost_step: {
    id: 'ghost_step',
    name: 'Ghost Step',
    line: 'Entering Stillpoint arcs lightning to prior trail',
    accent: '#b46bff',
    iconKey: 'phase_daggers'
  },
  executioner: {
    id: 'executioner',
    name: 'Executioner',
    line: 'Crits below 35% HP detonate in chain lightning',
    accent: '#f6c453',
    iconKey: 'momentum_edge'
  },
  bullet_alchemy: {
    id: 'bullet_alchemy',
    name: 'Bullet Alchemy',
    line: 'Every 8 parried bullets drops bonus Shards',
    accent: '#f472b6',
    iconKey: 'shard'
  },
  orbital_overdrive: {
    id: 'orbital_overdrive',
    name: 'Orbital Drive',
    line: '+45% orbital, drone, pylon & scythe DMG',
    accent: '#4effb4',
    iconKey: 'halo_blades'
  },
  last_stand: {
    id: 'last_stand',
    name: 'Aegis Protocol',
    line: 'Cheat death once: clear bullets & heal 45% HP',
    accent: '#9be2ff',
    iconKey: 'reactive_plating'
  },
  double_tap: {
    id: 'double_tap',
    name: 'Twin Trigger',
    line: '+1 bonus projectile on all weapons',
    accent: '#ff9f43',
    iconKey: 'swarm_missiles'
  },
  magnetic_storm: {
    id: 'magnetic_storm',
    name: 'Static Harvest',
    line: 'XP pickups zap nearby foes with arcs',
    accent: '#6fa8ff',
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
    shortDesc: 'Denser waves',
    shardBonus: 0.25,
    accent: '#ff6a26'
  },
  hyper_fire: {
    id: 'hyper_fire',
    name: 'HYPER FIRE',
    shortDesc: '+25% shot speed',
    shardBonus: 0.25,
    accent: '#ff4858'
  },
  ironclad: {
    id: 'ironclad',
    name: 'IRONCLAD',
    shortDesc: '+35% Boss/Elite HP',
    shardBonus: 0.25,
    accent: '#e5b34c'
  },
  fragile: {
    id: 'fragile',
    name: 'GLASS EDGE',
    shortDesc: '-25% HP · +25% DMG',
    shardBonus: 0.25,
    accent: '#cf7dff'
  },
  cursed_void: {
    id: 'cursed_void',
    name: 'CURSED VOID',
    shortDesc: 'Frequent Pact Altars',
    shardBonus: 0.25,
    accent: '#45e8d8'
  }
};

export const HEAT_ORDER: HeatId[] = ['swarm', 'hyper_fire', 'ironclad', 'fragile', 'cursed_void'];
