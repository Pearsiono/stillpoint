import { VesselDef, VesselId } from '../types';

export const VESSELS: Record<VesselId, VesselDef> = {
  vesper: {
    id: 'vesper',
    name: 'VESPER-01',
    codename: 'STRIKER',
    tagline: 'Balanced intercept chassis tuned for crisp Lift-to-Focus counter bursts.',
    accent: '#22e6ff',
    glow: 'rgba(34, 230, 255, 0.55)',
    starterWeapon: 'pulse_lance',
    unlockCost: 0,
    unlockBossHint: 'Unlocked by default',
    stats: {
      maxHp: 100,
      moveSpeed: 215,
      maxCharge: 100,
      chargeRateMult: 1.0,
      parryRadiusMult: 1.0,
      grazeRadius: 48,
      armor: 0
    },
    perk: 'Balanced Stillpoint drain & +15% reflected Parry Shard velocity'
  },
  aegis: {
    id: 'aegis',
    name: 'AEGIS-04',
    codename: 'BASTION',
    tagline: 'Heavy orbital vanguard that turns dense bullet curtains into counter-nova blasts.',
    accent: '#4effb4',
    glow: 'rgba(78, 255, 180, 0.55)',
    starterWeapon: 'halo_blades',
    unlockCost: 160,
    unlockBossHint: 'Or clear Boss I: Vortex Weaver',
    stats: {
      maxHp: 135,
      moveSpeed: 196,
      maxCharge: 115,
      chargeRateMult: 0.95,
      parryRadiusMult: 1.32,
      grazeRadius: 46,
      armor: 2
    },
    perk: '+32% Parry Shockwave radius & regenerates a 12 HP Energy Shield on multi-parry (4+)'
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM-09',
    codename: 'WRAITH',
    tagline: 'Featherweight speed-frame built to skim lethal bullets and flood the void with blades.',
    accent: '#d96bff',
    glow: 'rgba(217, 107, 255, 0.55)',
    starterWeapon: 'phase_daggers',
    unlockCost: 340,
    unlockBossHint: 'Or clear Boss II: Prism Seraph',
    stats: {
      maxHp: 85,
      moveSpeed: 244,
      maxCharge: 110,
      chargeRateMult: 1.28,
      parryRadiusMult: 1.08,
      grazeRadius: 68,
      armor: 0
    },
    perk: 'Huge Graze halo (+42%), +28% Kinetic Charge speed & faster Parry reset'
  }
};

export const VESSEL_ORDER: VesselId[] = ['vesper', 'aegis', 'phantom'];
