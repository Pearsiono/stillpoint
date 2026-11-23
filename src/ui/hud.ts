import { PASSIVES, WEAPONS } from '../data/upgrades';
import { HudSnapshot } from '../engine/game';
import { UpgradeChoice } from '../types';

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export class HudView {
  private root: HTMLDivElement;
  private xpFill: HTMLDivElement;
  private lvBadge: HTMLSpanElement;
  private hpFill: HTMLDivElement;
  private shieldFill: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private chargeFill: HTMLDivElement;
  private chargeText: HTMLSpanElement;
  private loadoutRow: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private statePill: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private parryEl: HTMLDivElement;
  private bossArea: HTMLDivElement;
  private grazeBadge: HTMLDivElement;
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
            <div class="hud-bars">
              <div class="bar-row">
                <span class="lv-badge" id="hud-lv">LV.1</span>
                <div class="meter">
                  <div class="meter-fill meter-hp" id="hud-hp" style="width:100%"></div>
                  <div class="meter-shield" id="hud-shield" style="width:0%"></div>
                </div>
                <span class="hp-text" id="hud-hp-txt">100/100</span>
              </div>
              <div class="bar-row">
                <span class="hp-text" style="min-width:34px;text-align:left;color:#22e6ff">FOCUS</span>
                <div class="meter">
                  <div class="meter-fill meter-charge" id="hud-charge" style="width:100%"></div>
                </div>
                <span class="hp-text" id="hud-charge-txt">100%</span>
              </div>
            </div>
            <div class="loadout-row" id="hud-loadout"></div>
          </div>

          <div class="hud-center">
            <div class="timer-pill" id="hud-timer">00:00</div>
            <div class="state-pill" id="hud-state">NORMAL</div>
          </div>

          <div class="hud-right">
            <div class="score-stack">
              <div class="score-val" id="hud-score">0</div>
              <div class="parry-sub" id="hud-parries">0 PARRIES</div>
            </div>
            <button class="icon-btn" id="hud-pause" aria-label="Pause">❚❚</button>
          </div>
        </div>

        <div class="boss-area" id="hud-boss"></div>
      </div>

      <div class="hud-bottom">
        <div class="graze-badge" id="hud-graze" style="display:none">GRAZE ×0</div>
        <div></div>
      </div>
    `;

    container.appendChild(this.root);

    this.xpFill = this.root.querySelector('#hud-xp')!;
    this.lvBadge = this.root.querySelector('#hud-lv')!;
    this.hpFill = this.root.querySelector('#hud-hp')!;
    this.shieldFill = this.root.querySelector('#hud-shield')!;
    this.hpText = this.root.querySelector('#hud-hp-txt')!;
    this.chargeFill = this.root.querySelector('#hud-charge')!;
    this.chargeText = this.root.querySelector('#hud-charge-txt')!;
    this.loadoutRow = this.root.querySelector('#hud-loadout')!;
    this.timerEl = this.root.querySelector('#hud-timer')!;
    this.statePill = this.root.querySelector('#hud-state')!;
    this.scoreEl = this.root.querySelector('#hud-score')!;
    this.parryEl = this.root.querySelector('#hud-parries')!;
    this.bossArea = this.root.querySelector('#hud-boss')!;
    this.grazeBadge = this.root.querySelector('#hud-graze')!;

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

    this.lvBadge.textContent = `LV.${h.level}`;
    const hpPct = Math.max(0, Math.min(100, (h.hp / Math.max(1, h.maxHp)) * 100));
    this.hpFill.style.width = `${hpPct.toFixed(1)}%`;
    const shieldPct = Math.max(0, Math.min(100, (h.shield / Math.max(1, h.maxHp)) * 100));
    this.shieldFill.style.width = `${shieldPct.toFixed(1)}%`;
    this.hpText.textContent = h.shield > 0 ? `${h.hp}+${h.shield}` : `${h.hp}/${h.maxHp}`;

    const chargePct = Math.max(0, Math.min(100, (h.charge / Math.max(1, h.maxCharge)) * 100));
    this.chargeFill.style.width = `${chargePct.toFixed(1)}%`;
    this.chargeFill.classList.toggle('stillpoint', h.inStillpoint);
    this.chargeText.textContent = `${Math.round(chargePct)}%`;

    this.timerEl.textContent = h.endlessMode
      ? `∞ ${formatTime(h.elapsed)}`
      : formatTime(h.elapsed);

    if (h.inStillpoint) {
      this.statePill.textContent = 'STILLPOINT';
      this.statePill.className = 'state-pill active-sp';
    } else if (h.parryReady) {
      this.statePill.textContent = 'PARRY ARMED';
      this.statePill.className = 'state-pill parry-armed';
    } else {
      this.statePill.textContent = 'CHARGING';
      this.statePill.className = 'state-pill';
    }

    this.scoreEl.textContent = h.score.toLocaleString();
    this.parryEl.textContent = `${h.parries} PARR${h.parries === 1 ? 'Y' : 'IES'}`;

    if (h.grazeCombo >= 2) {
      this.grazeBadge.style.display = 'block';
      this.grazeBadge.textContent = `GRAZE CHAIN ×${h.grazeCombo}`;
    } else {
      this.grazeBadge.style.display = 'none';
    }

    // Re-render loadout chips only when levels change
    const loadoutKey =
      h.weapons.map((w) => `${w.id}${w.level}${w.evolved ? 'E' : ''}`).join(',') +
      '|' +
      h.passives.map((p) => `${p.id}${p.level}`).join(',');
    if (loadoutKey !== this.lastLoadoutKey) {
      this.lastLoadoutKey = loadoutKey;
      const wHtml = h.weapons
        .map((w) => {
          const def = WEAPONS[w.id];
          return `<span class="slot-chip ${w.evolved ? 'evolved' : ''}" style="border-color:${w.evolved ? '#ffd166' : def.accent}66"><span>${def.icon}</span><span>${w.evolved ? '★' : w.level}</span></span>`;
        })
        .join('');
      const pHtml = h.passives
        .map((p) => {
          const def = PASSIVES[p.id];
          return `<span class="slot-chip" style="border-color:${def.accent}44"><span>${def.icon}</span><span>${p.level}</span></span>`;
        })
        .join('');
      this.loadoutRow.innerHTML = wHtml + pHtml;
    }

    // Boss warning / Boss HP bar
    const bossKey = h.boss
      ? `b:${h.boss.name}:${h.boss.hp}:${h.boss.phase}`
      : h.bossWarning
        ? `w:${h.bossWarning}`
        : '';
    if (bossKey !== this.lastBossKey) {
      this.lastBossKey = bossKey;
      if (h.boss) {
        const pct = Math.max(0, Math.min(100, (h.boss.hp / Math.max(1, h.boss.maxHp)) * 100));
        this.bossArea.innerHTML = `
          <div class="boss-card">
            <div class="boss-head">
              <span class="boss-name">${h.boss.name}</span>
              <span class="boss-sub">PHASE ${h.boss.phase} · ${Math.ceil(pct)}%</span>
            </div>
            <div class="boss-bar">
              <div class="boss-bar-fill" style="width:${pct.toFixed(1)}%"></div>
            </div>
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
      const dualHtml =
        c.normalNote && c.stillpointNote
          ? `
            <div class="dual-notes">
              <div class="note-line"><span class="note-tag normal">NORMAL</span><span>${c.normalNote}</span></div>
              <div class="note-line"><span class="note-tag stillpoint">STILLPOINT</span><span>${c.stillpointNote}</span></div>
            </div>
          `
          : '';
      return `
        <button class="choice-card ${c.kind === 'evolution' ? 'evolution' : ''}" data-choice="${c.id}">
          <div class="choice-top">
            <div class="choice-name-wrap">
              <div class="choice-icon" style="color:${c.accent};border-color:${c.accent}66">${c.icon}</div>
              <div class="choice-name" style="color:${c.kind === 'evolution' ? '#ffd166' : '#ffffff'}">${c.title}</div>
            </div>
            <span class="choice-badge">${c.badge}</span>
          </div>
          <div class="choice-desc">${c.subtitle}</div>
          ${dualHtml}
        </button>
      `;
    })
    .join('');

  return `
    <div class="overlay-backdrop">
      <div class="panel">
        <div class="draft-header">
          <div class="draft-title" style="color:${isBossChest ? '#ffd166' : '#ffffff'}">
            ${isBossChest ? '✦ CATALYST CACHE ✦' : `LEVEL ${level} · AUGMENT`}
          </div>
          <div class="draft-sub">
            ${isBossChest ? 'Enclosure shattered — select an evolved system or module' : 'Choose one upgrade to mutate your vessel'}
          </div>
        </div>
        <div class="choice-list">${cards}</div>
        ${
          rerolls > 0
            ? `<button class="secondary-btn" id="btn-reroll">↻ REROLL DRAFT (${rerolls} LEFT)</button>`
            : ''
        }
      </div>
    </div>
  `;
}
