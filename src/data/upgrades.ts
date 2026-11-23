import {
  PassiveDef,
  PassiveId,
  PlayerState,
  UpgradeChoice,
  WeaponDef,
  WeaponId
} from '../types';

export const MAX_WEAPON_SLOTS = 4;
export const MAX_PASSIVE_SLOTS = 4;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pulse_lance: {
    id: 'pulse_lance',
    name: 'Pulse Lance',
    evolvedName: 'SINGULARITY RAIL',
    catalystPassive: 'chrono_capacitor',
    accent: '#22e6ff',
    icon: '◈',
    normalDesc: 'Rapid cyan bolts track the closest threats.',
    stillpointDesc: 'Overcharges into a piercing Chrono Railbeam.',
    evolvedDesc: 'Twin hyper-piercing beams that tear unstable gravity rifts across the void.',
    maxLevel: 5
  },
  halo_blades: {
    id: 'halo_blades',
    name: 'Halo Sawblades',
    evolvedName: 'ECLIPSE GYRO',
    catalystPassive: 'kinetic_thrusters',
    accent: '#4effb4',
    icon: '◎',
    normalDesc: 'Orbiting plasma rings slice nearby swarms.',
    stillpointDesc: 'Expands into a razor Aegis Barrier that shreds enemy bullets.',
    evolvedDesc: 'Dual counter-rotating solar rings that flare into wide cleave arcs on parry.',
    maxLevel: 5
  },
  arc_tether: {
    id: 'arc_tether',
    name: 'Arc Tether',
    evolvedName: 'TESLA LATTICE',
    catalystPassive: 'flux_coil',
    accent: '#6fa8ff',
    icon: '⚡',
    normalDesc: 'Chains bioluminescent lightning through clustered foes.',
    stillpointDesc: 'Locks arcs into sustained high-voltage beams that zap nearby bullets.',
    evolvedDesc: 'Crackling storm web that arcs automatically from every parried shard.',
    maxLevel: 5
  },
  prism_drones: {
    id: 'prism_drones',
    name: 'Prism Drones',
    evolvedName: 'SERAPHIM ARRAY',
    catalystPassive: 'aether_lens',
    accent: '#7bf7ff',
    icon: '△',
    normalDesc: 'Autonomous crystal drones circle and volley nearby enemies.',
    stillpointDesc: 'Converges into a Prism Focus firing tri-split beams & extra parry shards.',
    evolvedDesc: 'Six harmonic drones unleash continuous prism lances and restore shield energy.',
    maxLevel: 5
  },
  void_mortars: {
    id: 'void_mortars',
    name: 'Void Mortars',
    evolvedName: 'EVENT HORIZON',
    catalystPassive: 'singularity_core',
    accent: '#b97aff',
    icon: '◉',
    normalDesc: 'Lobs plasma shells leaving burning neon blast craters.',
    stillpointDesc: 'Collapses active craters into gravity wells that pull foes & detonate on resume.',
    evolvedDesc: 'Persistent mini black holes crush waves and transmute trapped bullets into XP.',
    maxLevel: 5
  },
  phase_daggers: {
    id: 'phase_daggers',
    name: 'Phase Daggers',
    evolvedName: 'PHANTOM BARRAGE',
    catalystPassive: 'graze_conduit',
    accent: '#ff66e5',
    icon: '❖',
    normalDesc: 'Leaves suspended razor knives along your movement trail.',
    stillpointDesc: 'Recalls every planted dagger simultaneously into homing boss-seekers.',
    evolvedDesc: 'Grazing bullets spawns extra Phantom Daggers that execute weakened targets.',
    maxLevel: 5
  }
};

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  chrono_capacitor: {
    id: 'chrono_capacitor',
    name: 'Chrono Capacitor',
    pairsWith: 'pulse_lance',
    accent: '#22e6ff',
    icon: '⧗',
    desc: 'Expands Kinetic Charge capacity and slows Stillpoint drain.',
    perLevelLabel: '+18 Max Charge · -10% Drain',
    maxLevel: 5
  },
  kinetic_thrusters: {
    id: 'kinetic_thrusters',
    name: 'Kinetic Thrusters',
    pairsWith: 'halo_blades',
    accent: '#4effb4',
    icon: '»',
    desc: 'Boosts thrust speed and Kinetic Charge generation while weaving.',
    perLevelLabel: '+9% Move Speed · +16% Charge Rate',
    maxLevel: 5
  },
  flux_coil: {
    id: 'flux_coil',
    name: 'Flux Coil',
    pairsWith: 'arc_tether',
    accent: '#6fa8ff',
    icon: '∿',
    desc: 'Accelerates all weapon cycles and refreshes Parry Shockwave faster.',
    perLevelLabel: '+13% Fire Rate · -12% Parry CD',
    maxLevel: 5
  },
  aether_lens: {
    id: 'aether_lens',
    name: 'Aether Lens',
    pairsWith: 'prism_drones',
    accent: '#7bf7ff',
    icon: '◇',
    desc: 'Widens weapon blast zones, beam thickness, and Parry Shockwave reach.',
    perLevelLabel: '+15% Area & Parry Radius',
    maxLevel: 5
  },
  singularity_core: {
    id: 'singularity_core',
    name: 'Singularity Core',
    pairsWith: 'void_mortars',
    accent: '#b97aff',
    icon: '✦',
    desc: 'Amplifies all weapon output and reflected Parry Shard damage.',
    perLevelLabel: '+16% Damage · +24% Parry Shard DMG',
    maxLevel: 5
  },
  graze_conduit: {
    id: 'graze_conduit',
    name: 'Graze Conduit',
    pairsWith: 'phase_daggers',
    accent: '#ff66e5',
    icon: '◌',
    desc: 'Expands Graze halo, XP pull range, and restores HP on multi-parries.',
    perLevelLabel: '+14px Graze · +22% Magnet · Parry Heal',
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

  // 1. Catalyst Evolutions first!
  const evoIds = getEligibleEvolutions(player);
  for (const wid of evoIds) {
    const def = WEAPONS[wid];
    const pDef = PASSIVES[def.catalystPassive];
    pool.push({
      weight: preferEvolution ? 100 : 18,
      choice: {
        kind: 'evolution',
        id: `evo:${wid}`,
        title: def.evolvedName,
        subtitle: def.evolvedDesc,
        accent: '#ffd166',
        icon: def.icon,
        badge: `CATALYST · ${def.name.toUpperCase()} + ${pDef.name.toUpperCase()}`,
        weaponId: wid
      }
    });
  }

  // 2. Existing weapons that can level up
  for (const owned of player.weapons) {
    const def = WEAPONS[owned.id];
    if (owned.level < def.maxLevel) {
      const nextLv = owned.level + 1;
      const hasCatalyst = player.passives.some((p) => p.id === def.catalystPassive);
      pool.push({
        weight: nextLv === def.maxLevel && hasCatalyst ? 9 : 6,
        choice: {
          kind: 'weapon',
          id: `w:${owned.id}`,
          title: def.name,
          subtitle: `Upgrade to Lv.${nextLv} — higher output, tighter Stillpoint burst.`,
          accent: def.accent,
          icon: def.icon,
          badge: `WEAPON LV.${nextLv}`,
          normalNote: def.normalDesc,
          stillpointNote: def.stillpointDesc,
          nextLevel: nextLv,
          weaponId: owned.id
        }
      });
    }
  }

  // 3. New weapons if slots open
  if (player.weapons.length < MAX_WEAPON_SLOTS) {
    for (const wid of WEAPON_IDS) {
      if (player.weapons.some((w) => w.id === wid)) continue;
      const def = WEAPONS[wid];
      const matchesOwnedPassive = player.passives.some((p) => p.id === def.catalystPassive);
      pool.push({
        weight: matchesOwnedPassive ? 7 : 4.5,
        choice: {
          kind: 'weapon',
          id: `w:${wid}`,
          title: def.name,
          subtitle: `Pairs with ${PASSIVES[def.catalystPassive].name} → ${def.evolvedName}`,
          accent: def.accent,
          icon: def.icon,
          badge: 'NEW WEAPON',
          normalNote: def.normalDesc,
          stillpointNote: def.stillpointDesc,
          nextLevel: 1,
          weaponId: wid
        }
      });
    }
  }

  // 4. Existing passives
  for (const owned of player.passives) {
    const def = PASSIVES[owned.id];
    if (owned.level < def.maxLevel) {
      const nextLv = owned.level + 1;
      pool.push({
        weight: 5,
        choice: {
          kind: 'passive',
          id: `p:${owned.id}`,
          title: def.name,
          subtitle: `${def.perLevelLabel} · Catalyst for ${WEAPONS[def.pairsWith].name}`,
          accent: def.accent,
          icon: def.icon,
          badge: `MODULE LV.${nextLv}`,
          nextLevel: nextLv,
          passiveId: owned.id
        }
      });
    }
  }

  // 5. New passives if slots open
  if (player.passives.length < MAX_PASSIVE_SLOTS) {
    for (const pid of PASSIVE_IDS) {
      if (player.passives.some((p) => p.id === pid)) continue;
      const def = PASSIVES[pid];
      const matchesWeapon = player.weapons.some((w) => w.id === def.pairsWith);
      pool.push({
        weight: matchesWeapon ? 7.5 : 4,
        choice: {
          kind: 'passive',
          id: `p:${pid}`,
          title: def.name,
          subtitle: `${def.perLevelLabel} · Evolves ${WEAPONS[def.pairsWith].name}`,
          accent: def.accent,
          icon: def.icon,
          badge: matchesWeapon ? 'SYNERGY MODULE' : 'NEW MODULE',
          nextLevel: 1,
          passiveId: pid
        }
      });
    }
  }

  // Weighted sample without replacement
  const selected: UpgradeChoice[] = [];
  const remaining = [...pool];

  // If boss chest prefers evolution, guarantee one evolution at index 0
  if (preferEvolution && evoIds.length > 0) {
    const evoIdx = remaining.findIndex((item) => item.choice.kind === 'evolution');
    if (evoIdx >= 0) {
      selected.push(remaining.splice(evoIdx, 1)[0].choice);
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

  // Fallback overdrive heal if everything is maxed!
  while (selected.length < count) {
    selected.push({
      kind: 'heal',
      id: `overdrive:${selected.length}`,
      title: 'Overclock Surge',
      subtitle: 'Restore +35% Hull, refill Kinetic Charge, and permanently boost Damage +6%.',
      accent: '#4effb4',
      icon: '✚',
      badge: 'LIMIT BREAK'
    });
  }

  return selected;
}
