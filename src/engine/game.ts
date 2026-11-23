import { sound } from '../audio';
import { bridge } from '../bridge';
import { CORES, HEAT_MODS, RELICS } from '../data/builds';
import { FINISHES, PARRY_FX, TRAILS } from '../data/finishes';
import { getActiveLoadout } from '../data/loadout';
import { evaluateMilestones, getEquippedCoating, persistMetaSave } from '../data/meta';
import { SECTORS } from '../data/sectors';
import { generateUpgradeChoices, PACTS, PASSIVES, WEAPONS } from '../data/upgrades';
import { VESSELS } from '../data/vessels';
import {
  BlinkDecoy,
  BossEnclosure,
  CoreId,
  Enemy,
  EnemyBullet,
  GamePhase,
  HazardZone,
  HeatId,
  LaserBeam,
  MetaSave,
  MeteorStrike,
  PactId,
  PassiveId,
  Pickup,
  PlayerBullet,
  PlayerState,
  RailPylon,
  RelicId,
  RunStats,
  SectorId,
  SkinId,
  UpgradeChoice,
  VesselId,
  WorldNode
} from '../types';
import {
  BOSS_SCHEDULE,
  EnemyWorldContext,
  onEnemyDeathSplit,
  spawnEnemy,
  updateEnemies,
  updateWaveDirector
} from './enemies';
import { InputController } from './input';
import { ParticleSystem } from './particles';
import { WastelandRenderer } from './renderer';
import {
  findNearestEnemy,
  pointToSegmentDist,
  spawnPlantedDagger,
  updateWeapons,
  WeaponWorldContext
} from './weapons';

export interface HudSnapshot {
  phase: GamePhase;
  elapsed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  charge: number;
  maxCharge: number;
  inStillpoint: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  score: number;
  grazeCombo: number;
  surgeTier: number;
  surgeActive: boolean;
  weapons: PlayerState['weapons'];
  passives: PlayerState['passives'];
  relics: RelicId[];
  boss: { name: string; hp: number; maxHp: number } | null;
  bossWarning: string | null;
  eventBanner: string | null;
  endlessMode: boolean;
  rerolls: number;
}

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase, choices?: UpgradeChoice[], stats?: RunStats) => void;
  onHudTick: (hud: HudSnapshot) => void;
  onUnlockNotice: (text: string) => void;
}

export class StillpointGame {
  private canvas: HTMLCanvasElement;
  private renderer: WastelandRenderer;
  private input: InputController;
  private particles = new ParticleSystem();
  private callbacks: GameCallbacks;
  private save: MetaSave;

  phase: GamePhase = 'menu';
  player!: PlayerState;
  vesselId: VesselId = 'vesper';
  coreId: CoreId = 'deflector';
  skinId: SkinId = 'cyanide';
  sectorId: SectorId = 'drift';
  menuSheetOpen = false;

  enemies: Enemy[] = [];
  enemyBullets: EnemyBullet[] = [];
  playerBullets: PlayerBullet[] = [];
  pylons: RailPylon[] = [];
  hazards: HazardZone[] = [];
  nodes: WorldNode[] = [];
  decoys: BlinkDecoy[] = [];
  meteors: MeteorStrike[] = [];
  lasers: LaserBeam[] = [];
  pickups: Pickup[] = [];
  enclosure!: BossEnclosure;
  stats!: RunStats;

  private nextEntityId = 1;
  private realTime = 0;
  private worldTime = 0;
  private cameraX = 0;
  private cameraY = 0;
  private shakeMag = 0;
  private hitStopTimer = 0;
  private spawnAccum = { value: 0 };
  private eliteTimer = { value: 0 };
  private nodeTimer = { value: 12 };
  private nextBossIdx = 0;
  private endlessBossTimer = 85;
  private nextEventIdx = 0;
  private endlessEventTimer = 75;
  private eventBanner: string | null = null;
  private eventBannerTimer = 0;
  private meteorWavesLeft = 0;
  private meteorSpawnTimer = 0;
  private pendingBossDraft = false;
  private currentChoices: UpgradeChoice[] = [];
  private hasUsedStillpoint = false;
  private tutorialTimer = 0;
  private hudThrottle = 0;
  private lastFrameTs = 0;
  private scrapHarvestCounter = 0;
  private bonusHealDmg = 0;
  private goodRunCrateAwarded = false;
  private metaCommitted = { shards: 0, kills: 0, grazes: 0, runCounted: false };

  get isBossDraft(): boolean {
    return this.pendingBossDraft;
  }

  constructor(canvas: HTMLCanvasElement, save: MetaSave, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.save = save;
    this.callbacks = callbacks;
    this.vesselId = save.selectedVessel;
    this.coreId = save.selectedCore;
    this.skinId = save.selectedSkin;
    this.sectorId = save.selectedSector;
    this.renderer = new WastelandRenderer(canvas);
    this.input = new InputController(canvas, () => sound.unlock());

    this.applyAccentCss();
    this.resetWorldState(this.vesselId);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('visibilitychange', () => {
      sound.setSuspended(document.hidden);
      if (document.hidden && this.phase === 'playing') this.pauseGame();
    });
  }

  startLoop(): void {
    this.lastFrameTs = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastFrameTs) / 1000;
      this.lastFrameTs = now;
      const dtReal = Math.min(0.05, Math.max(0.001, rawDt));
      this.update(dtReal);
      this.renderFrame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(320, rect ? rect.width : window.innerWidth);
    const h = Math.max(480, rect ? rect.height : window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.renderer.resize(w, h, dpr);
  }

  setMenuSheetOpen(open: boolean): void {
    this.menuSheetOpen = open;
  }

  setVessel(id: VesselId): void {
    this.vesselId = id;
    this.save.selectedVessel = id;
    persistMetaSave(this.save);
  }

  setCore(id: CoreId): void {
    this.coreId = id;
    this.save.selectedCore = id;
    persistMetaSave(this.save);
  }

  setSkin(id: SkinId): void {
    this.skinId = id;
    this.save.selectedSkin = id;
    this.applyAccentCss();
    persistMetaSave(this.save);
  }

  setSector(id: SectorId): void {
    this.sectorId = id;
    this.save.selectedSector = id;
    persistMetaSave(this.save);
  }

  toggleHeat(id: HeatId): void {
    const idx = this.save.activeHeat.indexOf(id);
    if (idx >= 0) this.save.activeHeat.splice(idx, 1);
    else this.save.activeHeat.push(id);
    persistMetaSave(this.save);
  }

  randomizeBuild(): void {
    const vPool = this.save.unlockedVessels;
    const cPool = this.save.unlockedCores;
    const coatPool = this.save.coatings;
    const tPool = this.save.unlockedTrails;
    const pPool = this.save.unlockedParryFx;
    const pick = <T,>(arr: T[], cur: T): T => {
      if (arr.length <= 1) return arr[0] ?? cur;
      const others = arr.filter((x) => x !== cur);
      return others[Math.floor(Math.random() * others.length)];
    };
    let nextV = vPool[Math.floor(Math.random() * vPool.length)];
    let nextC = cPool[Math.floor(Math.random() * cPool.length)];
    let nextCoat = coatPool[Math.floor(Math.random() * coatPool.length)].uid;
    const nextT = tPool[Math.floor(Math.random() * tPool.length)];
    const nextP = pPool[Math.floor(Math.random() * pPool.length)];
    if (
      nextV === this.vesselId &&
      nextC === this.coreId &&
      nextCoat === this.save.equippedCoatingUid
    ) {
      if (coatPool.length > 1) {
        nextCoat = pick(
          coatPool.map((x) => x.uid),
          this.save.equippedCoatingUid
        );
      } else if (vPool.length > 1) {
        nextV = pick(vPool, this.vesselId);
      } else if (cPool.length > 1) {
        nextC = pick(cPool, this.coreId);
      }
    }
    this.setVessel(nextV);
    this.setCore(nextC);
    this.save.equippedCoatingUid = nextCoat;
    this.save.selectedTrail = nextT;
    this.save.selectedParryFx = nextP;
    this.applyAccentCss();
    persistMetaSave(this.save);
  }

  private applyAccentCss(): void {
    const coating = getEquippedCoating(this.save);
    const accent = FINISHES[coating.finishId]?.accent ?? '#4cb5ab';
    document.documentElement.style.setProperty('--accent', accent);
  }

  refreshVisualPrefs(): void {
    this.applyAccentCss();
  }

  startNewRun(): void {
    sound.unlock();
    this.vesselId = this.save.selectedVessel;
    this.coreId = this.save.selectedCore;
    this.skinId = this.save.selectedSkin;
    this.sectorId = this.save.selectedSector;
    this.applyAccentCss();
    this.resetWorldState(this.vesselId);
    this.seedOpeningWave();
    this.input.resetForNewRun();
    this.input.setEnabled(true);
    this.phase = 'playing';
    this.menuSheetOpen = false;
    sound.setGameState(true, false);
    bridge.haptic('medium');
    this.callbacks.onPhaseChange('playing');
    this.emitHud();
  }

  pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.setEnabled(false);
    sound.setStillpointBlend(0);
    this.callbacks.onPhaseChange('paused');
  }

  resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.35);
    this.input.setEnabled(true);
    this.callbacks.onPhaseChange('playing');
  }

  returnToMenu(): void {
    if (this.phase === 'paused' || this.phase === 'levelup') {
      this.finalizeMetaProgress(false);
    }
    this.phase = 'menu';
    this.input.setEnabled(false);
    sound.setGameState(false, false);
    sound.setStillpointBlend(0);
    this.resetWorldState(this.vesselId);
    this.callbacks.onPhaseChange('menu');
  }

  continueEndless(): void {
    if (this.phase !== 'victory') return;
    this.stats.endlessMode = true;
    this.endlessBossTimer = 80;
    this.phase = 'playing';
    this.input.setEnabled(true);
    this.player.hp = this.player.maxHp;
    this.player.kineticCharge = this.player.maxKineticCharge;
    sound.setGameState(true, false);
    this.particles.callout(this.player.x, this.player.y - 38, 'ENDLESS', '#e5b34c', 1.3, 1.1);
    this.callbacks.onPhaseChange('playing');
  }

  selectUpgrade(choiceId: string): void {
    if (this.phase !== 'levelup') return;
    const picked = this.currentChoices.find((c) => c.id === choiceId);
    if (!picked) return;

    if (picked.kind === 'evolution' && picked.weaponId) {
      const w = this.player.weapons.find((item) => item.id === picked.weaponId);
      if (w) {
        w.evolved = true;
        this.save.evolutionsCrafted++;
        this.checkAndToastMilestones();
        this.particles.ripple(this.player.x, this.player.y, 230, 18, '#e5b34c', 0.55);
        this.particles.callout(this.player.x, this.player.y - 42, WEAPONS[w.id].evolvedName, '#e5b34c', 1.2, 1.2);
      }
    } else if (picked.kind === 'relic' && picked.relicId) {
      if (!this.player.relics.includes(picked.relicId)) {
        this.player.relics.push(picked.relicId);
        const r = RELICS[picked.relicId];
        this.particles.ripple(this.player.x, this.player.y, 210, 15, r.accent, 0.5);
        this.particles.callout(this.player.x, this.player.y - 42, r.name, r.accent, 1.15, 1.1);
      }
    } else if (picked.kind === 'weapon' && picked.weaponId) {
      const addLv = picked.bonusLevels ?? 1;
      const existing = this.player.weapons.find((w) => w.id === picked.weaponId);
      if (existing) existing.level = Math.min(WEAPONS[existing.id].maxLevel, existing.level + addLv);
      else {
        this.player.weapons.push({
          id: picked.weaponId,
          level: Math.min(WEAPONS[picked.weaponId].maxLevel, addLv),
          evolved: false,
          cooldown: 0.1,
          auxTimer: 0
        });
      }
    } else if (picked.kind === 'passive' && picked.passiveId) {
      const addLv = picked.bonusLevels ?? 1;
      const existing = this.player.passives.find((p) => p.id === picked.passiveId);
      if (existing) existing.level = Math.min(PASSIVES[existing.id].maxLevel, existing.level + addLv);
      else {
        this.player.passives.push({
          id: picked.passiveId,
          level: Math.min(PASSIVES[picked.passiveId].maxLevel, addLv)
        });
      }
    } else if (picked.kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
      this.player.kineticCharge = this.player.maxKineticCharge;
      this.bonusHealDmg += 0.06;
    }

    // Apply OVERCLOCKED draft curse tradeoff when accepted!
    if (picked.curseId) {
      this.player.curses.push(picked.curseId);
      if (picked.curseId === 'blood_tax') {
        this.player.hp = Math.max(12, Math.round(this.player.hp * 0.78));
      }
      this.particles.callout(this.player.x, this.player.y - 36, picked.curseLine ?? '', '#d94842', 0.95, 1.0);
    }

    this.recomputePlayerStats();
    bridge.haptic('success');
    sound.playLevelUp();

    this.currentChoices = [];
    this.pendingBossDraft = false;

    // Cascade any overflow multi-level XP cleanly instead of stalling until next gem
    if (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.player.level++;
      this.player.xpToNext = this.nextLevelXp(this.player.level);
      this.openUpgradeDraft(false);
      return;
    }

    this.phase = 'playing';
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.3);
    this.input.setEnabled(true);
    this.callbacks.onPhaseChange('playing');
    this.emitHud();
  }

  rerollChoices(): UpgradeChoice[] {
    if (this.phase !== 'levelup' || this.player.rerolls <= 0) return this.currentChoices;
    this.player.rerolls--;
    bridge.haptic('light');
    const draftCount = this.player.modules.includes('risk_strict') ? 2 : 3;
    this.currentChoices = generateUpgradeChoices(this.player, draftCount, this.pendingBossDraft);
    this.callbacks.onPhaseChange('levelup', this.currentChoices);
    return this.currentChoices;
  }

  private nextLevelXp(level: number): number {
    return Math.round(52 + level * 34 + Math.pow(level, 1.72) * 14);
  }

  private resetWorldState(vesselId: VesselId): void {
    const vessel = VESSELS[vesselId];
    const activeModules = [...getActiveLoadout(this.save)];
    const hasMod = (id: (typeof activeModules)[number]) => activeModules.includes(id);

    this.enemies = [];
    this.enemyBullets = [];
    this.playerBullets = [];
    this.pylons = [];
    this.hazards = [];
    this.nodes = [];
    this.decoys = [];
    this.meteors = [];
    this.lasers = [];
    this.pickups = [];
    this.particles.clear();

    const baseMaxHp = vessel.stats.maxHp + (hasMod('plated_hull') ? 32 : 0);
    const startShield = vessel.stats.shield + (hasMod('reactive_cell') ? 28 : 0);
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facingAngle: -Math.PI / 2,
      hp: baseMaxHp,
      maxHp: baseMaxHp,
      shield: startShield,
      maxShield: Math.max(20, startShield + 12),
      shieldRegenTimer: 0,
      invulnTimer: 0,
      hitFlash: 0,
      kineticCharge: vessel.stats.maxCharge,
      maxKineticCharge: vessel.stats.maxCharge,
      inStillpoint: false,
      stillpointBlend: 0,
      stillpointTimeHeld: 0,
      coreCooldown: 0,
      coreCooldownMax: vesselId === 'phantom' ? 0.55 : 0.75,
      level: 1,
      xp: 0,
      xpToNext: 95,
      rerolls: hasMod('risk_strict') ? 0 : 1 + (hasMod('field_reroll') ? 2 : 0),
      grazeCombo: 0,
      grazeComboTimer: 0,
      grazeHealCounter: 0,
      grazeBurstCounter: 0,
      momentum: 0,
      surgeTier: 1,
      surgeTimer: 0,
      frenzyTimer: 0,
      berserkStacks: 0,
      berserkTimer: 0,
      lastStandUsed: false,
      missileLocks: [],
      inOverclockRing: false,
      moveSpeed: vessel.stats.moveSpeed,
      damageMult: 1,
      bossDmgMult: 1,
      critChance: 0.05,
      critMult: 1.75,
      fireRateMult: 1,
      areaMult: 1,
      corePowerMult: 1,
      chargeRateMult: vessel.stats.chargeRateMult,
      stillpointDrainMult: 1,
      grazeRadius: vessel.stats.grazeRadius,
      magnetRadius: 74,
      xpMult: 1,
      shardMult: 1,
      bonusProjectiles: 0,
      projectileSpeedMult: 1,
      slowPower: 0.42,
      slowDmgMult: 1,
      armor: vessel.stats.armor,
      modules: activeModules,
      weapons: [{ id: vessel.starterWeapon, level: 1, evolved: false, cooldown: 0.18, auxTimer: 0 }],
      passives: [],
      relics: [],
      pacts: [],
      curses: [],
      trail: [],
      distanceMovedSinceDagger: 0,
      haloOrbitAngle: 0,
      droneOrbitAngle: 0
    };

    this.recomputePlayerStats();
    this.player.hp = this.player.maxHp;
    this.player.shield = startShield;
    this.player.kineticCharge = this.player.maxKineticCharge;

    this.enclosure = {
      active: false,
      warningTimer: 0,
      cx: 0,
      cy: 0,
      halfW: 215,
      halfH: 315,
      bossIndex: 0,
      bossId: null,
      playerHitDuringBoss: false
    };

    this.stats = {
      elapsed: 0,
      score: 0,
      kills: 0,
      grazes: 0,
      bestGrazeCombo: 0,
      bossesDefeated: 0,
      shardsEarned: 0,
      cratesEarned: 0,
      relicCratesEarned: 0,
      sectorId: this.sectorId,
      vesselId: this.vesselId,
      coreId: this.coreId,
      skinId: this.skinId,
      heatCount: this.save.activeHeat.length,
      weapons: [],
      relics: [],
      endlessMode: false,
      victory: false
    };

    this.cameraX = 0;
    this.cameraY = 0;
    this.shakeMag = 0;
    this.hitStopTimer = 0;
    this.spawnAccum = { value: 0 };
    this.eliteTimer = { value: 0 };
    this.nodeTimer = { value: 14 };
    this.nextBossIdx = 0;
    this.endlessBossTimer = 85;
    this.nextEventIdx = 0;
    this.endlessEventTimer = 75;
    this.eventBanner = null;
    this.eventBannerTimer = 0;
    this.meteorWavesLeft = 0;
    this.meteorSpawnTimer = 0;
    this.scrapHarvestCounter = 0;
    this.bonusHealDmg = 0;
    this.goodRunCrateAwarded = false;
    this.metaCommitted = { shards: 0, kills: 0, grazes: 0, runCounted: false };
    this.hasUsedStillpoint = false;
    this.tutorialTimer = 9;
  }

  private seedOpeningWave(): void {
    const ctx = this.makeEnemyCtx();
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + 0.45;
      spawnEnemy(ctx, 'swarmer', Math.cos(ang) * 215, Math.sin(ang) * 215, false, 1);
    }
    const turret = spawnEnemy(ctx, 'turret', 0, -235, false, 1);
    turret.fireTimer = 0.85;
  }

  private recomputePlayerStats(): void {
    const v = VESSELS[this.vesselId];
    const hasMod = (id: PlayerState['modules'][number]) => this.player.modules.includes(id);
    const pLv = (id: PassiveId) => this.player.passives.find((p) => p.id === id)?.level ?? 0;

    const capLv = pLv('chrono_capacitor');
    const thrLv = pLv('kinetic_thrusters');
    const coilLv = pLv('flux_coil');
    const lensLv = pLv('aether_lens');
    const coreLv = pLv('singularity_core');
    const grazeLv = pLv('graze_conduit');
    const edgeLv = pLv('momentum_edge');
    const echoLv = pLv('echo_chamber');
    const plateLv = pLv('reactive_plating');
    const overLv = pLv('overclock_core');
    const cryoLv = pLv('cryo_core');
    const tgtLv = pLv('targeting_array');

    const glassHpMult =
      (this.player.pacts.includes('glass_cannon') ? 0.8 : 1.0) *
      (this.save.activeHeat.includes('fragile') ? 0.75 : 1.0) *
      (this.player.relics.includes('glass_prism') ? 0.82 : 1.0) *
      (hasMod('risk_glass') ? 0.7 : 1.0);
    const curseHpLoss = this.player.curses.filter((c) => c === 'fragile_hull').length * 16;
    const curseDrainMult = Math.pow(1.25, this.player.curses.filter((c) => c === 'heavy_drain').length);
    const curseSlowMult = Math.pow(0.88, this.player.curses.filter((c) => c === 'slow_rig').length);
    const dmgBonus =
      (this.player.pacts.includes('bloodlust') ? 1.4 : 1.0) *
      (this.save.activeHeat.includes('fragile') ? 1.25 : 1.0) *
      (hasMod('overbore') ? 1.18 : 1.0);
    const greedShardMult = this.player.pacts.includes('greed') ? 1.6 : 1.0;
    const heatShardBonus =
      1 + this.save.activeHeat.reduce((acc, h) => acc + (HEAT_MODS[h]?.shardBonus ?? 0), 0);

    const prevMaxHp = this.player.maxHp;
    const baseHp = v.stats.maxHp + (hasMod('plated_hull') ? 32 : 0);
    this.player.maxHp = Math.max(32, Math.round(baseHp * glassHpMult) - curseHpLoss);
    if (this.player.maxHp > prevMaxHp) this.player.hp += this.player.maxHp - prevMaxHp;
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);

    const bloodShieldMult = this.player.relics.includes('blood_engine') ? 0.85 : 1.0;
    const modShield = hasMod('reactive_cell') ? 28 : 0;
    this.player.maxShield = Math.max(
      16,
      Math.round((v.stats.shield + modShield + plateLv * 12 + 12) * bloodShieldMult)
    );
    this.player.shield = Math.min(this.player.shield, this.player.maxShield);
    this.player.armor = v.stats.armor + plateLv + (hasMod('plated_hull') ? 2 : 0);
    this.player.maxKineticCharge = v.stats.maxCharge + capLv * 18 + (hasMod('deep_capacitor') ? 35 : 0);
    const overclockDrainMult = this.coreId === 'overclock' ? 0.62 : 1.0;
    const timeBankDrainMult = this.player.relics.includes('time_bank') ? 1.22 : 1.0;
    this.player.stillpointDrainMult =
      Math.pow(0.9, capLv) *
      (hasMod('deep_capacitor') ? 0.82 : 1.0) *
      (hasMod('risk_drain') ? 1.35 : 1.0) *
      overclockDrainMult *
      timeBankDrainMult *
      curseDrainMult;
    this.player.moveSpeed =
      v.stats.moveSpeed * (1 + thrLv * 0.09) * (hasMod('slipstream') ? 1.14 : 1.0) * curseSlowMult;
    this.player.chargeRateMult =
      v.stats.chargeRateMult * (1 + thrLv * 0.16) * (hasMod('slipstream') ? 1.25 : 1.0);
    const doubleTapRofMult = this.player.relics.includes('double_tap') ? 0.86 : 1.0;
    this.player.fireRateMult = (1 + coilLv * 0.13) * doubleTapRofMult;
    this.player.coreCooldownMax =
      (this.vesselId === 'phantom' ? 0.55 : 0.75) *
      Math.pow(0.88, coilLv) *
      (hasMod('hair_trigger') ? 0.7 : 1.0);
    this.player.areaMult = 1 + lensLv * 0.16;
    this.player.damageMult = Math.max(0.8, (1 + coreLv * 0.15 + this.bonusHealDmg) * dmgBonus);
    this.player.bossDmgMult = 1 + tgtLv * 0.16 + (hasMod('boss_hunter') ? 0.3 : 0);
    this.player.corePowerMult = (1 + coreLv * 0.2) * (hasMod('hair_trigger') ? 1.3 : 1.0);
    this.player.grazeRadius = v.stats.grazeRadius + grazeLv * 14 + (hasMod('graze_leech') ? 24 : 0);
    this.player.magnetRadius = 74 + (hasMod('salvage_magnet') ? 60 : 0) + grazeLv * 18;
    this.player.critChance =
      0.05 +
      (this.vesselId === 'vesper' ? 0.08 : 0) +
      (hasMod('hollow_points') ? 0.15 : 0) +
      edgeLv * 0.1;
    this.player.critMult = hasMod('hollow_points') ? 2.2 : 1.75;
    this.player.projectileSpeedMult =
      (this.vesselId === 'vesper' ? 1.18 : 1.0) *
      (hasMod('overbore') ? 1.2 : 1.0) *
      (1 + edgeLv * 0.12);
    this.player.bonusProjectiles =
      Math.floor((echoLv + 1) / 2) +
      (this.player.relics.includes('double_tap') ? 1 : 0) +
      (this.vesselId === 'seraph' ? 1 : 0) +
      (hasMod('twin_chambers') ? 1 : 0);
    this.player.xpMult = 1 + overLv * 0.15;
    this.player.slowPower = 0.42 + cryoLv * 0.06;
    this.player.slowDmgMult = 1 + cryoLv * 0.18;
    this.player.shardMult =
      SECTORS[this.sectorId].shardMult *
      heatShardBonus *
      (1 + (hasMod('salvage_magnet') ? 0.2 : 0) + overLv * 0.16) *
      greedShardMult;
  }

  private addMomentum(amount: number): void {
    const p = this.player;
    if (p.surgeTimer > 0) return;
    p.momentum = Math.min(100, p.momentum + amount);
    p.surgeTier = p.momentum >= 75 ? 3 : p.momentum >= 40 ? 2 : 1;
    if (p.momentum >= 100) {
      p.surgeTier = 4;
      p.surgeTimer = 6.0;
      sound.playLevelUp();
      bridge.haptic('heavy');
      this.particles.ripple(p.x, p.y, 240, 14, '#e5b34c', 0.45);
      this.particles.callout(p.x, p.y - 44, 'SURGE ×4', '#e5b34c', 1.3, 1.0);
    }
  }

  private update(dtReal: number): void {
    this.realTime += dtReal;

    if (this.phase === 'menu') {
      this.worldTime += dtReal;
      this.cameraY -= dtReal * 24;
      this.cameraX += Math.sin(this.realTime * 0.25) * dtReal * 10;
      this.particles.update(dtReal, dtReal);
      return;
    }

    if (this.phase !== 'playing') return;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtReal;
      this.shakeMag *= Math.pow(0.82, dtReal * 60);
      this.particles.update(dtReal * 0.1, dtReal);
      return;
    }

    const input = this.input.sample();
    const player = this.player;

    // Timers for Momentum Surge, Frenzy, Berserk, Event Banner
    if (player.surgeTimer > 0) {
      player.surgeTimer = Math.max(0, player.surgeTimer - dtReal);
      if (player.surgeTimer <= 0) {
        player.momentum = 25;
        player.surgeTier = 1;
      }
    } else {
      player.momentum = Math.max(0, player.momentum - dtReal * 5.2);
      player.surgeTier = player.momentum >= 75 ? 3 : player.momentum >= 40 ? 2 : 1;
    }
    if (player.frenzyTimer > 0) player.frenzyTimer = Math.max(0, player.frenzyTimer - dtReal);
    if (player.berserkTimer > 0) {
      player.berserkTimer -= dtReal;
      if (player.berserkTimer <= 0) player.berserkStacks = 0;
    }
    if (this.eventBannerTimer > 0) {
      this.eventBannerTimer -= dtReal;
      if (this.eventBannerTimer <= 0) this.eventBanner = null;
    }

    // 1. Lift-to-Focus Stillpoint + 5 Core Powers!
    const wasStillpoint = player.inStillpoint;
    const minToEnter = wasStillpoint ? 0.5 : 5;
    player.inStillpoint = input.wantsStillpoint && player.kineticCharge > minToEnter;
    const justEntered = !wasStillpoint && player.inStillpoint;
    let justExited = wasStillpoint && !player.inStillpoint;

    if (player.coreCooldown > 0) {
      player.coreCooldown = Math.max(0, player.coreCooldown - dtReal);
    }

    if (justEntered) {
      this.hasUsedStillpoint = true;
      player.stillpointTimeHeld = 0;
      sound.playStillpointEnter();
      bridge.haptic('light');

      // Ghost Step relic: arc lightning back through your movement trail!
      if (player.relics.includes('ghost_step') && player.trail.length >= 2) {
        const origin = player.trail[0];
        this.particles.arc(origin.x, origin.y, player.x, player.y, '#cf7dff', 3, 0.28);
        for (const e of [...this.enemies]) {
          if (e.hp > 0 && pointToSegmentDist(e.x, e.y, origin.x, origin.y, player.x, player.y) <= e.radius + 16) {
            this.damageEnemy(e, 44 * player.damageMult, '#cf7dff', true);
          }
        }
      }

      if (player.coreCooldown <= 0 && player.kineticCharge >= 16) {
        this.activateStillpointCoreEntry();
      }

      if (this.vesselId === 'volt') {
        const sorted = [...this.enemies]
          .filter((e) => e.hp > 0)
          .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))
          .slice(0, 3);
        for (const t of sorted) {
          if (Math.hypot(t.x - player.x, t.y - player.y) <= 280) {
            this.particles.arc(player.x, player.y, t.x, t.y, '#6fa8ff', 2.8, 0.2);
            this.damageEnemy(t, 28 * player.damageMult, '#6fa8ff', true);
          }
        }
      }
    }

    // 3. Kinetic Charge — Earned Focus Economy (move & graze to recharge; zero idle AFK regen)
    if (player.inStillpoint) {
      player.stillpointTimeHeld += dtReal;
      player.kineticCharge = Math.max(0, player.kineticCharge - 27 * player.stillpointDrainMult * dtReal);
      if (player.kineticCharge <= 0.1) {
        player.inStillpoint = false;
        justExited = true;
      }
    } else {
      const ocBonus = player.inOverclockRing ? 2.1 : 1.0;
      const moveBonus = input.isMoving ? 11.5 : 0;
      player.kineticCharge = Math.min(
        player.maxKineticCharge,
        player.kineticCharge + moveBonus * player.chargeRateMult * ocBonus * dtReal
      );
    }

    if (justExited) {
      sound.playStillpointExit();
      this.activateStillpointCoreExit();
    }

    const targetBlend = player.inStillpoint ? 1 : 0;
    player.stillpointBlend +=
      (targetBlend - player.stillpointBlend) * Math.min(1, dtReal * (player.inStillpoint ? 22 : 16));
    sound.setStillpointBlend(player.stillpointBlend);

    // Overclock Core slows time to 35% instead of 17%, trading deep slow-mo for 2.3x turret DPS!
    const slowDepth = this.coreId === 'overclock' ? 0.65 : 0.83;
    const timeScale = 1 - player.stillpointBlend * slowDepth;
    const dtWorld = dtReal * timeScale;
    this.worldTime += dtWorld;
    this.stats.elapsed += dtWorld;
    if (this.tutorialTimer > 0) this.tutorialTimer -= dtReal;

    // 2. Gravity Siphon continuous enemy pull while in Stillpoint!
    if (player.inStillpoint && this.coreId === 'siphon') {
      const pullR = 240 * player.areaMult;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.isBoss) continue;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < pullR && d > 44) {
          e.x += (dx / d) * 155 * dtReal;
          e.y += (dy / d) * 155 * dtReal;
        }
      }
    }

    const plateLv = player.passives.find((p) => p.id === 'reactive_plating')?.level ?? 0;
    const hasReactiveCell = player.modules.includes('reactive_cell');
    if ((plateLv > 0 || hasReactiveCell) && player.shield < player.maxShield) {
      player.shieldRegenTimer += dtWorld;
      const interval =
        plateLv > 0
          ? Math.max(2.0, (hasReactiveCell ? 4.8 : 5.5) - plateLv * 0.6)
          : 4.0;
      if (player.shieldRegenTimer >= interval) {
        player.shieldRegenTimer = 0;
        const gain = (plateLv > 0 ? 4 : 0) + (hasReactiveCell ? 5 : 0);
        player.shield = Math.min(player.maxShield, player.shield + gain);
      }
    }

    // 4. Player Movement
    const speedBoost = (player.surgeTimer > 0 ? 1.18 : 1) * (player.frenzyTimer > 0 ? 1.32 : 1);
    if (!player.inStillpoint && input.isMoving) {
      player.vx = input.moveX * player.moveSpeed * speedBoost;
      player.vy = input.moveY * player.moveSpeed * speedBoost;
      const step = Math.hypot(player.vx * dtReal, player.vy * dtReal);
      player.x += player.vx * dtReal;
      player.y += player.vy * dtReal;
      player.distanceMovedSinceDagger += step;
      player.facingAngle = Math.atan2(player.vy, player.vx);

      if (Math.random() < 0.58) {
        player.trail.push({ x: player.x, y: player.y, alpha: 0.9 });
        if (player.trail.length > 14) player.trail.shift();
      }
    } else {
      player.vx *= Math.pow(0.76, dtReal * 60);
      player.vy *= Math.pow(0.76, dtReal * 60);
    }

    for (let i = player.trail.length - 1; i >= 0; i--) {
      player.trail[i].alpha -= dtReal * 3.8;
      if (player.trail[i].alpha <= 0) player.trail.splice(i, 1);
    }

    if (this.enclosure.active) {
      const m = 14;
      player.x = Math.max(this.enclosure.cx - this.enclosure.halfW + m, Math.min(this.enclosure.cx + this.enclosure.halfW - m, player.x));
      player.y = Math.max(this.enclosure.cy - this.enclosure.halfH + m, Math.min(this.enclosure.cy + this.enclosure.halfH - m, player.y));
    }

    if (player.invulnTimer > 0) {
      // Scale i-frame decay gently during Stillpoint so slow-mo never causes 5x contact hits
      const invulnDt = Math.max(dtWorld, dtReal * 0.35);
      player.invulnTimer = Math.max(0, player.invulnTimer - invulnDt);
    }
    if (player.hitFlash > 0) player.hitFlash = Math.max(0, player.hitFlash - dtReal * 5);
    if (player.grazeComboTimer > 0) {
      player.grazeComboTimer -= dtReal;
      if (player.grazeComboTimer <= 0) player.grazeCombo = 0;
    }
    for (const e of this.enemies) {
      if (e.shardSpillCooldown && e.shardSpillCooldown > 0) {
        e.shardSpillCooldown = Math.max(0, e.shardSpillCooldown - dtReal);
      }
    }

    const camTX = this.enclosure.active ? this.enclosure.cx * 0.42 + player.x * 0.58 : player.x;
    const camTY = this.enclosure.active ? this.enclosure.cy * 0.42 + player.y * 0.58 : player.y;
    this.cameraX += (camTX - this.cameraX) * Math.min(1, dtReal * 8.5);
    this.cameraY += (camTY - this.cameraY) * Math.min(1, dtReal * 8.5);
    this.shakeMag *= Math.pow(0.84, dtReal * 60);

    // 5. Mid-Run Tactical Events, World Nodes, Decoys, Meteors, Bosses & Waves
    this.updateTacticalEvents(dtWorld);
    this.updateWorldNodes(dtWorld, dtReal);
    this.updateDecoysAndMeteors(dtWorld, dtReal);
    if (this.phase !== 'playing') return;
    this.updateBossDirector(dtWorld, dtReal);
    if (this.phase !== 'playing') return;

    const enemyCtx = this.makeEnemyCtx();
    updateWaveDirector(enemyCtx, dtWorld, this.spawnAccum, this.eliteTimer, this.nodeTimer);
    updateEnemies(enemyCtx, dtWorld);
    if (this.phase !== 'playing') return;

    // Overclock Core: boost weapon tick rate 2.3x during Stillpoint!
    const weaponDtReal =
      player.inStillpoint && this.coreId === 'overclock' ? dtReal * 2.3 : dtReal;
    updateWeapons(this.makeWeaponCtx(justEntered, justExited), dtWorld, weaponDtReal);
    if (this.phase !== 'playing') return;
    this.updateHazards(dtWorld, dtReal);
    if (this.phase !== 'playing') return;
    this.updateLasers(dtWorld, dtReal);
    if (this.phase !== 'playing') return;
    this.updatePlayerBullets(dtWorld, dtReal);
    if (this.phase !== 'playing') return;
    this.updateEnemyBulletsAndGrazing(dtWorld);
    if (this.phase !== 'playing') return;
    this.updateEnemyContactCollisions();
    if (this.phase !== 'playing') return;
    this.updatePickups(dtWorld, dtReal);
    if (this.phase !== 'playing') return;
    this.particles.update(dtWorld, dtReal);

    this.hudThrottle += dtReal;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private activateStillpointCoreEntry(): void {
    const p = this.player;
    const v = VESSELS[this.vesselId];
    const aura = PARRY_FX[this.save.selectedParryFx] ?? PARRY_FX.steel_ring;
    const metaAreaMult = p.modules.includes('hair_trigger') ? 1.15 : 1.0;
    const coreRadiusMult = p.areaMult * v.stats.coreAreaMult * metaAreaMult;

    // Nova vessel passive: drop a pulling gravity rift whenever a Core triggers!
    if (this.vesselId === 'nova') {
      this.hazards.push({
        id: this.nextEntityId++,
        kind: 'rift',
        x: p.x,
        y: p.y,
        radius: 66 * p.areaMult,
        damagePerSec: 36 * p.damageMult,
        age: 0,
        maxAge: 2.3,
        color: aura.outer,
        collapsed: false,
        evolved: false,
        pullStrength: 170
      });
    }

    // Evolved Halo Sawblades (Eclipse Gyro): release 6 homing solar flares on Stillpoint entry!
    const halo = p.weapons.find((w) => w.id === 'halo_blades' && w.evolved);
    if (halo) {
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6;
        this.playerBullets.push({
          id: this.nextEntityId++,
          kind: 'parry_shard',
          x: p.x + Math.cos(ang) * 28,
          y: p.y + Math.sin(ang) * 28,
          vx: Math.cos(ang) * 460,
          vy: Math.sin(ang) * 460,
          radius: 6,
          damage: 34 * p.damageMult,
          pierce: 2,
          age: 0,
          maxAge: 1.5,
          color: '#8ee06c',
          homing: 7,
          hitSet: new Set(),
          evolved: true
        });
      }
    }

    if (this.coreId === 'blink') {
      // PHANTOM BLINK: Leave an exploding decoy hologram & teleport forward!
      p.kineticCharge = Math.max(0, p.kineticCharge - 14);
      p.coreCooldown = p.coreCooldownMax;
      const oldX = p.x;
      const oldY = p.y;
      this.decoys.push({ x: oldX, y: oldY, age: 0, maxAge: 2.2, radius: 52 * p.areaMult });
      let nx = p.x + Math.cos(p.facingAngle) * 108;
      let ny = p.y + Math.sin(p.facingAngle) * 108;
      if (this.enclosure.active) {
        nx = Math.max(this.enclosure.cx - this.enclosure.halfW + 18, Math.min(this.enclosure.cx + this.enclosure.halfW - 18, nx));
        ny = Math.max(this.enclosure.cy - this.enclosure.halfH + 18, Math.min(this.enclosure.cy + this.enclosure.halfH - 18, ny));
      }
      this.particles.arc(oldX, oldY, nx, ny, '#cf7dff', 3.5, 0.24);
      this.particles.ripple(nx, ny, 120 * coreRadiusMult, 12, aura.outer, 0.34);
      p.x = nx;
      p.y = ny;
      p.invulnTimer = Math.max(p.invulnTimer, 0.25);
      sound.playCoreBurst(3, false);
      bridge.haptic('medium');
      return;
    }

    if (this.coreId === 'siphon') {
      // GRAVITY SIPHON: Pull foes inward during Stillpoint; main blast fires on touch-down!
      p.kineticCharge = Math.max(0, p.kineticCharge - 10);
      p.coreCooldown = p.coreCooldownMax;
      this.particles.ripple(p.x, p.y, 215 * coreRadiusMult, 12, '#ff9f43', 0.45);
      sound.playCoreBurst(2, false);
      return;
    }

    if (this.coreId === 'overclock') {
      // OVERCLOCK: Hyper-DPS turret mode + auto-crit during Stillpoint!
      p.kineticCharge = Math.max(0, p.kineticCharge - 8);
      p.coreCooldown = p.coreCooldownMax;
      this.particles.ripple(p.x, p.y, 130 * coreRadiusMult, 12, '#e5b34c', 0.36);
      this.particles.callout(p.x, p.y - 36, 'OVERCLOCK', '#e5b34c', 1.05, 0.7);
      sound.playCoreBurst(2, false);
      return;
    }

    if (this.coreId === 'berserk') {
      // RAZOR REFLEX: Wide crimson slash executing <32% HP & granting Shield + Haste!
      p.kineticCharge = Math.max(0, p.kineticCharge - 14);
      p.coreCooldown = p.coreCooldownMax;
      const slashR = 162 * coreRadiusMult;
      const dmg = 52 * p.damageMult * p.corePowerMult;
      this.hazards.push({
        id: this.nextEntityId++,
        kind: 'nova_wave',
        x: p.x,
        y: p.y,
        radius: 22,
        maxRadius: slashR,
        damagePerSec: 0,
        age: 0,
        maxAge: 0.26,
        color: '#ff4858',
        collapsed: false,
        evolved: true,
        pullStrength: 0
      });
      this.particles.ripple(p.x, p.y, slashR * 1.25, 16, '#ff4858', 0.38);
      this.addShake(6);
      sound.playCoreBurst(4, true);
      bridge.haptic('medium');

      let execs = 0;
      let hitCount = 0;
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= slashR + e.radius) {
          hitCount++;
          const isExec = !e.isBoss && e.hp / e.maxHp <= 0.32;
          if (isExec) execs++;
          this.damageEnemy(e, isExec ? e.hp + 20 : dmg, '#ff4858', true);
        }
      }
      if (hitCount > 0) {
        p.shield = Math.min(p.maxShield, p.shield + hitCount * 4);
        p.berserkStacks = Math.min(8, p.berserkStacks + Math.min(4, hitCount));
        p.berserkTimer = 5.0;
        this.addMomentum(hitCount * 4);
      }
      if (execs > 0) {
        this.particles.callout(p.x, p.y - 42, `EXECUTE ×${execs}`, '#ff4858', 1.25, 0.85);
      }
      return;
    }

    // Default KINETIC NOVA Core: high-impact shockwave blasting & knocking back nearby foes!
    p.kineticCharge = Math.max(0, p.kineticCharge - 14);
    p.coreCooldown = p.coreCooldownMax;
    const blastR = 158 * coreRadiusMult;
    const dmg = 54 * p.damageMult * p.corePowerMult;
    this.hazards.push({
      id: this.nextEntityId++,
      kind: 'nova_wave',
      x: p.x,
      y: p.y,
      radius: 22,
      maxRadius: blastR,
      damagePerSec: 0,
      age: 0,
      maxAge: 0.28,
      color: aura.outer,
      collapsed: false,
      evolved: true,
      pullStrength: 0
    });
    this.particles.ripple(p.x, p.y, blastR * 1.3, 18, aura.outer, 0.42);
    this.addShake(6);
    sound.playCoreBurst(4, false);
    bridge.haptic('medium');

    let hitCount = 0;
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist <= blastR + e.radius) {
        hitCount++;
        this.damageEnemy(e, dmg, aura.outer, true);
        if (!e.isBoss && e.hp > 0) {
          e.x += (dx / dist) * 54;
          e.y += (dy / dist) * 54;
        }
      }
    }
    if (hitCount > 0) {
      this.addMomentum(Math.min(18, hitCount * 4));
      if (this.vesselId === 'aegis' && hitCount >= 3) {
        p.shield = Math.min(p.maxShield, p.shield + 10);
      }
    }
  }

  private activateStillpointCoreExit(): void {
    const p = this.player;
    const v = VESSELS[this.vesselId];
    const metaAreaMult = p.modules.includes('hair_trigger') ? 1.15 : 1.0;

    // Detonate Blink Decoys on touch-down!
    if (this.coreId === 'blink' && this.decoys.length > 0) {
      for (const d of this.decoys) {
        this.detonateDecoy(d);
      }
      this.decoys.length = 0;
    }

    // Gravity Siphon: shatter all sucked-in enemies outward + fire shrapnel ring on touch-down!
    if (this.coreId === 'siphon' && p.stillpointTimeHeld > 0.14) {
      const blastR = 180 * p.areaMult * v.stats.coreAreaMult * metaAreaMult;
      this.hazards.push({
        id: this.nextEntityId++,
        kind: 'nova_wave',
        x: p.x,
        y: p.y,
        radius: 24,
        maxRadius: blastR,
        damagePerSec: 0,
        age: 0,
        maxAge: 0.3,
        color: '#ff9f43',
        collapsed: false,
        evolved: true,
        pullStrength: 0
      });
      this.particles.ripple(p.x, p.y, blastR * 1.35, 18, '#ff9f43', 0.45);
      sound.playCoreBurst(5, true);
      bridge.haptic('heavy');
      this.addShake(8);

      let hitCount = 0;
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= blastR + e.radius) hitCount++;
      }

      const dmg = (56 + hitCount * 10) * p.damageMult * p.corePowerMult;
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist <= blastR + e.radius) {
          this.damageEnemy(e, dmg, '#ff9f43', true);
          if (!e.isBoss && e.hp > 0) {
            e.x += (dx / dist) * 64;
            e.y += (dy / dist) * 64;
          }
        }
      }

      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        this.playerBullets.push({
          id: this.nextEntityId++,
          kind: 'shrapnel',
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * 480,
          vy: Math.sin(ang) * 480,
          radius: 5.5,
          damage: 26 * p.damageMult * p.corePowerMult,
          pierce: 2,
          age: 0,
          maxAge: 0.85,
          color: '#ff9f43',
          homing: 0,
          hitSet: new Set()
        });
      }
      if (hitCount > 0) {
        this.addMomentum(Math.min(22, hitCount * 5));
        this.particles.callout(p.x, p.y - 38, `SIPHON ×${hitCount}`, '#ff9f43', 1.2, 0.85);
      }
    }
  }

  private detonateDecoy(d: BlinkDecoy): void {
    const p = this.player;
    const blastR = 135 * p.areaMult;
    const dmg = 54 * p.damageMult * p.corePowerMult;
    sound.playShoot('mortar');
    this.particles.shatter(d.x, d.y, '#cf7dff', 10, 1.3);
    this.particles.ripple(d.x, d.y, blastR * 1.2, 14, '#cf7dff', 0.4);
    for (const e of [...this.enemies]) {
      if (e.hp > 0 && Math.hypot(e.x - d.x, e.y - d.y) <= blastR + e.radius) {
        this.damageEnemy(e, dmg, '#cf7dff', true);
      }
    }
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      this.playerBullets.push({
        id: this.nextEntityId++,
        kind: 'shrapnel',
        x: d.x,
        y: d.y,
        vx: Math.cos(ang) * 440,
        vy: Math.sin(ang) * 440,
        radius: 5,
        damage: 24 * p.damageMult,
        pierce: 2,
        age: 0,
        maxAge: 0.9,
        color: '#cf7dff',
        homing: 0,
        hitSet: new Set()
      });
    }
  }

  private updateTacticalEvents(dtWorld: number): void {
    if (this.enclosure.active || this.enclosure.warningTimer > 0) return;

    const eventTimes = [48, 162, 282];
    if (this.nextEventIdx < eventTimes.length && this.stats.elapsed >= eventTimes[this.nextEventIdx]) {
      const idx = this.nextEventIdx++;
      this.triggerTacticalEvent(idx % 3);
    } else if (this.nextEventIdx >= eventTimes.length) {
      this.endlessEventTimer -= dtWorld;
      if (this.endlessEventTimer <= 0) {
        this.endlessEventTimer = 75;
        this.triggerTacticalEvent(Math.floor(Math.random() * 3));
      }
    }

    if (this.meteorWavesLeft > 0) {
      this.meteorSpawnTimer -= dtWorld;
      if (this.meteorSpawnTimer <= 0) {
        this.meteorSpawnTimer = 0.65;
        this.meteorWavesLeft--;
        for (let k = 0; k < 2; k++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 35 + Math.random() * 145;
          this.meteors.push({
            x: this.player.x + Math.cos(ang) * dist,
            y: this.player.y + Math.sin(ang) * dist,
            radius: 44,
            timer: 1.05,
            maxTimer: 1.05
          });
        }
      }
    }
  }

  private triggerTacticalEvent(kind: number): void {
    const p = this.player;
    const ctx = this.makeEnemyCtx();
    if (kind === 0) {
      // TREASURE HAULER!
      this.eventBanner = 'Relic Hauler';
      this.eventBannerTimer = 3.2;
      sound.playLevelUp();
      const side = Math.random() < 0.5 ? -1 : 1;
      spawnEnemy(ctx, 'hauler', p.x + side * 290, p.y - 90 + Math.random() * 180, false, 1 + this.stats.elapsed / 120);
    } else if (kind === 1) {
      // SWARM RING!
      this.eventBanner = 'Swarm Ring';
      this.eventBannerTimer = 2.8;
      sound.playBossWarn();
      const count = 16;
      for (let i = 0; i < count; i++) {
        const ang = (i * Math.PI * 2) / count;
        spawnEnemy(ctx, 'swarmer', p.x + Math.cos(ang) * 235, p.y + Math.sin(ang) * 235, false, 1 + this.stats.elapsed / 140);
      }
    } else {
      // METEOR BARRAGE!
      this.eventBanner = 'Slag Barrage';
      this.eventBannerTimer = 3.0;
      sound.playBossWarn();
      this.meteorWavesLeft = 6;
      this.meteorSpawnTimer = 0.2;
    }
  }

  private updateDecoysAndMeteors(dtWorld: number, dtReal: number): void {
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.age += dtWorld;
      if (d.age >= d.maxAge) {
        this.detonateDecoy(d);
        this.decoys.splice(i, 1);
      }
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.timer -= dtWorld;
      if (m.timer <= 0) {
        this.particles.shatter(m.x, m.y, '#ff6a26', 8, 1.1);
        this.particles.ripple(m.x, m.y, m.radius * 1.5, 10, '#ff6a26', 0.35);
        sound.playShoot('mortar');
        const dp = Math.hypot(this.player.x - m.x, this.player.y - m.y);
        if (dp <= m.radius) {
          this.damagePlayer(16);
        } else if (dp <= m.radius + this.player.grazeRadius) {
          this.registerGraze(m.x, m.y);
          this.pickups.push({
            id: this.nextEntityId++,
            kind: 'shard',
            x: m.x,
            y: m.y,
            vx: 0,
            vy: 0,
            value: Math.round(5 * this.player.shardMult),
            age: 0,
            magnetized: false
          });
        }
        // Meteor also blasts enemies inside!
        for (const e of [...this.enemies]) {
          if (e.hp > 0 && Math.hypot(e.x - m.x, e.y - m.y) <= m.radius + e.radius) {
            this.damageEnemy(e, 45, '#ff6a26');
          }
        }
        this.meteors.splice(i, 1);
        if (this.phase !== 'playing') return;
      }
    }
    void dtReal;
  }

  private updateWorldNodes(dtWorld: number, dtReal: number): void {
    const p = this.player;
    p.inOverclockRing = false;

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      n.age += dtWorld;
      if (n.age >= n.maxAge) {
        this.nodes.splice(i, 1);
        continue;
      }

      const d = Math.hypot(p.x - n.x, p.y - n.y);
      if (n.kind === 'overclock_ring') {
        if (d <= n.radius) p.inOverclockRing = true;
      } else if (n.kind === 'pact_altar' && n.pactId) {
        if (d <= n.radius) {
          n.progress += dtReal * 0.9;
          if (n.progress >= 1) {
            this.acceptPact(n.pactId, n.x, n.y);
            this.nodes.splice(i, 1);
          }
        } else {
          n.progress = Math.max(0, n.progress - dtReal * 0.8);
        }
      }
    }
  }

  private acceptPact(pactId: PactId, x: number, y: number): void {
    if (!this.player.pacts.includes(pactId)) {
      this.player.pacts.push(pactId);
      this.recomputePlayerStats();
    }
    const def = PACTS[pactId];
    sound.playBossWarn();
    bridge.haptic('heavy');
    this.particles.ripple(x, y, 220, 16, def.accent, 0.5);
    this.particles.callout(x, y - 24, `PACT: ${def.name}`, def.accent, 1.2, 1.2);
  }

  private updateBossDirector(dtWorld: number, dtReal: number): void {
    const enc = this.enclosure;
    const sector = SECTORS[this.sectorId];
    const maxMainBosses = this.sectorId === 'singularity' ? 4 : 3;

    if (!enc.active && enc.warningTimer <= 0) {
      if (!this.stats.endlessMode && this.nextBossIdx < maxMainBosses) {
        const nextBoss = BOSS_SCHEDULE[this.nextBossIdx];
        if (this.stats.elapsed >= nextBoss.time * sector.bossIntervalScale) {
          this.beginBossWarning(this.nextBossIdx);
        }
      } else if (this.stats.endlessMode) {
        this.endlessBossTimer -= dtWorld;
        if (this.endlessBossTimer <= 0) {
          this.endlessBossTimer = 85;
          this.beginBossWarning(this.nextBossIdx % BOSS_SCHEDULE.length);
        }
      }
    }

    if (enc.warningTimer > 0) {
      enc.warningTimer -= dtReal;
      enc.cx += (this.player.x - enc.cx) * Math.min(1, dtReal * 3);
      enc.cy += (this.player.y - enc.cy) * Math.min(1, dtReal * 3);
      if (enc.warningTimer <= 0) {
        enc.active = true;
        enc.playerHitDuringBoss = false;
        sound.setGameState(true, true);
        bridge.haptic('heavy');
        this.addShake(9);

        this.spawnAccum.value = 0;
        const pad = 24;
        const minX = enc.cx - enc.halfW + pad;
        const maxX = enc.cx + enc.halfW - pad;
        const minY = enc.cy - enc.halfH + pad;
        const maxY = enc.cy + enc.halfH - pad;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.isBoss) continue;
          if (e.kind === 'hauler') {
            e.x = Math.max(minX, Math.min(maxX, e.x));
            e.y = Math.max(minY, Math.min(maxY, e.y));
            continue;
          }
          this.spawnXp(e.x, e.y, e.xpValue);
          this.particles.shatter(e.x, e.y, e.accent, 4, 0.8);
          this.enemies.splice(i, 1);
        }
        for (const pk of this.pickups) {
          pk.x = Math.max(minX, Math.min(maxX, pk.x));
          pk.y = Math.max(minY, Math.min(maxY, pk.y));
        }
        this.enemyBullets.length = 0;

        const sched = BOSS_SCHEDULE[enc.bossIndex % BOSS_SCHEDULE.length];
        const endlessScale = this.stats.endlessMode
          ? Math.max(1.25, 1 + Math.max(0, this.stats.elapsed - 260) / 130)
          : 1;
        const boss = spawnEnemy(
          this.makeEnemyCtx(),
          sched.kind,
          enc.cx,
          enc.cy - enc.halfH * 0.55,
          false,
          endlessScale
        );
        enc.bossId = boss.id;
        this.particles.ripple(boss.x, boss.y, 290, 22, boss.accent, 0.65);
        this.emitHud();
      }
    }
  }

  private beginBossWarning(bossIndex: number): void {
    const enc = this.enclosure;
    enc.bossIndex = bossIndex;
    enc.warningTimer = 2.6;
    enc.cx = this.player.x;
    enc.cy = this.player.y;
    enc.halfW = 215;
    enc.halfH = 315;
    sound.playBossWarn();
    bridge.haptic('warning');
    this.emitHud();
  }

  private updateHazards(dtWorld: number, dtReal: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.age +=
        h.kind === 'nova_wave' || h.kind === 'frost_burst'
          ? dtReal
          : h.kind === 'singularity'
            ? dtReal * 0.45
            : dtWorld;
      if (h.age >= h.maxAge) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (h.kind === 'nova_wave' || h.kind === 'frost_burst') continue;

      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        const dx = h.x - e.x;
        const dy = h.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d <= h.radius + e.radius) {
          this.damageEnemy(e, h.damagePerSec * dtWorld, h.color);
          if (this.phase !== 'playing') return;
        }
        if (h.pullStrength > 0 && d <= h.radius * 1.9 && !e.isBoss && e.hp > 0) {
          const pull = h.pullStrength * dtReal * (1 - d / (h.radius * 2));
          e.x += (dx / d) * pull;
          e.y += (dy / d) * pull;
        }
      }
      if (h.damagePerSec > 0) {
        this.damageShrinesInRadius(h.x, h.y, h.radius, h.damagePerSec * dtWorld);
      }

      if (h.evolved && (h.kind === 'singularity' || h.kind === 'crater')) {
        for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
          const b = this.enemyBullets[bi];
          const dx = h.x - b.x;
          const dy = h.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < h.radius * 0.85) {
            this.enemyBullets.splice(bi, 1);
            if (Math.random() < 0.35) this.spawnXp(b.x, b.y, 4);
          } else if (d < h.radius * 1.6) {
            b.x += (dx / d) * 140 * dtReal;
            b.y += (dy / d) * 140 * dtReal;
          }
        }
      }
    }
  }

  private updateLasers(dtWorld: number, dtReal: number): void {
    const p = this.player;
    const hurtR = p.inStillpoint ? 4.5 : 8.2;

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= l.isEnemy ? dtWorld : dtReal;
      if (l.life <= 0) {
        if (l.isTelegraph) {
          l.isTelegraph = false;
          l.life = 0.24;
          l.maxLife = 0.24;
          sound.playShoot('rail');
          this.addShake(4);
        } else {
          this.lasers.splice(i, 1);
        }
        continue;
      }

      if (l.isEnemy && !l.isTelegraph && l.damage) {
        const dist = pointToSegmentDist(p.x, p.y, l.x1, l.y1, l.x2, l.y2);
        if (!l.hitPlayer && dist <= hurtR + l.width * 0.42) {
          l.hitPlayer = true;
          this.damagePlayer(l.damage);
          if (this.phase !== 'playing') return;
        } else if (dist <= p.grazeRadius + l.width * 0.5 && Math.random() < 0.22) {
          this.registerGraze(p.x, p.y);
        }
      }
    }
  }

  private updatePlayerBullets(dtWorld: number, dtReal: number): void {
    const phantomEvolved = this.player.weapons.some((w) => w.id === 'phase_daggers' && w.evolved);
    const orbitalBonus = this.player.relics.includes('orbital_overdrive') ? 1.45 : 1.0;
    const homingMult =
      1 + (this.player.passives.find((p) => p.id === 'targeting_array')?.level ?? 0) * 0.25;
    const enemySnap = [...this.enemies];

    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      if (i >= this.playerBullets.length) i = this.playerBullets.length - 1;
      if (i < 0) break;
      const b = this.playerBullets[i];
      if (!b) continue;

      if (b.kind === 'scythe') {
        b.spinAngle = (b.spinAngle ?? 0) + dtReal * (this.player.inStillpoint ? 26 : 16);
        const dtS = this.player.inStillpoint ? dtReal * 0.08 : dtWorld;
        b.age += dtS;
        if (b.age >= b.maxAge) {
          this.playerBullets.splice(i, 1);
          continue;
        }
        if (!this.player.inStillpoint) {
          if (b.age > 0.65) {
            const dx = this.player.x - b.x;
            const dy = this.player.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            b.vx += (dx / d) * 950 * dtWorld;
            b.vy += (dy / d) * 950 * dtWorld;
            if (b.age > 0.9 && d < 26) {
              this.playerBullets.splice(i, 1);
              continue;
            }
          }
          b.x += b.vx * dtWorld;
          b.y += b.vy * dtWorld;
        }
        // Reset Scythe hitSet in real time (~7 hits/sec) so hovering blades shred during Stillpoint
        b.hitResetTimer = (b.hitResetTimer ?? 0) + dtReal;
        if (b.hitResetTimer >= 1 / 7) {
          b.hitResetTimer -= 1 / 7;
          b.hitSet.clear();
        }
      } else {
        const dt =
          b.kind === 'parry_shard' || b.kind === 'dagger_homing' || b.kind === 'missile'
            ? dtReal * 0.92
            : this.player.inStillpoint
              ? dtReal * 0.45
              : dtWorld;
        b.age += dt;

        if (b.kind === 'mortar_shell') {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.age >= b.maxAge) {
            const r = b.blastRadius ?? 68;
            this.particles.burst(b.x, b.y, '#d387ff', 12, 50, 180, 3.2, 0.36);
            this.particles.ring(b.x, b.y, '#d387ff', 16, 0.28);
            for (const e of enemySnap) {
              if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) <= r + e.radius) {
                this.damageEnemy(e, b.damage, '#d387ff');
              }
            }
            this.damageShrinesInRadius(b.x, b.y, r, b.damage);
            this.hazards.push({
              id: this.nextEntityId++,
              kind: b.evolved || this.player.inStillpoint ? 'singularity' : 'crater',
              x: b.x,
              y: b.y,
              radius: r,
              damagePerSec: b.damage * 0.72,
              age: 0,
              maxAge: b.evolved ? 4.4 : 3.2,
              color: '#b97aff',
              collapsed: this.player.inStillpoint,
              evolved: Boolean(b.evolved),
              pullStrength: b.evolved ? 220 : this.player.inStillpoint ? 240 : 0
            });
            this.playerBullets.splice(i, 1);
          }
          continue;
        }

        if (b.age >= b.maxAge) {
          this.playerBullets.splice(i, 1);
          continue;
        }

        if (b.homing > 0) {
          const target =
            (b.targetId ? this.enemies.find((e) => e.id === b.targetId && e.hp > 0) : null) ??
            findNearestEnemy(b.x, b.y, this.enemies, 540, true);
          if (target) {
            b.targetId = target.id;
            const desired = Math.atan2(target.y - b.y, target.x - b.x);
            const speed = Math.hypot(b.vx, b.vy) || 460;
            const cur = Math.atan2(b.vy, b.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const nextAng = cur + diff * Math.min(1, b.homing * homingMult * dt);
            b.vx = Math.cos(nextAng) * speed;
            b.vy = Math.sin(nextAng) * speed;
          }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.kind === 'ricochet' && this.enclosure.active && (b.bounces ?? 0) > 0) {
          const enc = this.enclosure;
          if (b.x < enc.cx - enc.halfW || b.x > enc.cx + enc.halfW) {
            b.vx *= -1;
            b.bounces = (b.bounces ?? 1) - 1;
            b.hitSet.clear();
          }
          if (b.y < enc.cy - enc.halfH || b.y > enc.cy + enc.halfH) {
            b.vy *= -1;
            b.bounces = (b.bounces ?? 1) - 1;
            b.hitSet.clear();
          }
        }
      }

      // Breakable Resonance Shrines
      for (let ni = this.nodes.length - 1; ni >= 0; ni--) {
        const n = this.nodes[ni];
        if (n.kind !== 'shrine') continue;
        if (b.hitSet.has(-n.id)) continue;
        if ((n.x - b.x) ** 2 + (n.y - b.y) ** 2 <= (n.radius + b.radius) ** 2) {
          b.hitSet.add(-n.id);
          n.hp -= b.damage;
          this.particles.burst(b.x, b.y, '#e5b34c', 4, 40, 120, 2, 0.2);
          if (n.hp <= 0) {
            this.shatterShrine(n);
            this.nodes.splice(ni, 1);
          }
          if (b.kind !== 'scythe') {
            b.pierce--;
            if (b.pierce <= 0) break;
          }
        }
      }
      if (b.pierce <= 0 && b.kind !== 'scythe') {
        this.playerBullets.splice(i, 1);
        continue;
      }

      // Enemy collision
      for (const e of enemySnap) {
        if (this.phase !== 'playing') return;
        if (e.hp <= 0 || b.hitSet.has(e.id)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        if (dx * dx + dy * dy <= (e.radius + b.radius) ** 2) {
          b.hitSet.add(e.id);
          let finalDmg = b.damage * (b.kind === 'scythe' || b.kind === 'prism_bolt' ? orbitalBonus : 1);

          // Phalanx directional frontal shield check! (Stillpoint & Prism Shards pierce cleanly!)
          if (e.kind === 'aegis_bot' && b.kind !== 'parry_shard' && !this.player.inStillpoint) {
            const hitAngle = Math.atan2(b.y - e.y, b.x - e.x);
            let diff = hitAngle - e.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) < 1.15) {
              finalDmg *= 0.28;
              this.particles.burst(b.x, b.y, '#9be8ff', 4, 50, 150, 2, 0.18);
            }
          }

          // Chill effect on Frost Bolts or Cryo Rounds loadout module
          if (b.kind === 'frost_bolt') {
            e.chillTimer = 3.2;
          } else if (this.player.modules.includes('cryo_rounds')) {
            e.chillTimer = Math.max(e.chillTimer ?? 0, 2.0);
          }
          if (e.chillTimer && e.chillTimer > 0) {
            finalDmg *= this.player.slowDmgMult;
          }

          // Auto-crit in Overclock Core Stillpoint!
          const isCrit =
            (this.coreId === 'overclock' && this.player.inStillpoint) ||
            Math.random() < this.player.critChance;
          if (isCrit) finalDmg *= this.player.critMult;

          if (phantomEvolved && b.kind === 'dagger_homing' && !e.isBoss && e.hp / e.maxHp <= 0.2) {
            finalDmg = e.hp + 10;
          }

          // Missile AoE splash!
          if (b.kind === 'missile' && b.blastRadius) {
            this.particles.burst(b.x, b.y, '#ff7b47', 8, 40, 150, 2.8, 0.3);
            for (const other of [...this.enemies]) {
              if (other.id !== e.id && other.hp > 0 && Math.hypot(other.x - b.x, other.y - b.y) <= b.blastRadius + other.radius) {
                this.damageEnemy(other, finalDmg * 0.55, '#ff7b47');
              }
            }
          }

          this.damageEnemy(e, finalDmg, isCrit ? '#e5b34c' : b.color, isCrit || b.kind === 'parry_shard');
          this.particles.burst(b.x, b.y, b.color, 3, 40, 120, 2, 0.2);

          // Prism Split relic: crits split 2 homing prism shards!
          if (
            isCrit &&
            b.kind !== 'parry_shard' &&
            this.player.relics.includes('glass_prism') &&
            this.playerBullets.length < 180
          ) {
            for (let s = 0; s < 2; s++) {
              const target = findNearestEnemy(b.x, b.y, this.enemies, 480, true, e.id);
              const ang = target
                ? Math.atan2(target.y - b.y, target.x - b.x) + (s === 0 ? -0.25 : 0.25)
                : Math.random() * Math.PI * 2;
              this.playerBullets.push({
                id: this.nextEntityId++,
                kind: 'parry_shard',
                x: b.x,
                y: b.y,
                vx: Math.cos(ang) * 520,
                vy: Math.sin(ang) * 520,
                radius: 5,
                damage: finalDmg * 0.42,
                pierce: 1,
                age: 0,
                maxAge: 1.4,
                color: '#72d2ff',
                homing: 8.5,
                targetId: target?.id,
                hitSet: new Set([e.id])
              });
            }
          }

          // Executioner relic: crits below 35% HP arc lightning!
          if (isCrit && this.player.relics.includes('executioner') && e.hp > 0 && e.hp / e.maxHp < 0.35) {
            const chain = findNearestEnemy(e.x, e.y, this.enemies, 160, false, e.id);
            if (chain) {
              this.particles.arc(e.x, e.y, chain.x, chain.y, '#e5b34c', 2.4, 0.16);
              this.damageEnemy(chain, finalDmg * 0.7, '#e5b34c');
            }
          }

          if (b.kind === 'ricochet' && (b.bounces ?? 0) > 0) {
            b.bounces!--;
            const next = findNearestEnemy(b.x, b.y, this.enemies, 320, false, e.id);
            const spd = Math.hypot(b.vx, b.vy) || 540;
            const ang = next ? Math.atan2(next.y - b.y, next.x - b.x) : Math.random() * Math.PI * 2;
            b.vx = Math.cos(ang) * spd;
            b.vy = Math.sin(ang) * spd;

            if ((this.player.inStillpoint || b.evolved) && this.playerBullets.length < 180) {
              this.playerBullets.push({
                id: this.nextEntityId++,
                kind: 'ricochet',
                x: b.x,
                y: b.y,
                vx: Math.cos(ang + 0.45) * spd,
                vy: Math.sin(ang + 0.45) * spd,
                radius: 4.5,
                damage: b.damage * 0.72,
                pierce: 1,
                bounces: Math.max(0, (b.bounces ?? 1) - 1),
                age: 0,
                maxAge: 1.1,
                color: b.color,
                homing: 0,
                hitSet: new Set([e.id]),
                evolved: b.evolved
              });
            }
            break;
          }

          if (b.kind !== 'scythe') {
            b.pierce--;
            if (b.pierce <= 0) {
              this.playerBullets.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  private shatterShrine(shrine: WorldNode): void {
    sound.playBossDefeat();
    bridge.haptic('success');
    this.particles.shatter(shrine.x, shrine.y, '#e5b34c', 12, 1.3);
    this.particles.ripple(shrine.x, shrine.y, 200, 14, '#e5b34c', 0.45);
    this.spawnXp(shrine.x - 10, shrine.y - 6, 30);
    this.spawnXp(shrine.x + 10, shrine.y + 6, 30);
    this.pickups.push(
      { id: this.nextEntityId++, kind: 'shard', x: shrine.x + 18, y: shrine.y - 10, vx: 0, vy: 0, value: Math.round(24 * this.player.shardMult), age: 0, magnetized: false },
      { id: this.nextEntityId++, kind: 'magnet', x: shrine.x - 18, y: shrine.y + 8, vx: 0, vy: 0, value: 1, age: 0, magnetized: false }
    );
  }

  private updateEnemyBulletsAndGrazing(dtWorld: number): void {
    const p = this.player;
    const hurtR = p.inStillpoint ? 4.5 : 8.0;
    const grazeR = p.grazeRadius;

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      if (i >= this.enemyBullets.length) i = this.enemyBullets.length - 1;
      if (i < 0) break;
      const b = this.enemyBullets[i];
      if (!b) continue;

      b.age += dtWorld;
      b.x += b.vx * dtWorld;
      b.y += b.vy * dtWorld;

      if (b.age >= b.maxAge) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Blink decoys soak enemy bullets!
      let soaked = false;
      for (const d of this.decoys) {
        if ((b.x - d.x) ** 2 + (b.y - d.y) ** 2 <= 24 * 24) {
          this.enemyBullets.splice(i, 1);
          soaked = true;
          break;
        }
      }
      if (soaked) continue;

      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 760 * 760) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      const hitDist = hurtR + b.radius * 0.72;
      if (d2 <= hitDist * hitDist) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer(b.damage);
        i = Math.min(i, this.enemyBullets.length);
        continue;
      }

      if (!b.grazed && d2 <= (grazeR + b.radius) ** 2) {
        b.grazed = true;
        this.registerGraze(b.x, b.y);
      }
    }
  }

  private registerGraze(bx: number, by: number): void {
    const p = this.player;
    const aura = PARRY_FX[this.save.selectedParryFx] ?? PARRY_FX.steel_ring;
    const pactGrazeMult = p.pacts.includes('bullet_magnet') ? 1.75 : 1.0;

    this.stats.grazes++;
    this.addMomentum(6);
    p.grazeCombo++;
    p.grazeComboTimer = 2.4;
    if (p.grazeCombo > this.stats.bestGrazeCombo) {
      this.stats.bestGrazeCombo = p.grazeCombo;
    }
    this.stats.score += (14 + Math.min(44, p.grazeCombo * 3)) * p.surgeTier;

    p.kineticCharge = Math.min(
      p.maxKineticCharge,
      p.kineticCharge + 11 * p.chargeRateMult * pactGrazeMult
    );

    // Aegis vessel: every 8 consecutive grazes restores Shield!
    if (this.vesselId === 'aegis' && p.grazeCombo % 8 === 0) {
      p.shield = Math.min(p.maxShield, p.shield + 6);
    }

    // Graze Siphon module / Graze Conduit passive: grazing restores HP
    const grazeLv = p.passives.find((x) => x.id === 'graze_conduit')?.level ?? 0;
    const hasGrazeLeech = p.modules.includes('graze_leech');
    if (grazeLv > 0 || hasGrazeLeech) {
      p.grazeHealCounter++;
      const threshold = hasGrazeLeech ? 10 : 12;
      if (p.grazeHealCounter >= threshold) {
        p.grazeHealCounter = 0;
        const healAmt = (hasGrazeLeech ? 5 : 0) + (grazeLv > 0 ? Math.round(4 + grazeLv * 1.5) : 0);
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        this.particles.callout(p.x, p.y - 30, `+${healAmt} HP`, '#8ee06c', 0.9, 0.6);
      }
    }

    // Graze Surge relic: every 8 grazes refunds +28% Focus & emits shock blast!
    if (p.relics.includes('chain_parry')) {
      p.grazeBurstCounter++;
      if (p.grazeBurstCounter >= 8) {
        p.grazeBurstCounter = 0;
        p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + p.maxKineticCharge * 0.28);
        const blastR = 148 * p.areaMult;
        this.particles.ripple(p.x, p.y, blastR * 1.25, 14, aura.outer, 0.36);
        this.particles.callout(p.x, p.y - 38, 'GRAZE SURGE', aura.outer, 1.05, 0.75);
        sound.playCoreBurst(3, false);
        for (const e of [...this.enemies]) {
          if (e.hp <= 0) continue;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist <= blastR + e.radius) {
            this.damageEnemy(e, 44 * p.damageMult * p.corePowerMult, aura.outer, true);
            if (!e.isBoss && e.hp > 0) {
              e.x += (dx / dist) * 44;
              e.y += (dy / dist) * 44;
            }
          }
        }
      }
    }

    // Scrap Harvest relic: every 10 grazes drops magnetized bonus Shards!
    if (p.relics.includes('bullet_alchemy')) {
      this.scrapHarvestCounter++;
      if (this.scrapHarvestCounter >= 10) {
        this.scrapHarvestCounter = 0;
        this.pickups.push({
          id: this.nextEntityId++,
          kind: 'shard',
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          value: Math.round(5 * p.shardMult),
          age: 0,
          magnetized: true
        });
      }
    }

    this.particles.arc(p.x, p.y, bx, by, aura.outer, 1.4, 0.12);
    this.particles.burst((p.x + bx) * 0.5, (p.y + by) * 0.5, aura.outer, 3, 30, 100, 1.8, 0.22);
    sound.playGraze(p.grazeCombo);
    bridge.haptic('light');

    const daggers = p.weapons.find((w) => w.id === 'phase_daggers' && w.evolved);
    if (daggers) {
      spawnPlantedDagger(this.makeWeaponCtx(false, false), daggers, p.x, p.y);
    }
  }

  private updateEnemyContactCollisions(): void {
    const p = this.player;
    const hurtR = p.inStillpoint ? 5 : 9.5;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.kind === 'hauler') continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (hurtR + e.radius * 0.8) ** 2) {
        this.damagePlayer(e.isBoss ? 26 : e.isElite ? 20 : 16);
        break;
      }
    }
  }

  private updatePickups(dtWorld: number, dtReal: number): void {
    const p = this.player;
    const pullR = p.magnetRadius * (p.inStillpoint ? 1.55 : 1.0);
    const pullR2 = pullR * pullR;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      if (this.phase !== 'playing') break;
      if (i >= this.pickups.length) i = this.pickups.length - 1;
      if (i < 0) break;
      const pk = this.pickups[i];
      if (!pk) continue;

      pk.age += dtWorld;
      if (pk.age > 34) {
        this.pickups.splice(i, 1);
        continue;
      }

      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= pullR2 && pk.kind !== 'chest') pk.magnetized = true;

      if (pk.magnetized) {
        const d = Math.sqrt(d2) || 1;
        const spd = 400 + (p.inStillpoint ? 90 : 0);
        const dtMove = p.inStillpoint ? dtReal * 0.75 : dtReal;
        pk.x += (dx / d) * spd * dtMove;
        pk.y += (dy / d) * spd * dtMove;
      }

      if (d2 <= 24 * 24) {
        this.pickups.splice(i, 1);
        this.collectPickup(pk);
      }
    }
  }

  private collectPickup(pk: Pickup): void {
    const p = this.player;
    if (pk.kind === 'chest') {
      this.openUpgradeDraft(true);
      return;
    }
    if (pk.kind === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
      this.particles.callout(p.x, p.y - 24, '+HP', '#8ee06c', 0.95, 0.7);
      sound.playLevelUp();
      bridge.haptic('light');
      return;
    }
    if (pk.kind === 'shard') {
      this.stats.shardsEarned += pk.value;
      this.particles.callout(p.x, p.y - 24, `+${pk.value}`, '#f472b6', 0.95, 0.7);
      sound.playXp();
      return;
    }
    if (pk.kind === 'magnet') {
      for (const other of this.pickups) {
        if (other.kind.startsWith('xp')) other.magnetized = true;
      }
      this.particles.ripple(p.x, p.y, 260, 10, '#45e8d8', 0.45);
      sound.playLevelUp();
      return;
    }

    // Static Harvest relic: XP crystals zap nearby enemies!
    if (p.relics.includes('magnetic_storm')) {
      const target = findNearestEnemy(p.x, p.y, this.enemies, 220);
      if (target) {
        this.particles.arc(p.x, p.y, target.x, target.y, '#6fa8ff', 1.6, 0.12);
        this.damageEnemy(target, 14 * p.damageMult, '#6fa8ff');
        if (this.phase !== 'playing') return;
      }
    }

    const surgeXpMult = p.surgeTimer > 0 ? 1.2 : 1;
    p.xp += pk.value * p.xpMult * surgeXpMult;
    this.stats.score += pk.value * p.surgeTier;
    sound.playXp();
    if (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = this.nextLevelXp(p.level);
      this.openUpgradeDraft(false);
    }
  }

  private openUpgradeDraft(isBossChest: boolean): void {
    this.pendingBossDraft = isBossChest;
    this.phase = 'levelup';
    this.input.setEnabled(false);
    this.player.inStillpoint = false;
    sound.setStillpointBlend(0);
    sound.playLevelUp();
    bridge.haptic('medium');
    const choiceCount = this.player.modules.includes('risk_strict') ? 2 : 3;
    this.currentChoices = generateUpgradeChoices(this.player, choiceCount, isBossChest);
    this.callbacks.onPhaseChange('levelup', this.currentChoices);
    this.emitHud();
  }

  private damageEnemy = (enemy: Enemy, rawDmg: number, color: string, isCrit = false): void => {
    if (enemy.hp <= 0) return;
    const bossScale = enemy.isBoss || enemy.isElite ? this.player.bossDmgMult : 1;
    const hasSniperLens = this.player.modules.includes('sniper_lens');
    const stillpointScale = this.player.inStillpoint
      ? (this.player.relics.includes('time_bank') ? 1.4 : 1) *
        (this.player.pacts.includes('glass_cannon') ? 1.55 : 1) *
        (hasSniperLens ? 1.45 : 1) *
        (enemy.isBoss && !hasSniperLens ? 0.72 : 1)
      : 1;
    const dmg = rawDmg * bossScale * stillpointScale;
    enemy.hp -= dmg;
    enemy.hitFlash = 1;

    // Treasure Hauler spills Shards on a real-time cooldown so DoTs/120Hz cannot farm it
    if (enemy.kind === 'hauler' && !(enemy.shardSpillCooldown && enemy.shardSpillCooldown > 0)) {
      enemy.shardSpillCooldown = 0.28;
      this.pickups.push({
        id: this.nextEntityId++,
        kind: 'shard',
        x: enemy.x + (Math.random() - 0.5) * 20,
        y: enemy.y + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        value: Math.round(4 * this.player.shardMult),
        age: 0,
        magnetized: false
      });
    }

    if (enemy.hp <= 0) {
      this.handleEnemyKilled(enemy);
    } else if (isCrit && Math.random() < 0.25) {
      this.particles.callout(enemy.x, enemy.y - enemy.radius - 6, `${Math.round(dmg)}`, color, 0.85, 0.42);
    }
  };

  private handleEnemyKilled(enemy: Enemy): void {
    this.stats.kills++;
    const eqCoating = getEquippedCoating(this.save);
    if (eqCoating.striker) {
      eqCoating.kills++;
    }
    this.addMomentum(enemy.isElite ? 12 : 3.2);
    this.stats.score += enemy.scoreValue * this.player.surgeTier;

    // Evolved Arc Tether (Tesla Lattice): slain enemies discharge chain arcs to nearby foes!
    if (this.player.weapons.some((w) => w.id === 'arc_tether' && w.evolved)) {
      const chain = findNearestEnemy(enemy.x, enemy.y, this.enemies, 165, false, enemy.id);
      if (chain) {
        this.particles.arc(enemy.x, enemy.y, chain.x, chain.y, '#9cf6ff', 2.4, 0.16);
        this.damageEnemy(chain, 32 * this.player.damageMult, '#9cf6ff');
      }
    }

    // Blood Engine relic: every 20 kills triggers 4s Frenzy & +3 HP!
    if (this.player.relics.includes('blood_engine') && this.stats.kills % 20 === 0) {
      this.player.frenzyTimer = 4.0;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
      this.particles.callout(this.player.x, this.player.y - 34, 'FRENZY', '#ff4858', 1.0, 0.7);
    }

    // Volatile Shrapnel relic / Shrapnel Rig module: slain enemies burst into piercing splinters
    const splinterCount =
      (this.player.relics.includes('volatile_shrapnel') ? 5 : 0) +
      (this.player.modules.includes('shrapnel_rig') ? 3 : 0);
    if (splinterCount > 0 && this.playerBullets.length < 180) {
      for (let k = 0; k < splinterCount; k++) {
        const ang = (k * Math.PI * 2) / splinterCount + Math.random() * 0.4;
        this.playerBullets.push({
          id: this.nextEntityId++,
          kind: 'shrapnel',
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(ang) * 380,
          vy: Math.sin(ang) * 380,
          radius: 4.5,
          damage: 18 * this.player.damageMult,
          pierce: 2,
          age: 0,
          maxAge: 0.65,
          color: '#ff6a26',
          homing: 0,
          hitSet: new Set([enemy.id])
        });
      }
    }

    this.particles.shatter(
      enemy.x,
      enemy.y,
      enemy.accent,
      enemy.isBoss ? 22 : enemy.isElite || enemy.kind === 'hauler' ? 12 : 5,
      enemy.isBoss ? 1.8 : enemy.isElite ? 1.25 : 0.9
    );
    this.particles.burst(
      enemy.x,
      enemy.y,
      enemy.accent,
      enemy.isBoss ? 36 : enemy.isElite ? 12 : 5,
      60,
      enemy.isBoss ? 320 : 180,
      enemy.isBoss ? 4 : 2.5,
      enemy.isBoss ? 0.75 : 0.34
    );

    if (enemy.kind === 'splitter') {
      onEnemyDeathSplit(this.makeEnemyCtx(), enemy);
    }

    if (enemy.kind === 'hauler') {
      // Treasure Hauler pinata: guaranteed Relic Cache Chest + Shards + SALVAGE CRATE DROP!
      sound.playBossDefeat();
      this.save.standardCrates++;
      this.stats.cratesEarned++;
      persistMetaSave(this.save);
      this.particles.callout(enemy.x, enemy.y - 34, '+1 Salvage crate', '#e2a93b', 1.2, 1.3);
      this.callbacks.onUnlockNotice('Salvage crate dropped');
      this.pickups.push(
        { id: this.nextEntityId++, kind: 'chest', x: enemy.x, y: enemy.y, vx: 0, vy: 0, value: 1, age: 0, magnetized: false },
        { id: this.nextEntityId++, kind: 'shard', x: enemy.x + 18, y: enemy.y, vx: 0, vy: 0, value: Math.round(28 * this.player.shardMult), age: 0, magnetized: false }
      );
    } else if (enemy.isBoss) {
      this.handleBossDefeated(enemy);
    } else {
      this.spawnXp(enemy.x, enemy.y, enemy.xpValue);
      if (enemy.isElite || enemy.kind === 'carrier') {
        this.pickups.push({
          id: this.nextEntityId++,
          kind: 'shard',
          x: enemy.x + 10,
          y: enemy.y,
          vx: 0,
          vy: 0,
          value: Math.round(14 * this.player.shardMult),
          age: 0,
          magnetized: false
        });
        if (Math.random() < 0.24) {
          this.pickups.push({
            id: this.nextEntityId++,
            kind: 'heal',
            x: enemy.x - 10,
            y: enemy.y,
            vx: 0,
            vy: 0,
            value: 1,
            age: 0,
            magnetized: false
          });
        }
      } else if (Math.random() < 0.006) {
        this.pickups.push({
          id: this.nextEntityId++,
          kind: Math.random() < 0.65 ? 'heal' : 'magnet',
          x: enemy.x,
          y: enemy.y,
          vx: 0,
          vy: 0,
          value: 1,
          age: 0,
          magnetized: false
        });
      }
    }

    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.enemies.splice(idx, 1);
  }

  private handleBossDefeated(boss: Enemy): void {
    this.stats.bossesDefeated++;
    const bossIndexCleared = this.enclosure.bossIndex;
    this.nextBossIdx++;

    if (!this.enclosure.playerHitDuringBoss) this.save.noHitBossClears++;
    this.save.bossesCleared++;

    if (bossIndexCleared === 0 && !this.save.unlockedSectors.includes('helix')) {
      this.save.unlockedSectors.push('helix');
      this.callbacks.onUnlockNotice('Sunken Metro unlocked');
    } else if (bossIndexCleared === 1 && !this.save.unlockedSectors.includes('furnace')) {
      this.save.unlockedSectors.push('furnace');
      this.callbacks.onUnlockNotice('Slag Foundry unlocked');
    } else if (bossIndexCleared === 2 && !this.save.unlockedSectors.includes('singularity')) {
      this.save.unlockedSectors.push('singularity');
      this.callbacks.onUnlockNotice('The Monolith unlocked');
    }

    this.enclosure.active = false;
    this.enclosure.bossId = null;
    this.spawnAccum.value = 0;
    this.enemyBullets.length = 0;
    this.lasers = this.lasers.filter((l) => !l.isEnemy);

    sound.setGameState(true, false);
    sound.playBossDefeat();
    bridge.haptic('success');
    this.hitStopTimer = 0.08;
    this.addShake(15);
    this.particles.ripple(boss.x, boss.y, 380, 26, '#e5b34c', 0.8);

    const shardBonus = Math.round((45 + bossIndexCleared * 35) * this.player.shardMult);
    this.stats.shardsEarned += shardBonus;
    // Boss kills always award a sealed Crate (Classified crate on Heat 2+, final boss, or Boss 2 with Heat)
    if (
      this.save.activeHeat.length >= 2 ||
      bossIndexCleared >= 2 ||
      (bossIndexCleared >= 1 && this.save.activeHeat.length >= 1)
    ) {
      this.save.relicCrates++;
      this.stats.relicCratesEarned++;
      this.callbacks.onUnlockNotice('Classified crate dropped');
    } else {
      this.save.standardCrates++;
      this.stats.cratesEarned++;
      this.callbacks.onUnlockNotice('Salvage crate dropped');
    }
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.2);
    this.player.kineticCharge = this.player.maxKineticCharge;

    const finalBossKind = this.sectorId === 'singularity' ? 'boss_leviathan' : 'boss_archon';
    if (boss.kind === finalBossKind && !this.stats.endlessMode && !this.stats.victory) {
      this.stats.victory = true;
      if (!this.save.sectorsCleared.includes(this.sectorId)) {
        this.save.sectorsCleared.push(this.sectorId);
      }
      const finalStats = this.finalizeMetaProgress(true);
      this.phase = 'victory';
      this.input.setEnabled(false);
      sound.setStillpointBlend(0);
      this.callbacks.onPhaseChange('victory', undefined, finalStats);
      this.emitHud();
      return;
    }

    persistMetaSave(this.save);
    this.checkAndToastMilestones();
    this.openUpgradeDraft(true);
  }

  private damagePlayer(rawDmg: number): void {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    if (this.enclosure.active) this.enclosure.playerHitDuringBoss = true;

    let dmg = Math.max(8, rawDmg - p.armor);
    p.invulnTimer = 0.26;
    p.hitFlash = 1;
    p.grazeCombo = 0;

    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      dmg -= absorbed;
    }
    p.hp = Math.max(0, p.hp - dmg);

    // Aegis Protocol (Last Stand) relic: cheat death once!
    if (p.hp <= 0 && p.relics.includes('last_stand') && !p.lastStandUsed) {
      p.lastStandUsed = true;
      p.hp = Math.round(p.maxHp * 0.45);
      p.invulnTimer = 2.0;
      this.enemyBullets.length = 0;
      sound.playBossDefeat();
      bridge.haptic('heavy');
      this.addShake(14);
      this.particles.ripple(p.x, p.y, 340, 22, '#9be2ff', 0.65);
      this.particles.callout(p.x, p.y - 40, 'AEGIS PROTOCOL', '#9be2ff', 1.35, 1.2);
      this.emitHud();
      return;
    }

    sound.playPlayerHit();
    bridge.haptic('error');
    this.addShake(11);
    this.particles.shatter(p.x, p.y, '#e34b42', 8, 1);
    this.particles.ripple(p.x, p.y, 140, 12, '#e34b42', 0.32);

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 28 * 28) {
        this.enemyBullets.splice(i, 1);
      }
    }

    if (p.hp <= 0) this.handleGameOver();
    this.emitHud();
  }

  private handleGameOver(): void {
    const finalStats = this.finalizeMetaProgress(false);
    this.phase = 'gameover';
    this.input.setEnabled(false);
    this.player.inStillpoint = false;
    sound.setGameState(false, false);
    sound.setStillpointBlend(0);
    this.callbacks.onPhaseChange('gameover', undefined, finalStats);
  }

  private finalizeMetaProgress(isVictory: boolean): RunStats {
    const hasVictory = isVictory || this.stats.victory;
    const runBonus = Math.round(
      (this.stats.elapsed * 0.24 + this.stats.grazes * 0.35 + (hasVictory ? 150 : 0)) *
        this.player.shardMult
    );
    const totalPayout = Math.max(0, this.stats.shardsEarned + runBonus);
    const deltaShards = Math.max(0, totalPayout - this.metaCommitted.shards);
    const deltaKills = Math.max(0, this.stats.kills - this.metaCommitted.kills);
    const deltaGrazes = Math.max(0, this.stats.grazes - this.metaCommitted.grazes);

    this.metaCommitted.shards += deltaShards;
    this.metaCommitted.kills += deltaKills;
    this.metaCommitted.grazes += deltaGrazes;

    this.stats.weapons = this.player.weapons.map((w) => ({
      id: w.id,
      level: w.level,
      evolved: w.evolved
    }));
    this.stats.relics = [...this.player.relics];
    this.stats.vesselId = this.vesselId;
    this.stats.coreId = this.coreId;
    this.stats.skinId = this.skinId;
    this.stats.heatCount = this.save.activeHeat.length;

    // Award a Salvage Crate for a strong run if no boss/hauler crate dropped yet
    if (
      !this.goodRunCrateAwarded &&
      this.stats.cratesEarned === 0 &&
      this.stats.relicCratesEarned === 0 &&
      ((this.stats.elapsed >= 90 && this.stats.kills >= 55) || this.stats.score >= 18000)
    ) {
      this.goodRunCrateAwarded = true;
      this.save.standardCrates += 1;
      this.stats.cratesEarned += 1;
      this.callbacks.onUnlockNotice('Salvage crate earned');
    }

    this.save.shards += deltaShards;
    if (!this.metaCommitted.runCounted) {
      this.save.totalRuns += 1;
      this.metaCommitted.runCounted = true;
    }
    this.save.totalKills += deltaKills;
    this.save.totalGrazes += deltaGrazes;
    if (this.stats.bestGrazeCombo > this.save.bestSingleParry) {
      this.save.bestSingleParry = this.stats.bestGrazeCombo;
    }
    if (this.stats.elapsed > this.save.bestTimeSec) {
      this.save.bestTimeSec = Math.floor(this.stats.elapsed);
    }
    if (this.stats.score > this.save.bestScore) {
      this.save.bestScore = this.stats.score;
    }
    persistMetaSave(this.save);
    this.checkAndToastMilestones();
    return {
      ...this.stats,
      shardsEarned: this.stats.endlessMode && !isVictory ? deltaShards : totalPayout
    };
  }

  private checkAndToastMilestones(): void {
    const notices = evaluateMilestones(this.save);
    for (const notice of notices) {
      this.callbacks.onUnlockNotice(notice);
    }
  }

  private damageShrinesInRadius = (x: number, y: number, radius: number, dmg: number): void => {
    for (let ni = this.nodes.length - 1; ni >= 0; ni--) {
      const n = this.nodes[ni];
      if (n.kind !== 'shrine') continue;
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= (n.radius + radius) ** 2) {
        n.hp -= dmg;
        if (Math.random() < 0.4) this.particles.burst(n.x, n.y, '#e5b34c', 3, 30, 100, 1.8, 0.18);
        if (n.hp <= 0) {
          this.shatterShrine(n);
          this.nodes.splice(ni, 1);
        }
      }
    }
  };

  private damageShrinesAlongLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    halfWidth: number,
    dmg: number
  ): void => {
    for (let ni = this.nodes.length - 1; ni >= 0; ni--) {
      const n = this.nodes[ni];
      if (n.kind !== 'shrine') continue;
      if (pointToSegmentDist(n.x, n.y, x1, y1, x2, y2) <= n.radius + halfWidth) {
        n.hp -= dmg;
        this.particles.burst(n.x, n.y, '#e5b34c', 4, 40, 120, 2, 0.2);
        if (n.hp <= 0) {
          this.shatterShrine(n);
          this.nodes.splice(ni, 1);
        }
      }
    }
  };

  private spawnXp = (x: number, y: number, value: number): void => {
    if (this.pickups.length > 160) {
      // Merge overflow into the newest XP gem and refresh its age so merged XP is never lost
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const newest = this.pickups[i];
        if (newest.kind.startsWith('xp')) {
          newest.value += value;
          newest.age = 0;
          newest.kind = newest.value >= 35 ? 'xp_large' : newest.value >= 16 ? 'xp_mid' : 'xp_small';
          return;
        }
      }
    }
    const kind = value >= 35 ? 'xp_large' : value >= 16 ? 'xp_mid' : 'xp_small';
    this.pickups.push({
      id: this.nextEntityId++,
      kind,
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 14,
      vx: 0,
      vy: 0,
      value,
      age: 0,
      magnetized: false
    });
  };

  private addShake(amount: number): void {
    this.shakeMag = Math.min(18, Math.max(this.shakeMag, amount));
  }

  private makeEnemyCtx(): EnemyWorldContext {
    return {
      player: this.player,
      sectorId: this.sectorId,
      activeHeat: this.save.activeHeat,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      lasers: this.lasers,
      nodes: this.nodes,
      enclosure: this.enclosure,
      particles: this.particles,
      elapsed: this.stats.elapsed,
      endlessMode: this.stats.endlessMode,
      nextId: () => this.nextEntityId++
    };
  }

  private makeWeaponCtx(justEntered: boolean, justExited: boolean): WeaponWorldContext {
    const coating = getEquippedCoating(this.save);
    const accent = FINISHES[coating.finishId]?.accent ?? '#4cb5ab';
    return {
      player: this.player,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      pylons: this.pylons,
      hazards: this.hazards,
      nodes: this.nodes,
      lasers: this.lasers,
      particles: this.particles,
      accentColor: accent,
      nextId: () => this.nextEntityId++,
      damageEnemy: this.damageEnemy,
      damageShrinesInRadius: this.damageShrinesInRadius,
      damageShrinesAlongLine: this.damageShrinesAlongLine,
      spawnXp: this.spawnXp,
      time: this.realTime,
      justEnteredStillpoint: justEntered,
      justExitedStillpoint: justExited
    };
  }

  private emitHud(): void {
    const boss = this.enclosure.bossId
      ? this.enemies.find((e) => e.id === this.enclosure.bossId) ?? null
      : null;
    const bossWarning =
      this.enclosure.warningTimer > 0
        ? BOSS_SCHEDULE[this.enclosure.bossIndex % BOSS_SCHEDULE.length].name
        : null;

    this.callbacks.onHudTick({
      phase: this.phase,
      elapsed: this.stats.elapsed,
      hp: Math.ceil(this.player.hp),
      maxHp: Math.ceil(this.player.maxHp),
      shield: Math.ceil(this.player.shield),
      maxShield: Math.ceil(this.player.maxShield),
      charge: this.player.kineticCharge,
      maxCharge: this.player.maxKineticCharge,
      inStillpoint: this.player.inStillpoint,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      score: this.stats.score,
      grazeCombo: this.player.grazeCombo,
      surgeTier: this.player.surgeTier,
      surgeActive: this.player.surgeTimer > 0,
      weapons: this.player.weapons,
      passives: this.player.passives,
      relics: this.player.relics,
      boss: boss
        ? {
            name: boss.bossName ?? 'ANOMALY',
            hp: Math.max(0, Math.ceil(boss.hp)),
            maxHp: Math.ceil(boss.maxHp)
          }
        : null,
      bossWarning,
      eventBanner: this.eventBanner,
      endlessMode: this.stats.endlessMode,
      rerolls: this.player.rerolls
    });
  }

  private renderFrame(): void {
    const shakeX = (Math.random() - 0.5) * 2 * this.shakeMag;
    const shakeY = (Math.random() - 0.5) * 2 * this.shakeMag;
    const coating = getEquippedCoating(this.save);
    const trail = TRAILS[this.save.selectedTrail] ?? TRAILS.ion_ash;
    const aura = PARRY_FX[this.save.selectedParryFx] ?? PARRY_FX.steel_ring;

    this.renderer.render({
      player: this.player,
      vesselId: this.vesselId,
      coreId: this.coreId,
      skinId: this.skinId,
      coating,
      trailColor: trail.color,
      trailCoreColor: trail.coreColor,
      accentColor: FINISHES[coating.finishId]?.accent ?? aura.outer,
      auraOuter: aura.outer,
      auraInner: aura.inner,
      sectorId: this.sectorId,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      pylons: this.pylons,
      hazards: this.hazards,
      nodes: this.nodes,
      decoys: this.decoys,
      meteors: this.meteors,
      lasers: this.lasers,
      pickups: this.pickups,
      enclosure: this.enclosure,
      particles: this.particles,
      input: this.input.sample(),
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      shakeX,
      shakeY,
      realTime: this.realTime,
      worldTime: this.worldTime,
      elapsed: this.stats.elapsed,
      showHint: !this.hasUsedStillpoint && this.tutorialTimer > 0,
      reduceFlash: this.save.settings.reduceFlash,
      menuMode: this.phase === 'menu',
      menuSheetOpen: this.menuSheetOpen
    });
  }
}

void CORES;
