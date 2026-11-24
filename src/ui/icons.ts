// Bespoke geometric SVG icons (zero generic Unicode symbols).

const PATHS: Record<string, string> = {
  graze_conduit: '<circle cx="12" cy="12" r="8" stroke-dasharray="4 3" /><circle cx="12" cy="12" r="2.5" fill="currentColor" />',
  shard: '<polygon points="12 2 19 12 12 22 5 12" fill="currentColor" fill-opacity="0.22" /><polygon points="12 2 19 12 12 22 5 12" />',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />',
  play: '<polygon points="6 4 20 12 6 20" fill="currentColor" stroke="none" />',
  ships: '<polygon points="12 3 20 19 12 15.5 4 19" />',
  skins: '<circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 12h16" stroke-opacity="0.5" /><circle cx="12" cy="12" r="3" fill="currentColor" />',
  matrix: '<rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" />',
  trophy: '<path d="M7 4h10v6a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 15v5M8 20h8" />',
  gear: '<circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />',
  music: '<path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" />',
  sfx: '<polygon points="4 9 9 9 14 4 14 20 9 15 4 15" /><path d="M17.5 8.5a5 5 0 0 1 0 7" />',
  haptics: '<rect x="7" y="4" width="10" height="16" rx="1.5" /><path d="M3 8v8M21 8v8" />',
  flash: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" />',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />',
  key: '<circle cx="8" cy="12" r="3.8" /><path d="M11.8 12H21M17 12v3.2M20 12v2.4" />',
  check: '<polyline points="4 12 10 18 20 6" />',
  reroll: '<path d="M20 12a8 8 0 1 1-2.3-5.7" /><polyline points="20 4 20 10 14 10" />',
  heal: '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />',
  back: '<polyline points="15 5 8 12 15 19" />',
  chevron: '<polyline points="9 6 15 12 9 18" />',
  skull: '<circle cx="12" cy="10" r="6" /><path d="M9 16v4h6v-4M9.5 10h.5M14 10h.5" />',
  timer: '<circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 15 15" /><line x1="9" y1="2" x2="15" y2="2" />',
  info: '<circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16.5" /><line x1="12" y1="7.4" x2="12" y2="7.7" />',
  dispatch: '<rect x="4" y="3" width="16" height="18" rx="1" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12.5" y2="16" />',
  radar: '<circle cx="12" cy="12" r="8" stroke-opacity="0.45" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="12" x2="18" y2="6" />'
};

export function svgIcon(key: string, size = 18, color = 'currentColor'): string {
  const body = PATHS[key] ?? PATHS.shard;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${body}</svg>`;
}
