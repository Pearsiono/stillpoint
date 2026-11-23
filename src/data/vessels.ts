import { VesselDef, VesselId } from '../types';

export const VESSELS: Record<VesselId, VesselDef> = {
  vesper: {
    id: 'vesper',
    name: 'VESPER',
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
    perkShort: '+18% SHOT SPD · +8% CRIT'
  },
  aegis: {
    id: 'aegis',
    name: 'AEGIS',
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
    perkShort: '+32% CORE AREA · HEAVY SHIELD'
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
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
    perkShort: '+40% GRAZE HALO · FAST FOCUS'
  },
  volt: {
    id: 'volt',
    name: 'VOLT',
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
    perkShort: 'STILLPOINT ARCS LIGHTNING TO 3 FOES'
  },
  nova: {
    id: 'nova',
    name: 'NOVA',
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
    perkShort: 'STILLPOINT ENTRY SPAWNS GRAVITY RIFT'
  },
  seraph: {
    id: 'seraph',
    name: 'SERAPH',
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
    perkShort: '+1 BONUS SHOT · HIGH SHIELD'
  }
};

export const VESSEL_ORDER: VesselId[] = ['vesper', 'aegis', 'phantom', 'volt', 'nova', 'seraph'];
