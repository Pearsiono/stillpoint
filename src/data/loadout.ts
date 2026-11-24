import { MetaSave, ModuleCategory, ModuleDef, ModuleId } from '../types';

export const BASE_LOADOUT_POINTS = 10;

export const STARTER_UNLOCKED_MODULES: ModuleId[] = [
  'point_blank',
  'snap_focus',
  'afterburner_mines',
  'kinetic_shield'
];

export const DEFAULT_PRESETS: [ModuleId[], ModuleId[], ModuleId[]] = [
  ['point_blank', 'snap_focus', 'afterburner_mines', 'kinetic_shield'],
  ['snap_focus', 'afterburner_mines'],
  ['point_blank', 'kinetic_shield']
];

// Playstyle-defining Pick-10 modules: every choice alters strategy & tradeoffs instead of flat stat sticks
export const MODULES: Record<ModuleId, ModuleDef> = {
  // Combat Style
  point_blank: {
    id: 'point_blank',
    name: 'Point-Blank Choke',
    category: 'combat',
    points: 2,
    unlockCost: 0,
    iconKey: 'nova_pulse',
    accent: '#e08538',
    line: '+50% damage within 150px, -25% beyond 240px'
  },
  snap_focus: {
    id: 'snap_focus',
    name: 'Snap Capacitor',
    category: 'combat',
    points: 2,
    unlockCost: 0,
    iconKey: 'pulse_lance',
    accent: '#4cb5ab',
    line: 'First 0.8s of slow-mo deals +70% damage; holding longer deals -25%'
  },
  emergency_vent: {
    id: 'emergency_vent',
    name: 'Emergency Vent',
    category: 'combat',
    points: 2,
    unlockCost: 175,
    iconKey: 'nova_pulse',
    accent: '#e08538',
    line: 'Reactor Stall lockout is 50% shorter; exiting slow-mo below 25% focus boosts Core exit burst by 25%'
  },
  heavy_ordnance: {
    id: 'heavy_ordnance',
    name: 'Heavy Ordnance',
    category: 'combat',
    points: 2,
    unlockCost: 140,
    iconKey: 'void_mortars',
    accent: '#dfa436',
    line: 'Shots pierce +1 and knock foes back; -25% shot speed, -15% fire rate'
  },
  ricochet_rig: {
    id: 'ricochet_rig',
    name: 'Bank-Shot Rig',
    category: 'combat',
    points: 3,
    unlockCost: 210,
    iconKey: 'ricochet_shard',
    accent: '#5ce1e6',
    line: 'Single-target shots bounce once to a nearby foe for 65% damage, -12% base damage'
  },
  specialist_lock: {
    id: 'specialist_lock',
    name: 'Twin-Slot Rig',
    category: 'combat',
    points: 3,
    unlockCost: 230,
    iconKey: 'rail_turret',
    accent: '#ff7b47',
    line: 'Cap weapon slots at 2; starter begins LV 2 and all weapons fire 32% faster'
  },

  // Movement & Focus Loops
  afterburner_mines: {
    id: 'afterburner_mines',
    name: 'Wake Mines',
    category: 'movement',
    points: 2,
    unlockCost: 0,
    iconKey: 'swarm_missiles',
    accent: '#e0632b',
    line: 'Drops an armed proximity blast mine every 115px moved'
  },
  momentum_drive: {
    id: 'momentum_drive',
    name: 'Slipstream Drive',
    category: 'movement',
    points: 2,
    unlockCost: 135,
    iconKey: 'kinetic_thrusters',
    accent: '#5cd68d',
    line: 'Moving ramps fire rate up to +40%; stopping drops it to -15%'
  },
  graze_spark: {
    id: 'graze_spark',
    name: 'Arc Graze',
    category: 'movement',
    points: 2,
    unlockCost: 155,
    iconKey: 'arc_tether',
    accent: '#6fa8ff',
    line: 'Every 3 grazes fires a homing lightning lance and pulls nearby XP'
  },
  exit_vortex: {
    id: 'exit_vortex',
    name: 'Collapse Wake',
    category: 'movement',
    points: 2,
    unlockCost: 170,
    iconKey: 'singularity_core',
    accent: '#a974e8',
    line: 'Exiting slow-mo leaves a 2.5s pulling rift behind you (5s cooldown)'
  },
  focus_surge: {
    id: 'focus_surge',
    name: 'Reflex Tap',
    category: 'movement',
    points: 3,
    unlockCost: 215,
    iconKey: 'chrono_capacitor',
    accent: '#7bf7ff',
    line: 'Entering slow-mo at 5+ graze combo gives 1.6s zero focus drain and resets core'
  },

  // Defense & Status Tricks
  kinetic_shield: {
    id: 'kinetic_shield',
    name: 'Kinetic Barrier',
    category: 'tactics',
    points: 2,
    unlockCost: 0,
    iconKey: 'shield',
    accent: '#62a4f5',
    line: 'Moving builds up to 18 overshield; taking damage pauses recharge for 4s'
  },
  surge_capacitor: {
    id: 'surge_capacitor',
    name: 'Thermal Siphon',
    category: 'tactics',
    points: 3,
    unlockCost: 225,
    iconKey: 'graze_conduit',
    accent: '#5cd6d0',
    line: 'Grazing enemy shots restores +35% more focus; passive movement focus recharge is 20% slower'
  },
  emp_shell: {
    id: 'emp_shell',
    name: 'EMP Bulkhead',
    category: 'tactics',
    points: 3,
    unlockCost: 195,
    iconKey: 'reactive_plating',
    accent: '#82c4e8',
    line: '+20 starting shield; breaking shield erases nearby bullets and stuns foes (10s CD)'
  },
  cryo_shatter: {
    id: 'cryo_shatter',
    name: 'Frostbite Trigger',
    category: 'tactics',
    points: 2,
    unlockCost: 165,
    iconKey: 'frost_nova',
    accent: '#7ee8ff',
    line: 'Every 5th shot chills foes; killing chilled enemies shatters 4 ice splinters'
  },
  blood_pact: {
    id: 'blood_pact',
    name: 'Siphon Chassis',
    category: 'tactics',
    points: 3,
    unlockCost: 205,
    iconKey: 'phase_daggers',
    accent: '#d94842',
    line: 'Disables shield; every 15 kills drops a healing blood cell (+10 HP and +20% speed)'
  },
  chain_detonate: {
    id: 'chain_detonate',
    name: 'Volatile Marks',
    category: 'tactics',
    points: 2,
    unlockCost: 180,
    iconKey: 'halo_blades',
    accent: '#e05fa8',
    line: 'Crits prime foes for 3s; killing primed targets blasts nearby foes for 22% max HP'
  },

  // Risk Traits (negative point cost expands Pick-10 budget up to 15)
  risk_glass: {
    id: 'risk_glass',
    name: 'Stripped Hull',
    category: 'risk',
    points: -2,
    unlockCost: 110,
    iconKey: 'chrono_scythe',
    accent: '#d4423b',
    line: '-30% max HP for +2 loadout points'
  },
  risk_drain: {
    id: 'risk_drain',
    name: 'Overheated Core',
    category: 'risk',
    points: -2,
    unlockCost: 110,
    iconKey: 'targeting_array',
    accent: '#cf512a',
    line: '+40% focus drain for +2 loadout points'
  },
  risk_strict: {
    id: 'risk_strict',
    name: 'Locked Draft',
    category: 'risk',
    points: -1,
    unlockCost: 80,
    iconKey: 'overclock_core',
    accent: '#d97134',
    line: '0 rerolls and 2 draft choices for +1 loadout point'
  }
};

