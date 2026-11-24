import { VesselDef, VesselId } from '../types';

export const VESSELS: Record<VesselId, VesselDef> = {
  vesper: {
    id: 'vesper',
    name: 'Vesper',
    starterWeapon: 'pulse_lance',
    unlockCost: 0,
    stats: {
      maxHp: 100,
      moveSpeed: 224,
      maxCharge: 104,
      chargeRateMult: 1.04,
      coreAreaMult: 1.04,
      grazeRadius: 52,
      armor: 0,
      shield: 8
    },
    perkShort: '+10% fire rate and +10% crit chance'
  },
  aegis: {
    id: 'aegis',
    name: 'Aegis',
    starterWeapon: 'halo_blades',
    unlockCost: 120,
    stats: {
      maxHp: 136,
      moveSpeed: 204,
      maxCharge: 112,
      chargeRateMult: 0.98,
      coreAreaMult: 1.32,
      grazeRadius: 48,
      armor: 2,
      shield: 22
    },
    perkShort: '+32% core area; grazing and Core triggers restore shield'
  },
  reaper: {
    id: 'reaper',
    name: 'Reaper',
    starterWeapon: 'chrono_scythe',
    unlockCost: 150,
    stats: {
      maxHp: 96,
      moveSpeed: 234,
      maxCharge: 108,
      chargeRateMult: 1.04,
      coreAreaMult: 1.04,
      grazeRadius: 56,
      armor: 0,
      shield: 8
    },
    perkShort: 'Kills during slow-mo refund +5.5 focus'
  },
  prism: {
    id: 'prism',
    name: 'Prism',
    starterWeapon: 'ricochet_shard',
    unlockCost: 175,
    stats: {
      maxHp: 96,
      moveSpeed: 232,
      maxCharge: 108,
      chargeRateMult: 1.08,
      coreAreaMult: 1.04,
      grazeRadius: 54,
      armor: 0,
      shield: 12
    },
    perkShort: '+1 pierce on shots; +14% weapon area and +25% crit damage'
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    starterWeapon: 'phase_daggers',
    unlockCost: 200,
    stats: {
      maxHp: 90,
      moveSpeed: 246,
      maxCharge: 110,
      chargeRateMult: 1.24,
      coreAreaMult: 1.06,
      grazeRadius: 70,
      armor: 0,
      shield: 0
    },
    perkShort: 'Wider graze halo, faster focus charge, and -25% core cooldown'
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    starterWeapon: 'arc_tether',
    unlockCost: 230,
    stats: {
      maxHp: 98,
      moveSpeed: 230,
      maxCharge: 108,
      chargeRateMult: 1.1,
      coreAreaMult: 1.1,
      grazeRadius: 54,
      armor: 0,
      shield: 10
    },
    perkShort: 'Core triggers arc lightning to 4 nearby foes'
  },
  pyre: {
    id: 'pyre',
    name: 'Pyre',
    starterWeapon: 'nova_pulse',
    unlockCost: 260,
    stats: {
      maxHp: 128,
      moveSpeed: 208,
      maxCharge: 112,
      chargeRateMult: 1.02,
      coreAreaMult: 1.22,
      grazeRadius: 48,
      armor: 2,
      shield: 12
    },
    perkShort: 'Taking damage or exiting slow-mo ignites a thermal ring'
  },
  bastion: {
    id: 'bastion',
    name: 'Bastion',
    starterWeapon: 'rail_turret',
    unlockCost: 290,
    stats: {
      maxHp: 142,
      moveSpeed: 202,
      maxCharge: 116,
      chargeRateMult: 0.98,
      coreAreaMult: 1.16,
      grazeRadius: 46,
      armor: 3,
      shield: 18
    },
    perkShort: '+28% fire rate and 25% damage reduction during slow-mo'
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    starterWeapon: 'void_mortars',
    unlockCost: 320,
    stats: {
      maxHp: 118,
      moveSpeed: 212,
      maxCharge: 120,
      chargeRateMult: 1.0,
      coreAreaMult: 1.18,
      grazeRadius: 50,
      armor: 1,
      shield: 12
    },
    perkShort: 'Slow-mo opens a pulling gravity rift'
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier',
    starterWeapon: 'frost_nova',
    unlockCost: 350,
    stats: {
      maxHp: 108,
      moveSpeed: 222,
      maxCharge: 116,
      chargeRateMult: 1.06,
      coreAreaMult: 1.12,
      grazeRadius: 52,
      armor: 1,
      shield: 16
    },
    perkShort: 'Chills nearby foes; chilled kills burst into ice spikes'
  },
  seraph: {
    id: 'seraph',
    name: 'Seraph',
    starterWeapon: 'prism_drones',
    unlockCost: 390,
    stats: {
      maxHp: 96,
      moveSpeed: 218,
      maxCharge: 114,
      chargeRateMult: 1.04,
      coreAreaMult: 1.06,
      grazeRadius: 50,
      armor: 0,
      shield: 28
    },
    perkShort: '+1 extra projectile and heavy recharging shield'
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie',
    starterWeapon: 'swarm_missiles',
    unlockCost: 420,
    stats: {
      maxHp: 104,
      moveSpeed: 226,
      maxCharge: 116,
      chargeRateMult: 1.08,
      coreAreaMult: 1.08,
      grazeRadius: 58,
      armor: 1,
      shield: 14
    },
    perkShort: 'Missile salvo every 5 grazes and +16% damage to elites and bosses'
  }
};

export const VESSEL_ORDER: VesselId[] = [
  'vesper',
  'aegis',
  'reaper',
  'prism',
  'phantom',
  'volt',
  'pyre',
  'bastion',
  'nova',
  'glacier',
  'seraph',
  'valkyrie'
];
