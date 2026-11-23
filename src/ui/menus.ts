import { sound } from '../audio';
import { bridge } from '../bridge';
import {
  buyMetaUpgrade,
  getMetaUpgradeCost,
  META_UPGRADES,
  persistMetaSave
} from '../data/meta';
import { WEAPONS } from '../data/upgrades';
import { VESSEL_ORDER, VESSELS } from '../data/vessels';
import { GamePhase, MetaSave, MetaUpgradeId, RunStats, UpgradeChoice, VesselId } from '../types';
import { formatTime, renderUpgradeDraftHtml } from './hud';

type MenuTab = 'home' | 'vessels' | 'matrix' | 'settings';

export interface OverlayActions {
  onStartRun: (vessel: VesselId) => void;
  onSelectVessel: (vessel: VesselId) => void;
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
  private tab: MenuTab = 'home';
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
    }, 3200);
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

  private renderMenu(): void {
    const vessel = VESSELS[this.save.selectedVessel];
    const starter = WEAPONS[vessel.starterWeapon];

    if (this.tab === 'home') {
      this.container.innerHTML = `
        <div class="overlay-backdrop menu-bg">
          <div class="title-hero">
            <div class="title-kicker">CHRONO BULLET-HELL ROGUELIKE</div>
            <div class="title-logo">STILLPOINT</div>
            <div class="title-sub">Weave through the neon storm. Lift your thumb to bend time and shatter bullet curtains back at the void.</div>
            <div class="shard-pill">❖ ${this.save.shards.toLocaleString()} RESONANCE SHARDS</div>
          </div>

          <div class="panel">
            <div class="item-row">
              <div>
                <div class="stat-label">ACTIVE VESSEL</div>
                <div class="item-title" style="color:${vessel.accent}">${vessel.name} · ${vessel.codename}</div>
                <div class="item-meta">Starter: ${starter.icon} ${starter.name}</div>
              </div>
              <button class="buy-btn" id="btn-open-vessels">SWITCH</button>
            </div>

            <div class="control-hint-card">
              <div><strong>DRAG</strong> anywhere to weave &amp; graze enemy fire for Kinetic Charge.</div>
              <div><strong>LIFT THUMB</strong> (or hold <strong>SPACE</strong>) to trigger <strong>STILLPOINT</strong> slow-mo &amp; fire a <strong>PARRY SHOCKWAVE</strong>.</div>
            </div>

            <div class="mini-stats">
              <div class="stat-box">
                <div class="stat-label">BEST TIME</div>
                <div class="stat-value">${formatTime(this.save.bestTimeSec)}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">BEST SCORE</div>
                <div class="stat-value">${this.save.bestScore.toLocaleString()}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">PARRIES</div>
                <div class="stat-value" style="color:#22e6ff">${this.save.totalParries.toLocaleString()}</div>
              </div>
            </div>

            <button class="primary-btn" id="btn-play">ENTER THE VOID</button>

            <div class="nav-row">
              <button class="secondary-btn" id="btn-tab-vessels">VESSELS</button>
              <button class="secondary-btn" id="btn-tab-matrix">MATRIX</button>
              <button class="secondary-btn" id="btn-tab-settings">AUDIO</button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-play')!.addEventListener('click', () => {
        this.actions.onStartRun(this.save.selectedVessel);
      });
      this.container.querySelector('#btn-open-vessels')!.addEventListener('click', () => {
        this.tab = 'vessels';
        this.renderMenu();
      });
      this.container.querySelector('#btn-tab-vessels')!.addEventListener('click', () => {
        this.tab = 'vessels';
        this.renderMenu();
      });
      this.container.querySelector('#btn-tab-matrix')!.addEventListener('click', () => {
        this.tab = 'matrix';
        this.renderMenu();
      });
      this.container.querySelector('#btn-tab-settings')!.addEventListener('click', () => {
        this.tab = 'settings';
        this.renderMenu();
      });
      return;
    }

    if (this.tab === 'vessels') {
      const cards = VESSEL_ORDER.map((vid) => {
        const v = VESSELS[vid];
        const unlocked = this.save.unlockedVessels.includes(vid);
        const selected = this.save.selectedVessel === vid;
        const starterW = WEAPONS[v.starterWeapon];
        const canBuy = !unlocked && this.save.shards >= v.unlockCost;
        return `
          <div class="item-card ${selected ? 'selected' : ''}">
            <div class="item-row">
              <div>
                <div class="item-title" style="color:${v.accent}">${v.name} · ${v.codename}</div>
                <div class="item-meta">${starterW.icon} ${starterW.name} · ${v.stats.maxHp} HP · SPD ${v.stats.moveSpeed}</div>
              </div>
              ${
                unlocked
                  ? `<button class="buy-btn" data-select-vessel="${vid}">${selected ? 'EQUIPPED' : 'SELECT'}</button>`
                  : `<button class="buy-btn" data-unlock-vessel="${vid}" ${canBuy ? '' : 'disabled'}>❖ ${v.unlockCost}</button>`
              }
            </div>
            <div class="item-meta">${v.tagline}</div>
            <div class="item-meta" style="color:#bfefff">✦ ${v.perk}</div>
            ${!unlocked ? `<div class="item-meta" style="color:#ffd166">${v.unlockBossHint}</div>` : ''}
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="overlay-backdrop">
          <div class="panel">
            <div class="item-row">
              <div>
                <div class="draft-title" style="text-align:left;font-size:17px">VESSEL HANGAR</div>
                <div class="item-meta">Select your intercept hull</div>
              </div>
              <div class="shard-pill">❖ ${this.save.shards}</div>
            </div>
            <div class="scroll-list">${cards}</div>
            <button class="secondary-btn" id="btn-back-home">← BACK</button>
          </div>
        </div>
      `;

      this.container.querySelectorAll<HTMLButtonElement>('[data-select-vessel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const vid = btn.dataset.selectVessel as VesselId;
          this.actions.onSelectVessel(vid);
          bridge.haptic('light');
          this.renderMenu();
        });
      });

      this.container.querySelectorAll<HTMLButtonElement>('[data-unlock-vessel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const vid = btn.dataset.unlockVessel as VesselId;
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

      this.container.querySelector('#btn-back-home')!.addEventListener('click', () => {
        this.tab = 'home';
        this.renderMenu();
      });
      return;
    }

    if (this.tab === 'matrix') {
      const items = META_UPGRADES.map((u) => {
        const lv = this.save.upgrades[u.id] ?? 0;
        const maxed = lv >= u.maxLevel;
        const cost = getMetaUpgradeCost(u, lv);
        const canBuy = !maxed && this.save.shards >= cost;
        const pips = Array.from({ length: u.maxLevel }, (_, idx) =>
          `<span class="pip ${idx < lv ? 'filled' : ''}"></span>`
        ).join('');

        return `
          <div class="item-card">
            <div class="item-row">
              <div>
                <div class="item-title">${u.name} <span style="color:#22e6ff;font-size:11px">LV.${lv}/${u.maxLevel}</span></div>
                <div class="item-meta">${u.perLevelText} — ${u.desc}</div>
                <div class="pip-bar">${pips}</div>
              </div>
              <button class="buy-btn" data-buy-meta="${u.id}" ${canBuy ? '' : 'disabled'}>
                ${maxed ? 'MAXED' : `❖ ${cost}`}
              </button>
            </div>
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="overlay-backdrop">
          <div class="panel">
            <div class="item-row">
              <div>
                <div class="draft-title" style="text-align:left;font-size:17px">CORE MATRIX</div>
                <div class="item-meta">Permanent vessel tuning</div>
              </div>
              <div class="shard-pill">❖ ${this.save.shards}</div>
            </div>
            <div class="scroll-list">${items}</div>
            <button class="secondary-btn" id="btn-back-home">← BACK</button>
          </div>
        </div>
      `;

      this.container.querySelectorAll<HTMLButtonElement>('[data-buy-meta]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.buyMeta as MetaUpgradeId;
          if (buyMetaUpgrade(this.save, id)) {
            bridge.haptic('success');
            sound.playLevelUp();
            this.renderMenu();
          }
        });
      });

      this.container.querySelector('#btn-back-home')!.addEventListener('click', () => {
        this.tab = 'home';
        this.renderMenu();
      });
      return;
    }

    // Settings tab
    const s = this.save.settings;
    this.container.innerHTML = `
      <div class="overlay-backdrop">
        <div class="panel">
          <div class="draft-title" style="text-align:left;font-size:17px">AUDIO &amp; HAPTICS</div>
          <div class="item-meta">iOS Ambient mode is active — your own Spotify or Apple Music will keep playing uninterrupted.</div>

          <div class="toggle-row">
            <div>
              <div class="item-title">Reactive Synth Music</div>
              <div class="item-meta">Low-pass muffles during Stillpoint slow-mo</div>
            </div>
            <button class="toggle-pill ${s.music ? 'on' : ''}" data-toggle="music">${s.music ? 'ON' : 'OFF'}</button>
          </div>

          <div class="toggle-row">
            <div>
              <div class="item-title">Sound Effects</div>
              <div class="item-meta">Graze ticks, parry shatter &amp; weapon cues</div>
            </div>
            <button class="toggle-pill ${s.sfx ? 'on' : ''}" data-toggle="sfx">${s.sfx ? 'ON' : 'OFF'}</button>
          </div>

          <div class="toggle-row">
            <div>
              <div class="item-title">iOS Native Haptics</div>
              <div class="item-meta">Tactile feedback on grazes, parries &amp; bosses</div>
            </div>
            <button class="toggle-pill ${s.haptics ? 'on' : ''}" data-toggle="haptics">${s.haptics ? 'ON' : 'OFF'}</button>
          </div>

          <div class="toggle-row">
            <div>
              <div class="item-title">Reduced Screen Flash</div>
              <div class="item-meta">Softer Stillpoint vignette &amp; pulse FX</div>
            </div>
            <button class="toggle-pill ${s.reduceFlash ? 'on' : ''}" data-toggle="reduceFlash">${s.reduceFlash ? 'ON' : 'OFF'}</button>
          </div>

          <button class="secondary-btn" id="btn-back-home">← BACK</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle as keyof MetaSave['settings'];
        this.save.settings[key] = !this.save.settings[key];
        sound.setSettings(this.save.settings.music, this.save.settings.sfx);
        bridge.setHapticsEnabled(this.save.settings.haptics);
        persistMetaSave(this.save);
        bridge.haptic('light');
        this.renderMenu();
      });
    });

    this.container.querySelector('#btn-back-home')!.addEventListener('click', () => {
      this.tab = 'home';
      this.renderMenu();
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
      btn.addEventListener('click', () => {
        this.actions.onSelectUpgrade(btn.dataset.choice!);
      });
    });
    const rerollBtn = this.container.querySelector('#btn-reroll');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', () => this.actions.onReroll());
    }
  }

  private renderPause(): void {
    const s = this.save.settings;
    this.container.innerHTML = `
      <div class="overlay-backdrop">
        <div class="panel">
          <div class="draft-header">
            <div class="draft-title">STASIS PAUSED</div>
            <div class="draft-sub">Time field suspended</div>
          </div>

          <div class="toggle-row">
            <div class="item-title">Synth Music</div>
            <button class="toggle-pill ${s.music ? 'on' : ''}" id="p-music">${s.music ? 'ON' : 'OFF'}</button>
          </div>
          <div class="toggle-row">
            <div class="item-title">SFX</div>
            <button class="toggle-pill ${s.sfx ? 'on' : ''}" id="p-sfx">${s.sfx ? 'ON' : 'OFF'}</button>
          </div>
          <div class="toggle-row">
            <div class="item-title">Haptics</div>
            <button class="toggle-pill ${s.haptics ? 'on' : ''}" id="p-haptics">${s.haptics ? 'ON' : 'OFF'}</button>
          </div>

          <button class="primary-btn" id="btn-resume">RESUME RUN</button>
          <button class="secondary-btn" id="btn-abandon">ABORT TO HANGAR</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-resume')!.addEventListener('click', () => this.actions.onResume());
    this.container.querySelector('#btn-abandon')!.addEventListener('click', () => {
      this.tab = 'home';
      this.actions.onQuitToMenu();
    });
    this.container.querySelector('#p-music')!.addEventListener('click', () => {
      s.music = !s.music;
      sound.setSettings(s.music, s.sfx);
      persistMetaSave(this.save);
      this.renderPause();
    });
    this.container.querySelector('#p-sfx')!.addEventListener('click', () => {
      s.sfx = !s.sfx;
      sound.setSettings(s.music, s.sfx);
      persistMetaSave(this.save);
      this.renderPause();
    });
    this.container.querySelector('#p-haptics')!.addEventListener('click', () => {
      s.haptics = !s.haptics;
      bridge.setHapticsEnabled(s.haptics);
      persistMetaSave(this.save);
      this.renderPause();
    });
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
      endlessMode: false,
      victory: false
    };

    this.container.innerHTML = `
      <div class="overlay-backdrop">
        <div class="panel">
          <div class="draft-header">
            <div class="title-kicker" style="color:${isVictory ? '#ffd166' : '#ff4d6d'}">
              ${isVictory ? 'CHRONO ARCHON SHATTERED' : 'VESSEL SIGNAL LOST'}
            </div>
            <div class="draft-title" style="font-size:24px;color:${isVictory ? '#ffd166' : '#ffffff'}">
              ${isVictory ? 'STILLPOINT MASTERED' : 'RUN TERMINATED'}
            </div>
          </div>

          <div style="text-align:center">
            <span class="shard-pill">❖ +${st.shardsEarned} RESONANCE SHARDS EARNED</span>
          </div>

          <div class="mini-stats">
            <div class="stat-box">
              <div class="stat-label">TIME</div>
              <div class="stat-value">${formatTime(st.elapsed)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">SCORE</div>
              <div class="stat-value">${st.score.toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">BOSSES</div>
              <div class="stat-value" style="color:#ffd166">${st.bossesDefeated}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">PARRIES</div>
              <div class="stat-value" style="color:#22e6ff">${st.parries}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">MAX BURST</div>
              <div class="stat-value" style="color:#ff66e5">×${st.bestSingleParry}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">GRAZES</div>
              <div class="stat-value" style="color:#4effb4">${st.grazes}</div>
            </div>
          </div>

          ${
            isVictory
              ? `<button class="primary-btn gold" id="btn-endless">CONTINUE ENDLESS OVERDRIVE</button>`
              : `<button class="primary-btn" id="btn-retry">RE-ENTER THE VOID</button>`
          }
          <div class="nav-row" style="grid-template-columns:1fr 1fr">
            <button class="secondary-btn" id="btn-go-matrix">CORE MATRIX</button>
            <button class="secondary-btn" id="btn-go-home">HANGAR</button>
          </div>
        </div>
      </div>
    `;

    const endlessBtn = this.container.querySelector('#btn-endless');
    if (endlessBtn) {
      endlessBtn.addEventListener('click', () => this.actions.onContinueEndless());
    }
    const retryBtn = this.container.querySelector('#btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.actions.onStartRun(this.save.selectedVessel));
    }
    this.container.querySelector('#btn-go-matrix')!.addEventListener('click', () => {
      this.tab = 'matrix';
      this.actions.onQuitToMenu();
    });
    this.container.querySelector('#btn-go-home')!.addEventListener('click', () => {
      this.tab = 'home';
      this.actions.onQuitToMenu();
    });
  }
}
