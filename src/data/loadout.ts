import { MetaSave, ModuleCategory, ModuleDef, ModuleId } from '../types';

export const BASE_LOADOUT_POINTS = 10;

export const STARTER_UNLOCKED_MODULES: ModuleId[] = [
  'overbore',
  'deep_capacitor',
  'plated_hull',
  'salvage_magnet'
];

export const DEFAULT_PRESETS: [ModuleId[], ModuleId[], ModuleId[]] = [
  ['overbore', 'deep_capacitor', 'plated_hull', 'salvage_magnet'],
  ['overbore', 'deep_capacitor'],
  ['plated_hull', 'salvage_magnet']
];

export const MODULES: Record<ModuleId, ModuleDef> = {
  // Offense
  overbore: {
    id: 'overbore',
    name: 'Overbore Barrel',
    category: 'offense',
    points: 2,
    unlockCost: 0,
    iconKey: 'pulse_lance',
    accent: '#dfa436',
    line: '+18% damage, +20% shot speed'
  },
  twin_chambers: {
    id: 'twin_chambers',
    name: 'Twin Chambers',
    category: 'offense',
    points: 3,
    unlockCost: 180,
    iconKey: 'rail_turret',
    accent: '#e08538',
    line: '+1 extra projectile on all weapons'
  },
  hollow_points: {
    id: 'hollow_points',
    name: 'Hollow Points',
    category: 'offense',
    points: 2,
    unlockCost: 110,
    iconKey: 'phase_daggers',
    accent: '#e05fa8',
    line: '+15% crit chance, 2.2× crit damage'
  },
  boss_hunter: {
    id: 'boss_hunter',
    name: 'Hunter Optics',
    category: 'offense',
    points: 2,
    unlockCost: 120,
    iconKey: 'targeting_array',
    accent: '#ff7b47',
    line: '+30% damage to bosses and elites'
  },
  shrapnel_rig: {
    id: 'shrapnel_rig',
    name: 'Shrapnel Rig',
    category: 'offense',
    points: 2,
    unlockCost: 130,
    iconKey: 'ricochet_shard',
    accent: '#e0632b',
    line: 'Kills burst into 3 piercing splinters'
  },
  cryo_rounds: {
    id: 'cryo_rounds',
    name: 'Cryo Rounds',
    category: 'offense',
    points: 1,
    unlockCost: 80,
    iconKey: 'frost_nova',
    accent: '#7ee8ff',
    line: 'Direct hits chill enemies for 2s'
  },

  // Focus & Stillpoint
  deep_capacitor: {
    id: 'deep_capacitor',
    name: 'Deep Capacitor',
    category: 'focus',
    points: 2,
    unlockCost: 0,
    iconKey: 'chrono_capacitor',
    accent: '#4cb5ab',
    line: '+35 max focus, -18% slow-mo drain'
  },
  sniper_lens: {
    id: 'sniper_lens',
    name: 'Sniper Lens',
    category: 'focus',
    points: 3,
    unlockCost: 190,
    iconKey: 'aether_lens',
    accent: '#7bf7ff',
    line: '+45% slow-mo damage, ignores boss slow-mo armor'
  },
  hair_trigger: {
    id: 'hair_trigger',
    name: 'Hair Trigger',
    category: 'focus',
    points: 2,
    unlockCost: 130,
    iconKey: 'nova_pulse',
    accent: '#a974e8',
    line: '-30% core cooldown, +30% core damage'
  },
  slipstream: {
    id: 'slipstream',
    name: 'Slipstream',
    category: 'focus',
    points: 1,
    unlockCost: 75,
    iconKey: 'kinetic_thrusters',
    accent: '#5cd68d',
    line: '+14% move speed, +25% focus charge'
  },
  graze_leech: {
    id: 'graze_leech',
    name: 'Graze Siphon',
    category: 'focus',
    points: 2,
    unlockCost: 140,
    iconKey: 'graze_conduit',
    accent: '#ff66e5',
    line: '+24 graze halo, every 10 grazes restores 5 HP'
  },

  // Chassis & Utility
  plated_hull: {
    id: 'plated_hull',
    name: 'Plated Bulkhead',
    category: 'chassis',
    points: 2,
    unlockCost: 0,
    iconKey: 'reactive_plating',
    accent: '#82c4e8',
    line: '+32 max HP, +2 armor'
  },
  reactive_cell: {
    id: 'reactive_cell',
    name: 'Reactive Cell',
    category: 'chassis',
    points: 2,
    unlockCost: 115,
    iconKey: 'shield',
    accent: '#62a4f5',
    line: '+28 shield that regenerates every 4s'
  },
  field_reroll: {
    id: 'field_reroll',
    name: 'Draft Reroller',
    category: 'chassis',
    points: 1,
    unlockCost: 90,
    iconKey: 'flux_coil',
    accent: '#dfa436',
    line: '+2 draft rerolls per run'
  },
  salvage_magnet: {
    id: 'salvage_magnet',
    name: 'Salvage Magnet',
    category: 'chassis',
    points: 1,
    unlockCost: 0,
    iconKey: 'shard',
    accent: '#4cb5ab',
    line: '+60 pickup pull, +20% shards earned'
  },

  // Risk Traits (negative point cost expands Pick-10 capacity!)
  risk_glass: {
    id: 'risk_glass',
    name: 'Stripped Hull',
    category: 'risk',
    points: -2,
    unlockCost: 90,
    iconKey: 'chrono_scythe',
    accent: '#d4423b',
    line: '-30% max HP for +2 loadout points'
  },
  risk_drain: {
    id: 'risk_drain',
    name: 'Overheated Core',
    category: 'risk',
    points: -2,
    unlockCost: 90,
    iconKey: 'void_mortars',
    accent: '#cf512a',
    line: '+35% focus drain for +2 loadout points'
  },
  risk_strict: {
    id: 'risk_strict',
    name: 'Locked Draft',
    category: 'risk',
    points: -1,
    unlockCost: 60,
    iconKey: 'overclock_core',
    accent: '#d97134',
    line: '0 rerolls and 2 draft choices for +1 loadout point'
  }
};

