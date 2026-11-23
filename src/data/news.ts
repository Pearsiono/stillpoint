import { MetaSave } from '../types';

export interface NewsEntry {
  id: string;
  date: string;
  kind: 'announcement' | 'patch';
  version?: string;
  title: string;
  summary: string;
  bullets: string[];
}

const LIVE_NEWS_URL = 'https://pearsiono.github.io/stillpoint/news.json';

export const BUNDLED_NEWS: NewsEntry[] = [
  {
    id: 'dev_1_0_roadmap',
    date: '2026-11-23',
    kind: 'announcement',
    title: 'Welcome to STILLPOINT 1.0 & Road to 1.1',
    summary:
      'STILLPOINT is launching free on iPhone with zero forced ads. Here is what is coming next in our first major post-launch update.',
    bullets: [
      '3 Wasteland Factions with weekly shared kill objectives and faction emblem rewards.',
      'Weekly Developer 1-of-1 Vault Auctions where veterans bid Shards on handcrafted unique coatings.',
      'Player Skin Marketplace built on server-verified accounts so rare pattern seeds and low-float FN drops can be traded for Shards.',
      'Weekly Seeded Challenge Runs with exclusive serialized leaderboard trophies.'
    ]
  },
  {
    id: 'patch_1_0_0',
    date: '2026-11-23',
    kind: 'patch',
    version: '1.0.0',
    title: 'v1.0.0 Launch Release',
    summary:
      'Full 1.0 release featuring Brink Shockwave and Bullet Pressure slow-mo risk/reward, painted Metal-Slug combat hardware and arcade FX, Direct Drag controls, and per-sector synth soundtracks.',
    bullets: [
      'Brink Shockwave & Bullet Pressure: enter Stillpoint right as a shot scrapes your hull to trigger an electric pushback shockwave and Focus refund; hold inside live bullet curtains to build Overpressure, or suffer a Reactor Stall if Focus bottoms out at 0%.',
      'Added Brink Capacitor and Pressure Vent Pick-10 Loadout modules.',
      'Full Combat Visual Overhaul: painted industrial sprites for every deployed turret, drone, sawblade, flail, mine, missile, mortar, kunai, scythe, and pickup, plus inked arcade bullets, multi-layered lasers, and chunky fireball explosions.',
      'Added Direct 1:1 Drag alongside Floating Stick, Pause Build Inspector with Evolution hints, and Run-End Damage Breakdown bars.',
      'Composed 4 distinct synth soundtracks for Ash Flats, Sunken Metro, Slag Foundry, and The Monolith.',
      'Added optional Armory Scanner Boost (+50% crate odds for 3 runs, max 2/day), iCloud save sync, and Game Center leaderboards.'
    ]
  }
];

let cachedEntries: NewsEntry[] = [...BUNDLED_NEWS];
let fetchStarted = false;

function isValidEntry(raw: unknown): raw is NewsEntry {
  if (!raw || typeof raw !== 'object') return false;
  const e = raw as Partial<NewsEntry>;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.date === 'string' &&
    (e.kind === 'announcement' || e.kind === 'patch') &&
    typeof e.title === 'string' &&
    typeof e.summary === 'string' &&
    Array.isArray(e.bullets) &&
    e.bullets.every((b) => typeof b === 'string')
  );
}

export function getNewsEntries(): NewsEntry[] {
  return cachedEntries;
}

export function getLatestNewsId(): string {
  return cachedEntries[0]?.id ?? '';
}

export function hasUnreadNews(save: MetaSave): boolean {
  const latest = getLatestNewsId();
  return Boolean(latest && save.lastSeenNewsId !== latest);
}

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fetchLiveNews(onUpdated?: () => void): void {
  if (fetchStarted || typeof fetch !== 'function') return;
  fetchStarted = true;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = window.setTimeout(() => ctrl?.abort(), 4500);

  fetch(`${LIVE_NEWS_URL}?t=${Math.floor(Date.now() / 600000)}`, {
    signal: ctrl?.signal,
    cache: 'no-store'
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray((data as { entries?: unknown }).entries)
          ? (data as { entries: unknown[] }).entries
          : null;
      if (!list) return;
      const valid = list.filter(isValidEntry);
      if (valid.length === 0) return;

      const byId = new Map<string, NewsEntry>();
      for (const item of valid) byId.set(item.id, item);
      for (const fallback of BUNDLED_NEWS) {
        if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
      }
      cachedEntries = Array.from(byId.values());
      onUpdated?.();
    })
    .catch(() => {
      // Offline or GitHub Pages not yet enabled: silently use bundled notes
    })
    .finally(() => {
      window.clearTimeout(timer);
    });
}
