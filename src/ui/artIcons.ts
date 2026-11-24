import { CoreId, PassiveId, RelicId, SectorId, SkinId, VesselId, WeaponId } from '../types';

export type RarityTier = 'common' | 'good' | 'rare' | 'epic' | 'gold' | 'mythic';

export function rarityForCore(id: CoreId): RarityTier {
  switch (id) {
    case 'deflector': return 'rare';
    case 'blink': return 'epic';
    case 'aegis_dome': return 'rare';
    case 'siphon': return 'gold';
    case 'chrono_echo': return 'good';
    case 'overclock': return 'gold';
    case 'singularity_lance': return 'epic';
    case 'berserk': return 'mythic';
    case 'catalyst_surge': return 'mythic';
  }
}

const CORE_ICON_URL: Record<CoreId, string> = {
  deflector: './art/icon_core.png',
  blink: './art/icon_core_blink.png',
  aegis_dome: './art/icon_core_aegis_dome.png',
  siphon: './art/icon_core_siphon.png',
  chrono_echo: './art/icon_core_chrono_echo.png',
  overclock: './art/icon_core_overclock.png',
  singularity_lance: './art/icon_core_singularity_lance.png',
  berserk: './art/icon_core_berserk.png',
  catalyst_surge: './art/icon_core_catalyst_surge.png'
};

