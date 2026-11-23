import { PassiveId, SectorId, SkinId, VesselId, WeaponId } from '../types';

export type RarityTier = 'common' | 'good' | 'rare' | 'epic' | 'gold' | 'mythic';

export function rarityForLevel(level: number, evolved = false): RarityTier {
  if (evolved) return 'mythic';
  if (level >= 5) return 'gold';
  if (level === 4) return 'epic';
  if (level === 3) return 'rare';
  if (level === 2) return 'good';
  return 'common';
}

export function rarityForVessel(id: VesselId): RarityTier {
  switch (id) {
    case 'vesper': return 'rare';
    case 'aegis': return 'good';
    case 'phantom': return 'epic';
    case 'volt': return 'epic';
    case 'nova': return 'gold';
    case 'seraph': return 'mythic';
  }
}

export function rarityForSkin(id: SkinId): RarityTier {
  switch (id) {
    case 'cyanide': return 'common';
    case 'ronin': return 'good';
    case 'gilded': return 'rare';
    case 'sakura': return 'rare';
    case 'venom': return 'rare';
    case 'monolith': return 'epic';
    case 'ultraviolet': return 'epic';
    case 'ink': return 'gold';
    case 'eclipse': return 'gold';
    case 'prismatic': return 'mythic';
  }
}

const WEAPON_ICON_URL: Record<WeaponId, string> = {
  pulse_lance: './art/icon_pulse_lance.png',
  halo_blades: './art/icon_halo_blades.png',
  arc_tether: './art/icon_arc_tether.png',
  prism_drones: './art/icon_prism_drones.png',
  void_mortars: './art/icon_void_mortars.png',
  phase_daggers: './art/icon_phase_daggers.png',
  chrono_scythe: './art/icon_chrono_scythe.png',
  ricochet_shard: './art/icon_ricochet_shard.png',
  nova_pulse: './art/icon_nova_pulse.png',
  rail_turret: './art/icon_rail_turret.png'
};

// Map passives to crisp rendered art icons with subtle hue styling
const PASSIVE_ICON_MAP: Record<PassiveId, { src: string; filter?: string }> = {
  chrono_capacitor: { src: './art/icon_shard.png', filter: 'hue-rotate(-10deg)' },
  kinetic_thrusters: { src: './art/icon_nova_pulse.png', filter: 'hue-rotate(85deg)' },
  flux_coil: { src: './art/icon_arc_tether.png' },
  aether_lens: { src: './art/icon_prism_drones.png' },
  singularity_core: { src: './art/icon_void_mortars.png' },
  graze_conduit: { src: './art/icon_phase_daggers.png' },
  momentum_edge: { src: './art/icon_ricochet_shard.png', filter: 'hue-rotate(135deg)' },
  echo_chamber: { src: './art/icon_ricochet_shard.png' },
  reactive_plating: { src: './art/icon_shield.png' },
  overclock_core: { src: './art/icon_shard.png', filter: 'hue-rotate(155deg) saturate(1.5) brightness(1.15)' }
};

export function artIconImg(key: string, size = 32): string {
  if (key in WEAPON_ICON_URL) {
    const src = WEAPON_ICON_URL[key as WeaponId];
    return `<img src="${src}" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key in PASSIVE_ICON_MAP) {
    const p = PASSIVE_ICON_MAP[key as PassiveId];
    const st = p.filter ? `style="filter:${p.filter}"` : '';
    return `<img src="${p.src}" width="${size}" height="${size}" class="art-img" ${st} alt="" draggable="false" />`;
  }
  if (key === 'shard') {
    return `<img src="./art/icon_shard.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key === 'heal' || key === 'shield') {
    return `<img src="./art/icon_shield.png" width="${size}" height="${size}" class="art-img" style="filter:hue-rotate(75deg)" alt="" draggable="false" />`;
  }
  return `<img src="./art/icon_shard.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
}

export function shipArtUrl(id: VesselId): string {
  return `./art/ship_${id}.png`;
}

export function sectorBannerUrl(id: SectorId): string {
  return `./art/sector_${id}.jpg`;
}

export function bossArtForSector(id: SectorId): string {
  switch (id) {
    case 'drift': return './art/boss_weaver.png';
    case 'helix': return './art/boss_seraph.png';
    case 'furnace': return './art/boss_archon.png';
    case 'singularity': return './art/boss_leviathan.png';
  }
}

export function skinCssFilter(skinId: SkinId): string {
  switch (skinId) {
    case 'cyanide': return 'none';
    case 'ronin': return 'sepia(0.55) hue-rotate(-38deg) saturate(1.9) brightness(1.06)';
    case 'gilded': return 'sepia(0.75) hue-rotate(8deg) saturate(1.7) contrast(1.08)';
    case 'sakura': return 'sepia(0.65) hue-rotate(15deg) saturate(2.1) contrast(1.1)';
    case 'venom': return 'sepia(0.5) hue-rotate(68deg) saturate(1.85)';
    case 'monolith': return 'hue-rotate(15deg) saturate(1.2) brightness(1.22)';
    case 'ultraviolet': return 'hue-rotate(95deg) saturate(1.85)';
    case 'ink': return 'grayscale(1) contrast(1.22) brightness(1.05)';
    case 'eclipse': return 'sepia(0.8) hue-rotate(-24deg) saturate(2.3) contrast(1.16) brightness(0.92)';
    case 'prismatic': return 'saturate(1.6) brightness(1.15)';
  }
}
