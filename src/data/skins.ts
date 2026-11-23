import { SkinDef, SkinId } from '../types';

export const SKINS: Record<SkinId, SkinDef> = {
  cyanide: {
    id: 'cyanide',
    name: 'RELIC',
    hullFill: '#3b424d',
    hullTrim: '#e5e2d9',
    hullCore: '#45e8d8',
    accent: '#45e8d8',
    trailColor: '#45e8d8',
    parryOuter: '#45e8d8',
    parryInner: '#f2b866',
    unlockCost: 0
  },
  ronin: {
    id: 'ronin',
    name: 'OXIDE',
    hullFill: '#d8d2c5',
    hullTrim: '#c93b3b',
    hullCore: '#ff6448',
    accent: '#e34b42',
    trailColor: '#ff6448',
    parryOuter: '#e34b42',
    parryInner: '#f4c26b',
    unlockCost: 80
  },
  gilded: {
    id: 'gilded',
    name: 'BRASSWORKS',
    hullFill: '#242329',
    hullTrim: '#d9a441',
    hullCore: '#ffe29a',
    accent: '#e5b34c',
    trailColor: '#e5b34c',
    parryOuter: '#e5b34c',
    parryInner: '#f5efe0',
    unlockCost: 140
  },
  sakura: {
    id: 'sakura',
    name: 'HAZARD',
    hullFill: '#202124',
    hullTrim: '#eab308',
    hullCore: '#fff3a1',
    accent: '#f0bc2e',
    trailColor: '#f59e0b',
    parryOuter: '#f0bc2e',
    parryInner: '#ef4444',
    unlockCost: 180
  },
  venom: {
    id: 'venom',
    name: 'OVERGROWN',
    hullFill: '#2b332b',
    hullTrim: '#8ee06c',
    hullCore: '#d8ffc2',
    accent: '#8ee06c',
    trailColor: '#76d65c',
    parryOuter: '#8ee06c',
    parryInner: '#45e8d8',
    unlockCost: 220
  },
  monolith: {
    id: 'monolith',
    name: 'FROSTGLASS',
    hullFill: '#6a8ba1',
    hullTrim: '#edf6fc',
    hullCore: '#b8ecff',
    accent: '#9bd8f5',
    trailColor: '#7fc9ed',
    parryOuter: '#c2ecff',
    parryInner: '#639cd9',
    unlockCost: 240,
    unlockMilestone: 'graze_200'
  },
  ultraviolet: {
    id: 'ultraviolet',
    name: 'AMETHYST',
    hullFill: '#332445',
    hullTrim: '#d387ff',
    hullCore: '#f6d9ff',
    accent: '#cf7dff',
    trailColor: '#bd63f2',
    parryOuter: '#cf7dff',
    parryInner: '#45e8d8',
    unlockCost: 300,
    unlockMilestone: 'parry_burst_8'
  },
  ink: {
    id: 'ink',
    name: 'SUMI BONE',
    hullFill: '#141416',
    hullTrim: '#ebe7dc',
    hullCore: '#ffffff',
    accent: '#ebe7dc',
    trailColor: '#d9d4c7',
    parryOuter: '#ebe7dc',
    parryInner: '#8a867c',
    unlockCost: 360,
    unlockMilestone: 'sector_helix'
  },
  eclipse: {
    id: 'eclipse',
    name: 'SLAG CORE',
    hullFill: '#171212',
    hullTrim: '#ff6a26',
    hullCore: '#ffd285',
    accent: '#ff6a26',
    trailColor: '#ff521b',
    parryOuter: '#ff6a26',
    parryInner: '#ff2e4c',
    unlockCost: 450,
    unlockMilestone: 'no_hit_boss'
  },
  prismatic: {
    id: 'prismatic',
    name: 'AURELIA',
    hullFill: '#ece8df',
    hullTrim: '#45e8d8',
    hullCore: '#ffffff',
    accent: '#63f2e3',
    trailColor: '#63f2e3',
    parryOuter: '#63f2e3',
    parryInner: '#f2c15a',
    rainbow: true,
    unlockCost: 650,
    unlockMilestone: 'trophies_8'
  }
};

export const SKIN_ORDER: SkinId[] = [
  'cyanide',
  'ronin',
  'gilded',
  'sakura',
  'venom',
  'monolith',
  'ultraviolet',
  'ink',
  'eclipse',
  'prismatic'
];

export function resolveSkinColors(skin: SkinDef, time: number): SkinDef {
  if (!skin.rainbow) return skin;
  const hue = (time * 68) % 360;
  const hue2 = (hue + 95) % 360;
  return {
    ...skin,
    hullTrim: `hsl(${hue}, 78%, 70%)`,
    accent: `hsl(${hue}, 80%, 68%)`,
    trailColor: `hsl(${hue2}, 80%, 66%)`,
    parryOuter: `hsl(${hue}, 82%, 68%)`,
    parryInner: `hsl(${hue2}, 82%, 68%)`
  };
}