export function coreIconImg(id: CoreId, size = 28): string {
  return `<img src="${CORE_ICON_URL[id]}" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
}

export function crateArtUrl(kind: 'standard' | 'relic'): string {
  return kind === 'relic' ? './art/crate_classified.png' : './art/crate_salvage.png';
}

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
    case 'reaper': return 'good';
    case 'prism': return 'good';
    case 'phantom': return 'epic';
    case 'volt': return 'epic';
    case 'pyre': return 'epic';
    case 'bastion': return 'epic';
    case 'nova': return 'gold';
    case 'glacier': return 'gold';
    case 'seraph': return 'mythic';
    case 'valkyrie': return 'mythic';
  }
}

export function rarityForWeapon(id: WeaponId): RarityTier {
  switch (id) {
    case 'pulse_lance': return 'rare';
    case 'halo_blades':
    case 'arc_tether':
    case 'ricochet_shard':
    case 'chrono_scythe':
      return 'good';
    case 'nova_pulse':
    case 'phase_daggers':
    case 'frost_nova':
    case 'acid_sprayer':
    case 'shatter_mine':
      return 'rare';
    case 'prism_drones':
    case 'rail_turret':
    case 'grav_flail':
      return 'epic';
    case 'void_mortars':
    case 'swarm_missiles':
      return 'gold';
    case 'mirror_beam':
      return 'mythic';
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

const WEAPON_ICON_URL: Record<WeaponId, { src: string; filter?: string }> = {
  pulse_lance: { src: './art/icon_pulse_lance.png' },
  halo_blades: { src: './art/icon_halo_blades.png' },
  arc_tether: { src: './art/icon_arc_tether.png' },
  prism_drones: { src: './art/icon_prism_drones.png' },
  void_mortars: { src: './art/icon_void_mortars.png' },
  phase_daggers: { src: './art/icon_phase_daggers.png' },
  chrono_scythe: { src: './art/icon_chrono_scythe.png' },
  ricochet_shard: { src: './art/icon_ricochet_shard.png' },
  nova_pulse: { src: './art/icon_nova_pulse.png' },
  rail_turret: { src: './art/icon_rail_turret.png' },
  frost_nova: { src: './art/icon_frost_nova.png' },
  swarm_missiles: { src: './art/icon_swarm_missiles.png' },
  grav_flail: { src: './art/icon_grav_flail.png' },
  acid_sprayer: { src: './art/icon_acid_sprayer.png' },
  mirror_beam: { src: './art/icon_mirror_beam.png' },
  shatter_mine: { src: './art/icon_shatter_mine.png' }
};

interface PassiveSealDef {
  numeral: string;
  accent: string;
  motif: string;
}

const PASSIVE_SEALS: Record<PassiveId, PassiveSealDef> = {
  chrono_capacitor: {
    numeral: 'I',
    accent: '#4cb5ab',
    motif: '<path d="M18 9h12M18 39h12" stroke-opacity="0.55" />'
  },
  kinetic_thrusters: {
    numeral: 'II',
    accent: '#68c97a',
    motif: '<polyline points="17 11 24 7 31 11" stroke-opacity="0.6" /><polyline points="17 37 24 41 31 37" stroke-opacity="0.6" />'
  },
  flux_coil: {
    numeral: 'III',
    accent: '#6fa8ff',
    motif: '<path d="M15 10h18M15 38h18" stroke-dasharray="3 2" stroke-opacity="0.6" />'
  },
  aether_lens: {
    numeral: 'IV',
    accent: '#7bf7ff',
    motif: '<polygon points="24 6 42 24 24 42 6 24" stroke-opacity="0.24" />'
  },
  singularity_core: {
    numeral: 'V',
    accent: '#b97aff',
    motif: '<circle cx="24" cy="24" r="16" stroke-dasharray="4 3" stroke-opacity="0.34" />'
  },
  graze_conduit: {
    numeral: 'VI',
    accent: '#e06b9e',
    motif: '<circle cx="24" cy="24" r="17" stroke-opacity="0.28" /><circle cx="24" cy="8" r="1.4" fill="currentColor" stroke="none" /><circle cx="24" cy="40" r="1.4" fill="currentColor" stroke="none" />'
  },
  momentum_edge: {
    numeral: 'VII',
    accent: '#e05872',
    motif: '<path d="M12 10l5-3h14l5 3M12 38l5 3h14l5-3" stroke-opacity="0.5" />'
  },
  echo_chamber: {
    numeral: 'VIII',
    accent: '#5ce1e6',
    motif: '<path d="M10 17v14M38 17v14" stroke-opacity="0.45" />'
  },
  reactive_plating: {
    numeral: 'IX',
    accent: '#e08538',
    motif: '<polygon points="24 6 38 11 38 26 24 42 10 26 10 11" stroke-opacity="0.28" />'
  },
  overclock_core: {
    numeral: 'X',
    accent: '#e5b34c',
    motif: '<path d="M14 9h20M14 39h20M9 24h3M36 24h3" stroke-opacity="0.55" />'
  },
  cryo_core: {
    numeral: 'XI',
    accent: '#7ee8ff',
    motif: '<path d="M24 6v5M24 37v5M6 24h5M37 24h5" stroke-opacity="0.55" />'
  },
  targeting_array: {
    numeral: 'XII',
    accent: '#e06d42',
    motif: '<path d="M11 11h5v5M37 11h-5v5M11 37h5v-5M37 37h-5v-5" stroke-opacity="0.48" />'
  },
  heavy_frame: {
    numeral: 'XIII',
    accent: '#c9884a',
    motif: '<rect x="8" y="8" width="32" height="32" stroke-opacity="0.26" />'
  },
  corrosive_vat: {
    numeral: 'XIV',
    accent: '#78d65c',
    motif: '<path d="M14 10h20M14 38h20" stroke-opacity="0.55" /><circle cx="14" cy="10" r="1.4" fill="currentColor" stroke="none" /><circle cx="34" cy="38" r="1.4" fill="currentColor" stroke="none" />'
  },
  optic_relay: {
    numeral: 'XV',
    accent: '#f0bc42',
    motif: '<path d="M10 24l14-16 14 16-14 16z" stroke-opacity="0.28" />'
  },
  blast_capacitor: {
    numeral: 'XVI',
    accent: '#d9533c',
    motif: '<path d="M11 11l4 4M37 11l-4 4M11 37l4-4M37 37l-4-4" stroke-opacity="0.58" />'
  }
};

export function passiveNumeral(id: PassiveId): string {
  return PASSIVE_SEALS[id].numeral;
}

export function passiveBadgeSvg(id: PassiveId, size = 32): string {
  const s = PASSIVE_SEALS[id];
  const len = s.numeral.length;
  const fontSize = len === 1 ? 22 : len === 2 ? 19 : len === 3 ? 15.5 : 13;
  const letterSpacing = len >= 3 ? '-0.6' : '0.4';
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" class="art-img passive-seal-svg" aria-hidden="true">
    <polygon points="14,2 34,2 46,14 46,34 34,46 14,46 2,34 2,14" fill="#171512" stroke="${s.accent}" stroke-width="2.2" />
    <polygon points="15.5,5 32.5,5 43,15.5 43,32.5 32.5,43 15.5,43 5,32.5 5,15.5" fill="#1f1c18" stroke="rgba(236,227,211,0.18)" stroke-width="1" />
    <g fill="none" stroke="${s.accent}" stroke-width="1.5" stroke-linecap="square" style="color:${s.accent}">
      ${s.motif}
    </g>
    <circle cx="15" cy="6.5" r="1.1" fill="rgba(223,164,54,0.65)" />
    <circle cx="33" cy="6.5" r="1.1" fill="rgba(223,164,54,0.65)" />
    <circle cx="15" cy="41.5" r="1.1" fill="rgba(223,164,54,0.65)" />
    <circle cx="33" cy="41.5" r="1.1" fill="rgba(223,164,54,0.65)" />
    <text x="24" y="23.5" text-anchor="middle" dominant-baseline="central" fill="#f3ead8" font-family="Georgia, 'Times New Roman', serif" font-weight="900" font-size="${fontSize}" letter-spacing="${letterSpacing}">${s.numeral}</text>
    <line x1="15" y1="35.5" x2="33" y2="35.5" stroke="${s.accent}" stroke-width="1.6" stroke-opacity="0.85" />
  </svg>`;
}

