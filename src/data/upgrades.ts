import { DRAFT_CURSE_IDS, DRAFT_CURSES, RELIC_IDS, RELICS } from './builds';
import {
  PactId,
  PassiveDef,
  PassiveId,
  PlayerState,
  UpgradeChoice,
  WeaponDef,
  WeaponId
} from '../types';

export const MAX_WEAPON_SLOTS = 4;
export const MAX_PASSIVE_SLOTS = 4;

export const PACTS: Record<
  PactId,
  { id: PactId; name: string; trade: string; accent: string }
> = {
  bloodlust: {
    id: 'bloodlust',
    name: 'BLOODLUST',
    trade: '+40% DMG · Foes faster',
    accent: '#ff3b5c'
  },
  glass_cannon: {
    id: 'glass_cannon',
    name: 'FRACTURE',
    trade: '+65% Parry DMG · -20% HP',
    accent: '#ff7a1a'
  },
  bullet_magnet: {
    id: 'bullet_magnet',
    name: 'OVERDRIVE',
    trade: '+75% Graze · Faster fire',
    accent: '#d96bff'
  },
  greed: {
    id: 'greed',
    name: 'AVARICE',
    trade: '+60% Shards · More Elites',
    accent: '#f6c453'
  }
};

export const PACT_IDS = Object.keys(PACTS) as PactId[];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pulse_lance: {
    id: 'pulse_lance',
    name: 'Pulse Lance',
    evolvedName: 'SINGULARITY RAIL',
    catalystPassive: 'chrono_capacitor',
    accent: '#22e6ff',
    shortDesc: 'Auto-bolts · Slow-mo piercing railbeam',
    stillpointShort: 'Piercing Chrono Railbeam',
    evolvedShort: 'Twin rails tear detonating gravity rifts',
    maxLevel: 5
  },
  halo_blades: {
    id: 'halo_blades',
    name: 'Halo Sawblades',
    evolvedName: 'ECLIPSE GYRO',
    catalystPassive: 'kinetic_thrusters',
    accent: '#4effb4',
    shortDesc: 'Orbiting blades · Slow-mo bullet shredder',
    stillpointShort: 'Shreds incoming enemy bullets',
    evolvedShort: 'Dual solar rings flare shards on parry',
    maxLevel: 5
  },
  arc_tether: {
    id: 'arc_tether',
    name: 'Arc Tether',
    evolvedName: 'TESLA LATTICE',
    catalystPassive: 'flux_coil',
    accent: '#6fa8ff',
    shortDesc: 'Chain lightning · Slow-mo zaps bullets',
    stillpointShort: 'Zaps nearby enemy projectiles',
    evolvedShort: 'Parried shards chain storm lightning',
    maxLevel: 5
  },
  prism_drones: {
    id: 'prism_drones',
    name: 'Prism Drones',
    evolvedName: 'SERAPHIM ARRAY',
    catalystPassive: 'aether_lens',
    accent: '#7bf7ff',
    shortDesc: 'Autonomous drones · Slow-mo tri-beams',
    stillpointShort: 'Tri-split refraction beams',
    evolvedShort: 'Six drones + periodic Shield regen',
    maxLevel: 5
  },
  void_mortars: {
    id: 'void_mortars',
    name: 'Void Mortars',
    evolvedName: 'EVENT HORIZON',
    catalystPassive: 'singularity_core',
    accent: '#b97aff',
    shortDesc: 'Plasma craters · Slow-mo gravity collapse',
    stillpointShort: 'Pulls foes, detonates on resume',
    evolvedShort: 'Black holes turn bullets into XP',
    maxLevel: 5
  },
  phase_daggers: {
    id: 'phase_daggers',
    name: 'Phase Daggers',
    evolvedName: 'PHANTOM BARRAGE',
    catalystPassive: 'graze_conduit',
    accent: '#ff66e5',
    shortDesc: 'Trail blades · Slow-mo homing recall',
    stillpointShort: 'Recalls all knives at elites',
    evolvedShort: 'Grazes spawn daggers · Executes <20%',
    maxLevel: 5
  },
  chrono_scythe: {
    id: 'chrono_scythe',
    name: 'Chrono Scythe',
    evolvedName: 'REAPER ECLIPSE',
    catalystPassive: 'momentum_edge',
    accent: '#ff5c8a',
    shortDesc: 'Boomerang arcs · Slow-mo frozen buzzsaws',
    stillpointShort: 'Locks mid-air shredding bullets',
    evolvedShort: 'Twin crimson saws slice bullets nonstop',
    maxLevel: 5
  },
  ricochet_shard: {
    id: 'ricochet_shard',
    name: 'Ricochet Shard',
    evolvedName: 'KALEIDOSCOPE',
    catalystPassive: 'echo_chamber',
    accent: '#5ce1e6',
    shortDesc: 'Bouncing needles · Slow-mo split on hit',
    stillpointShort: 'Fractures into 2 shards per bounce',
    evolvedShort: 'Multi-bounce prism storm fills arena',
    maxLevel: 5
  },
  nova_pulse: {
    id: 'nova_pulse',
    name: 'Nova Pulse',
    evolvedName: 'SUPERNOVA HEART',
    catalystPassive: 'reactive_plating',
    accent: '#ff9f43',
    shortDesc: 'Shockwave aura · Slow-mo implosion burst',
    stillpointShort: 'Mega blast triggers on touch-down',
    evolvedShort: 'Continuous dual shockwaves erase bullets',
    maxLevel: 5
  },
  rail_turret: {
    id: 'rail_turret',
    name: 'Rail Pylons',
    evolvedName: 'OBELISK NETWORK',
    catalystPassive: 'overclock_core',
    accent: '#f6c453',
    shortDesc: 'Deploys pylons · Slow-mo laser tripwires',
    stillpointShort: 'Links pylons with lethal beams',
    evolvedShort: 'Triangulates plasma fields between nodes',
    maxLevel: 5
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Cryo Ring',
    evolvedName: 'ABSOLUTE ZERO',
    catalystPassive: 'cryo_core',
    accent: '#7ee8ff',
    shortDesc: 'Chills foes · Slow-mo shatters frozen enemies',
    stillpointShort: 'Shatters chilled foes into ice spikes',
    evolvedShort: 'Deep-freeze shockwaves detonate waves on contact',
    maxLevel: 5
  },
  swarm_missiles: {
    id: 'swarm_missiles',
    name: 'Swarm Missiles',
    evolvedName: 'VALKYRIE SALVO',
    catalystPassive: 'targeting_array',
    accent: '#ff7b47',
    shortDesc: 'Homing rockets · Slow-mo paints lock-on salvo',
    stillpointShort: 'Launches painted missile swarm on resume',
    evolvedShort: 'Continuous curved warhead barrage melts bosses',
    maxLevel: 5
  }
};

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  chrono_capacitor: {
    id: 'chrono_capacitor',
    name: 'Chrono Capacitor',
    pairsWith: 'pulse_lance',
    accent: '#22e6ff',
    shortStat: '+18 Focus · -10% drain',
    maxLevel: 5
  },
  kinetic_thrusters: {
    id: 'kinetic_thrusters',
    name: 'Kinetic Thrusters',
    pairsWith: 'halo_blades',
    accent: '#4effb4',
    shortStat: '+9% Speed · +16% Charge',
    maxLevel: 5
  },
  flux_coil: {
    id: 'flux_coil',
    name: 'Flux Coil',
    pairsWith: 'arc_tether',
    accent: '#6fa8ff',
    shortStat: '+13% Fire rate · -12% Parry CD',
    maxLevel: 5
  },
  aether_lens: {
    id: 'aether_lens',
    name: 'Aether Lens',
    pairsWith: 'prism_drones',
    accent: '#7bf7ff',
    shortStat: '+15% Area & Parry radius',
    maxLevel: 5
  },
  singularity_core: {
    id: 'singularity_core',
    name: 'Singularity Core',
    pairsWith: 'void_mortars',
    accent: '#b97aff',
    shortStat: '+16% DMG · +24% Parry DMG',
    maxLevel: 5
  },
  graze_conduit: {
    id: 'graze_conduit',
    name: 'Graze Conduit',
    pairsWith: 'phase_daggers',
    accent: '#ff66e5',
    shortStat: '+14 Graze · Parry heals HP',
    maxLevel: 5
  },
  momentum_edge: {
    id: 'momentum_edge',
    name: 'Momentum Edge',
    pairsWith: 'chrono_scythe',
    accent: '#ff5c8a',
    shortStat: '+10% Crit · +12% Shot speed',
    maxLevel: 5
  },
  echo_chamber: {
    id: 'echo_chamber',
    name: 'Echo Chamber',
    pairsWith: 'ricochet_shard',
    accent: '#5ce1e6',
    shortStat: '+1 Projectile every 2 lv',
    maxLevel: 5
  },
  reactive_plating: {
    id: 'reactive_plating',
    name: 'Reactive Plating',
    pairsWith: 'nova_pulse',
    accent: '#ff9f43',
    shortStat: '+1 Armor · +12 Shield',
    maxLevel: 5
  },
  overclock_core: {
    id: 'overclock_core',
    name: 'Overclock Core',
    pairsWith: 'rail_turret',
    accent: '#f6c453',
    shortStat: '+18% XP & Shard gain',
    maxLevel: 5
  },
  cryo_core: {
    id: 'cryo_core',
    name: 'Cryo Core',
    pairsWith: 'frost_nova',
    accent: '#7ee8ff',
    shortStat: '+18% DMG vs chilled · Deeper freeze',
    maxLevel: 5
  },
  targeting_array: {
    id: 'targeting_array',
    name: 'Targeting Array',
    pairsWith: 'swarm_missiles',
    accent: '#ff7b47',
    shortStat: '+16% Boss DMG · Stronger homing',
    maxLevel: 5
  }
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];

