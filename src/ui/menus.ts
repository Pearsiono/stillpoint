import { sound } from '../audio';
import { bridge } from '../bridge';
import { CORE_ORDER, CORES, HEAT_MODS, HEAT_ORDER, RELICS } from '../data/builds';
import {
  buyMetaUpgrade,
  getMetaUpgradeCost,
  META_UPGRADES,
  MILESTONES,
  persistMetaSave
} from '../data/meta';
import { SECTOR_ORDER, SECTORS } from '../data/sectors';
import { SKIN_ORDER, SKINS } from '../data/skins';
import { VESSEL_ORDER, VESSELS } from '../data/vessels';
import {
  CoreId,
  GamePhase,
  HeatId,
  MetaSave,
  MetaUpgradeId,
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
  rarityForCore,
  rarityForLevel,
  rarityForSkin,
  rarityForVessel,
  sectorBannerUrl,
  shipArtUrl,
  skinCssFilter
} from './artIcons';
import { formatTime, renderUpgradeDraftHtml } from './hud';
import { svgIcon } from './icons';

type HubTab = 'skins' | 'hangar' | 'battle' | 'talents' | 'trials';
type HangarSub = 'ships' | 'cores';

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
  private tab: HubTab = 'battle';
  private hangarSub: HangarSub = 'ships';
  private browsingSectorIdx = 0;
  private settingsOpen = false;
  private heatOpen = false;
  private toastEl: HTMLDivElement | null = null;
  private toastTimer = 0;

  constructor(parent: HTMLElement, save: MetaSave, actions: OverlayActions) {
    this.container = document.createElement('div');
    this.save = save;
    this.actions = actions;
    this.browsingSectorIdx = Math.max(0, SECTOR_ORDER.indexOf(save.selectedSector));
    parent.appendChild(this.container);
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
    if (phase === 'playing') {
      this.settingsOpen = false;
      this.heatOpen = false;
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

  private renderHub(): void {
    const canBuyTalent = META_UPGRADES.some((u) => {
      const lv = this.save.upgrades[u.id] ?? 0;
      return lv < u.maxLevel && this.save.shards >= getMetaUpgradeCost(u, lv);
    });

    const bodyHtml =
      this.tab === 'battle'
        ? this.buildBattleTab()
        : this.tab === 'hangar'
          ? this.buildHangarTab()
          : this.tab === 'skins'
            ? this.buildSkinsTab()
            : this.tab === 'talents'
              ? this.buildTalentsTab()
              : this.buildTrialsTab();

    const modalHtml = this.settingsOpen
      ? this.buildSettingsModal()
      : this.heatOpen
        ? this.buildHeatModal()
        : '';

    this.container.innerHTML = `
      <div class="hub-shell">
        <div class="hub-topbar">
          <div class="currency-pill">
            ${artIconImg('shard', 20)}
            <span>${this.save.shards.toLocaleString()}</span>
          </div>
          <div class="topbar-actions">
            <button class="icon-square ${this.save.settings.music ? '' : 'muted'}" id="btn-quick-mute" aria-label="Mute Music">
              ${svgIcon('music', 16)}
            </button>
            <button class="icon-square" id="btn-settings" aria-label="Settings">
              ${svgIcon('gear', 16)}
            </button>
          </div>
        </div>

        <div class="hub-content">${bodyHtml}</div>

        <nav class="bottom-nav">
          <button class="nav-item ${this.tab === 'skins' ? 'active' : ''}" data-tab="skins">
            ${svgIcon('skins', 19)}
            <span>SKINS</span>
          </button>
          <button class="nav-item ${this.tab === 'hangar' ? 'active' : ''}" data-tab="hangar">
            ${svgIcon('ships', 19)}
            <span>HANGAR</span>
          </button>
          <button class="nav-item battle-center ${this.tab === 'battle' ? 'active' : ''}" data-tab="battle">
            ${svgIcon('play', 19)}
            <span>BATTLE</span>
          </button>
          <button class="nav-item ${this.tab === 'talents' ? 'active' : ''}" data-tab="talents">
            ${svgIcon('matrix', 18)}
            <span>TALENTS</span>
            ${canBuyTalent ? '<span class="red-dot"></span>' : ''}
          </button>
          <button class="nav-item ${this.tab === 'trials' ? 'active' : ''}" data-tab="trials">
            ${svgIcon('trophy', 18)}
            <span>TRIALS</span>
          </button>
        </nav>

        ${modalHtml}
      </div>
    `;

    this.bindHubEvents();
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
    const skinFilter = skinCssFilter(this.save.selectedSkin);

    return `
      <div class="battle-tab">
        <div class="brand-wordmark">STILLPOINT</div>

        <div class="chapter-carousel">
          <button class="carousel-arrow" id="btn-sec-prev" aria-label="Previous Sector">
            ${svgIcon('back', 16)}
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
                  <img src="${bossArtForSector(secId)}" width="22" height="22" class="art-img" alt="" />
                </div>
              </div>
            </div>
          </div>

          <button class="carousel-arrow" id="btn-sec-next" aria-label="Next Sector">
            ${svgIcon('chevron', 16)}
          </button>
        </div>

        <div class="hero-stage" id="btn-go-hangar">
          <div class="hero-ship-wrap">
            <img src="${shipArtUrl(vessel.id)}" class="hero-ship-img" style="filter:${skinFilter}" alt="${vessel.name}" />
          </div>
          <div class="hero-info">
            <div class="hero-name-row">
              <span class="hero-name">${vessel.name}</span>
              <div style="display:flex;gap:5px">
                <div class="r-frame ${rarityForVessel(vessel.id)}" style="width:32px;height:32px">
                  ${artIconImg(vessel.starterWeapon, 22)}
                </div>
                <div class="r-frame ${rarityForCore(core.id)}" style="width:32px;height:32px">
                  ${coreIconImg(core.id, 22)}
                </div>
              </div>
            </div>
            <div class="hero-stats">
              <span class="stat-chip" style="color:${core.accent};border-color:${core.accent}66">${core.name}</span>
              <span class="stat-chip">${SKINS[this.save.selectedSkin].name}</span>
            </div>
          </div>
        </div>

        ${
          secUnlocked
            ? `<button class="battle-btn" id="btn-play">${svgIcon('play', 18, '#171004')}<span>PLAY</span></button>`
            : `<button class="battle-btn unlock-btn" id="btn-unlock-sec" ${canUnlockSec ? '' : 'disabled'}>
                 ${artIconImg('shard', 20)}<span>UNLOCK · ${sector.unlockCost}</span>
               </button>`
        }
      </div>
    `;
  }

  private buildHangarTab(): string {
    const vessel = VESSELS[this.save.selectedVessel];
    const core = CORES[this.save.selectedCore];
    const skinFilter = skinCssFilter(this.save.selectedSkin);
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
                <img src="${shipArtUrl(vid)}" class="equip-thumb" style="${unlocked ? `filter:${skinFilter}` : ''}" alt="${v.name}" />
                <div class="equip-name">${v.name}</div>
                <div class="equip-cost">
                  ${unlocked ? (selected ? svgIcon('check', 12, '#ffffff') : '') : `${artIconImg('shard', 12)}${v.unlockCost}`}
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
                  ${coreIconImg(cid, 28)}
                </div>
                <div class="talent-body">
                  <div class="talent-name" style="color:${c.accent}">${c.name}</div>
                  <div class="talent-stat">${c.shortDesc}</div>
                </div>
                <span class="buy-pill ${canBuy ? 'ready' : ''}">
                  ${unlocked ? (selected ? svgIcon('check', 13, '#ffffff') : 'USE') : `${artIconImg('shard', 12)}${c.unlockCost}`}
                </span>
              </button>
            `;
          }).join('')}</div>`;

    return `
      <div class="bay-preview">
        <img src="${shipArtUrl(vessel.id)}" class="bay-ship-big" style="filter:${skinFilter}" alt="${vessel.name}" />
        <div class="hero-info">
          <div class="hero-name-row">
            <span class="hero-name">${vessel.name}</span>
            <button class="icon-square" id="btn-randomize" style="width:32px;height:32px" aria-label="Randomize Build">
              ${svgIcon('reroll', 15)}
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

  private buildSkinsTab(): string {
    const vessel = VESSELS[this.save.selectedVessel];
    const activeSkin = SKINS[this.save.selectedSkin];
    const activeFilter = skinCssFilter(activeSkin.id);

    const tiles = SKIN_ORDER.map((sid) => {
      const s = SKINS[sid];
      const unlocked = this.save.unlockedSkins.includes(sid);
      const selected = this.save.selectedSkin === sid;
      const tier = rarityForSkin(sid);
      return `
        <button class="r-frame skin-card ${tier} ${selected ? 'selected' : ''}" data-skin="${sid}">
          <img src="${shipArtUrl(vessel.id)}" class="skin-ship-mini" style="filter:${skinCssFilter(sid)}" alt="${s.name}" />
          <div style="flex:1;min-width:0">
            <div class="equip-name">${s.name}</div>
            <div class="equip-cost" style="margin-top:3px">
              ${unlocked ? (selected ? 'EQUIPPED' : 'OWNED') : `${artIconImg('shard', 12)}${s.unlockCost}`}
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="bay-preview">
        <img src="${shipArtUrl(vessel.id)}" class="bay-ship-big" style="filter:${activeFilter}" alt="${activeSkin.name}" />
        <div class="hero-info">
          <div class="hero-name">${activeSkin.name}</div>
          <div class="hero-stats">
            <span class="stat-chip" style="border-color:${activeSkin.accent};color:${activeSkin.accent}">${vessel.name}</span>
          </div>
        </div>
      </div>

      <div class="skin-cards-grid">${tiles}</div>
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
            ${artIconImg(TALENT_ICON_KEYS[u.id], 28)}
          </div>
          <div class="talent-body">
            <div class="talent-name">${u.name}</div>
            <div class="talent-stat">${u.perLevelShort}</div>
            <div class="pips">${pips}</div>
          </div>
          <button class="buy-pill ${canBuy ? 'ready' : ''}" data-buy-meta="${u.id}" ${canBuy ? '' : 'disabled'}>
            ${maxed ? 'MAX' : `${artIconImg('shard', 13)}${cost}`}
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
          <div style="display:flex;align-items:center;gap:10px">
            <div class="r-frame ${done ? 'gold' : 'common'}" style="width:36px;height:36px">
              ${svgIcon(done ? 'check' : 'trophy', 16, done ? '#ebb644' : '#8b8f9c')}
            </div>
            <div>
              <div class="talent-name">${m.name}</div>
              <div class="talent-stat">${m.goalText} · ${Math.min(st.current, st.target).toLocaleString()}/${st.target.toLocaleString()}</div>
              <div class="trial-bar"><div class="trial-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
            </div>
          </div>
          <span class="talent-stat" style="color:${done ? 'var(--gold)' : 'var(--muted)'};font-weight:900">${reward}</span>
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
        <button class="trial-card ${on ? 'done' : ''}" data-heat="${hid}" style="width:100%;text-align:left;${on ? `border-color:${h.accent}` : ''}">
          <div>
            <div class="talent-name" style="color:${on ? h.accent : '#efece3'}">${h.name}</div>
            <div class="talent-stat">${h.shortDesc}</div>
          </div>
          <span class="buy-pill ${on ? 'ready' : ''}">+25%</span>
        </button>
      `;
    }).join('');

    return `
      <div class="modal-backdrop" id="heat-bg">
        <div class="modal-box">
          <div class="modal-head">
            <div class="modal-title" style="color:#ff6a26">HEAT</div>
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
            <button class="toggle-tile ${s.music ? 'on' : ''}" data-toggle="music">${svgIcon('music', 16)} <span>MUSIC</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" data-toggle="sfx">${svgIcon('sfx', 16)} <span>SFX</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" data-toggle="haptics">${svgIcon('haptics', 16)} <span>HAPTICS</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" data-toggle="reduceFlash">${svgIcon('flash', 16)} <span>LOW FLASH</span></button>
          </div>
          <button class="ghost-btn" id="btn-close-settings">DONE</button>
        </div>
      </div>
    `;
  }

  private bindHubEvents(): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as HubTab;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-hsub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hangarSub = btn.dataset.hsub as HangarSub;
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelector('#btn-quick-mute')?.addEventListener('click', () => {
      this.save.settings.music = !this.save.settings.music;
      sound.setSettings(this.save.settings.music, this.save.settings.sfx);
      persistMetaSave(this.save);
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.settingsOpen = true;
      this.renderHub();
    });

    this.container.querySelector('#btn-close-settings')?.addEventListener('click', () => {
      this.settingsOpen = false;
      this.renderHub();
    });

    this.container.querySelector('#settings-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'settings-bg') {
        this.settingsOpen = false;
        this.renderHub();
      }
    });

    this.container.querySelector('#btn-heat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.heatOpen = true;
      bridge.haptic('light');
      this.renderHub();
    });

    this.container.querySelector('#btn-close-heat')?.addEventListener('click', () => {
      this.heatOpen = false;
      this.renderHub();
    });

    this.container.querySelector('#heat-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'heat-bg') {
        this.heatOpen = false;
        this.renderHub();
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-heat]').forEach((b) => {
      b.addEventListener('click', () => {
        this.actions.onToggleHeat(b.dataset.heat as HeatId);
        bridge.haptic('light');
        this.renderHub();
      });
    });

    this.container.querySelector('#btn-randomize')?.addEventListener('click', () => {
      this.actions.onRandomizeBuild();
      bridge.haptic('medium');
      sound.playXp();
      this.renderHub();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.toggle as keyof MetaSave['settings'];
        this.save.settings[key] = !this.save.settings[key];
        sound.setSettings(this.save.settings.music, this.save.settings.sfx);
        bridge.setHapticsEnabled(this.save.settings.haptics);
        persistMetaSave(this.save);
        bridge.haptic('light');
        this.renderHub();
      });
    });

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

    this.container.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach((b) => {
      b.addEventListener('click', () => {
        const vid = b.dataset.ship as VesselId;
        const v = VESSELS[vid];
        if (this.save.unlockedVessels.includes(vid)) {
          this.actions.onSelectVessel(vid);
          bridge.haptic('light');
          this.renderHub();
        } else if (this.save.shards >= v.unlockCost) {
          this.save.shards -= v.unlockCost;
          this.save.unlockedVessels.push(vid);
          this.actions.onSelectVessel(vid);
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub();
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
          this.renderHub();
        } else if (this.save.shards >= c.unlockCost) {
          this.save.shards -= c.unlockCost;
          this.save.unlockedCores.push(cid);
          this.actions.onSelectCore(cid);
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub();
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((b) => {
      b.addEventListener('click', () => {
        const sid = b.dataset.skin as SkinId;
        const s = SKINS[sid];
        if (this.save.unlockedSkins.includes(sid)) {
          this.actions.onSelectSkin(sid);
          bridge.haptic('light');
          this.renderHub();
        } else if (this.save.shards >= s.unlockCost) {
          this.save.shards -= s.unlockCost;
          this.save.unlockedSkins.push(sid);
          this.actions.onSelectSkin(sid);
          persistMetaSave(this.save);
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub();
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-buy-meta]').forEach((b) => {
      b.addEventListener('click', () => {
        if (buyMetaUpgrade(this.save, b.dataset.buyMeta as MetaUpgradeId)) {
          bridge.haptic('success');
          sound.playLevelUp();
          this.renderHub();
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
          <button class="ghost-btn" id="btn-quit">QUIT</button>
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
      parries: 0,
      bestSingleParry: 0,
      grazes: 0,
      bossesDefeated: 0,
      shardsEarned: 0,
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

    const weaponStrip = st.weapons
      .map(
        (w) =>
          `<span class="r-frame ${rarityForLevel(w.level, w.evolved)}" style="width:32px;height:32px">${artIconImg(w.id, 22)}<span class="slot-lv">${w.evolved ? '★' : w.level}</span></span>`
      )
      .join('');
    const relicStrip = st.relics
      .map(
        (rid) =>
          `<span class="r-frame gold" style="width:28px;height:28px">${artIconImg(RELICS[rid].iconKey, 18)}</span>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-box" style="border-color:${isVictory ? 'var(--gold)' : 'var(--danger)'}">
          <div class="modal-head">
            <div class="modal-title" style="color:${isVictory ? 'var(--gold)' : '#efece3'}">
              ${isVictory ? 'VICTORY' : 'DEFEATED'}
            </div>
            <div class="currency-pill" style="padding:4px 9px;color:var(--gold)">
              ${artIconImg('shard', 16)} +${st.shardsEarned}
            </div>
          </div>

          <div class="build-strip">
            <img src="${shipArtUrl(st.vesselId)}" width="34" height="34" class="art-img" style="filter:${skinCssFilter(st.skinId)}" alt="" />
            ${weaponStrip}
            ${relicStrip}
          </div>

          <div class="summary-grid">
            <div class="summary-cell">${svgIcon('timer', 16, 'var(--muted)')}<span class="summary-num">${formatTime(st.elapsed)}</span></div>
            <div class="summary-cell">${svgIcon('trophy', 16, 'var(--muted)')}<span class="summary-num">${st.score.toLocaleString()}</span></div>
            <div class="summary-cell">${svgIcon('skull', 16, 'var(--muted)')}<span class="summary-num">${st.kills}</span></div>
            <div class="summary-cell">${svgIcon('parry', 16, 'var(--accent)')}<span class="summary-num" style="color:var(--accent)">${st.parries}</span></div>
          </div>

          ${
            isVictory
              ? `<button class="battle-btn" id="btn-endless">ENDLESS</button>`
              : `<button class="battle-btn" id="btn-retry">RETRY</button>`
          }
          <button class="ghost-btn" id="btn-home">MENU</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-endless')?.addEventListener('click', () => this.actions.onContinueEndless());
    this.container.querySelector('#btn-retry')?.addEventListener('click', () => this.actions.onStartRun());
    this.container.querySelector('#btn-home')!.addEventListener('click', () => {
      this.tab = 'battle';
      this.actions.onQuitToMenu();
    });
  }
}