const RELIC_SIGILS: Record<RelicId, { accent: string; glyph: string }> = {
  glass_prism: { accent: '#52b8c9', glyph: '<polygon points="24,11 35,33 13,33" /><line x1="24" y1="11" x2="24" y2="33" />' },
  volatile_shrapnel: { accent: '#e0632b', glyph: '<polygon points="24,10 27,20 37,24 27,28 24,38 21,28 11,24 21,20" />' },
  time_bank: { accent: '#e2a93b', glyph: '<path d="M16 13h16M16 35h16M17 13l7 11-7 11M31 13l-7 11 7 11" />' },
  blood_engine: { accent: '#d94842', glyph: '<path d="M24 11C29 19 33 23 33 28a9 9 0 0 1-18 0c0-5 4-9 9-17z" />' },
  chain_parry: { accent: '#4cb5ab', glyph: '<polyline points="26,11 16,25 24,25 22,37 32,23 24,23 26,11" />' },
  ghost_step: { accent: '#a974e8', glyph: '<path d="M13 31c4-12 8-12 11 0s7 12 11 0" /><circle cx="35" cy="17" r="2.5" fill="currentColor" stroke="none" />' },
  executioner: { accent: '#e2b24a', glyph: '<line x1="14" y1="34" x2="34" y2="14" /><polyline points="25,14 34,14 34,23" /><line x1="17" y1="24" x2="24" y2="31" />' },
  bullet_alchemy: { accent: '#d6689e', glyph: '<polygon points="24,11 33,24 24,37 15,24" /><circle cx="24" cy="24" r="3" />' },
  orbital_overdrive: { accent: '#68c97a', glyph: '<circle cx="24" cy="24" r="10" /><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" /><circle cx="34" cy="24" r="2.2" fill="currentColor" stroke="none" />' },
  last_stand: { accent: '#82c4e8', glyph: '<path d="M24 11l11 4.5v8.5c0 6-4.5 10.5-11 13-6.5-2.5-11-7-11-13v-8.5z" /><line x1="24" y1="18" x2="24" y2="30" /><line x1="18" y1="24" x2="30" y2="24" />' },
  double_tap: { accent: '#e08538', glyph: '<polygon points="18,13 22,22 18,35 14,22" /><polygon points="30,13 34,22 30,35 26,22" />' },
  magnetic_storm: { accent: '#6a9be8', glyph: '<path d="M16 14v11a8 8 0 0 0 16 0V14" /><line x1="14" y1="14" x2="19" y2="14" /><line x1="29" y1="14" x2="34" y2="14" />' },
  echo_salvo: { accent: '#5ce1e6', glyph: '<path d="M14 24a10 10 0 0 1 10-10M19 24a5 5 0 0 1 5-5M34 24a10 10 0 0 1-10 10M29 24a5 5 0 0 1-5 5" /><circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />' },
  chrono_leech: { accent: '#4cb5ab', glyph: '<circle cx="24" cy="24" r="11" /><polyline points="24,17 24,24 30,27" /><line x1="20" y1="10" x2="28" y2="10" />' },
  overcharge_shield: { accent: '#62a4f5', glyph: '<polygon points="24,11 35,17 35,31 24,37 13,31 13,17" /><polyline points="25,17 20,24 25,24 23,31" />' },
  volatile_xp: { accent: '#e2a93b', glyph: '<polygon points="24,12 31,20 28,34 20,34 17,20" /><line x1="24" y1="12" x2="24" y2="34" />' },
  berserk_heart: { accent: '#d94842', glyph: '<polyline points="11,25 17,25 21,15 26,33 30,22 37,22" />' },
  ricochet_aura: { accent: '#7bf7ff', glyph: '<polyline points="13,32 22,16 28,28 35,15" /><polyline points="30,15 35,15 35,20" />' },
  frost_shatter_relic: { accent: '#7ee8ff', glyph: '<line x1="24" y1="11" x2="24" y2="37" /><line x1="13" y1="17" x2="35" y2="31" /><line x1="35" y1="17" x2="13" y2="31" />' },
  golden_greed: { accent: '#f0bc42', glyph: '<polyline points="13,31 16,17 24,23 32,17 35,31" /><line x1="13" y1="34" x2="35" y2="34" />' }
};