export function getEligibleEvolutions(player: PlayerState): WeaponId[] {
  const result: WeaponId[] = [];
  for (const w of player.weapons) {
    if (w.evolved || w.level < WEAPONS[w.id].maxLevel) continue;
    const cat = WEAPONS[w.id].catalystPassive;
    if (player.passives.some((p) => p.id === cat)) {
      result.push(w.id);
    }
  }
  return result;
}

export function generateUpgradeChoices(
  player: PlayerState,
  count = 3,
  preferEvolution = false
): UpgradeChoice[] {
  const pool: Array<{ choice: UpgradeChoice; weight: number }> = [];

  const evoIds = getEligibleEvolutions(player);
  for (const wid of evoIds) {
    const def = WEAPONS[wid];
    pool.push({
      weight: preferEvolution ? 120 : 22,
      choice: {
        kind: 'evolution',
        id: `evo:${wid}`,
        title: def.evolvedName,
        line: def.evolvedShort,
        accent: '#f6c453',
        iconKey: wid,
        weaponId: wid
      }
    });
  }

  for (const owned of player.weapons) {
    const def = WEAPONS[owned.id];
    if (owned.level < def.maxLevel) {
      const nextLv = owned.level + 1;
      const hasCatalyst = player.passives.some((p) => p.id === def.catalystPassive);
      pool.push({
        weight: nextLv === def.maxLevel && hasCatalyst ? 10 : 6.5,
        choice: {
          kind: 'weapon',
          id: `w:${owned.id}`,
          title: def.name,
          line: def.shortDesc,
          accent: def.accent,
          iconKey: owned.id,
          level: nextLv,
          maxLevel: def.maxLevel,
          weaponId: owned.id
        }
      });
    }
  }

  if (player.weapons.length < MAX_WEAPON_SLOTS) {
    for (const wid of WEAPON_IDS) {
      if (player.weapons.some((w) => w.id === wid)) continue;
      const def = WEAPONS[wid];
      const matchesPassive = player.passives.some((p) => p.id === def.catalystPassive);
      pool.push({
        weight: matchesPassive ? 7.5 : 4.2,
        choice: {
          kind: 'weapon',
          id: `w:${wid}`,
          title: def.name,
          line: def.shortDesc,
          accent: def.accent,
          iconKey: wid,
          level: 1,
          maxLevel: def.maxLevel,
          isNew: true,
          isSynergy: matchesPassive,
          weaponId: wid
        }
      });
    }
  }

  for (const owned of player.passives) {
    const def = PASSIVES[owned.id];
    if (owned.level < def.maxLevel) {
      pool.push({
        weight: 5,
        choice: {
          kind: 'passive',
          id: `p:${owned.id}`,
          title: def.name,
          line: def.shortStat,
          accent: def.accent,
          iconKey: owned.id,
          level: owned.level + 1,
          maxLevel: def.maxLevel,
          passiveId: owned.id
        }
      });
    }
  }

  if (player.passives.length < MAX_PASSIVE_SLOTS) {
    for (const pid of PASSIVE_IDS) {
      if (player.passives.some((p) => p.id === pid)) continue;
      const def = PASSIVES[pid];
      const matchesWeapon = player.weapons.some((w) => w.id === def.pairsWith);
      pool.push({
        weight: matchesWeapon ? 8.5 : 3.5,
        choice: {
          kind: 'passive',
          id: `p:${pid}`,
          title: def.name,
          line: def.shortStat,
          accent: def.accent,
          iconKey: pid,
          level: 1,
          maxLevel: def.maxLevel,
          isNew: true,
          isSynergy: matchesWeapon,
          passiveId: pid
        }
      });
    }
  }

  // Wildcard Run Relics! Always offered inside Relic Caches (bosses, shrines, treasure haulers) & milestone levels!
  const unownedRelics = RELIC_IDS.filter((rid) => !player.relics.includes(rid));
  if (unownedRelics.length > 0 && (preferEvolution || player.level === 5 || player.level === 10 || player.level === 15)) {
    for (const rid of unownedRelics) {
      const rdef = RELICS[rid];
      pool.push({
        weight: preferEvolution ? 35 : 16,
        choice: {
          kind: 'relic',
          id: `rel:${rid}`,
          title: rdef.name,
          line: rdef.line,
          accent: rdef.accent,
          iconKey: rdef.iconKey,
          relicId: rid
        }
      });
    }
  }

  // Weighted sample without replacement
  const selected: UpgradeChoice[] = [];
  const remaining = [...pool];

  if (preferEvolution && evoIds.length > 0) {
    const evoIndices: number[] = [];
    remaining.forEach((item, idx) => {
      if (item.choice.kind === 'evolution') evoIndices.push(idx);
    });
    if (evoIndices.length > 0) {
      const pick = evoIndices[Math.floor(Math.random() * evoIndices.length)];
      selected.push(remaining.splice(pick, 1)[0].choice);
    }
  } else if (preferEvolution && unownedRelics.length > 0) {
    const relIndices: number[] = [];
    remaining.forEach((item, idx) => {
      if (item.choice.kind === 'relic') relIndices.push(idx);
    });
    if (relIndices.length > 0) {
      const pick = relIndices[Math.floor(Math.random() * relIndices.length)];
      selected.push(remaining.splice(pick, 1)[0].choice);
    }
  }

  while (selected.length < count && remaining.length > 0) {
    const totalW = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalW;
    let pickIdx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll <= 0) {
        pickIdx = i;
        break;
      }
    }
    selected.push(remaining.splice(pickIdx, 1)[0].choice);
  }

  while (selected.length < count) {
    selected.push({
      kind: 'heal',
      id: `overdrive:${selected.length}`,
      title: 'FIELD REPAIR',
      line: '+30% HP · +6% DMG · FULL FOCUS',
      accent: '#68c97a',
      iconKey: 'heal'
    });
  }

  // Starting at Lv.3+, ~38% chance one non-evolution card rolls OVERCLOCKED (+2 LV, real permanent curse!)
  // Forces genuine risk/reward judgment instead of blind button-mashing!
  if (!preferEvolution && player.level >= 3 && Math.random() < 0.42) {
    const candidates = selected.filter(
      (c) => (c.kind === 'weapon' || c.kind === 'passive') && (c.level ?? 1) < (c.maxLevel ?? 5)
    );
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const curseId = DRAFT_CURSE_IDS[Math.floor(Math.random() * DRAFT_CURSE_IDS.length)];
      target.isOverclocked = true;
      target.bonusLevels = 2;
      target.curseId = curseId;
      target.curseLine = DRAFT_CURSES[curseId].label;
      target.level = Math.min(target.maxLevel ?? 5, (target.level ?? 1) + 1);
    }
  }

  return selected;
}