export const MODULE_ORDER: ModuleId[] = [
  'overbore',
  'twin_chambers',
  'hollow_points',
  'boss_hunter',
  'shrapnel_rig',
  'cryo_rounds',
  'deep_capacitor',
  'sniper_lens',
  'hair_trigger',
  'slipstream',
  'graze_leech',
  'plated_hull',
  'reactive_cell',
  'field_reroll',
  'salvage_magnet',
  'risk_glass',
  'risk_drain',
  'risk_strict'
];

export const MODULE_CATEGORIES: Array<{ id: ModuleCategory; label: string }> = [
  { id: 'offense', label: 'Weapons' },
  { id: 'focus', label: 'Focus' },
  { id: 'chassis', label: 'Chassis' },
  { id: 'risk', label: 'Risk traits' }
];

export function getActiveLoadout(save: MetaSave): ModuleId[] {
  return save.loadoutPresets[save.activePreset] ?? [];
}

export function getLoadoutBudget(equipped: ModuleId[]): {
  used: number;
  capacity: number;
  bonus: number;
  remaining: number;
} {
  let used = 0;
  let bonus = 0;
  for (const id of equipped) {
    const def = MODULES[id];
    if (!def) continue;
    if (def.points > 0) used += def.points;
    else bonus += Math.abs(def.points);
  }
  const capacity = BASE_LOADOUT_POINTS + bonus;
  return { used, capacity, bonus, remaining: capacity - used };
}

export function canToggleModule(
  equipped: ModuleId[],
  id: ModuleId
): { ok: boolean; reason?: string } {
  const def = MODULES[id];
  if (!def) return { ok: false };
  const isEquipped = equipped.includes(id);

  if (isEquipped) {
    // Removing a Risk Trait could put positive modules over capacity!
    if (def.points < 0) {
      const next = equipped.filter((m) => m !== id);
      const b = getLoadoutBudget(next);
      if (b.used > b.capacity) {
        return { ok: false, reason: `Free ${b.used - b.capacity} pts first` };
      }
    }
    return { ok: true };
  }

  const b = getLoadoutBudget(equipped);
  if (def.points > 0 && b.used + def.points > b.capacity) {
    return { ok: false, reason: `Need ${b.used + def.points - b.capacity} more pts` };
  }
  return { ok: true };
}
