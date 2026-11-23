import { sound } from '../audio';
import { bridge } from '../bridge';
import { CORE_ORDER, CORES, HEAT_MODS, HEAT_ORDER, RELICS } from '../data/builds';
import {
  CRATE_KEY_COST,
  FINISHES,
  getCoatingScrapValue,
  getEffectMeta,
  getEffectScrapValue,
  getEffectVisualParams,
  getWearGrade,
  isStarterEffect,
  RARITY_META,
  RARITY_NEXT,
  rollCrateDrop
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
  equipEffectItem,
  executeEffectTradeUp,
  executeTradeUp,
  getEquippedAuraItem,
  getEquippedCoating,
  getEquippedTrailItem,
  MILESTONES,
  persistMetaSave,
  scrapCoating,
  scrapEffectItem,
  selectLoadoutPreset,
  toggleLoadoutModule,
  unlockLoadoutModule
} from '../data/meta';
import { SECTOR_ORDER, SECTORS } from '../data/sectors';
import { VESSEL_ORDER, VESSELS } from '../data/vessels';
import {
  drawEffectStillpointAura,
  drawEffectThumbnail,
  drawEffectThrusterPlume,
  drawEffectTrailWake
} from '../engine/effectRenderer';
import { renderPatternCanvas } from '../engine/patternBaker';
import { sprites } from '../engine/sprites';
import {
  CoatingRarity,
  CoreId,
  CrateDrop,
  EffectItem,
  GamePhase,
  HeatId,
  LoadoutPresetIndex,
  MetaSave,
  ModuleId,
  RunStats,
  SectorId,
  SkinId,
  UpgradeChoice,
  VesselId
} from '../types';
import {
  artIconImg,
  bossArtForSector,
  coreIconImg,
  crateArtUrl,
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
type FxFilter = 'all' | 'trail' | 'aura';
type FxDemoMode = 'auto' | 'flight' | 'stillpoint';

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
  private fxFilter: FxFilter = 'all';
  private fxDemoMode: FxDemoMode = 'auto';
  private browsingSectorIdx = 0;
  private settingsOpen = false;
  private heatOpen = false;
  private oddsOpen = false;
  private inspectUid: string | null = null;
  private inspectEffectUid: string | null = null;
  private inspectVesselIdx = 0;
  private previewShipId: VesselId | null = null;
  private forgeMode = false;
  private forgeSelection: string[] = [];
  private fxForgeMode = false;
  private fxForgeSelection: string[] = [];
  private activeReelRaf = 0;
  private activeReelTimer = 0;
  private fxAnimRaf = 0;
  private reelItems: CrateDrop[] | null = null;
  private reelWinner: CrateDrop | null = null;
  private reelCrateKind: 'standard' | 'relic' = 'standard';
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
    this.stopFxPreviewLoop();

    if (phase === 'playing') {
      this.settingsOpen = false;
      this.heatOpen = false;
      this.oddsOpen = false;
      this.inspectUid = null;
      this.inspectEffectUid = null;
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
  }

  private stopFxPreviewLoop(): void {
    if (this.fxAnimRaf) {
      cancelAnimationFrame(this.fxAnimRaf);
      this.fxAnimRaf = 0;
    }
  }

  private renderHub(preserveScroll = false): void {
    this.stopFxPreviewLoop();
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
      : this.inspectEffectUid
        ? this.buildInspectEffectModal()
        : this.inspectUid
          ? this.buildInspectModal()
          : this.oddsOpen
            ? this.buildCrateOddsModal()
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
    this.startFxPreviewLoopIfNeeded();
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
    const canBuyDisplay = !isDisplayUnlocked && this.save.shards >= vessel.unlockCost;
    const coating = getEquippedCoating(this.save);
    const mods = getActiveLoadout(this.save);

    const maxHp = Math.max(32, Math.round(vessel.stats.maxHp * (mods.includes('risk_glass') ? 0.7 : 1)));
    const moveSpd = Math.round(vessel.stats.moveSpeed);
    const maxFocus = vessel.stats.maxCharge;

    const hpPct = Math.min(100, Math.round((maxHp / 155) * 100));
    const spdPct = Math.min(100, Math.round((moveSpd / 260) * 100));
    const focusPct = Math.min(100, Math.round((maxFocus / 145) * 100));

    const subContent =
      this.hangarSub === 'ships'
        ? `<div class="equip-grid">${VESSEL_ORDER.map((vid) => {
            const v = VESSELS[vid];
            const unlocked = this.save.unlockedVessels.includes(vid);
            const selected = this.save.selectedVessel === vid;
            const previewing = !unlocked && this.previewShipId === vid;
            const affordable = !unlocked && this.save.shards >= v.unlockCost;
            const tier = rarityForVessel(vid);
            return `
              <button class="r-frame equip-card ${tier} ${selected ? 'selected' : ''} ${previewing ? 'previewing' : ''} ${unlocked ? '' : 'locked'}" data-ship="${vid}">
                ${
                  unlocked
                    ? `<canvas class="coated-canvas equip-thumb" width="116" height="116" data-vid="${vid}" data-cuid="${coating.uid}"></canvas>`
                    : `<img src="${shipArtUrl(vid)}" class="equip-thumb" alt="${v.name}" />`
                }
                <div class="equip-name">${v.name}</div>
                <div class="equip-cost" style="color:${unlocked ? 'var(--gold)' : affordable ? 'var(--gold)' : 'var(--muted)'}">
                  ${unlocked ? (selected ? svgIcon('check', 12, '#dfa436') : '') : `${artIconImg('shard', 10)}<span>${v.unlockCost}</span>`}
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
            <div style="display:flex;align-items:center;gap:7px">
              <span class="rig-name">${vessel.name}</span>
              <span class="r-frame ${rarityForVessel(vessel.id)}" style="width:22px;height:22px">
                ${artIconImg(vessel.starterWeapon, 14)}
              </span>
            </div>
            ${
              isDisplayUnlocked
                ? `<button class="icon-square" id="btn-randomize" style="width:30px;height:30px" aria-label="Randomize loadout">
                     ${svgIcon('reroll', 14)}
                   </button>`
                : `<button class="buy-pill ${canBuyDisplay ? 'ready' : ''}" id="btn-buy-ship" data-buy-ship="${vessel.id}" ${canBuyDisplay ? '' : 'disabled'}>
                     <span>Unlock</span>${artIconImg('shard', 11)}<span>${vessel.unlockCost}</span>
                   </button>`
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
        <button class="subtab-btn ${this.hangarSub === 'ships' ? 'active' : ''}" data-hsub="ships">Ships (${this.save.unlockedVessels.length}/${VESSEL_ORDER.length})</button>
        <button class="subtab-btn ${this.hangarSub === 'cores' ? 'active' : ''}" data-hsub="cores">Cores (${this.save.unlockedCores.length}/${CORE_ORDER.length})</button>
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
          Skins (${this.save.coatings.length})
        </button>
        <button class="subtab-btn ${this.armorySub === 'fx' ? 'active' : ''}" data-asub="fx">
          Effects (${this.save.effectItems.length})
        </button>
      </div>
      ${subContent}
    `;
  }

  private buildCratesSubtab(): string {
    const canBuyKey = this.save.shards >= CRATE_KEY_COST;
    const hasKeys = this.save.keys > 0;

    const stdLabel =
      this.save.standardCrates === 0
        ? 'Earn from bosses, haulers, and trials'
        : hasKeys
          ? `${svgIcon('key', 14, '#161108')}<span>Open</span>`
          : 'Need 1 key';

    const relicLabel =
      this.save.relicCrates === 0
        ? 'Earn from sector clears and hard trials'
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
        <div class="key-bar-actions">
          <button class="icon-square" id="btn-crate-odds" style="width:32px;height:32px" aria-label="Crate drop odds">
            ${svgIcon('info', 15)}
          </button>
          <button class="buy-pill ${canBuyKey ? 'ready' : ''}" id="btn-buy-key" ${canBuyKey ? '' : 'disabled'}>
            <span>Buy key</span>
            ${artIconImg('shard', 12)}
            <span>${CRATE_KEY_COST}</span>
          </button>
        </div>
      </div>

      <div class="crate-stack">
        <div class="crate-block">
          <div class="crate-hero">
            <div class="crate-icon-wrap">
              <img src="${crateArtUrl('standard')}" class="crate-icon-art" alt="Salvage crate" draggable="false" />
            </div>
            <div class="crate-meta">
              <div class="crate-top">
                <div class="crate-title">Salvage crate</div>
                <span class="crate-count" style="color:${this.save.standardCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
                  ×${this.save.standardCrates}
                </span>
              </div>
              <div class="ledger-sub">Pattern skins, thruster exhausts, and Stillpoint auras from haulers and bosses.</div>
            </div>
          </div>
          <button class="battle-btn ${this.save.standardCrates > 0 && !hasKeys ? 'need-key' : ''}" style="height:40px;font-size:14px" id="btn-open-std" ${this.save.standardCrates > 0 ? '' : 'disabled'}>
            ${stdLabel}
          </button>
        </div>

        <div class="crate-block">
          <div class="crate-hero">
            <div class="crate-icon-wrap classified">
              <img src="${crateArtUrl('relic')}" class="crate-icon-art" alt="Classified crate" draggable="false" />
            </div>
            <div class="crate-meta">
              <div class="crate-top">
                <div class="crate-title" style="color:var(--gold)">Classified crate</div>
                <span class="crate-count" style="color:${this.save.relicCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
                  ×${this.save.relicCrates}
                </span>
              </div>
              <div class="ledger-sub">Higher rare and Relic ★ odds from sector clears and hard trials.</div>
            </div>
          </div>
          <button class="battle-btn rust-btn ${this.save.relicCrates > 0 && !hasKeys ? 'need-key' : ''}" style="height:40px;font-size:14px" id="btn-open-relic" ${this.save.relicCrates > 0 ? '' : 'disabled'}>
            ${relicLabel}
          </button>
        </div>
      </div>
    `;
  }

  private buildCrateOddsModal(): string {
    const renderTable = (rates: Array<{ label: string; pct: string; flex: number; color: string }>) => `
      <div class="odds-bar">
        ${rates.map((r) => `<div style="flex:${r.flex};background:${r.color}"></div>`).join('')}
      </div>
      <div class="odds-table">
        ${rates
          .map(
            (r) => `
              <div class="odds-cell" style="border-top-color:${r.color}">
                <span class="odds-tier">${r.label}</span>
                <span class="odds-pct" style="color:${r.color}">${r.pct}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `;

    const stdRates = [
      { label: 'Mil-Spec', pct: '60%', flex: 60, color: '#5b82d6' },
      { label: 'Restricted', pct: '25%', flex: 25, color: '#9c6ae6' },
      { label: 'Classified', pct: '10.5%', flex: 10.5, color: '#d64eb8' },
      { label: 'Covert', pct: '3.7%', flex: 3.7, color: '#d9483b' },
      { label: 'Relic ★', pct: '0.8%', flex: 0.8, color: '#e2a93b' }
    ];

    const relicRates = [
      { label: 'Mil-Spec', pct: '28%', flex: 28, color: '#5b82d6' },
      { label: 'Restricted', pct: '38%', flex: 38, color: '#9c6ae6' },
      { label: 'Classified', pct: '23%', flex: 23, color: '#d64eb8' },
      { label: 'Covert', pct: '8.8%', flex: 8.8, color: '#d9483b' },
      { label: 'Relic ★', pct: '2.2%', flex: 2.2, color: '#e2a93b' }
    ];

    return `
      <div class="modal-backdrop" id="odds-bg">
        <div class="modal-box" style="border-top-color:var(--gold)">
          <div class="modal-head">
            <div class="modal-title">Drop odds</div>
            <span class="mono" style="color:var(--muted);font-size:11px">Cosmetics only</span>
          </div>

          <div class="odds-section">
            <div class="odds-head">
              <img src="${crateArtUrl('standard')}" width="24" height="24" class="art-img" alt="" />
              <span>Salvage crate</span>
            </div>
            ${renderTable(stdRates)}
          </div>

          <div class="odds-section">
            <div class="odds-head" style="color:var(--gold)">
              <img src="${crateArtUrl('relic')}" width="24" height="24" class="art-img" alt="" />
              <span>Classified crate</span>
            </div>
            ${renderTable(relicRates)}
          </div>

          <div class="odds-note">
            Pool contains 20 pattern skins and 14 thruster or aura effects. Each drop rolls pattern #000 to #999, float wear FN to BS, and a 10% ST tracker chance. Trade up 5 matching drops to craft the next tier.
          </div>

          <button class="ghost-btn" id="btn-close-odds">Done</button>
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
    const eqTrail = getEquippedTrailItem(this.save);
    const eqAura = getEquippedAuraItem(this.save);
    const tMeta = getEffectMeta('trail', eqTrail.effectId);
    const aMeta = getEffectMeta('aura', eqAura.effectId);

    const filtered = this.save.effectItems
      .filter((e) => this.fxFilter === 'all' || e.slot === this.fxFilter)
      .sort((a, b) => {
        const ra = RARITY_META[getEffectMeta(a.slot, a.effectId).rarity].order;
        const rb = RARITY_META[getEffectMeta(b.slot, b.effectId).rarity].order;
        if (rb !== ra) return rb - ra;
        return b.acquiredAt - a.acquiredAt;
      });

    const selectedRarity: CoatingRarity | null =
      this.fxForgeSelection.length > 0
        ? (() => {
            const first = this.save.effectItems.find((e) => e.uid === this.fxForgeSelection[0]);
            return first ? getEffectMeta(first.slot, first.effectId).rarity : null;
          })()
        : null;
    const nextTier = selectedRarity ? RARITY_NEXT[selectedRarity] : null;

    const slotsHtml = Array.from({ length: 5 }, (_, idx) => {
      const uid = this.fxForgeSelection[idx];
      const item = uid ? this.save.effectItems.find((e) => e.uid === uid) : null;
      const color = item ? RARITY_META[getEffectMeta(item.slot, item.effectId).rarity].color : '';
      return `<span class="forge-slot ${item ? 'filled' : ''}" style="${color ? `background:${color};border-color:${color}` : ''}"></span>`;
    }).join('');

    const tiles = filtered
      .map((item) => {
        const meta = getEffectMeta(item.slot, item.effectId);
        const rar = RARITY_META[meta.rarity];
        const wear = getWearGrade(item.floatVal);
        const equipped =
          (item.slot === 'trail' && item.uid === this.save.equippedTrailUid) ||
          (item.slot === 'aura' && item.uid === this.save.equippedAuraUid);
        const starter = isStarterEffect(item);
        const picked = this.fxForgeSelection.includes(item.uid);
        const eligible =
          !starter &&
          Boolean(RARITY_NEXT[meta.rarity]) &&
          (selectedRarity === null || meta.rarity === selectedRarity);
        const dim = this.fxForgeMode && !picked && !eligible;

        return `
          <button class="coating-tile ${equipped ? 'equipped' : ''} ${picked ? 'forge-pick' : ''} ${dim ? 'forge-dim' : ''}"
            data-fx-item="${item.uid}" style="border-bottom-color:${rar.color}">
            <div class="tile-top-meta">
              <span style="color:${wear.color}">${wear.code}</span>
              <span class="fx-slot-tag">${item.slot === 'trail' ? 'Jet' : 'Aura'}</span>
              ${item.striker ? '<span class="st-badge">ST</span>' : equipped ? svgIcon('check', 11, '#dfa436') : ''}
            </div>
            <canvas width="96" height="96" style="width:62px;height:62px" data-fx-thumb="${item.uid}"></canvas>
            <div class="coating-name" style="color:${rar.color}">${meta.name}</div>
            <div class="coating-seed">#${String(item.seed).padStart(3, '0')} ${item.floatVal.toFixed(2)}</div>
          </button>
        `;
      })
      .join('');

    return `
      <div class="fx-stage">
        <canvas class="fx-preview-canvas" id="fx-live-canvas" width="320" height="320"></canvas>
        <div class="fx-mode-row">
          <button class="preset-pill ${this.fxDemoMode === 'auto' ? 'active' : ''}" data-fxdemo="auto">Auto</button>
          <button class="preset-pill ${this.fxDemoMode === 'flight' ? 'active' : ''}" data-fxdemo="flight">Exhaust</button>
          <button class="preset-pill ${this.fxDemoMode === 'stillpoint' ? 'active' : ''}" data-fxdemo="stillpoint">Stillpoint</button>
        </div>
        <div class="fx-equipped-line">
          <span style="color:${RARITY_META[tMeta.rarity].color}">${tMeta.name}</span>
          <span style="color:${RARITY_META[aMeta.rarity].color}">${aMeta.name}</span>
        </div>
      </div>

      <div class="locker-toolbar">
        <button class="buy-pill ${this.fxForgeMode ? 'ready' : ''}" id="btn-toggle-fx-forge">
          ${this.fxForgeMode ? 'Cancel' : 'Trade up'}
        </button>
        ${
          this.fxForgeMode && this.fxForgeSelection.length === 5 && nextTier
            ? `<button class="buy-pill ready" id="btn-exec-fx-forge" style="background:linear-gradient(180deg,#e06a34,#b53f16);color:#1a0904;border-color:#ffbd96">
                 Craft ${RARITY_META[nextTier].label}
               </button>`
            : this.fxForgeMode
              ? `<div class="forge-slots" aria-label="Effect trade up slots">${slotsHtml}</div>`
              : `<div class="fx-filter-group">
                   <button class="preset-pill ${this.fxFilter === 'all' ? 'active' : ''}" data-fxfilter="all">All</button>
                   <button class="preset-pill ${this.fxFilter === 'trail' ? 'active' : ''}" data-fxfilter="trail">Jet</button>
                   <button class="preset-pill ${this.fxFilter === 'aura' ? 'active' : ''}" data-fxfilter="aura">Aura</button>
                 </div>`
        }
      </div>

      <div class="locker-grid">${tiles}</div>
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
        } else {
          const meta = getEffectMeta(drop.effect.slot, drop.effect.effectId);
          visualHtml = `<canvas class="reel-swatch" width="66" height="54" data-reel-idx="${idx}"></canvas>`;
          label = meta.name;
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

  private buildInspectEffectModal(): string {
    const item = this.save.effectItems.find((e) => e.uid === this.inspectEffectUid);
    if (!item) return '';
    const meta = getEffectMeta(item.slot, item.effectId);
    const rar = RARITY_META[meta.rarity];
    const wear = getWearGrade(item.floatVal);
    const equipped =
      (item.slot === 'trail' && item.uid === this.save.equippedTrailUid) ||
      (item.slot === 'aura' && item.uid === this.save.equippedAuraUid);
    const starter = isStarterEffect(item);
    const scrapVal = getEffectScrapValue(item);

    return `
      <div class="modal-backdrop" id="inspect-fx-bg">
        <div class="modal-box" style="border-top-color:${rar.color}">
          <div class="modal-head">
            <div class="modal-title" style="color:${rar.color}">${meta.name}</div>
            <span class="mono" style="font-size:11px;font-weight:700;color:var(--muted)">
              ${item.slot === 'trail' ? 'Thruster exhaust' : 'Stillpoint aura'}
            </span>
          </div>

          <div class="inspect-stage">
            <canvas class="fx-preview-canvas" id="inspect-fx-canvas" width="320" height="320" data-inspect-fx="${item.uid}"></canvas>
            ${item.specialTag ? `<span class="special-pill">${item.specialTag}</span>` : ''}
          </div>

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
              <span class="meta-k">${item.slot === 'trail' ? 'Kills' : 'Grazes'}</span>
              <span class="meta-v" style="color:${item.striker ? '#f09543' : 'var(--muted)'}">
                ${item.striker ? `ST ${String(item.statCount).padStart(5, '0')}` : 'None'}
              </span>
            </div>
          </div>

          <div class="crate-actions">
            <button class="battle-btn" style="height:42px;font-size:14px" id="btn-equip-fx" ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Equipped' : 'Equip'}
            </button>
            <button class="ghost-btn" style="height:42px;color:${starter ? 'var(--muted)' : '#f47a72'}" id="btn-scrap-fx" ${starter ? 'disabled' : ''}>
              ${starter ? 'Default' : `Scrap +${scrapVal}`}
            </button>
          </div>
          <button class="ghost-btn" id="btn-close-inspect-fx">Close</button>
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
    applyCrateDrop(this.save, winner);

    const items: CrateDrop[] = [];
    for (let i = 0; i < 36; i++) {
      items.push(i === 27 ? winner : rollCrateDrop(kind));
    }
    this.reelCrateKind = kind;
    this.reelItems = items;
    this.reelWinner = winner;
    sound.unlock();
    this.renderHub(true);
  }

  private startCrateReelAnimation(): void {
    const track = this.container.querySelector('#reel-track') as HTMLDivElement | null;
    const winner = this.reelWinner;
    const items = this.reelItems;
    if (!track || !winner || !items) return;

    this.container.querySelectorAll<HTMLCanvasElement>('[data-reel-idx]').forEach((cv) => {
      const idx = Number(cv.dataset.reelIdx);
      const drop = items[idx];
      if (!drop) return;
      if (drop.kind === 'coating') {
        const swatch = renderPatternCanvas(drop.coating.finishId, drop.coating.seed, drop.coating.floatVal, 66);
        const ctx = cv.getContext('2d');
        ctx?.drawImage(swatch, 0, 0, cv.width, cv.height);
      } else {
        drawEffectThumbnail(cv, drop.effect, 1.8);
      }
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
      if (winner.kind === 'coating') {
        this.inspectUid = winner.coating.uid;
        this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(this.save.selectedVessel));
        this.armorySub = 'locker';
      } else {
        this.inspectEffectUid = winner.effect.uid;
        this.armorySub = 'fx';
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
    // 1. Coated ships across Play, Hangar, Skins, Inspect, Run End
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

    // 2. Rolled Effect inventory thumbnails
    this.container.querySelectorAll<HTMLCanvasElement>('[data-fx-thumb]').forEach((cv) => {
      const uid = cv.dataset.fxThumb;
      const item = this.save.effectItems.find((e) => e.uid === uid);
      if (item) drawEffectThumbnail(cv, item, 1.8);
    });
  }

  private startFxPreviewLoopIfNeeded(): void {
    const liveCv = this.container.querySelector('#fx-live-canvas') as HTMLCanvasElement | null;
    const inspectCv = this.container.querySelector('#inspect-fx-canvas') as HTMLCanvasElement | null;
    if (!liveCv && !inspectCv) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const renderAt = (sec: number) => {
      if (inspectCv) {
        const uid = inspectCv.dataset.inspectFx;
        const item = this.save.effectItems.find((e) => e.uid === uid);
        if (item) {
          const trail = item.slot === 'trail' ? item : getEquippedTrailItem(this.save);
          const aura = item.slot === 'aura' ? item : getEquippedAuraItem(this.save);
          const mode: FxDemoMode = item.slot === 'trail' ? 'flight' : 'stillpoint';
          this.drawAnimatedFxStage(inspectCv, trail, aura, mode, sec);
        }
      } else if (liveCv) {
        this.drawAnimatedFxStage(
          liveCv,
          getEquippedTrailItem(this.save),
          getEquippedAuraItem(this.save),
          this.fxDemoMode,
          sec
        );
      }
    };

    if (reducedMotion) {
      renderAt(1.6);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      if (this.currentPhase !== 'menu') {
        this.fxAnimRaf = 0;
        return;
      }
      const sec = (now - start) / 1000;
      renderAt(sec);
      this.fxAnimRaf = requestAnimationFrame(tick);
    };
    this.fxAnimRaf = requestAnimationFrame(tick);
  }

  private drawAnimatedFxStage(
    cv: HTMLCanvasElement,
    trailItem: EffectItem,
    auraItem: EffectItem,
    mode: FxDemoMode,
    time: number
  ): void {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const cx = W * 0.5;
    const vid = this.save.selectedVessel;
    const coating = getEquippedCoating(this.save);

    // Smooth demo blend: Auto alternates 2.6s Flight -> 2.6s Stillpoint!
    let stillBlend = 0;
    if (mode === 'stillpoint') {
      stillBlend = 1;
    } else if (mode === 'flight') {
      stillBlend = 0;
    } else {
      const cyc = time % 5.2;
      if (cyc < 2.2) stillBlend = 0;
      else if (cyc < 2.6) stillBlend = (cyc - 2.2) / 0.4;
      else if (cyc < 4.8) stillBlend = 1;
      else stillBlend = 1 - (cyc - 4.8) / 0.4;
    }

    const flightBlend = 1 - stillBlend;
    const cy = H * (0.42 + stillBlend * 0.08);
    const swayX = Math.sin(time * 2.1) * 14 * flightBlend;
    const shipX = cx + swayX;

    ctx.clearRect(0, 0, W, H);

    // Scroll the actual painted wasteland biome floor underneath the preview ship!
    const tile = sprites.getPaintedBiomeTile(this.save.selectedSector) ?? sprites.getBiomeTile(this.save.selectedSector);
    const tileSz = 260;
    const scrollSpd = 128 * (1 - stillBlend * 0.86);
    const tileOff = (time * scrollSpd) % tileSz;
    ctx.save();
    for (let x = -tileSz * 0.25; x < W; x += tileSz) {
      for (let y = tileOff - tileSz; y < H; y += tileSz) {
        ctx.drawImage(tile, x, y, tileSz, tileSz);
      }
    }
    // Soft Stillpoint ash-silence dimmer + subtle vignette matching live gameplay!
    ctx.fillStyle = `rgba(9, 10, 14, ${0.28 + stillBlend * 0.44})`;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.48, W * 0.16, W * 0.5, H * 0.5, W * 0.66);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(7,7,10,0.72)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Streaming synthetic flight wake trail behind ship!
    if (flightBlend > 0.05) {
      const wakePts: Array<{ x: number; y: number; alpha: number }> = [];
      const count = 14;
      for (let i = 0; i < count; i++) {
        const frac = i / (count - 1); // 0 = oldest bottom, 1 = newest near nozzle
        const tBack = (1 - frac) * 0.55;
        const px = cx + Math.sin((time - tBack) * 2.1) * 14 * flightBlend;
        const py = cy + 44 + (1 - frac) * 124;
        wakePts.push({ x: px, y: py, alpha: frac * flightBlend });
      }
      drawEffectTrailWake(ctx, wakePts, trailItem, time);
    }

    ctx.save();
    ctx.translate(shipX, cy);

    // Full animated geometric Stillpoint Aura!
    if (stillBlend > 0.03) {
      drawEffectStillpointAura(ctx, auraItem, 108, stillBlend, time);
    }

    // Full animated thruster nozzle plume!
    if (flightBlend > 0.08) {
      ctx.save();
      ctx.globalAlpha = flightBlend;
      drawEffectThrusterPlume(ctx, vid, trailItem, time, 2.35);
      ctx.restore();
    }

    // Coated ship hull sprite
    const art = sprites.getCoatedShipArt(vid, coating, 160);
    if (art) {
      ctx.save();
      ctx.globalAlpha = 1 - stillBlend * 0.25;
      ctx.drawImage(art, -58, -58, 116, 116);
      ctx.restore();
    }

    // Pinpoint Stillpoint core diamond
    if (stillBlend > 0.08) {
      const ap = getEffectVisualParams(auraItem);
      ctx.save();
      ctx.globalAlpha = stillBlend;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ap.primary;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private bindHubEvents(): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as HubTab;
        this.forgeMode = false;
        this.forgeSelection = [];
        this.fxForgeMode = false;
        this.fxForgeSelection = [];
        this.previewShipId = null;
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
        this.fxForgeMode = false;
        this.fxForgeSelection = [];
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

    // Keys, Drop Odds Info & Crates
    this.container.querySelector('#btn-crate-odds')?.addEventListener('click', () => {
      this.oddsOpen = true;
      bridge.haptic('light');
      this.renderHub(true);
    });
    this.container.querySelector('#btn-close-odds')?.addEventListener('click', () => {
      this.oddsOpen = false;
      this.renderHub(true);
    });
    this.container.querySelector('#odds-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'odds-bg') {
        this.oddsOpen = false;
        this.renderHub(true);
      }
    });
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

    // Skins Locker + Trade-Up
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

    // Skin Inspect Modal
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

    // Effects Live Stage, Filter, Trade-Up & Inspect Modal
    this.container.querySelectorAll<HTMLButtonElement>('[data-fxdemo]').forEach((b) => {
      b.addEventListener('click', () => {
        this.fxDemoMode = b.dataset.fxdemo as FxDemoMode;
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fxfilter]').forEach((b) => {
      b.addEventListener('click', () => {
        this.fxFilter = b.dataset.fxfilter as FxFilter;
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    this.container.querySelector('#btn-toggle-fx-forge')?.addEventListener('click', () => {
      this.fxForgeMode = !this.fxForgeMode;
      this.fxForgeSelection = [];
      bridge.haptic('light');
      this.renderHub(true);
    });

    this.container.querySelector('#btn-exec-fx-forge')?.addEventListener('click', () => {
      const forged = executeEffectTradeUp(this.save, this.fxForgeSelection);
      if (forged) {
        this.fxForgeMode = false;
        this.fxForgeSelection = [];
        this.actions.onVisualPrefsChanged();
        const rar = RARITY_META[getEffectMeta(forged.slot, forged.effectId).rarity];
        sound.playCrateReveal(rar.order);
        bridge.haptic('heavy');
        this.inspectEffectUid = forged.uid;
        this.renderHub(true);
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-fx-item]').forEach((b) => {
      b.addEventListener('click', () => {
        const uid = b.dataset.fxItem!;
        const item = this.save.effectItems.find((e) => e.uid === uid);
        if (!item) return;

        if (this.fxForgeMode) {
          if (isStarterEffect(item)) return;
          const idx = this.fxForgeSelection.indexOf(uid);
          if (idx >= 0) {
            this.fxForgeSelection.splice(idx, 1);
          } else if (this.fxForgeSelection.length < 5) {
            const rar = getEffectMeta(item.slot, item.effectId).rarity;
            if (!RARITY_NEXT[rar]) return;
            if (this.fxForgeSelection.length > 0) {
              const first = this.save.effectItems.find((e) => e.uid === this.fxForgeSelection[0]);
              if (first && getEffectMeta(first.slot, first.effectId).rarity !== rar) return;
            }
            this.fxForgeSelection.push(uid);
          }
          bridge.haptic('light');
          this.renderHub(true);
          return;
        }

        this.inspectEffectUid = uid;
        bridge.haptic('light');
        this.renderHub(true);
      });
    });

    this.container.querySelector('#btn-close-inspect-fx')?.addEventListener('click', () => {
      this.inspectEffectUid = null;
      this.renderHub(true);
    });
    this.container.querySelector('#inspect-fx-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'inspect-fx-bg') {
        this.inspectEffectUid = null;
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-equip-fx')?.addEventListener('click', () => {
      if (this.inspectEffectUid && equipEffectItem(this.save, this.inspectEffectUid)) {
        this.actions.onVisualPrefsChanged();
        bridge.haptic('success');
        sound.playXp();
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-scrap-fx')?.addEventListener('click', () => {
      if (!this.inspectEffectUid) return;
      const got = scrapEffectItem(this.save, this.inspectEffectUid);
      if (got > 0) {
        this.inspectEffectUid = null;
        this.actions.onVisualPrefsChanged();
        bridge.haptic('medium');
        sound.playXp();
        this.showToast(`Scrapped for +${got} shards`);
        this.renderHub(true);
      }
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

    // Ships (Direct Shard purchase in Hangar — tap locked to preview, unlock directly with Shards!)
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
          this.renderHub(true);
        }
      });
    });

    this.container.querySelector('#btn-buy-ship')?.addEventListener('click', () => {
      const btn = this.container.querySelector('#btn-buy-ship') as HTMLButtonElement | null;
      const vid = btn?.dataset.buyShip as VesselId | undefined;
      if (!vid) return;
      const v = VESSELS[vid];
      if (!this.save.unlockedVessels.includes(vid) && this.save.shards >= v.unlockCost) {
        this.save.shards -= v.unlockCost;
        this.save.unlockedVessels.push(vid);
        this.previewShipId = null;
        this.actions.onSelectVessel(vid);
        persistMetaSave(this.save);
        bridge.haptic('success');
        sound.playLevelUp();
        this.showToast(`${v.name} unlocked`);
        this.renderHub(true);
      } else {
        bridge.haptic('warning');
        this.showToast(`Need ${v.unlockCost} shards`);
      }
    });

    // Cores (Direct Shard purchase in Hangar)
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
