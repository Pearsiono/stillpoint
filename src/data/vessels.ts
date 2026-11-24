import { VesselDef, VesselId } from '../types';

export const VESSELS: Record<VesselId, VesselDef> = {
  vesper: {
    id: 'vesper',
    name: 'Vesper',
    starterWeapon: 'pulse_lance',
    unlockCost: 0,
    stats: {
      maxHp: 100,
      moveSpeed: 222,
      maxCharge: 100,
      chargeRateMult: 1.0,
      coreAreaMult: 1.0,
      grazeRadius: 50,
      armor: 0,
      shield: 0
    },
    perkShort: '+18% shot speed and +8% crit chance'
  },
  aegis: {
    id: 'aegis',
    name: 'Aegis',
    starterWeapon: 'halo_blades',
    unlockCost: 160,
    stats: {
      maxHp: 135,
      moveSpeed: 202,
      maxCharge: 115,
      chargeRateMult: 0.96,
      coreAreaMult: 1.32,
      grazeRadius: 48,
      armor: 2,
      shield: 20
    },
    perkShort: '+32% core blast area and graze shield regen'
  },
  reaper: {
    id: 'reaper',
    name: 'Reaper',
    starterWeapon: 'chrono_scythe',
    unlockCost: 220,
    stats: {
      maxHp: 94,
      moveSpeed: 234,
      maxCharge: 108,
      chargeRateMult: 1.06,
      coreAreaMult: 1.06,
      grazeRadius: 56,
      armor: 0,
      shield: 6
    },
    perkShort: 'Kills during slow-mo refund +7 focus'
  },
  prism: {
    id: 'prism',
    name: 'Prism',
    starterWeapon: 'ricochet_shard',
    unlockCost: 240,
    stats: {
      maxHp: 92,
      moveSpeed: 238,
      maxCharge: 106,
      chargeRateMult: 1.1,
      coreAreaMult: 1.0,
      grazeRadius: 54,
      armor: 0,
      shield: 10
    },
    perkShort: '+1 pierce on shots; ricochet bounces gain +35% damage'
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    starterWeapon: 'phase_daggers',
    unlockCost: 300,
    stats: {
      maxHp: 85,
      moveSpeed: 248,
      maxCharge: 110,
      chargeRateMult: 1.28,
      coreAreaMult: 1.08,
      grazeRadius: 70,
      armor: 0,
      shield: 0
    },
    perkShort: 'Wider graze halo and faster focus charge'
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    starterWeapon: 'arc_tether',
    unlockCost: 420,
    stats: {
      maxHp: 95,
      moveSpeed: 230,
      maxCharge: 105,
      chargeRateMult: 1.12,
      coreAreaMult: 1.12,
      grazeRadius: 54,
      armor: 0,
      shield: 8
    },
    perkShort: 'Slow-mo arcs lightning to 3 nearby foes'
  },
  pyre: {
    id: 'pyre',
    name: 'Pyre',
    starterWeapon: 'nova_pulse',
    unlockCost: 440,
    stats: {
      maxHp: 128,
      moveSpeed: 208,
      maxCharge: 112,
      chargeRateMult: 1.02,
      coreAreaMult: 1.24,
      grazeRadius: 48,
      armor: 2,
      shield: 10
    },
    perkShort: 'Taking damage or exiting slow-mo ignites a thermal ring'
  },
  bastion: {
    id: 'bastion',
    name: 'Bastion',
    starterWeapon: 'rail_turret',
    unlockCost: 480,
    stats: {
      maxHp: 140,
      moveSpeed: 196,
      maxCharge: 120,
      chargeRateMult: 0.98,
      coreAreaMult: 1.18,
      grazeRadius: 46,
      armor: 3,
      shield: 18
    },
    perkShort: '+25% fire rate in slow-mo and +1 max Rail Pylon'
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    starterWeapon: 'void_mortars',
    unlockCost: 540,
    stats: {
      maxHp: 120,
      moveSpeed: 206,
      maxCharge: 125,
      chargeRateMult: 1.0,
      coreAreaMult: 1.2,
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
    unlockCost: 580,
    stats: {
      maxHp: 106,
      moveSpeed: 224,
      maxCharge: 122,
      chargeRateMult: 1.08,
      coreAreaMult: 1.16,
      grazeRadius: 52,
      armor: 1,
      shield: 16
    },
    perkShort: 'Chills close enemies; chilled kills burst into ice spikes'
  },
  seraph: {
    id: 'seraph',
    name: 'Seraph',
    starterWeapon: 'prism_drones',
    unlockCost: 750,
    stats: {
      maxHp: 110,
      moveSpeed: 228,
      maxCharge: 130,
      chargeRateMult: 1.16,
      coreAreaMult: 1.18,
      grazeRadius: 58,
      armor: 1,
      shield: 26
    },
    perkShort: '+1 extra projectile and heavy recharging shield'
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie',
    starterWeapon: 'swarm_missiles',
    unlockCost: 780,
    stats: {
      maxHp: 114,
      moveSpeed: 220,
      maxCharge: 126,
      chargeRateMult: 1.12,
      coreAreaMult: 1.15,
      grazeRadius: 56,
      armor: 1,
      shield: 18
    },
    perkShort: 'Missile salvo every 5 grazes and 2× slow-mo lock-on speed'
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
