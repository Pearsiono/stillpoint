import { sound } from '../audio';
import { bridge } from '../bridge';
import { CORE_ORDER, CORES, HEAT_MODS, HEAT_ORDER, RELICS } from '../data/builds';
import {
  AURA_RARITY,
  CRATE_KEY_COST,
  FINISHES,
  getCoatingScrapValue,
  getWearGrade,
  PARRY_FX,
  PARRY_FX_ORDER,
  RARITY_META,
  RARITY_NEXT,
  rollCrateDrop,
  SHIP_RARITY,
  TRAIL_ORDER,
  TRAIL_RARITY,
  TRAILS
} from '../data/finishes';
import {
  BASE_LOADOUT_POINTS,
  getActiveLoadout,
  getLoadoutBudget,
  MODULE_CATEGORIES,
  MODULE_ORDER,
  MODULES
} from '../data/loadout';
import {
  applyCrateDrop,
  buyCrateKey,
  clearActivePreset,
  equipCoating,
  executeTradeUp,
  getEquippedCoating,
  MILESTONES,
  persistMetaSave,
  scrapCoating,
  selectLoadoutPreset,
  toggleLoadoutModule,
  unlockLoadoutModule
} from '../data/meta';
import { SECTOR_ORDER, SECTORS } from '../data/sectors';
import { VESSEL_ORDER, VESSELS } from '../data/vessels';
import { renderPatternCanvas } from '../engine/patternBaker';
import { sprites } from '../engine/sprites';
import {
  CoatingRarity,
  CoreId,
  CrateDrop,
  FinishId,
  GamePhase,
  HeatId,
  LoadoutPresetIndex,
  MetaSave,
  ModuleId,
  ParryFxId,
  RunStats,
  SectorId,
  SkinId,
  TrailId,
  UpgradeChoice,
  VesselId
} from '../types';
import {
  artIconImg,
  bossArtForSector,
  coreIconImg,
  rarityForCore,
  rarityForLevel,
  rarityForVessel,
  sectorBannerUrl,
  shipArtUrl
} from './artIcons';
import { formatTime, renderUpgradeDraftHtml } from './hud';
import { svgIcon } from './icons';

type HubTab = 'armory' | 'hangar' | 'battle' | 'loadout' | 'trials';
type HangarSub = 'ships' | 'cores';
type ArmorySub = 'crates' | 'locker' | 'fx';

type CratePreviewTile =
  | { kind: 'coating'; id: FinishId; seed: number; floatVal: number }
  | { kind: 'ship'; vesselId: VesselId }
  | { kind: 'trail'; trailId: TrailId }
  | { kind: 'aura'; auraId: ParryFxId };

// Visual sample drops shown directly on each crate (coatings + ships + effects)
const STD_CRATE_SAMPLES: CratePreviewTile[] = [
  { kind: 'coating', id: 'dune_splinter', seed: 142, floatVal: 0.14 },
  { kind: 'ship', vesselId: 'aegis' },
  { kind: 'trail', trailId: 'verdigris_mist' },
  { kind: 'coating', id: 'fade', seed: 420, floatVal: 0.04 },
  { kind: 'ship', vesselId: 'seraph' }
];

const RELIC_CRATE_SAMPLES: CratePreviewTile[] = [
  { kind: 'coating', id: 'damascus', seed: 205, floatVal: 0.09 },
  { kind: 'ship', vesselId: 'phantom' },
  { kind: 'aura', auraId: 'obsidian_wave' },
  { kind: 'ship', vesselId: 'nova' },
  { kind: 'coating', id: 'doppler', seed: 952, floatVal: 0.02 }
];

const PRESET_LABELS: readonly string[] = ['A', 'B', 'C'];

export interface OverlayActions {
  onStartRun: () => void;
  onSelectVessel: (vessel: VesselId) => void;
  onSelectCore: (core: CoreId) => void;
  onSelectSkin: (skin: SkinId) => void;
  onSelectSector: (sector: SectorId) => void;
  onToggleHeat: (heat: HeatId) => void;
  onRandomizeBuild: () => void;
  onVisualPrefsChanged: () => void;
  onSheetToggle: (open: boolean) => void;
  onSelectUpgrade: (choiceId: string) => void;
  onReroll: () => void;
  onResume: () => void;
  onQuitToMenu: () => void;
  onContinueEndless: () => void;
}

export class OverlayController {
  private container: HTMLDivElement;
  private save: MetaSave;
  private actions: OverlayActions;
  private currentPhase: GamePhase = 'menu';
  private tab: HubTab = 'battle';
  private hangarSub: HangarSub = 'ships';
  private armorySub: ArmorySub = 'crates';
  private browsingSectorIdx = 0;
  private settingsOpen = false;
  private heatOpen = false;
  private inspectUid: string | null = null;
  private inspectVesselIdx = 0;
  private previewShipId: VesselId | null = null;
  private previewTrailId: TrailId | null = null;
  private previewAuraId: ParryFxId | null = null;
  private forgeMode = false;
  private forgeSelection: string[] = [];
  private activeReelRaf = 0;
  private activeReelTimer = 0;
  private reelItems: CrateDrop[] | null = null;
  private reelWinner: CrateDrop | null = null;
  private reelResult: { isDuplicate: boolean; shardRefund: number } | null = null;
  private reelCrateKind: 'standard' | 'relic' = 'standard';
  private dropReveal: { drop: CrateDrop; isDuplicate: boolean; shardRefund: number } | null = null;
  private toastEl: HTMLDivElement | null = null;
  private toastTimer = 0;
  private toastQueue: string[] = [];

  constructor(parent: HTMLElement, save: MetaSave, actions: OverlayActions) {
    this.container = document.createElement('div');
    this.save = save;
    this.actions = actions;
    this.browsingSectorIdx = Math.max(0, SECTOR_ORDER.indexOf(save.selectedSector));
    this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(save.selectedVessel));
    parent.appendChild(this.container);

