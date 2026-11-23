import { sound } from '../audio';
import { bridge } from '../bridge';
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
  GamePhase,
  MetaSave,
  MetaUpgradeId,
  RunStats,
  SectorId,
  SkinId,
  UpgradeChoice,
  VesselId
} from '../types';
import { formatTime, renderUpgradeDraftHtml } from './hud';
import { svgIcon } from './icons';

type MenuSheet = 'none' | 'ships' | 'skins' | 'sectors' | 'upgrades' | 'trophies' | 'settings';

export interface OverlayActions {
  onStartRun: () => void;
  onSelectVessel: (vessel: VesselId) => void;
  onSelectSkin: (skin: SkinId) => void;
  onSelectSector: (sector: SectorId) => void;
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
  private sheet: MenuSheet = 'none';
  private toastEl: HTMLDivElement | null = null;
  private toastTimer = 0;

  constructor(parent: HTMLElement, save: MetaSave, actions: OverlayActions) {
    this.container = document.createElement('div');
    this.save = save;
    this.actions = actions;
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
      this.sheet = 'none';
      this.actions.onSheetToggle(false);
      this.container.innerHTML = '';
      return;
    }
    if (phase === 'menu') {
      this.renderMenu();
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

  private setSheet(next: MenuSheet): void {
    this.sheet = next;
    this.actions.onSheetToggle(next !== 'none');
    this.renderMenu();
  }

  private renderMenu(): void {
    const sector = SECTORS[this.save.selectedSector];
    const canBuyUpgrade = META_UPGRADES.some((u) => {
      const lv = this.save.upgrades[u.id] ?? 0;
      return lv < u.maxLevel && this.save.shards >= getMetaUpgradeCost(u, lv);
    });

    if (this.sheet === 'none') {
      this.container.innerHTML = `
        <div class="home-shell">
          <div>
            <div class="home-top">
              <div class="shard-counter">
                ${svgIcon('shard', 14, 'var(--accent)')}
                <span>${this.save.shards.toLocaleString()}</span>
              </div>
              <button class="icon-square" id="btn-settings" aria-label="Settings">
                ${svgIcon('gear', 16)}
              </button>
            </div>
            <div class="home-title-block">
              <div class="wordmark">STILLPOINT</div>
            </div>
          </div>

          <div class="home-spacer"></div>

          <div class="home-dock">
            <button class="sector-strip" id="btn-sectors">
              <div class="sector-left">
                <span class="sector-code" style="border-color:${sector.accent};color:${sector.accent}">${sector.code}</span>
                <span class="sector-name">${sector.name}</span>
              </div>
              <span class="sector-mult">${sector.shardMult.toFixed(1)}× ${svgIcon('chevron', 14)}</span>
            </button>

            <button class="cta-btn" id="btn-play">
              ${svgIcon('play', 16, '#07080d')}
              <span>PLAY</span>
            </button>

            <div class="dock-nav">
              <button class="dock-tab" id="btn-ships">
                ${svgIcon('ships', 18)}
                <span>SHIPS</span>
              </button>
              <button class="dock-tab" id="btn-skins">
                ${svgIcon('skins', 18)}
                <span>SKINS</span>
              </button>
              <button class="dock-tab" id="btn-upgrades">
                ${svgIcon('matrix', 17)}
                <span>UPGRADES</span>
                ${canBuyUpgrade ? '<span class="pip-alert"></span>' : ''}
              </button>
              <button class="dock-tab" id="btn-trophies">
                ${svgIcon('trophy', 17)}
                <span>TROPHIES</span>
              </button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-play')!.addEventListener('click', () => this.actions.onStartRun());
      this.container.querySelector('#btn-sectors')!.addEventListener('click', () => this.setSheet('sectors'));
      this.container.querySelector('#btn-ships')!.addEventListener('click', () => this.setSheet('ships'));
      this.container.querySelector('#btn-skins')!.addEventListener('click', () => this.setSheet('skins'));
      this.container.querySelector('#btn-upgrades')!.addEventListener('click', () => this.setSheet('upgrades'));
      this.container.querySelector('#btn-trophies')!.addEventListener('click', () => this.setSheet('trophies'));
      this.container.querySelector('#btn-settings')!.addEventListener('click', () => this.setSheet('settings'));
      return;
    }

    if (this.sheet === 'ships') {
      const rows = VESSEL_ORDER.map((vid) => {
        const v = VESSELS[vid];
        const unlocked = this.save.unlockedVessels.includes(vid);
        const active = this.save.selectedVessel === vid;
        const canBuy = !unlocked && this.save.shards >= v.unlockCost;
        return `
          <div class="row-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}">
            <div class="row-main">
              <div class="row-icon">${svgIcon(vid, 18, active ? 'var(--accent)' : '#ebe7dc')}</div>
              <div>
                <div class="row-title">${v.name}</div>
                <div class="row-sub">${v.perkShort}</div>
              </div>
            </div>
            ${
              unlocked
                ? `<button class="action-chip ${active ? 'equipped' : ''}" data-ship="${vid}">${active ? svgIcon('check', 13) : 'USE'}</button>`
                : `<button class="action-chip" data-buy-ship="${vid}" ${canBuy ? '' : 'disabled'}>${svgIcon('shard', 12, 'var(--accent)')}${v.unlockCost}</button>`
            }
          </div>
        `;
      }).join('');

      this.renderSheet('SHIPS', rows, true);

      this.container.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach((b) => {
        b.addEventListener('click', () => {
          this.actions.onSelectVessel(b.dataset.ship as VesselId);
          bridge.haptic('light');
          this.renderMenu();
        });
      });
      this.container.querySelectorAll<HTMLButtonElement>('[data-buy-ship]').forEach((b) => {
        b.addEventListener('click', () => {
          const vid = b.dataset.buyShip as VesselId;
          const v = VESSELS[vid];
          if (this.save.shards >= v.unlockCost && !this.save.unlockedVessels.includes(vid)) {
            this.save.shards -= v.unlockCost;
            this.save.unlockedVessels.push(vid);
            this.actions.onSelectVessel(vid);
            persistMetaSave(this.save);
            bridge.haptic('success');
            sound.playLevelUp();
            this.renderMenu();
          }
        });
      });
      return;
    }

    if (this.sheet === 'skins') {
      const tiles = SKIN_ORDER.map((sid) => {
        const s = SKINS[sid];
        const unlocked = this.save.unlockedSkins.includes(sid);
        const active = this.save.selectedSkin === sid;
        const canBuy = !unlocked && this.save.shards >= s.unlockCost;
        const actionBtn = unlocked
          ? `<span class="action-chip ${active ? 'equipped' : ''}">${active ? svgIcon('check', 12) : 'USE'}</span>`
          : `<span class="action-chip" style="opacity:${canBuy ? 1 : 0.4}">${svgIcon('shard', 11, 'var(--accent)')}${s.unlockCost}</span>`;
        return `
          <button class="skin-tile ${active ? 'active' : ''}" data-skin="${sid}">
            <div class="swatch-row">
              <div class="swatch">
                <span class="swatch-bar" style="background:${s.hullFill}"></span>
                <span class="swatch-bar" style="background:${s.hullTrim}"></span>
                <span class="swatch-bar" style="background:${s.accent}"></span>
              </div>
              ${actionBtn}
            </div>
            <div class="row-title">${s.name}</div>
          </button>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="sheet-backdrop preview-open" id="sheet-bg">
          <div class="sheet">
            <div class="sheet-head">
              <div class="sheet-title">SKINS</div>
              <div class="shard-counter" style="padding:4px 8px;font-size:12px">
                ${svgIcon('shard', 12, 'var(--accent)')} ${this.save.shards.toLocaleString()}
              </div>
            </div>
            <div class="skin-grid">${tiles}</div>
            <button class="ghost-btn" id="btn-close-sheet">${svgIcon('back', 14)} DONE</button>
          </div>
        </div>
      `;

      this.bindSheetClose();
      this.container.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.dataset.skin as SkinId;
          const s = SKINS[sid];
          if (this.save.unlockedSkins.includes(sid)) {
            this.actions.onSelectSkin(sid);
            bridge.haptic('light');
            this.renderMenu();
          } else if (this.save.shards >= s.unlockCost) {
            this.save.shards -= s.unlockCost;
            this.save.unlockedSkins.push(sid);
            this.actions.onSelectSkin(sid);
            persistMetaSave(this.save);
            bridge.haptic('success');
            sound.playLevelUp();
            this.renderMenu();
          }
        });
      });
      return;
    }

    if (this.sheet === 'sectors') {
      const rows = SECTOR_ORDER.map((secId) => {
        const sc = SECTORS[secId];
        const unlocked = this.save.unlockedSectors.includes(secId);
        const active = this.save.selectedSector === secId;
        const canBuy = !unlocked && this.save.shards >= sc.unlockCost;
        return `
          <div class="row-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}">
            <div class="row-main">
              <span class="sector-code" style="border-color:${sc.accent};color:${sc.accent}">${sc.code}</span>
              <div>
                <div class="row-title">${sc.name}</div>
                <div class="row-sub">${sc.shardMult.toFixed(1)}× Shards</div>
              </div>
            </div>
            ${
              unlocked
                ? `<button class="action-chip ${active ? 'equipped' : ''}" data-sector="${secId}">${active ? svgIcon('check', 13) : 'SELECT'}</button>`
                : `<button class="action-chip" data-buy-sector="${secId}" ${canBuy ? '' : 'disabled'}>${svgIcon('shard', 12, 'var(--accent)')}${sc.unlockCost}</button>`
            }
          </div>
        `;
      }).join('');

      this.renderSheet('SECTORS', rows, true);

      this.container.querySelectorAll<HTMLButtonElement>('[data-sector]').forEach((b) => {
        b.addEventListener('click', () => {
          this.actions.onSelectSector(b.dataset.sector as SectorId);
          bridge.haptic('light');
          this.renderMenu();
        });
      });
      this.container.querySelectorAll<HTMLButtonElement>('[data-buy-sector]').forEach((b) => {
        b.addEventListener('click', () => {
          const secId = b.dataset.buySector as SectorId;
          const sc = SECTORS[secId];
          if (this.save.shards >= sc.unlockCost && !this.save.unlockedSectors.includes(secId)) {
            this.save.shards -= sc.unlockCost;
            this.save.unlockedSectors.push(secId);
            this.actions.onSelectSector(secId);
            persistMetaSave(this.save);
            bridge.haptic('success');
            sound.playLevelUp();
            this.renderMenu();
          }
        });
      });
      return;
    }

    if (this.sheet === 'upgrades') {
      const rows = META_UPGRADES.map((u) => {
        const lv = this.save.upgrades[u.id] ?? 0;
        const maxed = lv >= u.maxLevel;
        const cost = getMetaUpgradeCost(u, lv);
        const canBuy = !maxed && this.save.shards >= cost;
        const pips = Array.from({ length: u.maxLevel }, (_, i) =>
          `<span class="pip ${i < lv ? 'on' : ''}"></span>`
        ).join('');
        return `
          <div class="row-card">
            <div>
              <div class="row-title">${u.name}</div>
              <div class="row-sub">${u.perLevelShort}</div>
              <div class="pips">${pips}</div>
            </div>
            <button class="action-chip" data-buy-meta="${u.id}" ${canBuy ? '' : 'disabled'}>
              ${maxed ? 'MAX' : `${svgIcon('shard', 12, 'var(--accent)')}${cost}`}
            </button>
          </div>
        `;
      }).join('');

      this.renderSheet('UPGRADES', rows, false);

      this.container.querySelectorAll<HTMLButtonElement>('[data-buy-meta]').forEach((b) => {
        b.addEventListener('click', () => {
          if (buyMetaUpgrade(this.save, b.dataset.buyMeta as MetaUpgradeId)) {
            bridge.haptic('success');
            sound.playLevelUp();
            this.renderMenu();
          }
        });
      });
      return;
    }

    if (this.sheet === 'trophies') {
      const doneCount = this.save.claimedMilestones.length;
      const rows = MILESTONES.map((m) => {
        const st = m.check(this.save);
        const done = this.save.claimedMilestones.includes(m.id) || st.done;
        const reward = m.rewardLabel ? `${m.rewardLabel} · +${m.rewardShards}` : `+${m.rewardShards}`;
        return `
          <div class="row-card ${done ? 'active' : ''}">
            <div class="row-main">
              <div class="row-icon">${svgIcon(done ? 'check' : 'trophy', 15, done ? 'var(--gold)' : '#6d7588')}</div>
              <div>
                <div class="row-title">${m.name}</div>
                <div class="row-sub">${m.goalText} · ${Math.min(st.current, st.target).toLocaleString()}/${st.target.toLocaleString()}</div>
              </div>
            </div>
            <span class="row-sub" style="color:${done ? 'var(--gold)' : 'var(--muted)'};font-weight:800">${reward}</span>
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="sheet-backdrop" id="sheet-bg">
          <div class="sheet">
            <div class="sheet-head">
              <div class="sheet-title">TROPHIES</div>
              <span class="row-sub" style="color:var(--gold);font-weight:800">${doneCount} / ${MILESTONES.length}</span>
            </div>
            <div class="scroll-zone">${rows}</div>
            <button class="ghost-btn" id="btn-close-sheet">${svgIcon('back', 14)} DONE</button>
          </div>
        </div>
      `;
      this.bindSheetClose();
      return;
    }

    // Settings sheet
    const s = this.save.settings;
    this.container.innerHTML = `
      <div class="sheet-backdrop center" id="sheet-bg">
        <div class="sheet">
          <div class="sheet-head">
            <div class="sheet-title">SETTINGS</div>
          </div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" data-toggle="music">
              ${svgIcon('music', 16)} <span>MUSIC</span>
            </button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" data-toggle="sfx">
              ${svgIcon('sfx', 16)} <span>SFX</span>
            </button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" data-toggle="haptics">
              ${svgIcon('haptics', 16)} <span>HAPTICS</span>
            </button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" data-toggle="reduceFlash">
              ${svgIcon('flash', 16)} <span>LOW FLASH</span>
            </button>
          </div>
          <button class="ghost-btn" id="btn-close-sheet">${svgIcon('back', 14)} DONE</button>
        </div>
      </div>
    `;
    this.bindSheetClose();
    this.container.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.toggle as keyof MetaSave['settings'];
        this.save.settings[key] = !this.save.settings[key];
        sound.setSettings(this.save.settings.music, this.save.settings.sfx);
        bridge.setHapticsEnabled(this.save.settings.haptics);
        persistMetaSave(this.save);
        bridge.haptic('light');
        this.renderMenu();
      });
    });
  }

  private renderSheet(title: string, rowsHtml: string, previewOpen: boolean): void {
    this.container.innerHTML = `
      <div class="sheet-backdrop ${previewOpen ? 'preview-open' : ''}" id="sheet-bg">
        <div class="sheet">
          <div class="sheet-head">
            <div class="sheet-title">${title}</div>
            <div class="shard-counter" style="padding:4px 8px;font-size:12px">
              ${svgIcon('shard', 12, 'var(--accent)')} ${this.save.shards.toLocaleString()}
            </div>
          </div>
          <div class="scroll-zone">${rowsHtml}</div>
          <button class="ghost-btn" id="btn-close-sheet">${svgIcon('back', 14)} DONE</button>
        </div>
      </div>
    `;
    this.bindSheetClose();
  }

  private bindSheetClose(): void {
    this.container.querySelector('#btn-close-sheet')?.addEventListener('click', () => this.setSheet('none'));
    this.container.querySelector('#sheet-bg')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'sheet-bg') this.setSheet('none');
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
      <div class="sheet-backdrop center">
        <div class="sheet">
          <div class="sheet-head">
            <div class="sheet-title">PAUSED</div>
          </div>
          <div class="toggle-grid">
            <button class="toggle-tile ${s.music ? 'on' : ''}" id="p-music">${svgIcon('music', 15)} <span>MUSIC</span></button>
            <button class="toggle-tile ${s.sfx ? 'on' : ''}" id="p-sfx">${svgIcon('sfx', 15)} <span>SFX</span></button>
            <button class="toggle-tile ${s.haptics ? 'on' : ''}" id="p-haptics">${svgIcon('haptics', 15)} <span>HAPTICS</span></button>
            <button class="toggle-tile ${s.reduceFlash ? 'on' : ''}" id="p-flash">${svgIcon('flash', 15)} <span>LOW FLASH</span></button>
          </div>
          <button class="cta-btn" id="btn-resume">RESUME</button>
          <button class="ghost-btn" id="btn-quit">QUIT</button>
        </div>
      </div>
    `;
    this.container.querySelector('#btn-resume')!.addEventListener('click', () => this.actions.onResume());
    this.container.querySelector('#btn-quit')!.addEventListener('click', () => {
      this.sheet = 'none';
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
      endlessMode: false,
      victory: false
    };

    this.container.innerHTML = `
      <div class="sheet-backdrop center">
        <div class="sheet" style="border-top-color:${isVictory ? 'var(--gold)' : 'var(--danger)'}">
          <div class="sheet-head">
            <div class="sheet-title" style="color:${isVictory ? 'var(--gold)' : '#ebe7dc'}">
              ${isVictory ? 'VICTORY' : 'DEFEATED'}
            </div>
            <div class="shard-counter" style="padding:4px 8px;color:var(--gold)">
              ${svgIcon('shard', 12, 'var(--gold)')} +${st.shardsEarned}
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-cell">${svgIcon('timer', 16, 'var(--muted)')}<span class="summary-num">${formatTime(st.elapsed)}</span></div>
            <div class="summary-cell">${svgIcon('trophy', 16, 'var(--muted)')}<span class="summary-num">${st.score.toLocaleString()}</span></div>
            <div class="summary-cell">${svgIcon('skull', 16, 'var(--muted)')}<span class="summary-num">${st.kills}</span></div>
            <div class="summary-cell">${svgIcon('parry', 16, 'var(--accent)')}<span class="summary-num" style="color:var(--accent)">${st.parries}</span></div>
          </div>

          ${
            isVictory
              ? `<button class="cta-btn gold" id="btn-endless">ENDLESS</button>`
              : `<button class="cta-btn" id="btn-retry">RETRY</button>`
          }
          <button class="ghost-btn" id="btn-home">HANGAR</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-endless')?.addEventListener('click', () => this.actions.onContinueEndless());
    this.container.querySelector('#btn-retry')?.addEventListener('click', () => this.actions.onStartRun());
    this.container.querySelector('#btn-home')!.addEventListener('click', () => {
      this.sheet = 'none';
      this.actions.onQuitToMenu();
    });
  }
}
