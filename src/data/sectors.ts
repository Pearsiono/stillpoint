import { SectorDef, SectorId } from '../types';

export const SECTORS: Record<SectorId, SectorDef> = {
  drift: {
    id: 'drift',
    code: '01',
    name: 'Ash Flats',
    accent: '#45e8d8',
    bgBase: '#19191d',
    bgGlow: 'rgba(138, 122, 102, 0.14)',
    gridColor: 'rgba(218, 210, 194, 0.08)',
    gridStyle: 'square',
    shardMult: 1.0,
    difficultyMult: 1.0,
    bossIntervalScale: 1.0,
    unlockCost: 0
  },
  helix: {
    id: 'helix',
    code: '02',
    name: 'Sunken Metro',
    accent: '#8ee06c',
    bgBase: '#131b19',
    bgGlow: 'rgba(72, 134, 108, 0.16)',
    gridColor: 'rgba(164, 214, 182, 0.085)',
    gridStyle: 'hex',
    shardMult: 1.3,
    difficultyMult: 1.22,
    bossIntervalScale: 0.94,
    unlockCost: 140,
    unlockBossRequired: 1
  },
  furnace: {
    id: 'furnace',
    code: '03',
    name: 'Slag Foundry',
    accent: '#ff6a26',
    bgBase: '#1d1412',
    bgGlow: 'rgba(180, 74, 34, 0.18)',
    gridColor: 'rgba(240, 132, 82, 0.09)',
    gridStyle: 'diamond',
    shardMult: 1.65,
    difficultyMult: 1.48,
    bossIntervalScale: 0.88,
    unlockCost: 280,
    unlockBossRequired: 2
  },
  singularity: {
    id: 'singularity',
    code: '04',
    name: 'The Monolith',
    accent: '#e5b34c',
    bgBase: '#151418',
    bgGlow: 'rgba(182, 148, 76, 0.16)',
    gridColor: 'rgba(229, 179, 76, 0.095)',
    gridStyle: 'radial',
    shardMult: 2.1,
    difficultyMult: 1.78,
    bossIntervalScale: 0.72,
    unlockCost: 480,
    unlockBossRequired: 3
  }
};

export const SECTOR_ORDER: SectorId[] = ['drift', 'helix', 'furnace', 'singularity'];
