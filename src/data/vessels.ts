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
    unlockMilestone: 'boss_1',
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
    perkShort: '+32% core blast area and recharging shield'
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    starterWeapon: 'phase_daggers',
    unlockCost: 300,
    unlockMilestone: 'boss_2',
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
    unlockMilestone: 'graze_350',
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
  nova: {
    id: 'nova',
    name: 'Nova',
    starterWeapon: 'void_mortars',
    unlockCost: 540,
    unlockMilestone: 'sector_drift',
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
  seraph: {
    id: 'seraph',
    name: 'Seraph',
    starterWeapon: 'prism_drones',
    unlockCost: 750,
    unlockMilestone: 'boss_3',
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
    perkShort: '+1 extra projectile and heavy shield'
  }
};

export const VESSEL_ORDER: VesselId[] = ['vesper', 'aegis', 'phantom', 'volt', 'nova', 'seraph'];