export const MODULE_ORDER: ModuleId[] = [
  'point_blank',
  'snap_focus',
  'emergency_vent',
  'heavy_ordnance',
  'ricochet_rig',
  'specialist_lock',
  'afterburner_mines',
  'momentum_drive',
  'graze_spark',
  'exit_vortex',
  'focus_surge',
  'kinetic_shield',
  'surge_capacitor',
  'emp_shell',
  'cryo_shatter',
  'blood_pact',
  'chain_detonate',
  'risk_glass',
  'risk_drain',
  'risk_strict'
];

export const MODULE_CATEGORIES: Array<{ id: ModuleCategory; label: string }> = [
  { id: 'combat', label: 'Combat style' },
  { id: 'movement', label: 'Movement & focus' },
  { id: 'tactics', label: 'Defense & status' },
  { id: 'risk', label: 'Risk traits' }
];

// Refund table for players migrating from the pre-v1.0.13 stat-stick loadout modules
export const LEGACY_MODULE_COSTS: Record<string, number> = {
  twin_chambers: 180,
  hollow_points: 110,
  boss_hunter: 120,
  shrapnel_rig: 130,
  cryo_rounds: 80,
  sniper_lens: 190,
  hair_trigger: 130,
  slipstream: 75,
  graze_leech: 140,
  reactive_cell: 115,
  field_reroll: 90,
  risk_glass: 90,
  risk_drain: 90,
  risk_strict: 60
};

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
