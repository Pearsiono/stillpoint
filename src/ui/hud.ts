import { HudSnapshot } from '../engine/game';
import { UpgradeChoice } from '../types';
import { artIconImg, rarityForLevel, relicBadgeSvg, relicGenericSvg } from './artIcons';
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
  private focusFill: HTMLDivElement;
  private lvTag: HTMLSpanElement;
  private slotsWrap: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private bossArea: HTMLDivElement;
  private bossFillEl: HTMLDivElement | null = null;
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

    const focusPct = Math.max(0, Math.min(100, (h.charge / Math.max(1, h.maxCharge)) * 100));
    this.focusFill.style.width = `${h.stalled ? Math.max(18, focusPct) : focusPct}%`;
    this.focusFill.classList.toggle('active', h.inStillpoint && !h.stalled);
    this.focusFill.classList.toggle('stalled', h.stalled);

    this.lvTag.textContent = `LV ${h.level}`;
    this.timerEl.textContent = h.endlessMode ? `∞ ${formatTime(h.elapsed)}` : formatTime(h.elapsed);
    this.scoreEl.textContent = h.score.toLocaleString();

    if (h.stalled) {
      this.comboEl.style.display = 'block';
      this.comboEl.style.color = '#ff6a55';
      this.comboEl.textContent = 'Reactor Stalled';
    } else if (h.surgeActive) {
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
          return `<span class="r-frame hud-slot passive-slot ${tier}">${artIconImg(p.id, 22)}<span class="slot-lv">${p.level}</span></span>`;
        })
        .join('');
      const sep1 = wHtml && pHtml ? '<span class="hud-slot-sep"></span>' : '';
      const rHtml =
        h.relics.length > 0
          ? `<span class="r-frame hud-slot relic-slot gold">${relicGenericSvg(21)}<span class="slot-lv">${h.relics.length}</span></span>`
          : '';
      this.slotsWrap.innerHTML = wHtml + sep1 + pHtml + rHtml;
    }

    const bossKey = h.boss
      ? `b:${h.boss.name}`
      : h.bossWarning
        ? `w:${h.bossWarning}`
        : h.eventBanner
          ? `e:${h.eventBanner}`
          : '';
    if (bossKey !== this.lastBossKey) {
      this.lastBossKey = bossKey;
      this.bossFillEl = null;
      if (h.boss) {
        const pct = Math.max(0, Math.min(100, (h.boss.hp / Math.max(1, h.boss.maxHp)) * 100));
        this.bossArea.innerHTML = `
          <div class="boss-strip">
            <div class="boss-name">${h.boss.name}</div>
            <div class="boss-track"><div class="boss-fill" style="width:${pct.toFixed(1)}%"></div></div>
          </div>
        `;
        this.bossFillEl = this.bossArea.querySelector('.boss-fill');
      } else if (h.bossWarning) {
        this.bossArea.innerHTML = `<div class="boss-warn">${h.bossWarning}</div>`;
      } else if (h.eventBanner) {
        this.bossArea.innerHTML = `<div class="boss-warn" style="border-color:var(--accent);color:var(--accent)">${h.eventBanner}</div>`;
      } else {
        this.bossArea.innerHTML = '';
      }
    } else if (h.boss && this.bossFillEl) {
      const pct = Math.max(0, Math.min(100, (h.boss.hp / Math.max(1, h.boss.maxHp)) * 100));
      this.bossFillEl.style.width = `${pct.toFixed(1)}%`;
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
      const kindLabel =
        c.kind === 'evolution'
          ? 'Evolve'
          : c.kind === 'relic'
            ? 'Relic'
            : c.kind === 'heal'
              ? 'Repair'
              : c.kind === 'passive'
                ? 'Stat'
                : 'Weapon';
      const tag = c.isOverclocked
        ? '+2 LV'
        : c.isNew && !c.pairIconKey
          ? `New ${kindLabel}`
          : kindLabel;
      const pairHtml = c.pairIconKey
        ? `<span class="pair-badge" title="Evolution pair">+${artIconImg(c.pairIconKey, 14)}</span>`
        : '';
      const cardClass =
        c.kind === 'evolution'
          ? 'evo'
          : c.kind === 'relic'
            ? 'relic'
            : c.isOverclocked
              ? 'cursed'
              : c.kind === 'passive'
                ? 'passive'
                : '';
      const iconBoxClass =
        c.kind === 'passive'
          ? 'passive-box'
          : c.kind === 'relic'
            ? 'relic-box'
            : '';
      const iconHtml =
        c.kind === 'relic' && c.relicId
          ? relicBadgeSvg(c.relicId, 44)
          : artIconImg(c.iconKey, c.kind === 'passive' ? 44 : 36);
      const titleColor =
        c.kind === 'evolution'
          ? '#ff7c76'
          : c.kind === 'relic'
            ? 'var(--gold)'
            : c.isOverclocked
              ? '#f28a52'
              : c.kind === 'passive'
                ? '#d8e6e2'
                : 'var(--ink)';
      const tagStyle = c.isOverclocked
        ? 'color:#f47a72'
        : c.kind === 'passive'
          ? 'color:var(--accent)'
          : '';
      return `
        <button class="draft-card ${cardClass}" data-choice="${c.id}">
          <div class="r-frame draft-icon-box ${iconBoxClass} ${tier}">
            ${iconHtml}
          </div>
          <div class="draft-body">
            <div class="draft-top">
              <span class="draft-name" style="color:${titleColor}">${c.title}</span>
              <span class="draft-tag-wrap">
                ${pairHtml}
                <span class="draft-tag" style="${tagStyle}">${tag}</span>
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
