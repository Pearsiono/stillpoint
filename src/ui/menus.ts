import { sound } from '../audio';
import { bridge } from '../bridge';
import { CORE_ORDER, CORES, HEAT_MODS, HEAT_ORDER, RELICS } from '../data/builds';
import {
  CRATE_COSTS,
  FINISHES,
  getCoatingScrapValue,
  getWearGrade,
  PARRY_FX,
  PARRY_FX_ORDER,
  RARITY_META,
  RARITY_NEXT,
  rollCoatingFromCrate,
  TRAIL_ORDER,
  TRAILS
} from '../data/finishes';
import {
  buyCrate,
  buyMetaUpgrade,
  equipCoating,
  executeTradeUp,
  getEquippedCoating,
  getMetaUpgradeCost,
  META_UPGRADES,
  MILESTONES,
  persistMetaSave,
  scrapCoating
} from '../data/meta';
import { SECTOR_ORDER, SECTORS } from '../data/sectors';
import { VESSEL_ORDER, VESSELS } from '../data/vessels';
import { renderPatternCanvas } from '../engine/patternBaker';
import { sprites } from '../engine/sprites';
import {
  CoatingItem,
  CoatingRarity,
  CoreId,
  GamePhase,
  HeatId,
  MetaSave,
  MetaUpgradeId,
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

type HubTab = 'armory' | 'hangar' | 'battle' | 'talents' | 'trials';
type HangarSub = 'ships' | 'cores';
type ArmorySub = 'crates' | 'locker' | 'fx';

const TALENT_ICON_KEYS: Record<MetaUpgradeId, string> = {
  hull_integrity: 'reactive_plating',
  kinetic_core: 'kinetic_thrusters',
  parry_resonance: 'nova_pulse',
  time_lattice: 'chrono_capacitor',
  crit_calibration: 'momentum_edge',
  magnet_field: 'prism_drones',
  shard_harvester: 'shard',
  reroll_module: 'echo_chamber'
};

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
  private forgeMode = false;
  private forgeSelection: string[] = [];
  private activeReelRaf = 0;
  private activeReelTimer = 0;
  private reelItems: CoatingItem[] | null = null;
  private reelWinner: CoatingItem | null = null;
  private reelCrateKind: 'standard' | 'relic' = 'standard';
  private toastEl: HTMLDivElement | null = null;
  private toastTimer = 0;

  constructor(parent: HTMLElement, save: MetaSave, actions: OverlayActions) {
    this.container = document.createElement('div');
    this.save = save;
    this.actions = actions;
    this.browsingSectorIdx = Math.max(0, SECTOR_ORDER.indexOf(save.selectedSector));
    this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(save.selectedVessel));
    parent.appendChild(this.container);

    // Re-hydrate coated ship canvases once PNG ship art finishes decoding!
    sprites.onArtLoaded(() => {
      if (this.currentPhase === 'menu' || this.currentPhase === 'gameover' || this.currentPhase === 'victory') {
        this.hydrateCoatedCanvases();
      }
    });
  }

  showToast(message: string): void {
    if (this.toastEl) this.toastEl.remove();
    window.clearTimeout(this.toastTimer);
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    this.toastEl = el;
    this.toastTimer = window.setTimeout(() => {
      el.remove();
      this.toastEl = null;
    }, 3000);
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

  private renderHub(preserveScroll = false): void {
    const prevScroll = preserveScroll
      ? this.container.querySelector('.hub-content')?.scrollTop ?? 0
      : 0;
    const canBuyTalent = META_UPGRADES.some((u) => {
      const lv = this.save.upgrades[u.id] ?? 0;
      return lv < u.maxLevel && this.save.shards >= getMetaUpgradeCost(u, lv);
    });
    const totalCrates = this.save.standardCrates + this.save.relicCrates;

    const bodyHtml =
      this.tab === 'battle'
        ? this.buildBattleTab()
        : this.tab === 'hangar'
          ? this.buildHangarTab()
          : this.tab === 'armory'
            ? this.buildArmoryTab()
            : this.tab === 'talents'
              ? this.buildTalentsTab()
              : this.buildTrialsTab();

    const modalHtml = this.reelItems
      ? this.buildCrateReelModal()
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
            <div class="currency-pill">
              ${artIconImg('shard', 18)}
              <span>${this.save.shards.toLocaleString()}</span>
            </div>
            ${
              totalCrates > 0
                ? `<button class="currency-pill crate-pill" id="btn-top-crates">CRATES ×${totalCrates}</button>`
                : ''
            }
          </div>
          <div class="topbar-actions">
            <button class="icon-square ${this.save.settings.music ? '' : 'muted'}" id="btn-quick-mute" aria-label="Mute Music">
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
            <span>ARMORY</span>
            ${totalCrates > 0 ? '<span class="red-dot"></span>' : ''}
          </button>
          <button class="nav-item ${this.tab === 'hangar' ? 'active' : ''}" data-tab="hangar">
            ${svgIcon('ships', 18)}
            <span>HANGAR</span>
          </button>
          <button class="nav-item battle-center ${this.tab === 'battle' ? 'active' : ''}" data-tab="battle">
            ${svgIcon('play', 18)}
            <span>BATTLE</span>
          </button>
          <button class="nav-item ${this.tab === 'talents' ? 'active' : ''}" data-tab="talents">
            ${svgIcon('matrix', 17)}
            <span>TALENTS</span>
            ${canBuyTalent ? '<span class="red-dot"></span>' : ''}
          </button>
          <button class="nav-item ${this.tab === 'trials' ? 'active' : ''}" data-tab="trials">
            ${svgIcon('trophy', 17)}
            <span>TRIALS</span>
          </button>
        </nav>

        ${modalHtml}
      </div>
    `;

    this.bindHubEvents();
    this.hydrateCoatedCanvases();
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

    return `
      <div class="battle-tab">
        <div class="brand-header">
          <div class="brand-wordmark">STILLPOINT</div>
        </div>

        <div class="chapter-carousel">
          <button class="carousel-arrow" id="btn-sec-prev" aria-label="Previous Sector">
            ${svgIcon('back', 15)}
          </button>

          <div class="chapter-card" style="border-color:${secUnlocked ? sector.accent : 'var(--line)'}">
            <div class="chapter-art-wrap">
              <img src="${sectorBannerUrl(secId)}" class="chapter-art ${secUnlocked ? '' : 'locked'}" alt="${sector.name}" draggable="false" />
              <div class="chapter-grad"></div>
              <div class="chapter-top-badges">
                <span class="ch-pill" style="color:${sector.accent};border-color:${sector.accent}">${sector.code}</span>
                <span class="ch-pill" style="color:var(--gold)">
                  ${secCleared ? '★ ' : ''}${totalMult.toFixed(1)}×
                </span>
              </div>
            </div>
            <div class="chapter-footer">
              <div class="chapter-title">${sector.name}</div>
              <div class="boss-mini">
                <button class="heat-pill ${heatCount > 0 ? 'hot' : ''}" id="btn-heat">
                  HEAT ${heatCount}
                </button>
                <div class="boss-thumb">
                  <img src="${bossArtForSector(secId)}" width="20" height="20" class="art-img" alt="" />
                </div>
              </div>
            </div>
          </div>

          <button class="carousel-arrow" id="btn-sec-next" aria-label="Next Sector">
            ${svgIcon('chevron', 15)}
          </button>
        </div>

        <div class="hero-stage" id="btn-go-hangar" style="border-left-color:${rarColor}">
          <div class="hero-ship-wrap">
            <canvas class="coated-canvas hero-ship-img" width="144" height="144" data-vid="${vessel.id}" data-cuid="${coating.uid}"></canvas>
          </div>
          <div class="hero-info">
            <div class="hero-name-row">
              <span class="hero-name">${vessel.name}</span>
              <div style="display:flex;gap:4px">
                <div class="r-frame ${rarityForVessel(vessel.id)}" style="width:30px;height:30px">
                  ${artIconImg(vessel.starterWeapon, 20)}
                </div>
                <div class="r-frame ${rarityForCore(core.id)}" style="width:30px;height:30px">
                  ${coreIconImg(core.id, 20)}
                </div>
              </div>
            </div>
            <div class="hero-stats">
              <span class="stat-chip" style="color:${core.accent};border-color:${core.accent}66">${core.name}</span>
              <span class="stat-chip" style="color:${rarColor};border-color:${rarColor}66">${finish.name} · ${wear.code}</span>
            </div>
          </div>
        </div>

        ${
          secUnlocked
            ? `<button class="battle-btn" id="btn-play">${svgIcon('play', 17, '#161108')}<span>DEPLOY</span></button>`
            : `<button class="battle-btn unlock-btn" id="btn-unlock-sec" ${canUnlockSec ? '' : 'disabled'}>
                 ${artIconImg('shard', 18)}<span>UNLOCK · ${sector.unlockCost}</span>
               </button>`
        }
      </div>
    `;
  }

  private buildHangarTab(): string {
    const vessel = VESSELS[this.save.selectedVessel];
    const core = CORES[this.save.selectedCore];
    const coating = getEquippedCoating(this.save);
    const maxHp = vessel.stats.maxHp + (this.save.upgrades.hull_integrity ?? 0) * 14;

    const subContent =
      this.hangarSub === 'ships'
        ? `<div class="equip-grid">${VESSEL_ORDER.map((vid) => {
            const v = VESSELS[vid];
            const unlocked = this.save.unlockedVessels.includes(vid);
            const selected = this.save.selectedVessel === vid;
            const tier = rarityForVessel(vid);
            return `
              <button class="r-frame equip-card ${tier} ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-ship="${vid}">
                ${
                  unlocked
                    ? `<canvas class="coated-canvas equip-thumb" width="116" height="116" data-vid="${vid}" data-cuid="${coating.uid}"></canvas>`
                    : `<img src="${shipArtUrl(vid)}" class="equip-thumb" alt="${v.name}" />`
                }
                <div class="equip-name">${v.name}</div>
                <div class="equip-cost">
                  ${unlocked ? (selected ? svgIcon('check', 12, '#dfa436') : '') : `${artIconImg('shard', 11)}${v.unlockCost}`}
                </div>
              </button>
            `;
          }).join('')}</div>`
        : `<div class="trial-list">${CORE_ORDER.map((cid) => {
            const c = CORES[cid];
            const unlocked = this.save.unlockedCores.includes(cid);
            const selected = this.save.selectedCore === cid;
            const canBuy = !unlocked && this.save.shards >= c.unlockCost;
            return `
              <button class="talent-row ${selected ? 'unlocked' : ''}" data-core="${cid}" style="text-align:left;${selected ? `border-color:${c.accent}` : ''}">
                <div class="r-frame talent-node ${rarityForCore(cid)}">
                  ${coreIconImg(cid, 26)}
                </div>
                <div class="talent-body">
                  <div class="talent-name" style="color:${c.accent}">${c.name}</div>
                  <div class="talent-stat">${c.shortDesc}</div>
                </div>
                <span class="buy-pill ${canBuy ? 'ready' : ''}">
                  ${unlocked ? (selected ? svgIcon('check', 13, '#dfa436') : 'USE') : `${artIconImg('shard', 11)}${c.unlockCost}`}
                </span>
              </button>
            `;
          }).join('')}</div>`;

    return `
      <div class="bay-preview">
        <canvas class="coated-canvas bay-ship-big" width="156" height="156" data-vid="${vessel.id}" data-cuid="${coating.uid}"></canvas>
        <div class="hero-info">
          <div class="hero-name-row">
            <span class="hero-name">${vessel.name}</span>
            <button class="icon-square" id="btn-randomize" style="width:30px;height:30px" aria-label="Randomize Build">
              ${svgIcon('reroll', 14)}
            </button>
          </div>
          <div class="talent-stat">${this.hangarSub === 'ships' ? vessel.perkShort : core.shortDesc}</div>
          <div class="hero-stats">
            <span class="stat-chip">HP ${maxHp}</span>
            <span class="stat-chip" style="color:${core.accent}">${core.name}</span>
          </div>
        </div>
      </div>

      <div class="subtab-row">
        <button class="subtab-btn ${this.hangarSub === 'ships' ? 'active' : ''}" data-hsub="ships">SHIPS</button>
        <button class="subtab-btn ${this.hangarSub === 'cores' ? 'active' : ''}" data-hsub="cores">CORES</button>
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
          CRATES${totalCrates > 0 ? ` (${totalCrates})` : ''}
        </button>
        <button class="subtab-btn ${this.armorySub === 'locker' ? 'active' : ''}" data-asub="locker">
          LOCKER (${this.save.coatings.length})
        </button>
        <button class="subtab-btn ${this.armorySub === 'fx' ? 'active' : ''}" data-asub="fx">
          FX
        </button>
      </div>
      ${subContent}
    `;
  }

  private buildCratesSubtab(): string {
    const canBuyStd = this.save.shards >= CRATE_COSTS.standard;
    const canBuyRelic = this.save.shards >= CRATE_COSTS.relic;
    return `
      <div class="crate-stack">
        <div class="crate-card">
          <div class="crate-top">
            <div>
              <div class="crate-title">SALVAGE CRATE</div>
              <div class="talent-stat">SEEDED PATTERN · FLOAT WEAR · 12% STRIKER</div>
            </div>
            <span class="crate-count" style="color:${this.save.standardCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
              ×${this.save.standardCrates}
            </span>
          </div>
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
          <div class="crate-actions">
            <button class="battle-btn" style="height:40px;font-size:13px" id="btn-open-std" ${this.save.standardCrates > 0 ? '' : 'disabled'}>
              OPEN
            </button>
            <button class="ghost-btn" style="height:40px" id="btn-buy-std" ${canBuyStd ? '' : 'disabled'}>
              ${artIconImg('shard', 14)} ${CRATE_COSTS.standard}
            </button>
          </div>
        </div>

        <div class="crate-card relic">
          <div class="crate-top">
            <div>
              <div class="crate-title" style="color:var(--gold)">CLASSIFIED CRATE</div>
              <div class="talent-stat">HIGH COVERT / ★ ODDS · 22% STRIKER</div>
            </div>
            <span class="crate-count" style="color:${this.save.relicCrates > 0 ? 'var(--gold)' : 'var(--muted)'}">
              ×${this.save.relicCrates}
            </span>
          </div>
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
          <div class="crate-actions">
            <button class="battle-btn rust-btn" style="height:40px;font-size:13px" id="btn-open-relic" ${this.save.relicCrates > 0 ? '' : 'disabled'}>
              OPEN
            </button>
            <button class="ghost-btn" style="height:40px" id="btn-buy-relic" ${canBuyRelic ? '' : 'disabled'}>
              ${artIconImg('shard', 14)} ${CRATE_COSTS.relic}
            </button>
          </div>
        </div>

        <div class="trial-card" style="border-left:3px solid var(--muted)">
          <div class="talent-stat">DROP SOURCES · BOSS KILLS · RELIC HAULERS · HEAT 2+ BOSSES</div>
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
              ${item.striker ? '<span class="st-badge">ST</span>' : equipped ? '<span style="color:var(--gold)">EQ</span>' : ''}
            </div>
            <canvas class="coated-canvas" width="96" height="96" style="width:62px;height:62px" data-vid="${vesselId}" data-cuid="${item.uid}"></canvas>
            <div class="coating-name" style="color:${rar.color}">${def.name}</div>
            <div class="coating-seed">#${String(item.seed).padStart(3, '0')} · ${item.floatVal.toFixed(2)}</div>
          </button>
        `;
      })
      .join('');

    return `
      <div class="locker-toolbar">
        <button class="buy-pill ${this.forgeMode ? 'ready' : ''}" id="btn-toggle-forge">
          ${this.forgeMode ? `FORGE ${this.forgeSelection.length}/5` : 'FORGE 5→1'}
        </button>
        ${
          this.forgeMode && this.forgeSelection.length === 5 && nextTier
            ? `<button class="buy-pill ready" id="btn-exec-forge" style="background:linear-gradient(180deg,#e06a34,#b53f16);color:#1a0904">
                 CRAFT ${RARITY_META[nextTier].label}
               </button>`
            : `<span class="talent-stat">${this.forgeMode ? 'PICK 5 SAME TIER' : 'TAP TO INSPECT'}</span>`
        }
      </div>
      <div class="locker-grid">${tiles}</div>
    `;
  }

  private buildFxSubtab(): string {
    const trailsHtml = TRAIL_ORDER.map((tid) => {
      const t = TRAILS[tid];
      const owned = this.save.unlockedTrails.includes(tid);
      const selected = this.save.selectedTrail === tid;
      return `
        <button class="fx-card ${selected ? 'selected' : ''}" data-trail="${tid}">
          <span class="fx-dot" style="background:radial-gradient(circle, ${t.coreColor}, ${t.color})"></span>
          <div style="flex:1;min-width:0">
            <div class="equip-name">${t.name}</div>
            <div class="equip-cost">
              ${owned ? (selected ? 'ACTIVE' : 'OWNED') : `${artIconImg('shard', 11)}${t.cost}`}
            </div>
          </div>
        </button>
      `;
    }).join('');

    const parryHtml = PARRY_FX_ORDER.map((pid) => {
      const pf = PARRY_FX[pid];
      const owned = this.save.unlockedParryFx.includes(pid);
      const selected = this.save.selectedParryFx === pid;
      return `
        <button class="fx-card ${selected ? 'selected' : ''}" data-parryfx="${pid}">
          <span class="fx-dot" style="background:transparent;border:3px solid ${pf.outer};box-shadow:inset 0 0 0 2px ${pf.inner}"></span>
          <div style="flex:1;min-width:0">
            <div class="equip-name">${pf.name}</div>
            <div class="equip-cost">
              ${owned ? (selected ? 'ACTIVE' : 'OWNED') : `${artIconImg('shard', 11)}${pf.cost}`}
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="fx-section-title">THRUSTER EXHAUST</div>
      <div class="fx-grid">${trailsHtml}</div>
      <div class="fx-section-title">STILLPOINT AURA</div>
      <div class="fx-grid">${parryHtml}</div>
    `;
  }

  private buildCrateReelModal(): string {
    const items = this.reelItems ?? [];
    const strip = items
      .map((item, idx) => {
        const def = FINISHES[item.finishId];
        const rar = RARITY_META[def.rarity];
        const isGold = def.rarity === 'contraband';
        return `
          <div class="reel-item" style="border-bottom-color:${rar.color}">
            ${
              isGold
                ? `<div class="reel-swatch" style="display:flex;align-items:center;justify-content:center;background:#261d0e;color:var(--gold);font-size:26px;font-weight:700">★</div>`
                : `<canvas class="reel-swatch" width="66" height="54" data-reel-idx="${idx}"></canvas>`
            }
            <div class="reel-label" style="color:${rar.color}">${isGold ? 'RELIC ★' : def.name}</div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-head">
            <div class="modal-title" style="color:var(--gold)">
              ${this.reelCrateKind === 'relic' ? 'CLASSIFIED CRATE' : 'SALVAGE CRATE'}
            </div>
            <button class="buy-pill" id="btn-skip-reel">SKIP</button>
          </div>
          <div class="reel-viewport">
            <div class="reel-pointer"></div>
            <div class="reel-track" id="reel-track">${strip}</div>
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
            <div>
              <div class="talent-stat" style="color:${rar.color};font-weight:800">${rar.label}</div>
              <div class="modal-title">${def.name}</div>
            </div>
            <button class="buy-pill" id="btn-cycle-ship">${VESSELS[previewVid].name}</button>
          </div>

          <div class="inspect-stage" id="btn-inspect-ship">
            <canvas class="coated-canvas inspect-ship" width="240" height="240" data-vid="${previewVid}" data-cuid="${item.uid}"></canvas>
            ${item.specialTag ? `<span class="special-pill">${item.specialTag}</span>` : ''}
          </div>

          <div class="float-gauge">
            <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;font-weight:800">
              <span style="color:${wear.color}">${wear.label} (${wear.code})</span>
              <span>${item.floatVal.toFixed(4)}</span>
            </div>
            <div class="float-bar-wrap">
              <div class="float-pin" style="left:${(item.floatVal * 100).toFixed(2)}%"></div>
            </div>
          </div>

          <div class="inspect-meta-grid">
            <div class="meta-cell">
              <span class="meta-k">PATTERN</span>
              <span class="meta-v">#${String(item.seed).padStart(3, '0')}</span>
            </div>
            <div class="meta-cell">
              <span class="meta-k">TRACKER</span>
              <span class="meta-v" style="color:${item.striker ? '#e8842c' : 'var(--muted)'}">
                ${item.striker ? `ST ${String(item.kills).padStart(5, '0')}` : 'NONE'}
              </span>
            </div>
            <div class="meta-cell">
              <span class="meta-k">SCRAP</span>
              <span class="meta-v" style="color:var(--gold)">${isStarter ? '—' : `+${scrapVal}`}</span>
            </div>
          </div>

          <div class="crate-actions">
            <button class="battle-btn" style="height:42px;font-size:13px" id="btn-equip-coat" ${equipped ? 'disabled' : ''}>
              ${equipped ? 'EQUIPPED' : 'EQUIP'}
            </button>
            <button class="ghost-btn" style="height:42px;color:${isStarter ? 'var(--muted)' : '#f0655d'}" id="btn-scrap-coat" ${isStarter ? 'disabled' : ''}>
              SCRAP · +${scrapVal}
            </button>
          </div>
          <button class="ghost-btn" id="btn-close-inspect">CLOSE</button>
        </div>
      </div>
    `;
  }

  private buildTalentsTab(): string {
    const rows = META_UPGRADES.map((u) => {
      const lv = this.save.upgrades[u.id] ?? 0;
      const maxed = lv >= u.maxLevel;
      const cost = getMetaUpgradeCost(u, lv);
      const canBuy = !maxed && this.save.shards >= cost;
      const tier = rarityForLevel(Math.max(1, lv), maxed);
      const pips = Array.from({ length: u.maxLevel }, (_, i) =>
        `<span class="pip ${i < lv ? 'on' : ''}"></span>`
      ).join('');
      return `
        <div class="talent-row ${lv > 0 ? 'unlocked' : ''}">
          <div class="r-frame talent-node ${tier}">
            ${artIconImg(TALENT_ICON_KEYS[u.id], 26)}
          </div>
          <div class="talent-body">
            <div class="talent-name">${u.name}</div>
            <div class="talent-stat">${u.perLevelShort}</div>
            <div class="pips">${pips}</div>
          </div>
          <button class="buy-pill ${canBuy ? 'ready' : ''}" data-buy-meta="${u.id}" ${canBuy ? '' : 'disabled'}>
            ${maxed ? 'MAX' : `${artIconImg('shard', 12)}${cost}`}
          </button>
        </div>
      `;
    }).join('');

    return `<div class="talent-tree">${rows}</div>`;
  }

  private buildTrialsTab(): string {
    const rows = MILESTONES.map((m) => {
      const st = m.check(this.save);
      const done = this.save.claimedMilestones.includes(m.id) || st.done;
      const pct = Math.min(100, (st.current / Math.max(1, st.target)) * 100);
      const reward = m.rewardLabel ? `${m.rewardLabel} · +${m.rewardShards}` : `+${m.rewardShards}`;
      return `
        <div class="trial-card ${done ? 'done' : ''}">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <div class="r-frame ${done ? 'gold' : 'common'}" style="width:34px;height:34px">
              ${svgIcon(done ? 'check' : 'trophy', 15, done ? '#dfa436' : '#8f8779')}
            </div>
            <div style="min-width:0">
              <div class="talent-name">${m.name}</div>
              <div class="talent-stat">${m.goalText} · ${Math.min(st.current, st.target).toLocaleString()}/${st.target.toLocaleString()}</div>
              <div class="trial-bar"><div class="trial-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
            </div>
          </div>
          <span class="talent-stat" style="color:${done ? 'var(--gold)' : 'var(--muted)'};font-weight:800;flex-shrink:0;text-align:right">${reward}</span>
        </div>
      `;
    }).join('');

    return `<div class="trial-list">${rows}</div>`;
  }

  private buildHeatModal(): string {
    const bonusPct = this.save.activeHeat.length * 25;
    const rows = HEAT_ORDER.map((hid) => {
      const h = HEAT_MODS[hid];
      const on = this.save.activeHeat.includes(hid);
      return `
        <button class="trial-card ${on ? 'done' : ''}" data-heat="${hid}" style="width:100%;text-align:left;${on ? `border-color:${h.accent};border-left-color:${h.accent}` : ''}">
          <div>
            <div class="talent-name" style="color:${on ? h.accent : 'var(--ink)'}">${h.name}</div>
            <div class="talent-stat">${h.shortDesc}</div>
          </div>
          <span class="buy-pill ${on ? 'ready' : ''}">+25%</span>
        </button>
      `;
    }).join('');

    return `
      <div class="modal-backdrop" id="heat-bg">
        <div class="modal-box" style="border-top-color:var(--rust)">
          <div class="modal-head">
            <div class="modal-title" style="color:var(--rust)">HEAT</div>
            <span class="ch-pill" style="color:var(--gold)">+${bonusPct}% SHARDS</span>
          </div>
          <div class="trial-list">${rows}</div>
          <button class="ghost-btn" id="btn-close-heat">DONE</button>
        </div>
      </div>
    `;
  }

  private buildSettingsModal(): string {
    const s = this.save.settings;
    return `
      <div class="modal-backdrop" id="settings-bg">
        <div class="modal-box">
          <div class="modal-head"><div class="modal-title">SETTINGS</div></div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" data-toggle="music">${svgIcon('music', 15)} <span>MUSIC</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" data-toggle="sfx">${svgIcon('sfx', 15)} <span>SFX</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" data-toggle="haptics">${svgIcon('haptics', 15)} <span>HAPTICS</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" data-toggle="reduceFlash">${svgIcon('flash', 15)} <span>LOW FLASH</span></button>
          </div>
          <button class="ghost-btn" id="btn-close-settings">DONE</button>
        </div>
      </div>
    `;
  }

  private beginCrateRoll(kind: 'standard' | 'relic'): void {
    if (kind === 'standard') {
      if (this.save.standardCrates <= 0) return;
      this.save.standardCrates--;
    } else {
      if (this.save.relicCrates <= 0) return;
      this.save.relicCrates--;
    }
    const winner = rollCoatingFromCrate(kind);
    this.save.coatings.unshift(winner);
    persistMetaSave(this.save);

    const items: CoatingItem[] = [];
    for (let i = 0; i < 36; i++) {
      items.push(i === 27 ? winner : rollCoatingFromCrate(kind));
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

    // Paint procedural pattern swatches into reel tiles
    this.container.querySelectorAll<HTMLCanvasElement>('[data-reel-idx]').forEach((cv) => {
      const idx = Number(cv.dataset.reelIdx);
      const item = items[idx];
      if (!item) return;
      const swatch = renderPatternCanvas(item.finishId, item.seed, item.floatVal, 66);
      const ctx = cv.getContext('2d');
      ctx?.drawImage(swatch, 0, 0, cv.width, cv.height);
    });

    const itemStride = 98; // 92px width + 6px gap
    const winIdx = 27;
    const jitter = (Math.random() - 0.5) * 62; // authentic CS:GO near-miss landing offset!
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
      const rar = RARITY_META[FINISHES[winner.finishId].rarity];
      sound.playCrateReveal(rar.order);
      bridge.haptic(rar.order >= 3 ? 'heavy' : 'success');
      this.reelItems = null;
      this.reelWinner = null;
      this.inspectUid = winner.uid;
      this.inspectVesselIdx = Math.max(0, VESSEL_ORDER.indexOf(this.save.selectedVessel));
      this.armorySub = 'locker';
      this.renderHub();
    };

    this.container.querySelector('#btn-skip-reel')?.addEventListener('click', () => {
      finishRoll();
    });

    const step = (now: number) => {
      if (finished) return;
      const t = Math.min(1, (now - startTs) / duration);
      // Quintic ease-out for suspenseful slowing across the last 5 tiles!
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

  private hydrateCoatedCanvases(): void {
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
  }

  private bindHubEvents(): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as HubTab;
        this.forgeMode = false;
        this.forgeSelection = [];
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelector('#btn-top-crates')?.addEventListener('click', () => {
      this.tab = 'armory';
      this.armorySub = 'crates';
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-hsub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hangarSub = btn.dataset.hsub as HangarSub;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-asub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.armorySub = btn.dataset.asub as ArmorySub;
        this.forgeMode = false;
        this.forgeSelection = [];
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

    // Crates
    this.container.querySelector('#btn-open-std')?.addEventListener('click', () => this.beginCrateRoll('standard'));
    this.container.querySelector('#btn-open-relic')?.addEventListener('click', () => this.beginCrateRoll('relic'));
    this.container.querySelector('#btn-buy-std')?.addEventListener('click', () => {
      if (buyCrate(this.save, 'standard')) {
        sound.playLevelUp();
        bridge.haptic('success');
        this.renderHub(true);
      }
    });
    this.container.querySelector('#btn-buy-relic')?.addEventListener('click', () => {
      if (buyCrate(this.save, 'relic')) {
        sound.playLevelUp();
        bridge.haptic('success');
        this.renderHub(true);
      }
    });

    // Locker + Trade-Up Forge
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
        this.showToast(`SCRAPPED · +${got} SHARDS`);
        this.renderHub(true);
      }
    });

    // Trails & Stillpoint Aura FX
    this.container.querySelectorAll<HTMLButtonElement>('[data-trail]').forEach((b) => {
      b.addEventListener('click', () => {
        const tid = b.dataset.trail as TrailId;
        const t = TRAILS[tid];
        if (this.save.unlockedTrails.includes(tid)) {
          this.save.selectedTrail = tid;
          persistMetaSave(this.save);
          bridge.haptic('light');
          this.renderHub(true);
        } else if (this.save.shards >= t.cost) {
          this.save.shards -= t.cost;
          this.save.unlockedTrails.push(tid);
          this.save.selectedTrail = tid;
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub(true);
        } else {
          bridge.haptic('warning');
          this.showToast(`NEED ${t.cost} SHARDS`);
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-parryfx]').forEach((b) => {
      b.addEventListener('click', () => {
        const pid = b.dataset.parryfx as ParryFxId;
        const pf = PARRY_FX[pid];
        if (this.save.unlockedParryFx.includes(pid)) {
          this.save.selectedParryFx = pid;
          persistMetaSave(this.save);
          bridge.haptic('light');
          this.renderHub(true);
        } else if (this.save.shards >= pf.cost) {
          this.save.shards -= pf.cost;
          this.save.unlockedParryFx.push(pid);
          this.save.selectedParryFx = pid;
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub(true);
        } else {
          bridge.haptic('warning');
          this.showToast(`NEED ${pf.cost} SHARDS`);
        }
      });
    });

    // Sector Carousel & Battle
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

    // Ships & Cores
    this.container.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach((b) => {
      b.addEventListener('click', () => {
        const vid = b.dataset.ship as VesselId;
        const v = VESSELS[vid];
        if (this.save.unlockedVessels.includes(vid)) {
          this.actions.onSelectVessel(vid);
          bridge.haptic('light');
          this.renderHub(true);
        } else if (this.save.shards >= v.unlockCost) {
          this.save.shards -= v.unlockCost;
          this.save.unlockedVessels.push(vid);
          this.actions.onSelectVessel(vid);
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub(true);
        } else {
          bridge.haptic('warning');
          this.showToast(`NEED ${v.unlockCost} SHARDS`);
        }
      });
    });

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
          this.showToast(`NEED ${c.unlockCost} SHARDS`);
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-buy-meta]').forEach((b) => {
      b.addEventListener('click', () => {
        if (buyMetaUpgrade(this.save, b.dataset.buyMeta as MetaUpgradeId)) {
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub(true);
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
          <div class="modal-head"><div class="modal-title">PAUSED</div></div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" id="p-music">${svgIcon('music', 15)} <span>MUSIC</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" id="p-sfx">${svgIcon('sfx', 15)} <span>SFX</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" id="p-haptics">${svgIcon('haptics', 15)} <span>HAPTICS</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" id="p-flash">${svgIcon('flash', 15)} <span>LOW FLASH</span></button>
          </div>
          <button class="battle-btn" id="btn-resume">RESUME</button>
          <button class="ghost-btn" id="btn-quit">ABORT</button>
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
              ${isVictory ? 'SECTOR CLEAR' : 'SIGNAL LOST'}
            </div>
            <div style="display:flex;gap:5px">
              ${totalRunCrates > 0 ? `<div class="currency-pill crate-pill">+${totalRunCrates} CRATE</div>` : ''}
              <div class="currency-pill" style="color:var(--gold)">
                ${artIconImg('shard', 14)} +${st.shardsEarned}
              </div>
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
              ? `<button class="battle-btn" id="btn-endless">ENDLESS</button>`
              : `<button class="battle-btn" id="btn-retry">REDEPLOY</button>`
          }
          <button class="ghost-btn" id="btn-home">${totalRunCrates > 0 ? 'OPEN CRATES' : 'HANGAR'}</button>
        </div>
      </div>
    `;

    this.hydrateCoatedCanvases();
    this.container.querySelector('#btn-endless')?.addEventListener('click', () => this.actions.onContinueEndless());
    this.container.querySelector('#btn-retry')?.addEventListener('click', () => this.actions.onStartRun());
    this.container.querySelector('#btn-home')!.addEventListener('click', () => {
      this.tab = totalRunCrates > 0 ? 'armory' : 'battle';
      if (totalRunCrates > 0) this.armorySub = 'crates';
      this.actions.onQuitToMenu();
    });
  }
}