    sprites.onArtLoaded(() => {
      if (this.currentPhase === 'menu' || this.currentPhase === 'gameover' || this.currentPhase === 'victory') {
        this.hydrateVisualCanvases();
      }
    });
  }

  showToast(message: string): void {
    // Deduplicate consecutive identical messages and queue back-to-back unlock notices
    if (this.toastQueue[this.toastQueue.length - 1] === message) return;
    if (this.toastEl?.textContent === message && this.toastQueue.length === 0) return;
    if (this.toastQueue.length >= 4) this.toastQueue.shift();
    this.toastQueue.push(message);
    if (!this.toastEl) {
      this.flushToastQueue();
    }
  }

  private flushToastQueue(): void {
    window.clearTimeout(this.toastTimer);
    if (this.toastQueue.length === 0) {
      this.toastEl = null;
      return;
    }
    const next = this.toastQueue.shift()!;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = next;
    document.body.appendChild(el);
    this.toastEl = el;
    const stayMs = this.toastQueue.length > 0 ? 1700 : 2500;
    this.toastTimer = window.setTimeout(() => {
      el.remove();
      this.toastEl = null;
      this.flushToastQueue();
    }, stayMs);
  }

  renderPhase(
    phase: GamePhase,
    options?: {
      choices?: UpgradeChoice[];
      level?: number;
      rerolls?: number;
      isBossChest?: boolean;
      stats?: RunStats;
    }
  ): void {
    this.currentPhase = phase;
    this.cancelReel();

    if (phase === 'playing') {
      this.settingsOpen = false;
      this.heatOpen = false;
      this.inspectUid = null;
      this.dropReveal = null;
      this.container.innerHTML = '';
      return;
    }
    if (phase === 'menu') {
      this.browsingSectorIdx = Math.max(0, SECTOR_ORDER.indexOf(this.save.selectedSector));
      this.renderHub();
      return;
    }
    if (phase === 'levelup') {
      this.renderDraft(
        options?.choices ?? [],
        options?.level ?? 1,
        options?.rerolls ?? 0,
        Boolean(options?.isBossChest)
      );
      return;
    }
    if (phase === 'paused') {
      this.renderPause();
      return;
    }
    if (phase === 'gameover' || phase === 'victory') {
      this.renderRunEnd(phase === 'victory', options?.stats);
    }
  }

  private cancelReel(): void {
    if (this.activeReelRaf) {
      cancelAnimationFrame(this.activeReelRaf);
      this.activeReelRaf = 0;
    }
    if (this.activeReelTimer) {
      window.clearTimeout(this.activeReelTimer);
      this.activeReelTimer = 0;
    }
    this.reelItems = null;
    this.reelWinner = null;
    this.reelResult = null;
  }

  private renderHub(preserveScroll = false): void {
    const prevScroll = preserveScroll
      ? this.container.querySelector('.hub-content')?.scrollTop ?? 0
      : 0;
    const activeMods = getActiveLoadout(this.save);
    const budget = getLoadoutBudget(activeMods);
    const hasSpareLoadoutFit = this.save.unlockedModules.some(
      (id) => !activeMods.includes(id) && MODULES[id].points > 0 && MODULES[id].points <= budget.remaining
    );
    const totalCrates = this.save.standardCrates + this.save.relicCrates;
    const canOpenCrate = totalCrates > 0 && this.save.keys > 0;

    const bodyHtml =
      this.tab === 'battle'
        ? this.buildBattleTab()
        : this.tab === 'hangar'
          ? this.buildHangarTab()
          : this.tab === 'armory'
            ? this.buildArmoryTab()
            : this.tab === 'loadout'
              ? this.buildLoadoutTab()
              : this.buildTrialsTab();

    const modalHtml = this.reelItems
      ? this.buildCrateReelModal()
      : this.dropReveal
        ? this.buildDropRevealModal()
        : this.inspectUid
          ? this.buildInspectModal()
          : this.settingsOpen
            ? this.buildSettingsModal()
            : this.heatOpen
              ? this.buildHeatModal()
              : '';

    this.container.innerHTML = `
      <div class="hub-shell">
        <div class="hub-topbar">
          <div class="top-currencies">
            <div class="currency-readout">
              ${artIconImg('shard', 18)}
              <span>${this.save.shards.toLocaleString()}</span>
            </div>
            <button class="key-readout" id="btn-top-keys" aria-label="Crate keys">
              ${svgIcon('key', 14, 'var(--gold)')}
              <span>${this.save.keys}</span>
            </button>
            ${
              totalCrates > 0
                ? `<button class="crate-trigger" id="btn-top-crates">Crates ×${totalCrates}</button>`
                : ''
            }
          </div>
          <div class="topbar-actions">
            <button class="icon-square ${this.save.settings.music ? '' : 'muted'}" id="btn-quick-mute" aria-label="Toggle music">
              ${svgIcon('music', 15)}
            </button>
            <button class="icon-square" id="btn-settings" aria-label="Settings">
              ${svgIcon('gear', 15)}
            </button>
          </div>
        </div>

        <div class="hub-content">${bodyHtml}</div>

        <nav class="bottom-nav">
          <button class="nav-item ${this.tab === 'armory' ? 'active' : ''}" data-tab="armory">
            ${svgIcon('skins', 18)}
            <span>Armory</span>
            ${canOpenCrate ? '<span class="red-dot"></span>' : ''}
          </button>
          <button class="nav-item ${this.tab === 'hangar' ? 'active' : ''}" data-tab="hangar">
            ${svgIcon('ships', 18)}
            <span>Hangar</span>
          </button>
          <button class="nav-item battle-center ${this.tab === 'battle' ? 'active' : ''}" data-tab="battle">
            ${svgIcon('play', 18)}
            <span>Play</span>
          </button>
          <button class="nav-item ${this.tab === 'loadout' ? 'active' : ''}" data-tab="loadout">
            ${svgIcon('matrix', 17)}
            <span>Loadout</span>
            ${hasSpareLoadoutFit ? '<span class="red-dot"></span>' : ''}
          </button>
          <button class="nav-item ${this.tab === 'trials' ? 'active' : ''}" data-tab="trials">
            ${svgIcon('trophy', 17)}
            <span>Trials</span>
          </button>
        </nav>

        ${modalHtml}
      </div>
    `;

    this.bindHubEvents();
    this.hydrateVisualCanvases();
    if (this.reelItems) {
      this.startCrateReelAnimation();
    }
    if (preserveScroll && prevScroll > 0) {
      const content = this.container.querySelector('.hub-content');
      if (content) content.scrollTop = prevScroll;
    }
  }

  private buildBattleTab(): string {
    const secId = SECTOR_ORDER[this.browsingSectorIdx];
    const sector = SECTORS[secId];
    const secUnlocked = this.save.unlockedSectors.includes(secId);
    const secCleared = this.save.sectorsCleared.includes(secId);
    const canUnlockSec = !secUnlocked && this.save.shards >= sector.unlockCost;
    const heatCount = this.save.activeHeat.length;
    const totalMult = sector.shardMult * (1 + heatCount * 0.25);

    const vessel = VESSELS[this.save.selectedVessel];
    const core = CORES[this.save.selectedCore];
    const coating = getEquippedCoating(this.save);
    const finish = FINISHES[coating.finishId];
    const wear = getWearGrade(coating.floatVal);
    const rarColor = RARITY_META[finish.rarity].color;
    const budget = getLoadoutBudget(getActiveLoadout(this.save));
    const presetTag = `Class ${PRESET_LABELS[this.save.activePreset]} ${budget.used}/${budget.capacity}`;

    return `
      <div class="battle-tab">
        <div class="brand-wordmark">STILLPOINT</div>

        <div class="chapter-carousel">
          <button class="carousel-arrow" id="btn-sec-prev" aria-label="Previous sector">
            ${svgIcon('back', 15)}
          </button>

          <div class="chapter-card" style="border-color:${secUnlocked ? sector.accent : 'var(--line)'}">
            <div class="chapter-art-wrap">
              <img src="${sectorBannerUrl(secId)}" class="chapter-art ${secUnlocked ? '' : 'locked'}" alt="${sector.name}" draggable="false" />
              <div class="chapter-grad"></div>
              <div class="chapter-top-badges">
                <span class="ch-code" style="color:${sector.accent};border-color:${sector.accent}">${sector.code}</span>
                <span class="ch-code" style="color:var(--gold)">
                  ${secCleared ? '★ ' : ''}${totalMult.toFixed(1)}×
                </span>
              </div>
            </div>
            <div class="chapter-footer">
              <div class="chapter-title">${sector.name}</div>
              <div class="boss-mini">
                <button class="heat-btn ${heatCount > 0 ? 'hot' : ''}" id="btn-heat">
                  ${heatCount > 0 ? `Modifiers ${heatCount}` : 'Modifiers'}
                </button>
                <div class="boss-thumb">
                  <img src="${bossArtForSector(secId)}" width="20" height="20" class="art-img" alt="" />
                </div>
              </div>
            </div>
          </div>

          <button class="carousel-arrow" id="btn-sec-next" aria-label="Next sector">
            ${svgIcon('chevron', 15)}
          </button>
        </div>

        <button class="rig-strip" id="btn-go-hangar" aria-label="Open hangar">
          <canvas class="coated-canvas hero-ship-img" width="152" height="152" data-vid="${vessel.id}" data-cuid="${coating.uid}"></canvas>
          <div class="rig-info">
            <div class="rig-head">
              <div style="display:flex;align-items:baseline;gap:8px;min-width:0">
                <span class="rig-name">${vessel.name}</span>
                <span class="rig-class-tag">${presetTag}</span>
              </div>
              <div class="rig-icons">
                <span class="r-frame ${rarityForVessel(vessel.id)}" style="width:28px;height:28px">
                  ${artIconImg(vessel.starterWeapon, 19)}
                </span>
                <span class="r-frame ${rarityForCore(core.id)}" style="width:28px;height:28px">
                  ${coreIconImg(core.id, 19)}
                </span>
              </div>
            </div>
            <div class="rig-sub">
              <span style="color:${core.accent}">${core.name}</span>
              <span style="display:inline-flex;align-items:center;gap:5px;color:${rarColor}">
                <span>${finish.name}</span>
                <span class="wear-code" style="color:${wear.color}">${wear.code}</span>
              </span>
            </div>
          </div>
        </button>

        ${
          secUnlocked
            ? `<button class="battle-btn" id="btn-play">${svgIcon('play', 16, '#161108')}<span>Play</span></button>`
            : `<button class="battle-btn unlock-btn" id="btn-unlock-sec" ${canUnlockSec ? '' : 'disabled'}>
                 ${artIconImg('shard', 18)}<span>Unlock ${sector.unlockCost}</span>
               </button>`
        }
      </div>
    `;
  }

  private buildHangarTab(): string {
    const displayVid = this.previewShipId ?? this.save.selectedVessel;
    const vessel = VESSELS[displayVid];
    const isDisplayUnlocked = this.save.unlockedVessels.includes(displayVid);
    const coating = getEquippedCoating(this.save);
    const mods = getActiveLoadout(this.save);

    const baseHp = vessel.stats.maxHp + (mods.includes('plated_hull') ? 32 : 0);
    const maxHp = Math.max(32, Math.round(baseHp * (mods.includes('risk_glass') ? 0.7 : 1)));
    const moveSpd = Math.round(vessel.stats.moveSpeed * (mods.includes('slipstream') ? 1.14 : 1));
    const maxFocus = vessel.stats.maxCharge + (mods.includes('deep_capacitor') ? 35 : 0);

    const hpPct = Math.min(100, Math.round((maxHp / 210) * 100));
    const spdPct = Math.min(100, Math.round((moveSpd / 280) * 100));
    const focusPct = Math.min(100, Math.round((maxFocus / 175) * 100));
    const shipRarity = RARITY_META[SHIP_RARITY[displayVid]];

    const subContent =
      this.hangarSub === 'ships'
        ? `<div class="equip-grid">${VESSEL_ORDER.map((vid) => {
            const v = VESSELS[vid];
            const unlocked = this.save.unlockedVessels.includes(vid);
            const selected = this.save.selectedVessel === vid;
            const previewing = !unlocked && this.previewShipId === vid;
            const tier = rarityForVessel(vid);
            return `
              <button class="r-frame equip-card ${tier} ${selected ? 'selected' : ''} ${previewing ? 'previewing' : ''} ${unlocked ? '' : 'locked'}" data-ship="${vid}">
                ${
                  unlocked
                    ? `<canvas class="coated-canvas equip-thumb" width="116" height="116" data-vid="${vid}" data-cuid="${coating.uid}"></canvas>`
                    : `<img src="${shipArtUrl(vid)}" class="equip-thumb" alt="${v.name}" />`
                }
                <div class="equip-name">${v.name}</div>
                <div class="equip-cost">
                  ${unlocked ? (selected ? svgIcon('check', 12, '#dfa436') : '') : svgIcon('lock', 12, '#a39a8c')}
                </div>
              </button>
            `;
          }).join('')}</div>`
        : `<div class="ledger-list">${CORE_ORDER.map((cid) => {
            const c = CORES[cid];
            const unlocked = this.save.unlockedCores.includes(cid);
            const selected = this.save.selectedCore === cid;
            const canBuy = !unlocked && this.save.shards >= c.unlockCost;
            return `
              <button class="ledger-row ${selected ? 'active-mark' : ''}" data-core="${cid}" style="${selected ? `border-left-color:${c.accent}` : ''}">
                <div class="r-frame ledger-node ${rarityForCore(cid)}">
                  ${coreIconImg(cid, 25)}
                </div>
                <div class="ledger-body">
                  <div class="ledger-title" style="color:${c.accent}">${c.name}</div>
                  <div class="ledger-sub">${c.shortDesc}</div>
                </div>
                <span class="buy-pill ${canBuy ? 'ready' : ''}">
                  ${unlocked ? (selected ? svgIcon('check', 13, '#dfa436') : 'Equip') : `${artIconImg('shard', 11)}${c.unlockCost}`}
                </span>
              </button>
            `;
          }).join('')}</div>`;

    return `
      <div class="bay-stage">
        ${
          isDisplayUnlocked
            ? `<canvas class="coated-canvas bay-ship-big" width="164" height="164" data-vid="${vessel.id}" data-cuid="${coating.uid}"></canvas>`
            : `<img src="${shipArtUrl(vessel.id)}" class="bay-ship-big locked-stage-art" alt="${vessel.name}" />`
        }
        <div class="rig-info">
          <div class="rig-head">
            <span class="rig-name">${vessel.name}</span>
            ${
              isDisplayUnlocked
                ? `<button class="icon-square" id="btn-randomize" style="width:30px;height:30px" aria-label="Randomize loadout">
                     ${svgIcon('reroll', 14)}
                   </button>`
                : `<span class="crate-lock-note" style="color:${shipRarity.color}">${svgIcon('lock', 11, shipRarity.color)} Crate drop</span>`
            }
          </div>
          <div class="ledger-sub">${vessel.perkShort}</div>
          <div class="stat-bars">
            <div class="stat-bar-row">
              <span>Hull</span>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${hpPct}%;background:#df4b42"></div></div>
              <span class="stat-bar-val">${maxHp}</span>
            </div>
            <div class="stat-bar-row">
              <span>Speed</span>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${spdPct}%;background:var(--gold)"></div></div>
              <span class="stat-bar-val">${moveSpd}</span>
            </div>
            <div class="stat-bar-row">
              <span>Focus</span>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${focusPct}%;background:#4cb5ab"></div></div>
              <span class="stat-bar-val">${maxFocus}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="subtab-row">
        <button class="subtab-btn ${this.hangarSub === 'ships' ? 'active' : ''}" data-hsub="ships">Ships</button>
        <button class="subtab-btn ${this.hangarSub === 'cores' ? 'active' : ''}" data-hsub="cores">Cores</button>
      </div>

      ${subContent}
    `;
  }

  private buildArmoryTab(): string {
    const totalCrates = this.save.standardCrates + this.save.relicCrates;
    const subContent =
      this.armorySub === 'crates'
        ? this.buildCratesSubtab()
        : this.armorySub === 'locker'
          ? this.buildLockerSubtab()
          : this.buildFxSubtab();

    return `
      <div class="subtab-row">
        <button class="subtab-btn ${this.armorySub === 'crates' ? 'active' : ''}" data-asub="crates">
          Crates${totalCrates > 0 ? ` (${totalCrates})` : ''}
        </button>
        <button class="subtab-btn ${this.armorySub === 'locker' ? 'active' : ''}" data-asub="locker">
          Locker (${this.save.coatings.length})
        </button>
        <button class="subtab-btn ${this.armorySub === 'fx' ? 'active' : ''}" data-asub="fx">
          Effects
        </button>
      </div>
      ${subContent}
    `;
  }

  private buildCratesSubtab(): string {
    const canBuyKey = this.save.shards >= CRATE_KEY_COST;
    const hasKeys = this.save.keys > 0;

    const renderStrip = (group: 'std' | 'relic', samples: CratePreviewTile[]) =>
      samples
        .map((s, idx) => {
          if (s.kind === 'coating') {
            const rar = RARITY_META[FINISHES[s.id].rarity];
            return `<div class="crate-mini-swatch" style="border-bottom-color:${rar.color}"><canvas width="64" height="32" data-crate-sample="${group}:${idx}"></canvas></div>`;
          }
          if (s.kind === 'ship') {
            const rar = RARITY_META[SHIP_RARITY[s.vesselId]];
            return `<div class="crate-mini-swatch crate-mini-icon" style="border-bottom-color:${rar.color}"><img src="${shipArtUrl(s.vesselId)}" alt="${VESSELS[s.vesselId].name}" /></div>`;
          }
          if (s.kind === 'trail') {
            const t = TRAILS[s.trailId];
            const rar = RARITY_META[TRAIL_RARITY[s.trailId]];
            return `<div class="crate-mini-swatch crate-mini-icon" style="border-bottom-color:${rar.color}"><span class="mini-plume" style="background:radial-gradient(circle, ${t.coreColor}, ${t.color} 68%, transparent 100%)"></span></div>`;
          }
          const a = PARRY_FX[s.auraId];
          const rar = RARITY_META[AURA_RARITY[s.auraId]];
          return `<div class="crate-mini-swatch crate-mini-icon" style="border-bottom-color:${rar.color}"><span class="mini-aura" style="border-color:${a.outer};box-shadow:inset 0 0 0 2px ${a.inner}"></span></div>`;
        })
        .join('');

    const stdLabel =
      this.save.standardCrates === 0
        ? 'Earn from strong runs'
        : hasKeys
          ? `${svgIcon('key', 14, '#161108')}<span>Open</span>`
          : 'Need 1 key';

    const relicLabel =
      this.save.relicCrates === 0
        ? 'Earn from bosses and trials'
        : hasKeys
          ? `${svgIcon('key', 14, '#1a0904')}<span>Open</span>`
          : 'Need 1 key';

    return `
      <div class="key-bar">
        <div class="key-bar-info">
          ${svgIcon('key', 16, 'var(--gold)')}
          <span class="key-bar-title">Crate keys</span>
          <span class="key-bar-count">×${this.save.keys}</span>
        </div>
        <button class="buy-pill ${canBuyKey ? 'ready' : ''}" id="btn-buy-key" ${canBuyKey ? '' : 'disabled'}>
          <span>Buy key</span>
          ${artIconImg('shard', 12)}
          <span>${CRATE_KEY_COST}</span>
        </button>
      </div>

      <div class="crate-stack">
        <div class="crate-block">
          <div class="crate-top">
            <div class="crate-title">Salvage crate</div>
            <span class="crate-count" style="color:${this.save.standardCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
              ×${this.save.standardCrates}
            </span>
          </div>
          <div class="crate-preview-strip">${renderStrip('std', STD_CRATE_SAMPLES)}</div>
          <div class="odds-bar">
            <div style="flex:52;background:#5b82d6"></div>
            <div style="flex:28;background:#9c6ae6"></div>
            <div style="flex:13.2;background:#d64eb8"></div>
            <div style="flex:5.4;background:#d9483b"></div>
            <div style="flex:1.4;background:#e2a93b"></div>
          </div>
          <div class="odds-legend">
            <span style="color:#5b82d6">52%</span>
            <span style="color:#9c6ae6">28%</span>
            <span style="color:#d64eb8">13.2%</span>
            <span style="color:#d9483b">5.4%</span>
            <span style="color:#e2a93b">★ 1.4%</span>
          </div>
          <button class="battle-btn ${this.save.standardCrates > 0 && !hasKeys ? 'need-key' : ''}" style="height:40px;font-size:14px" id="btn-open-std" ${this.save.standardCrates > 0 ? '' : 'disabled'}>
            ${stdLabel}
          </button>
        </div>

        <div class="crate-block">
          <div class="crate-top">
            <div class="crate-title" style="color:var(--gold)">Classified crate</div>
            <span class="crate-count" style="color:${this.save.relicCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
              ×${this.save.relicCrates}
            </span>
          </div>
          <div class="crate-preview-strip">${renderStrip('relic', RELIC_CRATE_SAMPLES)}</div>
          <div class="odds-bar">
            <div style="flex:20;background:#5b82d6"></div>
            <div style="flex:38;background:#9c6ae6"></div>
            <div style="flex:27;background:#d64eb8"></div>
            <div style="flex:11.8;background:#d9483b"></div>
            <div style="flex:3.2;background:#e2a93b"></div>
          </div>
          <div class="odds-legend">
            <span style="color:#5b82d6">20%</span>
            <span style="color:#9c6ae6">38%</span>
            <span style="color:#d64eb8">27%</span>
            <span style="color:#d9483b">11.8%</span>
            <span style="color:#e2a93b">★ 3.2%</span>
          </div>
          <button class="battle-btn rust-btn ${this.save.relicCrates > 0 && !hasKeys ? 'need-key' : ''}" style="height:40px;font-size:14px" id="btn-open-relic" ${this.save.relicCrates > 0 ? '' : 'disabled'}>
            ${relicLabel}
          </button>
        </div>
      </div>
    `;
  }

  private buildLockerSubtab(): string {
    const vesselId = this.save.selectedVessel;
    const sorted = [...this.save.coatings].sort((a, b) => {
      const ra = RARITY_META[FINISHES[a.finishId].rarity].order;
      const rb = RARITY_META[FINISHES[b.finishId].rarity].order;
      if (rb !== ra) return rb - ra;
      return b.acquiredAt - a.acquiredAt;
    });

    const selectedRarity: CoatingRarity | null =
      this.forgeSelection.length > 0
        ? FINISHES[
            this.save.coatings.find((c) => c.uid === this.forgeSelection[0])?.finishId ?? 'factory_issue'
          ].rarity
        : null;
    const nextTier = selectedRarity ? RARITY_NEXT[selectedRarity] : null;

    const slotsHtml = Array.from({ length: 5 }, (_, idx) => {
      const uid = this.forgeSelection[idx];
      const item = uid ? this.save.coatings.find((c) => c.uid === uid) : null;
      const color = item ? RARITY_META[FINISHES[item.finishId].rarity].color : '';
      return `<span class="forge-slot ${item ? 'filled' : ''}" style="${color ? `background:${color};border-color:${color}` : ''}"></span>`;
    }).join('');

    const tiles = sorted
      .map((item) => {
        const def = FINISHES[item.finishId];
        const rar = RARITY_META[def.rarity];
        const wear = getWearGrade(item.floatVal);
        const equipped = item.uid === this.save.equippedCoatingUid;
        const isStarter = item.finishId === 'factory_issue';
        const picked = this.forgeSelection.includes(item.uid);
        const forgeEligible =
          !isStarter &&
          Boolean(RARITY_NEXT[def.rarity]) &&
          (selectedRarity === null || def.rarity === selectedRarity);
        const dim = this.forgeMode && !picked && !forgeEligible;

        return `
          <button class="coating-tile ${equipped ? 'equipped' : ''} ${picked ? 'forge-pick' : ''} ${dim ? 'forge-dim' : ''}"
            data-coating="${item.uid}" style="border-bottom-color:${rar.color}">
            <div class="tile-top-meta">
              <span style="color:${wear.color}">${wear.code}</span>
              ${item.striker ? '<span class="st-badge">ST</span>' : equipped ? svgIcon('check', 11, '#dfa436') : ''}
            </div>
            <canvas class="coated-canvas" width="96" height="96" style="width:62px;height:62px" data-vid="${vesselId}" data-cuid="${item.uid}"></canvas>
            <div class="coating-name" style="color:${rar.color}">${def.name}</div>
            <div class="coating-seed">#${String(item.seed).padStart(3, '0')} ${item.floatVal.toFixed(2)}</div>
          </button>
        `;
      })
      .join('');

    return `
      <div class="locker-toolbar">
        <button class="buy-pill ${this.forgeMode ? 'ready' : ''}" id="btn-toggle-forge">
          ${this.forgeMode ? 'Cancel' : 'Trade up'}
        </button>
        ${
          this.forgeMode && this.forgeSelection.length === 5 && nextTier
            ? `<button class="buy-pill ready" id="btn-exec-forge" style="background:linear-gradient(180deg,#e06a34,#b53f16);color:#1a0904;border-color:#ffbd96">
                 Craft ${RARITY_META[nextTier].label}
               </button>`
            : this.forgeMode
              ? `<div class="forge-slots" aria-label="Trade up slots">${slotsHtml}</div>`
              : `<span class="ledger-sub mono">${this.save.coatings.length} owned</span>`
        }
      </div>
      <div class="locker-grid">${tiles}</div>
    `;
  }

  private buildFxSubtab(): string {
    const activeTrail = this.previewTrailId ?? this.save.selectedTrail;
    const activeAura = this.previewAuraId ?? this.save.selectedParryFx;
    const isPreviewingLocked =
      (this.previewTrailId !== null && !this.save.unlockedTrails.includes(this.previewTrailId)) ||
      (this.previewAuraId !== null && !this.save.unlockedParryFx.includes(this.previewAuraId));

    const trailsHtml = TRAIL_ORDER.map((tid) => {
      const t = TRAILS[tid];
      const owned = this.save.unlockedTrails.includes(tid);
      const selected = this.save.selectedTrail === tid;
      const previewing = !owned && activeTrail === tid;
      const rar = RARITY_META[TRAIL_RARITY[tid]];
      return `
        <button class="fx-card ${selected ? 'selected' : ''} ${previewing ? 'previewing' : ''}" data-trail="${tid}" style="border-left:3px solid ${rar.color}">
          <span class="fx-dot" style="background:radial-gradient(circle, ${t.coreColor}, ${t.color})"></span>
          <div style="flex:1;min-width:0">
            <div class="equip-name">${t.name}</div>
            <div class="equip-cost" style="color:${owned ? 'var(--gold)' : rar.color}">
              ${owned ? (selected ? 'Active' : 'Owned') : `${svgIcon('lock', 10, rar.color)} ${rar.label}`}
            </div>
          </div>
        </button>
      `;
    }).join('');

    const auraHtml = PARRY_FX_ORDER.map((pid) => {
      const pf = PARRY_FX[pid];
      const owned = this.save.unlockedParryFx.includes(pid);
      const selected = this.save.selectedParryFx === pid;
      const previewing = !owned && activeAura === pid;
      const rar = RARITY_META[AURA_RARITY[pid]];
      return `
        <button class="fx-card ${selected ? 'selected' : ''} ${previewing ? 'previewing' : ''}" data-parryfx="${pid}" style="border-left:3px solid ${rar.color}">
          <span class="fx-dot" style="background:transparent;border:3px solid ${pf.outer};box-shadow:inset 0 0 0 2px ${pf.inner}"></span>
          <div style="flex:1;min-width:0">
            <div class="equip-name">${pf.name}</div>
            <div class="equip-cost" style="color:${owned ? 'var(--gold)' : rar.color}">
              ${owned ? (selected ? 'Active' : 'Owned') : `${svgIcon('lock', 10, rar.color)} ${rar.label}`}
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="fx-stage">
        <canvas class="fx-preview-canvas" id="fx-live-canvas" width="288" height="288"></canvas>
        ${isPreviewingLocked ? `<div class="fx-preview-caption">${svgIcon('lock', 11, '#a39a8c')} Previewing crate drop</div>` : ''}
      </div>
      <div class="fx-section-title">Thruster exhaust</div>
      <div class="fx-grid">${trailsHtml}</div>
      <div class="fx-section-title">Stillpoint aura</div>
      <div class="fx-grid">${auraHtml}</div>
    `;
  }

  private buildCrateReelModal(): string {
    const items = this.reelItems ?? [];
    const strip = items
      .map((drop, idx) => {
        const rar = RARITY_META[drop.rarity];
        const isGold = drop.rarity === 'contraband';
        let visualHtml = '';
        let label = '';

        if (isGold) {
          visualHtml = `<div class="reel-swatch reel-gold-tile">★</div>`;
          label = 'Relic ★';
        } else if (drop.kind === 'coating') {
          visualHtml = `<canvas class="reel-swatch" width="66" height="54" data-reel-idx="${idx}"></canvas>`;
          label = FINISHES[drop.coating.finishId].name;
        } else if (drop.kind === 'ship') {
          visualHtml = `<div class="reel-swatch reel-art-tile"><img src="${shipArtUrl(drop.vesselId)}" alt="" /></div>`;
          label = VESSELS[drop.vesselId].name;
        } else if (drop.kind === 'trail') {
          const t = TRAILS[drop.trailId];
          visualHtml = `<div class="reel-swatch reel-art-tile"><span class="reel-plume" style="background:radial-gradient(circle, ${t.coreColor}, ${t.color} 68%, transparent 100%)"></span></div>`;
          label = t.name;
        } else {
          const a = PARRY_FX[drop.auraId];
          visualHtml = `<div class="reel-swatch reel-art-tile"><span class="reel-aura" style="border-color:${a.outer};box-shadow:inset 0 0 0 3px ${a.inner}"></span></div>`;
          label = a.name;
        }

        return `
          <div class="reel-item" style="border-bottom-color:${rar.color}">
            ${visualHtml}
            <div class="reel-label" style="color:${rar.color}">${label}</div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-head">
            <div class="modal-title" style="color:var(--gold)">
              ${this.reelCrateKind === 'relic' ? 'Classified crate' : 'Salvage crate'}
            </div>
            <button class="buy-pill" id="btn-skip-reel">Skip</button>
          </div>
          <div class="reel-viewport">
            <div class="reel-pointer"></div>
            <div class="reel-track" id="reel-track">${strip}</div>
          </div>
        </div>
      </div>
    `;
  }

  private buildDropRevealModal(): string {
    const rev = this.dropReveal;
    if (!rev || rev.drop.kind === 'coating') return '';
    const drop = rev.drop;
    const rar = RARITY_META[drop.rarity];
    const coating = getEquippedCoating(this.save);

    let title = '';
    let category = '';
    let detail = '';
    let isEquipped = false;
    let stageHtml = '';

    if (drop.kind === 'ship') {
      const v = VESSELS[drop.vesselId];
      title = v.name;
      category = 'Ship chassis';
      detail = v.perkShort;
      isEquipped = this.save.selectedVessel === drop.vesselId;
      stageHtml = `<canvas class="coated-canvas inspect-ship" width="240" height="240" data-vid="${drop.vesselId}" data-cuid="${coating.uid}"></canvas>`;
    } else if (drop.kind === 'trail') {
      const t = TRAILS[drop.trailId];
      title = t.name;
      category = 'Thruster exhaust';
      detail = 'Equips in Armory effects';
      isEquipped = this.save.selectedTrail === drop.trailId;
      stageHtml = `<canvas class="fx-preview-canvas" id="reveal-fx-canvas" width="288" height="288" data-reveal-trail="${drop.trailId}"></canvas>`;
    } else {
      const a = PARRY_FX[drop.auraId];
      title = a.name;
      category = 'Stillpoint aura';
      detail = 'Equips in Armory effects';
      isEquipped = this.save.selectedParryFx === drop.auraId;
      stageHtml = `<canvas class="fx-preview-canvas" id="reveal-fx-canvas" width="288" height="288" data-reveal-aura="${drop.auraId}"></canvas>`;
    }

    return `
      <div class="modal-backdrop" id="reveal-bg">
        <div class="modal-box" style="border-top-color:${rar.color}">
          <div class="modal-head">
            <div class="modal-title" style="color:${rar.color}">${title}</div>
            <span class="mono" style="font-size:11px;font-weight:700;color:${rar.color}">${rar.label}</span>
          </div>

          <div class="inspect-stage">
            ${stageHtml}
            <div class="ledger-sub">${detail}</div>
          </div>

          <div class="inspect-strip" style="grid-template-columns:1fr 1fr">
            <div class="inspect-stat">
              <span class="meta-k">Type</span>
              <span class="meta-v">${category}</span>
            </div>
            <div class="inspect-stat">
              <span class="meta-k">Status</span>
              <span class="meta-v" style="color:${rev.isDuplicate ? 'var(--gold)' : '#63d69b'}">
                ${rev.isDuplicate ? `Duplicate +${rev.shardRefund}` : 'Unlocked'}
              </span>
            </div>
          </div>

          <div class="crate-actions">
            <button class="battle-btn" style="height:42px;font-size:14px" id="btn-equip-reveal" ${isEquipped ? 'disabled' : ''}>
              ${isEquipped ? 'Equipped' : 'Equip'}
            </button>
            <button class="ghost-btn" style="height:42px" id="btn-close-reveal">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  private buildInspectModal(): string {
    const item = this.save.coatings.find((c) => c.uid === this.inspectUid);
    if (!item) return '';
    const def = FINISHES[item.finishId];
    const rar = RARITY_META[def.rarity];
    const wear = getWearGrade(item.floatVal);
    const equipped = item.uid === this.save.equippedCoatingUid;
    const isStarter = item.finishId === 'factory_issue';
    const scrapVal = getCoatingScrapValue(item);
    const previewVid = VESSEL_ORDER[this.inspectVesselIdx % VESSEL_ORDER.length];

    return `
      <div class="modal-backdrop" id="inspect-bg">
        <div class="modal-box" style="border-top-color:${rar.color}">
          <div class="modal-head">
            <div class="modal-title" style="color:${rar.color}">${def.name}</div>
            <button class="buy-pill" id="btn-cycle-ship">${VESSELS[previewVid].name}</button>
          </div>

          <button class="inspect-stage" id="btn-inspect-ship" aria-label="Preview next ship">
            <canvas class="coated-canvas inspect-ship" width="240" height="240" data-vid="${previewVid}" data-cuid="${item.uid}"></canvas>
            ${item.specialTag ? `<span class="special-pill">${item.specialTag}</span>` : ''}
          </button>

          <div class="float-gauge">
            <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;font-weight:700">
              <span style="color:${wear.color}">${wear.label} (${wear.code})</span>
              <span>${item.floatVal.toFixed(4)}</span>
            </div>
            <div class="float-bar-wrap">
              <div class="float-pin" style="left:${(item.floatVal * 100).toFixed(2)}%"></div>
            </div>
          </div>

          <div class="inspect-strip">
            <div class="inspect-stat">
              <span class="meta-k">Pattern</span>
              <span class="meta-v">#${String(item.seed).padStart(3, '0')}</span>
            </div>
            <div class="inspect-stat">
              <span class="meta-k">Rarity</span>
              <span class="meta-v" style="color:${rar.color}">${rar.label}</span>
            </div>
            <div class="inspect-stat">
              <span class="meta-k">Tracker</span>
              <span class="meta-v" style="color:${item.striker ? '#f09543' : 'var(--muted)'}">
                ${item.striker ? `ST ${String(item.kills).padStart(5, '0')}` : 'None'}
              </span>
            </div>
          </div>

          <div class="crate-actions">
            <button class="battle-btn" style="height:42px;font-size:14px" id="btn-equip-coat" ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Equipped' : 'Equip'}
            </button>
            <button class="ghost-btn" style="height:42px;color:${isStarter ? 'var(--muted)' : '#f47a72'}" id="btn-scrap-coat" ${isStarter ? 'disabled' : ''}>
              ${isStarter ? 'Default' : `Scrap +${scrapVal}`}
            </button>
          </div>
          <button class="ghost-btn" id="btn-close-inspect">Close</button>
        </div>
      </div>
    `;
  }

  private buildLoadoutTab(): string {
    const activeMods = getActiveLoadout(this.save);
    const budget = getLoadoutBudget(activeMods);

    const presetPills = PRESET_LABELS.map((lbl, idx) => {
      const active = this.save.activePreset === idx;
      return `<button class="preset-pill ${active ? 'active' : ''}" data-preset="${idx}">Class ${lbl}</button>`;
    }).join('');

    const pipsHtml = Array.from({ length: budget.capacity }, (_, i) => {
      const isBonusSlot = i >= BASE_LOADOUT_POINTS;
      const isFilled = i < budget.used;
      return `<span class="cap-pip ${isFilled ? 'filled' : ''} ${isBonusSlot ? 'bonus' : ''}"></span>`;
    }).join('');

    const sectionsHtml = MODULE_CATEGORIES.map((cat) => {
      const items = MODULE_ORDER.filter((id) => MODULES[id].category === cat.id);
      const rows = items
        .map((id) => {
          const mod = MODULES[id];
          const unlocked = this.save.unlockedModules.includes(id);
          const equipped = activeMods.includes(id);
          const isRisk = mod.points < 0;
          const canAfford = !unlocked && this.save.shards >= mod.unlockCost;
          const fits = equipped || isRisk || mod.points <= budget.remaining;
          const ptText = isRisk ? `+${Math.abs(mod.points)} pt` : `${mod.points} pt`;
          const tier = isRisk ? 'mythic' : mod.points >= 3 ? 'gold' : mod.points === 2 ? 'rare' : 'good';

          let rightHtml = '';
          if (!unlocked) {
            rightHtml = `<span class="buy-pill ${canAfford ? 'ready' : ''}">${artIconImg('shard', 11)}${mod.unlockCost}</span>`;
          } else if (equipped) {
            rightHtml = `<span class="buy-pill ${isRisk ? 'risk-on' : 'ready'}">${svgIcon('check', 12, isRisk ? '#ffe4d6' : '#161108')}</span>`;
          } else {
            rightHtml = `<span class="buy-pill">Add</span>`;
          }

          return `
            <button class="ledger-row mod-row ${equipped ? (isRisk ? 'risk-mark' : 'active-mark') : ''} ${unlocked && !fits ? 'mod-over' : ''}"
              data-module="${id}" style="${equipped ? `border-left-color:${mod.accent}` : ''}">
              <div class="r-frame ledger-node ${tier}">
                ${artIconImg(mod.iconKey, 24)}
              </div>
              <div class="ledger-body">
                <div class="mod-title-row">
                  <span class="ledger-title" style="${equipped ? `color:${mod.accent}` : ''}">${mod.name}</span>
                  <span class="pt-chip ${isRisk ? 'risk' : ''}">${ptText}</span>
                </div>
                <div class="ledger-sub">${mod.line}</div>
              </div>
              ${rightHtml}
            </button>
          `;
        })
        .join('');

      return `
        <div class="loadout-cat-head">${cat.label}</div>
        <div class="ledger-list">${rows}</div>
      `;
    }).join('');

    return `
      <div class="loadout-header">
        <div class="preset-bar">
          <div class="preset-group">${presetPills}</div>
          <button class="buy-pill" id="btn-clear-loadout" ${activeMods.length === 0 ? 'disabled' : ''}>Clear</button>
        </div>
        <div class="cap-row">
          <div class="cap-pips" aria-label="Loadout points used">${pipsHtml}</div>
          <span class="cap-num">${budget.used}/${budget.capacity}</span>
        </div>
      </div>
      ${sectionsHtml}
    `;
  }

  private buildTrialsTab(): string {
    const rows = MILESTONES.map((m) => {
      const st = m.check(this.save);
      const done = this.save.claimedMilestones.includes(m.id) || st.done;
      const pct = Math.min(100, (st.current / Math.max(1, st.target)) * 100);
      return `
        <div class="ledger-row ${done ? 'gold-mark' : ''}">
          <div class="r-frame ${done ? 'gold' : 'common'}" style="width:34px;height:34px">
            ${svgIcon(done ? 'check' : 'trophy', 15, done ? '#dfa436' : '#a39a8c')}
          </div>
          <div class="ledger-body">
            <div class="ledger-title">${m.name}</div>
            <div class="ledger-sub">${m.goalText}</div>
            <div class="trial-progress-row">
              <div class="trial-bar"><div class="trial-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
              <span class="trial-frac">${Math.min(st.current, st.target).toLocaleString()}/${st.target.toLocaleString()}</span>
            </div>
          </div>
          <div class="trial-reward" style="color:${done ? 'var(--gold)' : 'var(--muted)'}">
            ${m.rewardLabel ? `<span>${m.rewardLabel}</span>` : ''}
            <span>+${m.rewardShards}</span>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="ledger-list">${rows}</div>`;
  }

  private buildHeatModal(): string {
    const bonusPct = this.save.activeHeat.length * 25;
    const rows = HEAT_ORDER.map((hid) => {
      const h = HEAT_MODS[hid];
      const on = this.save.activeHeat.includes(hid);
      return `
        <button class="ledger-row ${on ? 'active-mark' : ''}" data-heat="${hid}" style="${on ? `border-left-color:${h.accent}` : ''}">
          <div class="ledger-body">
            <div class="ledger-title" style="color:${on ? h.accent : 'var(--ink)'}">${h.name}</div>
            <div class="ledger-sub">${h.shortDesc}</div>
          </div>
          <span class="buy-pill ${on ? 'ready' : ''}">+25%</span>
        </button>
      `;
    }).join('');

    return `
      <div class="modal-backdrop" id="heat-bg">
        <div class="modal-box" style="border-top-color:var(--rust)">
          <div class="modal-head">
            <div class="modal-title" style="color:var(--ink)">Modifiers</div>
            <span class="mono" style="color:var(--gold);font-size:12px;font-weight:800">+${bonusPct}% shards</span>
          </div>
          <div class="ledger-list">${rows}</div>
          <button class="ghost-btn" id="btn-close-heat">Done</button>
        </div>
      </div>
    `;
  }

  private buildSettingsModal(): string {
    const s = this.save.settings;
    return `
      <div class="modal-backdrop" id="settings-bg">
        <div class="modal-box">
          <div class="modal-head"><div class="modal-title">Settings</div></div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" data-toggle="music">${svgIcon('music', 15)} <span>Music</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" data-toggle="sfx">${svgIcon('sfx', 15)} <span>Sound</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" data-toggle="haptics">${svgIcon('haptics', 15)} <span>Haptics</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" data-toggle="reduceFlash">${svgIcon('flash', 15)} <span>Low flash</span></button>
          </div>
          <button class="ghost-btn" id="btn-close-settings">Done</button>
        </div>
      </div>
    `;
  }

  private beginCrateRoll(kind: 'standard' | 'relic'): void {
    const count = kind === 'standard' ? this.save.standardCrates : this.save.relicCrates;
    if (count <= 0) return;
    if (this.save.keys <= 0) {
      bridge.haptic('warning');
      this.showToast(`Buy a key above (${CRATE_KEY_COST} shards)`);
      return;
    }

    if (kind === 'standard') this.save.standardCrates--;
    else this.save.relicCrates--;
    this.save.keys--;

    const winner = rollCrateDrop(kind);
    const result = applyCrateDrop(this.save, winner);

    const items: CrateDrop[] = [];
    for (let i = 0; i < 36; i++) {
      items.push(i === 27 ? winner : rollCrateDrop(kind));
    }
    this.reelCrateKind = kind;
    this.reelItems = items;
    this.reelWinner = winner;
    this.reelResult = result;
    sound.unlock();
    this.renderHub(true);
  }

  private startCrateReelAnimation(): void {
    const track = this.container.querySelector('#reel-track') as HTMLDivElement | null;
    const winner = this.reelWinner;
    const result = this.reelResult;
    const items = this.reelItems;
    if (!track || !winner || !items || !result) return;

    this.container.querySelectorAll<HTMLCanvasElement>('[data-reel-idx]').forEach((cv) => {
      const idx = Number(cv.dataset.reelIdx);
      const drop = items[idx];
      if (!drop || drop.kind !== 'coating') return;
      const swatch = renderPatternCanvas(drop.coating.finishId, drop.coating.seed, drop.coating.floatVal, 66);
      const ctx = cv.getContext('2d');
      ctx?.drawImage(swatch, 0, 0, cv.width, cv.height);
    });

    const itemStride = 98;
    const winIdx = 27;
    const jitter = (Math.random() - 0.5) * 62;
    const targetOffset = winIdx * itemStride + 46 + jitter;
    const duration = 3500;
    const startTs = performance.now();
    let lastTile = -1;
    let finished = false;

    const finishRoll = () => {
      if (finished) return;
      finished = true;
      if (this.activeReelRaf) {
        cancelAnimationFrame(this.activeReelRaf);
        this.activeReelRaf = 0;
      }
      if (this.activeReelTimer) {
        window.clearTimeout(this.activeReelTimer);
        this.activeReelTimer = 0;
      }
      const rar = RARITY_META[winner.rarity];
      sound.playCrateReveal(rar.order);
      bridge.haptic(rar.order >= 3 ? 'heavy' : 'success');
      this.reelItems = null;
      this.reelWinner = null;
      this.reelResult = null;
      if (winner.kind === 'coating') {
        this.inspectUid = winner.coating.uid;
        this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(this.save.selectedVessel));
        this.armorySub = 'locker';
      } else {
        this.dropReveal = {
          drop: winner,
          isDuplicate: result.isDuplicate,
          shardRefund: result.shardRefund
        };
      }
      this.renderHub();
    };

    this.container.querySelector('#btn-skip-reel')?.addEventListener('click', () => {
      finishRoll();
    });

    const step = (now: number) => {
      if (finished) return;
      const t = Math.min(1, (now - startTs) / duration);
      const ease = 1 - Math.pow(1 - t, 4.2);
      const curX = targetOffset * ease;
      track.style.transform = `translate3d(${-curX.toFixed(1)}px, 0, 0)`;

      const tileIdx = Math.floor(curX / itemStride);
      if (tileIdx !== lastTile) {
        lastTile = tileIdx;
        sound.playCrateTick(0.88 + (1 - t) * 0.28);
        if (t > 0.55) bridge.haptic('light');
      }

      if (t < 1) {
        this.activeReelRaf = requestAnimationFrame(step);
      } else {
        this.activeReelRaf = 0;
        this.activeReelTimer = window.setTimeout(finishRoll, 320);
      }
    };
    this.activeReelRaf = requestAnimationFrame(step);
  }

  private hydrateVisualCanvases(): void {
    // 1. Coated ships across Play, Hangar, Locker, Inspect, Reveal, Run End
    this.container.querySelectorAll<HTMLCanvasElement>('.coated-canvas[data-vid]').forEach((cv) => {
      const vid = cv.dataset.vid as VesselId;
      const cuid = cv.dataset.cuid;
      const coating =
        this.save.coatings.find((c) => c.uid === cuid) ?? getEquippedCoating(this.save);
      const art = sprites.getCoatedShipArt(vid, coating, Math.min(240, cv.width));
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (art) {
        ctx.drawImage(art, 0, 0, cv.width, cv.height);
      } else {
        const accent = FINISHES[coating.finishId]?.accent ?? '#4cb5ab';
        ctx.save();
        ctx.translate(cv.width * 0.5, cv.height * 0.5);
        ctx.fillStyle = '#2b2823';
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, cv.width * 0.025);
        ctx.beginPath();
        ctx.moveTo(0, -cv.height * 0.34);
        ctx.lineTo(cv.width * 0.28, cv.height * 0.28);
        ctx.lineTo(0, cv.height * 0.14);
        ctx.lineTo(-cv.width * 0.28, cv.height * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });

    // 2. Crate sample pattern swatches
    this.container.querySelectorAll<HTMLCanvasElement>('[data-crate-sample]').forEach((cv) => {
      const [group, idxStr] = (cv.dataset.crateSample ?? '').split(':');
      const sample = (group === 'relic' ? RELIC_CRATE_SAMPLES : STD_CRATE_SAMPLES)[Number(idxStr)];
      if (!sample || sample.kind !== 'coating') return;
      const swatch = renderPatternCanvas(sample.id, sample.seed, sample.floatVal, 64);
      const ctx = cv.getContext('2d');
      ctx?.drawImage(swatch, 0, 0, cv.width, cv.height);
    });

    // 3. Live FX preview canvas (shows equipped or previewed Thruster Exhaust + Stillpoint Aura)
    const fxCanvas = this.container.querySelector('#fx-live-canvas') as HTMLCanvasElement | null;
    if (fxCanvas) {
      this.drawFxPreview(
        fxCanvas,
        this.previewTrailId ?? this.save.selectedTrail,
        this.previewAuraId ?? this.save.selectedParryFx
      );
    }

    // 4. Crate Drop Reveal FX preview canvas
    const revealFx = this.container.querySelector('#reveal-fx-canvas') as HTMLCanvasElement | null;
    if (revealFx) {
      const trailId = (revealFx.dataset.revealTrail as TrailId | undefined) ?? this.save.selectedTrail;
      const auraId = (revealFx.dataset.revealAura as ParryFxId | undefined) ?? this.save.selectedParryFx;
      this.drawFxPreview(revealFx, trailId, auraId);
    }
  }

  private drawFxPreview(cv: HTMLCanvasElement, trailId: TrailId, auraId: ParryFxId): void {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const cx = W * 0.5;
    const cy = H * 0.46;
    const vid = this.save.selectedVessel;
    const coating = getEquippedCoating(this.save);
    const trail = TRAILS[trailId] ?? TRAILS.ion_ash;
    const aura = PARRY_FX[auraId] ?? PARRY_FX.steel_ring;

    ctx.clearRect(0, 0, W, H);

    // Subtle radial backdrop glow
    const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, W * 0.48);
    bg.addColorStop(0, `${aura.outer}26`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stillpoint Astrolabe outer + inner rings & reticle ticks
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = aura.outer;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 14, 4, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = aura.inner;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = aura.outer;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 86, Math.sin(a) * 86);
      ctx.lineTo(Math.cos(a) * 116, Math.sin(a) * 116);
      ctx.stroke();
    }

    // Thruster exhaust wake + glowing jet plume behind the ship
    const drawPlume = (x: number, y: number, w: number, len: number) => {
      const g = ctx.createLinearGradient(x, y, x, y + len);
      g.addColorStop(0, trail.coreColor);
      g.addColorStop(0.35, trail.color);
      g.addColorStop(1, `${trail.color}00`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + len);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
    };
    if (vid === 'aegis' || vid === 'nova' || vid === 'volt') {
      drawPlume(-18, 40, 11, 66);
      drawPlume(18, 40, 11, 66);
    } else {
      drawPlume(0, 40, 13, 72);
    }

    // Ship sprite with baked pattern coating
    const art = sprites.getCoatedShipArt(vid, coating, 160);
    if (art) {
      ctx.drawImage(art, -64, -64, 128, 128);
    }

    // Pinpoint Stillpoint core diamond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = aura.outer;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private bindHubEvents(): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as HubTab;
        this.forgeMode = false;
        this.forgeSelection = [];
        this.previewShipId = null;
        this.previewTrailId = null;
        this.previewAuraId = null;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    const openCratesTab = () => {
      this.tab = 'armory';
      this.armorySub = 'crates';
      bridge.haptic('light');
      this.renderHub();
    };
    this.container.querySelector('#btn-top-crates')?.addEventListener('click', openCratesTab);
    this.container.querySelector('#btn-top-keys')?.addEventListener('click', openCratesTab);

    this.container.querySelectorAll<HTMLButtonElement>('[data-hsub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hangarSub = btn.dataset.hsub as HangarSub;
        this.previewShipId = null;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-asub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.armorySub = btn.dataset.asub as ArmorySub;
        this.forgeMode = false;
        this.forgeSelection = [];
        this.previewTrailId = null;
        this.previewAuraId = null;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelector('#btn-quick-mute')?.addEventListener('click', () => {
      sound.unlock();
      this.save.settings.music = !this.save.settings.music;
      sound.setSettings(this.save.settings.music, this.save.settings.sfx);
      persistMetaSave(this.save);
      bridge.haptic('light');
      this.renderHub(true);
    });

    this.container.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.settingsOpen = true;
      this.renderHub(true);
    });

    this.container.querySelector('#btn-close-settings')?.addEventListener('click', () => {
      this.settingsOpen = false;
      this.renderHub(true);
    });

    this.container.querySelector('#settings-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'settings-bg') {
        this.settingsOpen = false;
        this.renderHub(true);
      }
    });

    this.container.querySelector('#btn-heat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.heatOpen = true;
      bridge.haptic('light');
      this.renderHub(true);
    });

    this.container.querySelector('#btn-close-heat')?.addEventListener('click', () => {
      this.heatOpen = false;
      this.renderHub(true);
    });

    this.container.querySelector('#heat-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'heat-bg') {
        this.heatOpen = false;
        this.renderHub(true);
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-heat]').forEach((b) => {
      b.addEventListener('click', () => {
        this.actions.onToggleHeat(b.dataset.heat as HeatId);
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    this.container.querySelector('#btn-randomize')?.addEventListener('click', () => {
      this.actions.onRandomizeBuild();
      bridge.haptic('medium');
      sound.playXp();
      this.renderHub(true);
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
      b.addEventListener('click', () => {
        sound.unlock();
        const key = b.dataset.toggle as keyof MetaSave['settings'];
        this.save.settings[key] = !this.save.settings[key];
        sound.setSettings(this.save.settings.music, this.save.settings.sfx);
        bridge.setHapticsEnabled(this.save.settings.haptics);
        persistMetaSave(this.save);
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    // Keys & Crates
    this.container.querySelector('#btn-buy-key')?.addEventListener('click', () => {
      if (buyCrateKey(this.save)) {
        sound.playLevelUp();
        bridge.haptic('success');
        this.showToast('+1 Crate key');
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-open-std')?.addEventListener('click', () => this.beginCrateRoll('standard'));
    this.container.querySelector('#btn-open-relic')?.addEventListener('click', () => this.beginCrateRoll('relic'));

    // Non-Coating Crate Drop Reveal Modal (Ship / Exhaust / Aura)
    this.container.querySelector('#btn-close-reveal')?.addEventListener('click', () => {
      this.dropReveal = null;
      this.renderHub(true);
    });
    this.container.querySelector('#reveal-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'reveal-bg') {
        this.dropReveal = null;
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-equip-reveal')?.addEventListener('click', () => {
      const drop = this.dropReveal?.drop;
      if (!drop || drop.kind === 'coating') return;
      if (drop.kind === 'ship') {
        this.actions.onSelectVessel(drop.vesselId);
      } else if (drop.kind === 'trail') {
        this.save.selectedTrail = drop.trailId;
        persistMetaSave(this.save);
        this.actions.onVisualPrefsChanged();
      } else {
        this.save.selectedParryFx = drop.auraId;
        persistMetaSave(this.save);
        this.actions.onVisualPrefsChanged();
      }
      bridge.haptic('success');
      sound.playXp();
      this.renderHub(true);
    });

    // Locker + Trade-Up
    this.container.querySelector('#btn-toggle-forge')?.addEventListener('click', () => {
      this.forgeMode = !this.forgeMode;
      this.forgeSelection = [];
      bridge.haptic('light');
      this.renderHub(true);
    });

    this.container.querySelector('#btn-exec-forge')?.addEventListener('click', () => {
      const forged = executeTradeUp(this.save, this.forgeSelection);
      if (forged) {
        this.forgeMode = false;
        this.forgeSelection = [];
        this.actions.onVisualPrefsChanged();
        const rar = RARITY_META[FINISHES[forged.finishId].rarity];
        sound.playCrateReveal(rar.order);
        bridge.haptic('heavy');
        this.inspectUid = forged.uid;
        this.renderHub(true);
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-coating]').forEach((b) => {
      b.addEventListener('click', () => {
        const uid = b.dataset.coating!;
        const item = this.save.coatings.find((c) => c.uid === uid);
        if (!item) return;

        if (this.forgeMode) {
          if (item.finishId === 'factory_issue') return;
          const idx = this.forgeSelection.indexOf(uid);
          if (idx >= 0) {
            this.forgeSelection.splice(idx, 1);
          } else if (this.forgeSelection.length < 5) {
            const def = FINISHES[item.finishId];
            if (!RARITY_NEXT[def.rarity]) return;
            if (this.forgeSelection.length > 0) {
              const first = this.save.coatings.find((c) => c.uid === this.forgeSelection[0]);
              if (first && FINISHES[first.finishId].rarity !== def.rarity) return;
            }
            this.forgeSelection.push(uid);
          }
          bridge.haptic('light');
          this.renderHub(true);
          return;
        }

        this.inspectUid = uid;
        this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(this.save.selectedVessel));
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    // Inspect Modal
    this.container.querySelector('#btn-close-inspect')?.addEventListener('click', () => {
      this.inspectUid = null;
      this.renderHub(true);
    });
    this.container.querySelector('#inspect-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'inspect-bg') {
        this.inspectUid = null;
        this.renderHub(true);
      }
    });
    const cycleShip = () => {
      this.inspectVesselIdx = (this.inspectVesselIdx + 1) % VESSEL_ORDER.length;
      bridge.haptic('light');
      this.renderHub(true);
    };
    this.container.querySelector('#btn-cycle-ship')?.addEventListener('click', cycleShip);
    this.container.querySelector('#btn-inspect-ship')?.addEventListener('click', cycleShip);
    this.container.querySelector('#btn-equip-coat')?.addEventListener('click', () => {
      if (this.inspectUid && equipCoating(this.save, this.inspectUid)) {
        this.actions.onVisualPrefsChanged();
        bridge.haptic('success');
        sound.playXp();
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-scrap-coat')?.addEventListener('click', () => {
      if (!this.inspectUid) return;
      const got = scrapCoating(this.save, this.inspectUid);
      if (got > 0) {
        this.inspectUid = null;
        this.actions.onVisualPrefsChanged();
        bridge.haptic('medium');
        sound.playXp();
        this.showToast(`Scrapped for +${got} shards`);
        this.renderHub(true);
      }
    });

    // Trails & Stillpoint Aura FX (Crate drops: owned equips, locked previews live)
    this.container.querySelectorAll<HTMLButtonElement>('[data-trail]').forEach((b) => {
      b.addEventListener('click', () => {
        const tid = b.dataset.trail as TrailId;
        if (this.save.unlockedTrails.includes(tid)) {
          this.previewTrailId = null;
          this.save.selectedTrail = tid;
          persistMetaSave(this.save);
          this.actions.onVisualPrefsChanged();
          bridge.haptic('light');
          this.renderHub(true);
        } else {
          this.previewTrailId = tid;
          bridge.haptic('light');
          this.showToast('Unlocked in crates');
          this.renderHub(true);
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-parryfx]').forEach((b) => {
      b.addEventListener('click', () => {
        const pid = b.dataset.parryfx as ParryFxId;
        if (this.save.unlockedParryFx.includes(pid)) {
          this.previewAuraId = null;
          this.save.selectedParryFx = pid;
          persistMetaSave(this.save);
          this.actions.onVisualPrefsChanged();
          bridge.haptic('light');
          this.renderHub(true);
        } else {
          this.previewAuraId = pid;
          bridge.haptic('light');
          this.showToast('Unlocked in crates');
          this.renderHub(true);
        }
      });
    });

    // Sector Carousel & Play
    this.container.querySelector('#btn-sec-prev')?.addEventListener('click', () => {
      this.browsingSectorIdx = (this.browsingSectorIdx - 1 + SECTOR_ORDER.length) % SECTOR_ORDER.length;
      const id = SECTOR_ORDER[this.browsingSectorIdx];
      if (this.save.unlockedSectors.includes(id)) this.actions.onSelectSector(id);
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelector('#btn-sec-next')?.addEventListener('click', () => {
      this.browsingSectorIdx = (this.browsingSectorIdx + 1) % SECTOR_ORDER.length;
      const id = SECTOR_ORDER[this.browsingSectorIdx];
      if (this.save.unlockedSectors.includes(id)) this.actions.onSelectSector(id);
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelector('#btn-go-hangar')?.addEventListener('click', () => {
      this.tab = 'hangar';
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelector('#btn-play')?.addEventListener('click', () => {
      const id = SECTOR_ORDER[this.browsingSectorIdx];
      if (this.save.unlockedSectors.includes(id)) {
        this.actions.onSelectSector(id);
        this.actions.onStartRun();
      }
    });

    this.container.querySelector('#btn-unlock-sec')?.addEventListener('click', () => {
      const id = SECTOR_ORDER[this.browsingSectorIdx];
      const sc = SECTORS[id];
      if (this.save.shards >= sc.unlockCost && !this.save.unlockedSectors.includes(id)) {
        this.save.shards -= sc.unlockCost;
        this.save.unlockedSectors.push(id);
        this.actions.onSelectSector(id);
        persistMetaSave(this.save);
        bridge.haptic('success');
        sound.playLevelUp();
        this.renderHub();
      }
    });

    // Ships (Crate & Trial unlocks — preview locked hulls live, equip owned hulls)
    this.container.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach((b) => {
      b.addEventListener('click', () => {
        const vid = b.dataset.ship as VesselId;
        if (this.save.unlockedVessels.includes(vid)) {
          this.previewShipId = null;
          this.actions.onSelectVessel(vid);
          bridge.haptic('light');
          this.renderHub(true);
        } else {
          this.previewShipId = vid;
          bridge.haptic('light');
          this.showToast('Unlocked in crates');
          this.renderHub(true);
        }
      });
    });

    // Cores (Functional Shard-unlockable gear)
    this.container.querySelectorAll<HTMLButtonElement>('[data-core]').forEach((b) => {
      b.addEventListener('click', () => {
        const cid = b.dataset.core as CoreId;
        const c = CORES[cid];
        if (this.save.unlockedCores.includes(cid)) {
          this.actions.onSelectCore(cid);
          bridge.haptic('light');
          this.renderHub(true);
        } else if (this.save.shards >= c.unlockCost) {
          this.save.shards -= c.unlockCost;
          this.save.unlockedCores.push(cid);
          this.actions.onSelectCore(cid);
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub(true);
        } else {
          bridge.haptic('warning');
          this.showToast(`Need ${c.unlockCost} shards`);
        }
      });
    });

    // Pick-10 Class Loadout Tab
    this.container.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.preset) as LoadoutPresetIndex;
        selectLoadoutPreset(this.save, idx);
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    this.container.querySelector('#btn-clear-loadout')?.addEventListener('click', () => {
      clearActivePreset(this.save);
      bridge.haptic('medium');
      this.renderHub(true);
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-module]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.module as ModuleId;
        const mod = MODULES[id];
        if (!this.save.unlockedModules.includes(id)) {
          if (unlockLoadoutModule(this.save, id)) {
            toggleLoadoutModule(this.save, id);
            bridge.haptic('success');
            sound.playLevelUp();
            this.showToast(`${mod.name} unlocked`);
            this.renderHub(true);
          } else {
            bridge.haptic('warning');
            this.showToast(`Need ${mod.unlockCost} shards`);
          }
          return;
        }
        const res = toggleLoadoutModule(this.save, id);
        if (res.ok) {
          bridge.haptic('light');
          sound.playXp();
          this.renderHub(true);
        } else {
          bridge.haptic('warning');
          if (res.reason) this.showToast(res.reason);
        }
      });
    });
  }

  private renderDraft(
    choices: UpgradeChoice[],
    level: number,
    rerolls: number,
    isBossChest: boolean
  ): void {
    this.container.innerHTML = renderUpgradeDraftHtml(choices, level, rerolls, isBossChest);
    this.container.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => this.actions.onSelectUpgrade(btn.dataset.choice!));
    });
    this.container.querySelector('#btn-reroll')?.addEventListener('click', () => this.actions.onReroll());
  }

  private renderPause(): void {
    const s = this.save.settings;
    this.container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-head"><div class="modal-title">Paused</div></div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" id="p-music">${svgIcon('music', 15)} <span>Music</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" id="p-sfx">${svgIcon('sfx', 15)} <span>Sound</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" id="p-haptics">${svgIcon('haptics', 15)} <span>Haptics</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" id="p-flash">${svgIcon('flash', 15)} <span>Low flash</span></button>
          </div>
          <button class="battle-btn" id="btn-resume">Resume</button>
          <button class="ghost-btn" id="btn-quit">Quit run</button>
        </div>
      </div>
    `;
    this.container.querySelector('#btn-resume')!.addEventListener('click', () => this.actions.onResume());
    this.container.querySelector('#btn-quit')!.addEventListener('click', () => {
      this.tab = 'battle';
      this.actions.onQuitToMenu();
    });
    const wire = (id: string, key: keyof MetaSave['settings']) => {
      this.container.querySelector(id)!.addEventListener('click', () => {
        sound.unlock();
        s[key] = !s[key];
        sound.setSettings(s.music, s.sfx);
        bridge.setHapticsEnabled(s.haptics);
        persistMetaSave(this.save);
        this.renderPause();
      });
    };
    wire('#p-music', 'music');
    wire('#p-sfx', 'sfx');
    wire('#p-haptics', 'haptics');
    wire('#p-flash', 'reduceFlash');
  }

  private renderRunEnd(isVictory: boolean, stats?: RunStats): void {
    const st = stats ?? {
      elapsed: 0,
      score: 0,
      kills: 0,
      grazes: 0,
      bestGrazeCombo: 0,
      bossesDefeated: 0,
      shardsEarned: 0,
      cratesEarned: 0,
      relicCratesEarned: 0,
      sectorId: this.save.selectedSector,
      vesselId: this.save.selectedVessel,
      coreId: this.save.selectedCore,
      skinId: this.save.selectedSkin,
      heatCount: 0,
      weapons: [],
      relics: [],
      endlessMode: false,
      victory: false
    };

    const coating = getEquippedCoating(this.save);
    const totalRunCrates = st.cratesEarned + st.relicCratesEarned;
    const weaponStrip = st.weapons
      .map(
        (w) =>
          `<span class="r-frame ${rarityForLevel(w.level, w.evolved)}" style="width:30px;height:30px">${artIconImg(w.id, 20)}<span class="slot-lv">${w.evolved ? '★' : w.level}</span></span>`
      )
      .join('');
    const relicStrip = st.relics
      .map(
        (rid) =>
          `<span class="r-frame gold" style="width:26px;height:26px">${artIconImg(RELICS[rid].iconKey, 16)}</span>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-box" style="border-top-color:${isVictory ? 'var(--gold)' : 'var(--danger)'}">
          <div class="modal-head">
            <div class="modal-title" style="color:${isVictory ? 'var(--gold)' : 'var(--ink)'}">
              ${isVictory ? 'Sector clear' : 'Hull destroyed'}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${totalRunCrates > 0 ? `<span class="crate-trigger">+${totalRunCrates} crate</span>` : ''}
              <span class="currency-readout" style="color:var(--gold)">
                ${artIconImg('shard', 14)} +${st.shardsEarned}
              </span>
            </div>
          </div>

          <div class="build-strip">
            <canvas class="coated-canvas" width="68" height="68" style="width:34px;height:34px" data-vid="${st.vesselId}" data-cuid="${coating.uid}"></canvas>
            ${weaponStrip}
            ${relicStrip}
          </div>

          <div class="summary-grid">
            <div class="summary-cell">${svgIcon('timer', 15, 'var(--muted)')}<span class="summary-num">${formatTime(st.elapsed)}</span></div>
            <div class="summary-cell">${svgIcon('trophy', 15, 'var(--muted)')}<span class="summary-num">${st.score.toLocaleString()}</span></div>
            <div class="summary-cell">${svgIcon('skull', 15, 'var(--muted)')}<span class="summary-num">${st.kills}</span></div>
            <div class="summary-cell">${svgIcon('graze_conduit', 15, 'var(--accent)')}<span class="summary-num" style="color:var(--accent)">${st.grazes}</span></div>
          </div>

          ${
            isVictory
              ? `<button class="battle-btn" id="btn-endless">Continue endless</button>`
              : `<button class="battle-btn" id="btn-retry">Play again</button>`
          }
          <button class="ghost-btn" id="btn-home">${totalRunCrates > 0 ? 'Open crates' : 'Hangar'}</button>
        </div>
      </div>
    `;

    this.hydrateVisualCanvases();
    this.container.querySelector('#btn-endless')?.addEventListener('click', () => this.actions.onContinueEndless());
    this.container.querySelector('#btn-retry')?.addEventListener('click', () => this.actions.onStartRun());
    this.container.querySelector('#btn-home')!.addEventListener('click', () => {
      this.tab = totalRunCrates > 0 ? 'armory' : 'battle';
      if (totalRunCrates > 0) this.armorySub = 'crates';
      this.actions.onQuitToMenu();
    });
  }
}