export function relicBadgeSvg(id: RelicId, size = 32): string {
  const r = RELIC_SIGILS[id];
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" class="art-img relic-seal-svg" aria-hidden="true">
    <polygon points="24,2 46,24 24,46 2,24" fill="#1d170d" stroke="#e2a93b" stroke-width="2.1" />
    <polygon points="24,6 42,24 24,42 6,24" fill="#271e10" stroke="rgba(226,169,59,0.34)" stroke-width="1" />
    <g fill="none" stroke="${r.accent}" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter" style="color:${r.accent}">
      ${r.glyph}
    </g>
  </svg>`;
}

export function relicGenericSvg(size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" class="art-img" aria-hidden="true">
    <polygon points="24,3 45,24 24,45 3,24" fill="#221a0e" stroke="#e2a93b" stroke-width="2.6" />
    <polygon points="24,13 35,24 24,35 13,24" fill="#e2a93b" fill-opacity="0.28" stroke="#f5d27a" stroke-width="2" />
  </svg>`;
}

export function artIconImg(key: string, size = 32): string {
  if (key === 'core') {
    return `<img src="./art/icon_core.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key in CORE_ICON_URL) {
    return coreIconImg(key as CoreId, size);
  }
  if (key in WEAPON_ICON_URL) {
    const w = WEAPON_ICON_URL[key as WeaponId];
    const st = w.filter ? `style="filter:${w.filter}"` : '';
    return `<img src="${w.src}" width="${size}" height="${size}" class="art-img" ${st} alt="" draggable="false" />`;
  }
  if (key in PASSIVE_SEALS) {
    return passiveBadgeSvg(key as PassiveId, size);
  }
  if (key in RELIC_SIGILS) {
    return relicBadgeSvg(key as RelicId, size);
  }
  if (key === 'shard') {
    return `<img src="./art/icon_shard.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key === 'heal') {
    return `<img src="./art/pickup_medkit.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key === 'magnet') {
    return `<img src="./art/pickup_magnet.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
  }
  if (key === 'shield') {
    return `<img src="./art/icon_shield.png" width="${size}" height="${size}" class="art-img" alt="" draggable="false" />`;
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
