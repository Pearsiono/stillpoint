import { VesselDef, VesselId } from '../types';

export const VESSELS: Record<VesselId, VesselDef> = {
  vesper: {
    id: 'vesper',
    name: 'VESPER',
    starterWeapon: 'pulse_lance',
    unlockCost: 0,
    stats: {
      maxHp: 100,
      moveSpeed: 218,
      maxCharge: 100,
      chargeRateMult: 1.0,
      parryRadiusMult: 1.0,
      grazeRadius: 48,
      armor: 0,
      shield: 0
    },
    perkShort: '+20% Parry Shard speed'
  },
  aegis: {
    id: 'aegis',
    name: 'AEGIS',
    starterWeapon: 'halo_blades',
    unlockCost: 160,
    unlockMilestone: 'boss_1',
    stats: {
      maxHp: 135,
      moveSpeed: 198,
      maxCharge: 115,
      chargeRateMult: 0.96,
      parryRadiusMult: 1.32,
      grazeRadius: 46,
      armor: 2,
      shield: 18
    },
    perkShort: '+32% Parry radius · Shield on 4× parry'
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
    starterWeapon: 'phase_daggers',
    unlockCost: 300,
    unlockMilestone: 'boss_2',
    stats: {
      maxHp: 85,
      moveSpeed: 246,
      maxCharge: 110,
      chargeRateMult: 1.28,
      parryRadiusMult: 1.08,
      grazeRadius: 68,
      armor: 0,
      shield: 0
    },
    perkShort: '+42% Graze halo · Faster charge'
  },
  volt: {
    id: 'volt',
    name: 'VOLT',
    starterWeapon: 'arc_tether',
    unlockCost: 420,
    unlockMilestone: 'parry_150',
    stats: {
      maxHp: 95,
      moveSpeed: 228,
      maxCharge: 105,
      chargeRateMult: 1.12,
      parryRadiusMult: 1.12,
      grazeRadius: 52,
      armor: 0,
      shield: 8
    },
    perkShort: 'Stillpoint entry arcs lightning to 3 foes'
  },
  nova: {
    id: 'nova',
    name: 'NOVA',
    starterWeapon: 'void_mortars',
    unlockCost: 540,
    unlockMilestone: 'sector_drift',
    stats: {
      maxHp: 120,
      moveSpeed: 204,
      maxCharge: 125,
      chargeRateMult: 1.0,
      parryRadiusMult: 1.2,
      grazeRadius: 48,
      armor: 1,
      shield: 10
    },
    perkShort: 'Parry Waves spawn gravity rifts'
  },
  seraph: {
    id: 'seraph',
    name: 'SERAPH',
    starterWeapon: 'prism_drones',
    unlockCost: 750,
    unlockMilestone: 'boss_3',
    stats: {
      maxHp: 110,
      moveSpeed: 226,
      maxCharge: 130,
      chargeRateMult: 1.16,
      parryRadiusMult: 1.18,
      grazeRadius: 56,
      armor: 1,
      shield: 24
    },
    perkShort: 'Double Parry Shards · High Energy Shield'
  }
};

export const VESSEL_ORDER: VesselId[] = ['vesper', 'aegis', 'phantom', 'volt', 'nova', 'seraph'];
