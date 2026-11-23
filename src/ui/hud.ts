import { PASSIVES, WEAPONS } from '../data/upgrades';
import { HudSnapshot } from '../engine/game';
import { UpgradeChoice } from '../types';
import { svgIcon } from './icons';

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export class HudView {
  private root: HTMLDivElement;
  private xpFill: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private shieldFill: HTMLDivElement;
  private focusFill: HTMLDivElement;
  private lvTag: HTMLSpanElement;
  private slotsWrap: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private bossArea: HTMLDivElement;
  private comboEl: HTMLDivElement;
  private lastLoadoutKey = '';
  private lastBossKey = '';

  constructor(container: HTMLElement, onPause: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud-layer';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <div class="xp-rail"><div class="xp-fill" id="hud-xp"></div></div>
      <div>
        <div class="hud-top">
          <div class="hud-left">
            <div class="bar-stack">
              <div class="hp-bar">
                <div class="hp-fill" id="hud-hp" style="width:100%"></div>
                <div class="shield-fill" id="hud-shield" style="width:0%"></div>
              </div>
              <div class="focus-bar">
                <div class="focus-fill" id="hud-focus" style="width:100%"></div>
              </div>
            </div>
            <div class="hud-meta-line">
              <span class="lv-tag" id="hud-lv">LV 1</span>
              <div class="hud-meta-line" id="hud-slots"></div>
            </div>
          </div>

          <div class="hud-timer" id="hud-timer">00:00</div>

          <div class="hud-right">
            <div class="hud-score" id="hud-score">0</div>
            <button class="icon-square" id="hud-pause" aria-label="Pause">
              ${svgIcon('pause', 14)}
            </button>
          </div>
        </div>

        <div class="boss-area" id="hud-boss"></div>
      </div>

      <div class="hud-bottom">
        <div class="combo-chip" id="hud-combo" style="display:none"></div>
        <div></div>
      </div>
    `;

    container.appendChild(this.root);

    this.xpFill = this.root.querySelector('#hud-xp')!;
    this.hpFill = this.root.querySelector('#hud-hp')!;
    this.shieldFill = this.root.querySelector('#hud-shield')!;
    this.focusFill = this.root.querySelector('#hud-focus')!;
    this.lvTag = this.root.querySelector('#hud-lv')!;
    this.slotsWrap = this.root.querySelector('#hud-slots')!;
    this.timerEl = this.root.querySelector('#hud-timer')!;
    this.scoreEl = this.root.querySelector('#hud-score')!;
    this.bossArea = this.root.querySelector('#hud-boss')!;
    this.comboEl = this.root.querySelector('#hud-combo')!;

    this.root.querySelector('#hud-pause')!.addEventListener('click', (e) => {
      e.stopPropagation();
      onPause();
    });
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  update(h: HudSnapshot): void {
    const xpPct = Math.min(100, (h.xp / Math.max(1, h.xpToNext)) * 100);
    this.xpFill.style.width = `${xpPct.toFixed(1)}%`;

    const hpPct = Math.max(0, Math.min(100, (h.hp / Math.max(1, h.maxHp)) * 100));
    this.hpFill.style.width = `${hpPct.toFixed(1)}%`;
    const shieldPct = Math.max(0, Math.min(100, (h.shield / Math.max(1, h.maxHp)) * 100));
    this.shieldFill.style.width = `${shieldPct.toFixed(1)}%`;

    const focusPct = Math.max(0, Math.min(100, (h.charge / Math.max(1, h.maxCharge)) * 100));
    this.focusFill.style.width = `${focusPct.toFixed(1)}%`;
    this.focusFill.classList.toggle('active', h.inStillpoint);

    this.lvTag.textContent = `LV ${h.level}`;
    this.timerEl.textContent = h.endlessMode ? `∞ ${formatTime(h.elapsed)}` : formatTime(h.elapsed);
    this.scoreEl.textContent = h.score.toLocaleString();

    if (h.grazeCombo >= 3) {
      this.comboEl.style.display = 'block';
      this.comboEl.textContent = `×${h.grazeCombo}`;
    } else {
      this.comboEl.style.display = 'none';
    }

    const loadoutKey =
      h.weapons.map((w) => `${w.id}${w.level}${w.evolved ? 'E' : ''}`).join(',') +
      '|' +
      h.passives.map((p) => `${p.id}${p.level}`).join(',');
    if (loadoutKey !== this.lastLoadoutKey) {
      this.lastLoadoutKey = loadoutKey;
      const wHtml = h.weapons
        .map((w) => {
          const def = WEAPONS[w.id];
          return `<span class="slot-pip ${w.evolved ? 'evolved' : ''}">${svgIcon(
            w.id,
            12,
            w.evolved ? '#e5b34c' : def.accent
          )}<span class="slot-lv">${w.evolved ? '★' : w.level}</span></span>`;
        })
        .join('');
      const pHtml = h.passives
        .map((p) => {
          const def = PASSIVES[p.id];
          return `<span class="slot-pip">${svgIcon(p.id, 11, def.accent)}<span class="slot-lv">${p.level}</span></span>`;
        })
        .join('');
      this.slotsWrap.innerHTML = wHtml + pHtml;
    }

    const bossKey = h.boss
      ? `b:${h.boss.name}:${h.boss.hp}`
      : h.bossWarning
        ? `w:${h.bossWarning}`
        : '';
    if (bossKey !== this.lastBossKey) {
      this.lastBossKey = bossKey;
      if (h.boss) {
        const pct = Math.max(0, Math.min(100, (h.boss.hp / Math.max(1, h.boss.maxHp)) * 100));
        this.bossArea.innerHTML = `
          <div class="boss-strip">
            <div class="boss-name">${h.boss.name}</div>
            <div class="boss-track"><div class="boss-fill" style="width:${pct.toFixed(1)}%"></div></div>
          </div>
        `;
      } else if (h.bossWarning) {
        this.bossArea.innerHTML = `<div class="boss-warn">${h.bossWarning}</div>`;
      } else {
        this.bossArea.innerHTML = '';
      }
    }
  }
}

export function renderUpgradeDraftHtml(
  choices: UpgradeChoice[],
  level: number,
  rerolls: number,
  isBossChest: boolean
): string {
  const cards = choices
    .map((c) => {
      const pips =
        c.level && c.maxLevel
          ? `<div class="pips">${Array.from({ length: c.maxLevel }, (_, i) => `<span class="pip ${i < c.level! ? 'on' : ''}"></span>`).join('')}</div>`
          : '';
      const tag =
        c.kind === 'evolution'
          ? 'EVOLVE'
          : c.isSynergy
            ? 'SYNERGY'
            : c.isNew
              ? 'NEW'
              : '';
      return `
        <button class="draft-card ${c.kind === 'evolution' ? 'evo' : ''}" data-choice="${c.id}">
          <div class="draft-icon" style="border-color:${c.accent}66">
            ${svgIcon(c.iconKey, 20, c.accent)}
          </div>
          <div class="draft-body">
            <div class="draft-top">
              <span class="draft-name" style="color:${c.kind === 'evolution' ? '#e5b34c' : '#ebe7dc'}">${c.title}</span>
              ${tag ? `<span class="draft-tag">${tag}</span>` : ''}
            </div>
            <div class="draft-line">${c.line}</div>
            ${pips}
          </div>
        </button>
      `;
    })
    .join('');

  return `
    <div class="sheet-backdrop center">
      <div class="sheet">
        <div class="sheet-head">
          <div class="sheet-title" style="color:${isBossChest ? '#e5b34c' : '#ebe7dc'}">
            ${isBossChest ? 'RELIC CACHE' : `LV ${level}`}
          </div>
        </div>
        ${cards}
        ${
          rerolls > 0
            ? `<button class="ghost-btn" id="btn-reroll">${svgIcon('reroll', 14)} ${rerolls}</button>`
            : ''
        }
      </div>
    </div>
  `;
}
