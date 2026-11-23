import { HudSnapshot } from '../engine/game';
import { UpgradeChoice } from '../types';
import { artIconImg, rarityForLevel } from './artIcons';
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

    if (h.surgeActive) {
      this.comboEl.style.display = 'block';
      this.comboEl.style.color = '#f6c453';
      this.comboEl.textContent = 'Surge ×4';
    } else if (h.surgeTier >= 2) {
      this.comboEl.style.display = 'block';
      this.comboEl.style.color = 'var(--accent)';
      this.comboEl.textContent = h.grazeCombo >= 3 ? `×${h.surgeTier}  Graze ${h.grazeCombo}` : `×${h.surgeTier}`;
    } else if (h.grazeCombo >= 3) {
      this.comboEl.style.display = 'block';
      this.comboEl.style.color = 'var(--accent)';
      this.comboEl.textContent = `Graze ${h.grazeCombo}`;
    } else {
      this.comboEl.style.display = 'none';
    }

    const loadoutKey =
      h.weapons.map((w) => `${w.id}${w.level}${w.evolved ? 'E' : ''}`).join(',') +
      '|' +
      h.passives.map((p) => `${p.id}${p.level}`).join(',') +
      '|' +
      h.relics.join(',');
    if (loadoutKey !== this.lastLoadoutKey) {
      this.lastLoadoutKey = loadoutKey;
      const wHtml = h.weapons
        .map((w) => {
          const tier = rarityForLevel(w.level, w.evolved);
          return `<span class="r-frame hud-slot ${tier}">${artIconImg(w.id, 18)}<span class="slot-lv">${w.evolved ? '★' : w.level}</span></span>`;
        })
        .join('');
      const pHtml = h.passives
        .map((p) => {
          const tier = rarityForLevel(p.level, false);
          return `<span class="r-frame hud-slot ${tier}">${artIconImg(p.id, 16)}<span class="slot-lv">${p.level}</span></span>`;
        })
        .join('');
      const rHtml =
        h.relics.length > 0
          ? `<span class="r-frame hud-slot epic">${artIconImg('core', 16)}<span class="slot-lv">${h.relics.length}</span></span>`
          : '';
      this.slotsWrap.innerHTML = wHtml + pHtml + rHtml;
    }

    const bossKey = h.boss
      ? `b:${h.boss.name}:${h.boss.hp}`
      : h.bossWarning
        ? `w:${h.bossWarning}`
        : h.eventBanner
          ? `e:${h.eventBanner}`
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
      } else if (h.eventBanner) {
        this.bossArea.innerHTML = `<div class="boss-warn" style="border-color:var(--accent);color:var(--accent)">${h.eventBanner}</div>`;
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
      const tier =
        c.kind === 'evolution'
          ? 'mythic'
          : c.kind === 'relic'
            ? 'gold'
            : c.kind === 'heal'
              ? 'good'
              : rarityForLevel(c.level ?? 1, false);
      const pips =
        c.level && c.maxLevel
          ? `<div class="pips">${Array.from({ length: c.maxLevel }, (_, i) => `<span class="pip ${i < c.level! ? 'on' : ''}"></span>`).join('')}</div>`
          : '';
      const tag =
        c.kind === 'evolution'
          ? 'Evolve'
          : c.kind === 'relic'
            ? 'Relic'
            : c.isOverclocked
              ? '+2 LV'
              : c.isNew && !c.pairIconKey
                ? 'New'
                : '';
      const pairHtml = c.pairIconKey
        ? `<span class="pair-badge" title="Evolution pair">+${artIconImg(c.pairIconKey, 13)}</span>`
        : '';
      const cardClass =
        c.kind === 'evolution'
          ? 'evo'
          : c.kind === 'relic'
            ? 'relic'
            : c.isOverclocked
              ? 'cursed'
              : '';
      const titleColor =
        c.kind === 'evolution'
          ? '#ff7c76'
          : c.kind === 'relic'
            ? 'var(--gold)'
            : c.isOverclocked
              ? '#f28a52'
              : 'var(--ink)';
      return `
        <button class="draft-card ${cardClass}" data-choice="${c.id}">
          <div class="r-frame draft-icon-box ${tier}">
            ${artIconImg(c.iconKey, 36)}
          </div>
          <div class="draft-body">
            <div class="draft-top">
              <span class="draft-name" style="color:${titleColor}">${c.title}</span>
              <span class="draft-tag-wrap">
                ${pairHtml}
                ${tag ? `<span class="draft-tag" style="${c.isOverclocked ? 'color:#f47a72' : ''}">${tag}</span>` : ''}
              </span>
            </div>
            <div class="draft-line">${c.line}</div>
            ${c.curseLine ? `<div class="draft-curse-line">${c.curseLine}</div>` : ''}
            ${pips}
          </div>
        </button>
      `;
    })
    .join('');

  return `
    <div class="modal-backdrop">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title" style="color:${isBossChest ? 'var(--gold)' : 'var(--ink)'}">
            ${isBossChest ? 'Relic cache' : `Level ${level}`}
          </div>
        </div>
        ${cards}
        ${
          rerolls > 0
            ? `<button class="ghost-btn" id="btn-reroll">${svgIcon('reroll', 14)} <span>Reroll (${rerolls})</span></button>`
            : ''
        }
      </div>
    </div>
  `;
}
