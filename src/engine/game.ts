import { sound } from '../audio';
import { bridge } from '../bridge';
import { evaluateMilestones, persistMetaSave } from '../data/meta';
import { SECTORS } from '../data/sectors';
import { resolveSkinColors, SKINS } from '../data/skins';
import { generateUpgradeChoices, PACTS, PASSIVES, WEAPONS } from '../data/upgrades';
import { VESSELS } from '../data/vessels';
import {
  BossEnclosure,
  Enemy,
  EnemyBullet,
  GamePhase,
  HazardZone,
  LaserBeam,
  MetaSave,
  PactId,
  ParryWave,
  PassiveId,
  Pickup,
  PlayerBullet,
  PlayerState,
  RailPylon,
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
  weapons: PlayerState['weapons'];
  passives: PlayerState['passives'];
  boss: { name: string; hp: number; maxHp: number } | null;
  bossWarning: string | null;
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
  skinId: SkinId = 'cyanide';
  sectorId: SectorId = 'drift';
  menuSheetOpen = false;

  enemies: Enemy[] = [];
  enemyBullets: EnemyBullet[] = [];
  playerBullets: PlayerBullet[] = [];
  pylons: RailPylon[] = [];
  hazards: HazardZone[] = [];
  nodes: WorldNode[] = [];
  lasers: LaserBeam[] = [];
  parryWaves: ParryWave[] = [];
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
  private pendingBossDraft = false;
  private currentChoices: UpgradeChoice[] = [];
  private hasUsedStillpoint = false;
  private tutorialTimer = 0;
  private hudThrottle = 0;
  private lastFrameTs = 0;

  constructor(canvas: HTMLCanvasElement, save: MetaSave, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.save = save;
    this.callbacks = callbacks;
    this.vesselId = save.selectedVessel;
    this.skinId = save.selectedSkin;
    this.sectorId = save.selectedSector;
    this.renderer = new WastelandRenderer(canvas);
    this.input = new InputController(canvas, () => sound.unlock());

    this.applyAccentCss();
    this.resetWorldState(this.vesselId);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('visibilitychange', () => {
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

  private applyAccentCss(): void {
    const skin = SKINS[this.skinId];
    document.documentElement.style.setProperty('--accent', skin.accent);
  }

  startNewRun(): void {
    sound.unlock();
    this.vesselId = this.save.selectedVessel;
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
    this.input.setEnabled(true);
    this.callbacks.onPhaseChange('playing');
  }

  returnToMenu(): void {
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
        this.particles.callout(
          this.player.x,
          this.player.y - 42,
          WEAPONS[w.id].evolvedName,
          '#e5b34c',
          1.2,
          1.2
        );
      }
    } else if (picked.kind === 'weapon' && picked.weaponId) {
      const existing = this.player.weapons.find((w) => w.id === picked.weaponId);
      if (existing) {
        existing.level = Math.min(WEAPONS[existing.id].maxLevel, existing.level + 1);
      } else {
        this.player.weapons.push({
          id: picked.weaponId,
          level: 1,
          evolved: false,
          cooldown: 0.1,
          auxTimer: 0
        });
      }
    } else if (picked.kind === 'passive' && picked.passiveId) {
      const existing = this.player.passives.find((p) => p.id === picked.passiveId);
      if (existing) {
        existing.level = Math.min(PASSIVES[existing.id].maxLevel, existing.level + 1);
      } else {
        this.player.passives.push({ id: picked.passiveId, level: 1 });
      }
    } else if (picked.kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.35);
      this.player.kineticCharge = this.player.maxKineticCharge;
      this.player.damageMult += 0.06;
    }

    this.recomputePlayerStats();
    bridge.haptic('success');
    sound.playLevelUp();

    this.currentChoices = [];
    this.pendingBossDraft = false;
    this.phase = 'playing';
    this.input.setEnabled(true);
    this.callbacks.onPhaseChange('playing');
    this.emitHud();
  }

  rerollChoices(): UpgradeChoice[] {
    if (this.phase !== 'levelup' || this.player.rerolls <= 0) return this.currentChoices;
    this.player.rerolls--;
    bridge.haptic('light');
    this.currentChoices = generateUpgradeChoices(this.player, 3, this.pendingBossDraft);
    this.callbacks.onPhaseChange('levelup', this.currentChoices);
    return this.currentChoices;
  }

  private resetWorldState(vesselId: VesselId): void {
    const vessel = VESSELS[vesselId];
    const u = this.save.upgrades;

    this.enemies = [];
    this.enemyBullets = [];
    this.playerBullets = [];
    this.pylons = [];
    this.hazards = [];
    this.nodes = [];
    this.lasers = [];
    this.parryWaves = [];
    this.pickups = [];
    this.particles.clear();

    const maxHp = vessel.stats.maxHp + (u.hull_integrity ?? 0) * 14;
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facingAngle: -Math.PI / 2,
      hp: maxHp,
      maxHp,
      shield: vessel.stats.shield,
      maxShield: Math.max(20, vessel.stats.shield + 12),
      shieldRegenTimer: 0,
      invulnTimer: 0,
      hitFlash: 0,
      kineticCharge: vessel.stats.maxCharge,
      maxKineticCharge: vessel.stats.maxCharge,
      inStillpoint: false,
      stillpointBlend: 0,
      stillpointTimeHeld: 0,
      parryCooldown: 0,
      parryCooldownMax: vesselId === 'phantom' ? 0.36 : 0.46,
      level: 1,
      xp: 0,
      xpToNext: 26,
      rerolls: 1 + (u.reroll_module ?? 0),
      grazeCombo: 0,
      grazeComboTimer: 0,
      inOverclockRing: false,
      moveSpeed: vessel.stats.moveSpeed,
      damageMult: 1,
      critChance: 0.05,
      fireRateMult: 1,
      areaMult: 1,
      parryMult: 1,
      chargeRateMult: vessel.stats.chargeRateMult,
      stillpointDrainMult: 1,
      grazeRadius: vessel.stats.grazeRadius,
      magnetRadius: 74,
      xpMult: 1,
      shardMult: 1,
      bonusProjectiles: 0,
      projectileSpeedMult: 1,
      armor: vessel.stats.armor,
      weapons: [
        {
          id: vessel.starterWeapon,
          level: 1,
          evolved: false,
          cooldown: 0.18,
          auxTimer: 0
        }
      ],
      passives: [],
      pacts: [],
      trail: [],
      distanceMovedSinceDagger: 0
    };

    this.recomputePlayerStats();
    this.player.hp = this.player.maxHp;
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
      parries: 0,
      bestSingleParry: 0,
      grazes: 0,
      bossesDefeated: 0,
      shardsEarned: 0,
      sectorId: this.sectorId,
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
    const u = this.save.upgrades;
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

    const glassHpMult = this.player.pacts.includes('glass_cannon') ? 0.8 : 1.0;
    const bloodDmgMult = this.player.pacts.includes('bloodlust') ? 1.4 : 1.0;
    const glassParryMult = this.player.pacts.includes('glass_cannon') ? 1.65 : 1.0;
    const greedShardMult = this.player.pacts.includes('greed') ? 1.6 : 1.0;

    const prevMaxHp = this.player.maxHp;
    this.player.maxHp = Math.round((v.stats.maxHp + (u.hull_integrity ?? 0) * 14) * glassHpMult);
    if (this.player.maxHp > prevMaxHp) {
      this.player.hp += this.player.maxHp - prevMaxHp;
    }
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);

    this.player.maxShield = Math.max(20, v.stats.shield + plateLv * 12 + 12);
    this.player.armor = v.stats.armor + plateLv;
    this.player.maxKineticCharge = v.stats.maxCharge + capLv * 18;
    this.player.stillpointDrainMult =
      Math.pow(0.9, capLv) * Math.pow(0.93, u.time_lattice ?? 0);
    this.player.moveSpeed = v.stats.moveSpeed * (1 + thrLv * 0.09);
    this.player.chargeRateMult =
      v.stats.chargeRateMult * (1 + thrLv * 0.16) * (1 + (u.kinetic_core ?? 0) * 0.1);
    this.player.fireRateMult = 1 + coilLv * 0.13;
    this.player.parryCooldownMax =
      (this.vesselId === 'phantom' ? 0.36 : 0.46) * Math.pow(0.88, coilLv);
    this.player.areaMult = 1 + lensLv * 0.15;
    this.player.damageMult = Math.max(1, (1 + coreLv * 0.16) * bloodDmgMult);
    this.player.parryMult =
      (1 + coreLv * 0.24) * (1 + (u.parry_resonance ?? 0) * 0.12) * glassParryMult;
    this.player.grazeRadius = v.stats.grazeRadius + grazeLv * 14;
    this.player.magnetRadius = 74 + (u.magnet_field ?? 0) * 20 + grazeLv * 18;
    this.player.critChance = 0.05 + (u.crit_calibration ?? 0) * 0.05 + edgeLv * 0.1;
    this.player.projectileSpeedMult = 1 + edgeLv * 0.12;
    this.player.bonusProjectiles = Math.floor((echoLv + 1) / 2);
    this.player.xpMult = 1 + overLv * 0.18;
    this.player.shardMult =
      SECTORS[this.sectorId].shardMult *
      (1 + (u.shard_harvester ?? 0) * 0.12 + overLv * 0.18) *
      greedShardMult;
  }

  private update(dtReal: number): void {
    this.realTime += dtReal;

    if (this.phase === 'menu') {
      // Gently glide over the wasteland ruins beneath the live hovering showcase rig!
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

    // 1. Lift-to-Focus Stillpoint
    const wasStillpoint = player.inStillpoint;
    const minToEnter = wasStillpoint ? 0.5 : 5;
    player.inStillpoint = input.wantsStillpoint && player.kineticCharge > minToEnter;
    const justEntered = !wasStillpoint && player.inStillpoint;
    const justExited = wasStillpoint && !player.inStillpoint;

    if (player.parryCooldown > 0) {
      player.parryCooldown = Math.max(0, player.parryCooldown - dtReal);
    }

    if (justEntered) {
      this.hasUsedStillpoint = true;
      player.stillpointTimeHeld = 0;
      sound.playStillpointEnter();
      bridge.haptic('light');
      if (player.parryCooldown <= 0 && player.kineticCharge >= 18) {
        this.triggerParryShockwave();
      }
      // VOLT vessel perk: entering Stillpoint snaps storm lightning to 3 nearest foes!
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
    } else if (justExited) {
      sound.playStillpointExit();
    }

    const targetBlend = player.inStillpoint ? 1 : 0;
    player.stillpointBlend +=
      (targetBlend - player.stillpointBlend) * Math.min(1, dtReal * (player.inStillpoint ? 22 : 16));
    sound.setStillpointBlend(player.stillpointBlend);

    const timeScale = 1 - player.stillpointBlend * 0.83;
    const dtWorld = dtReal * timeScale;
    this.worldTime += dtWorld;
    this.stats.elapsed += dtWorld;
    if (this.tutorialTimer > 0) this.tutorialTimer -= dtReal;

    // 2. Kinetic Charge
    if (player.inStillpoint) {
      player.stillpointTimeHeld += dtReal;
      player.kineticCharge = Math.max(
        0,
        player.kineticCharge - 25 * player.stillpointDrainMult * dtReal
      );
      if (player.kineticCharge <= 0.1) {
        player.inStillpoint = false;
        sound.playStillpointExit();
      }
    } else {
      const ocBonus = player.inOverclockRing ? 2.0 : 1.0;
      const moveBonus = input.isMoving ? 15.5 : 4.2;
      player.kineticCharge = Math.min(
        player.maxKineticCharge,
        player.kineticCharge + moveBonus * player.chargeRateMult * ocBonus * dtReal
      );
    }

    // Reactive Plating slow shield regeneration
    const plateLv = player.passives.find((p) => p.id === 'reactive_plating')?.level ?? 0;
    if (plateLv > 0 && player.shield < player.maxShield) {
      player.shieldRegenTimer += dtWorld;
      if (player.shieldRegenTimer >= Math.max(2.2, 5.5 - plateLv * 0.6)) {
        player.shieldRegenTimer = 0;
        player.shield = Math.min(player.maxShield, player.shield + 4);
      }
    }

    // 3. Movement
    if (!player.inStillpoint && input.isMoving) {
      player.vx = input.moveX * player.moveSpeed;
      player.vy = input.moveY * player.moveSpeed;
      const step = Math.hypot(player.vx * dtReal, player.vy * dtReal);
      player.x += player.vx * dtReal;
      player.y += player.vy * dtReal;
      player.distanceMovedSinceDagger += step;
      player.facingAngle = Math.atan2(player.vy, player.vx);

      if (Math.random() < 0.55) {
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

    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dtReal);
    if (player.hitFlash > 0) player.hitFlash = Math.max(0, player.hitFlash - dtReal * 5);
    if (player.grazeComboTimer > 0) {
      player.grazeComboTimer -= dtReal;
      if (player.grazeComboTimer <= 0) player.grazeCombo = 0;
    }

    const camTX = this.enclosure.active ? this.enclosure.cx * 0.42 + player.x * 0.58 : player.x;
    const camTY = this.enclosure.active ? this.enclosure.cy * 0.42 + player.y * 0.58 : player.y;
    this.cameraX += (camTX - this.cameraX) * Math.min(1, dtReal * 8.5);
    this.cameraY += (camTY - this.cameraY) * Math.min(1, dtReal * 8.5);
    this.shakeMag *= Math.pow(0.84, dtReal * 60);

    // 4. World Nodes (Overclock Rings, Shrines, Pacts)
    this.updateWorldNodes(dtWorld, dtReal);

    // 5. Bosses & Waves
    this.updateBossDirector(dtWorld, dtReal);
    const enemyCtx = this.makeEnemyCtx();
    updateWaveDirector(enemyCtx, dtWorld, this.spawnAccum, this.eliteTimer, this.nodeTimer);
    updateEnemies(enemyCtx, dtWorld);

    // 6. Weapons, Parries, Bullets, Grazing, Pickups
    updateWeapons(this.makeWeaponCtx(justEntered, justExited), dtWorld, dtReal);
    this.updateParryWaves(dtReal);
    this.updateHazards(dtWorld, dtReal);
    this.updateLasers(dtWorld, dtReal);
    this.updatePlayerBullets(dtWorld, dtReal);
    this.updateEnemyBulletsAndGrazing(dtWorld);
    this.updateEnemyContactCollisions();
    this.updatePickups(dtWorld, dtReal);
    this.particles.update(dtWorld, dtReal);

    this.hudThrottle += dtReal;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHud();
    }
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

  private triggerParryShockwave(): void {
    const p = this.player;
    const v = VESSELS[this.vesselId];
    const skin = resolveSkinColors(SKINS[this.skinId], this.realTime);
    const metaMult = 1 + (this.save.upgrades.parry_resonance ?? 0) * 0.08;

    p.kineticCharge = Math.max(0, p.kineticCharge - 16);
    p.parryCooldown = p.parryCooldownMax;

    const maxR = 136 * p.areaMult * v.stats.parryRadiusMult * metaMult;
    this.parryWaves.push({
      x: p.x,
      y: p.y,
      radius: 22,
      maxRadius: maxR,
      age: 0,
      duration: 0.25,
      parryCount: 0,
      bonusParryCount: 0,
      colorOuter: skin.parryOuter,
      colorInner: skin.parryInner
    });
    this.particles.ripple(p.x, p.y, maxR * 1.45, 16, skin.parryOuter, 0.45);
    this.addShake(4.5);

    // NOVA vessel perk: every Parry Shockwave leaves a mini gravity rift!
    if (this.vesselId === 'nova') {
      this.hazards.push({
        id: this.nextEntityId++,
        kind: 'rift',
        x: p.x,
        y: p.y,
        radius: 62 * p.areaMult,
        damagePerSec: 34 * p.damageMult,
        age: 0,
        maxAge: 2.2,
        color: skin.accent,
        collapsed: false,
        evolved: false,
        pullStrength: 165
      });
    }

    const halo = p.weapons.find((w) => w.id === 'halo_blades' && w.evolved);
    if (halo) {
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6;
        this.playerBullets.push({
          id: this.nextEntityId++,
          kind: 'parry_shard',
          x: p.x + Math.cos(ang) * 28,
          y: p.y + Math.sin(ang) * 28,
          vx: Math.cos(ang) * 450,
          vy: Math.sin(ang) * 450,
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
  }

  private updateParryWaves(dtReal: number): void {
    const p = this.player;
    const hasPrism = p.weapons.some((w) => w.id === 'prism_drones');
    const grazeLv = p.passives.find((x) => x.id === 'graze_conduit')?.level ?? 0;

    for (let wi = this.parryWaves.length - 1; wi >= 0; wi--) {
      const wave = this.parryWaves[wi];
      wave.age += dtReal;
      const t = Math.min(1, wave.age / wave.duration);
      wave.radius = 22 + (wave.maxRadius - 22) * (1 - Math.pow(1 - t, 2.5));

      for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
        const eb = this.enemyBullets[bi];
        if (!eb.parryable) continue;
        const dx = eb.x - wave.x;
        const dy = eb.y - wave.y;
        if (dx * dx + dy * dy <= (wave.radius + eb.radius + 6) ** 2) {
          this.enemyBullets.splice(bi, 1);
          wave.parryCount++;
          this.stats.parries++;
          this.stats.score += eb.isParryBonus ? 120 : 35;

          const shardCount = (hasPrism ? 2 : 1) + (this.vesselId === 'seraph' ? 1 : 0);
          const baseDmg = (eb.isParryBonus ? 80 : 32) * p.damageMult * p.parryMult;

          if (eb.isParryBonus) {
            wave.bonusParryCount++;
            p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + 15);
            this.particles.burst(eb.x, eb.y, '#ff66f5', 10, 80, 220, 3.2, 0.4);
          } else {
            p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + 2.6);
            this.particles.burst(eb.x, eb.y, wave.colorOuter, 5, 60, 170, 2.5, 0.3);
          }

          for (let s = 0; s < shardCount; s++) {
            const target = findNearestEnemy(eb.x, eb.y, this.enemies, 680, true);
            const ang = target
              ? Math.atan2(target.y - eb.y, target.x - eb.x) + (s - (shardCount - 1) / 2) * 0.22
              : Math.atan2(dy, dx);
            const spd = this.vesselId === 'vesper' ? 580 : 500;
            this.playerBullets.push({
              id: this.nextEntityId++,
              kind: 'parry_shard',
              x: eb.x,
              y: eb.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              radius: eb.isParryBonus ? 7.5 : 5.5,
              damage: baseDmg / (shardCount > 1 ? 1.38 : 1),
              pierce: eb.isParryBonus ? 3 : 1,
              age: 0,
              maxAge: 2.0,
              color: eb.isParryBonus ? '#e5b34c' : wave.colorOuter,
              homing: 9.5,
              targetId: target?.id,
              hitSet: new Set()
            });
          }
        }
      }

      if (wave.age >= wave.duration) {
        if (wave.parryCount > 0) {
          if (wave.parryCount > this.stats.bestSingleParry) {
            this.stats.bestSingleParry = wave.parryCount;
          }
          sound.playParry(wave.parryCount, wave.bonusParryCount > 0);
          bridge.haptic(wave.parryCount >= 4 || wave.bonusParryCount > 0 ? 'heavy' : 'medium');
          if (wave.parryCount >= 4 || wave.bonusParryCount > 0) {
            this.hitStopTimer = 0.032;
            this.addShake(8);
          }
          this.particles.callout(
            p.x,
            p.y - 36,
            `PARRY ×${wave.parryCount}`,
            wave.bonusParryCount > 0 ? '#e5b34c' : wave.colorOuter,
            wave.parryCount >= 5 ? 1.3 : 1.05,
            0.9
          );

          if (this.vesselId === 'aegis' && wave.parryCount >= 4) {
            p.shield = Math.min(p.maxShield, p.shield + 14);
          }
          if (grazeLv > 0 && wave.parryCount >= 3) {
            p.hp = Math.min(p.maxHp, p.hp + 2 + grazeLv * 1.5);
          }
        }
        this.parryWaves.splice(wi, 1);
      }
    }
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

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e.isBoss) {
            this.spawnXp(e.x, e.y, e.xpValue);
            this.particles.shatter(e.x, e.y, e.accent, 4, 0.8);
            this.enemies.splice(i, 1);
          }
        }
        this.enemyBullets.length = 0;

        const sched = BOSS_SCHEDULE[enc.bossIndex % BOSS_SCHEDULE.length];
        const endlessScale = this.stats.endlessMode ? 1 + (this.stats.elapsed - 340) / 140 : 1;
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
      h.age += h.kind === 'nova_wave' ? dtReal : h.kind === 'singularity' ? dtReal * 0.45 : dtWorld;
      if (h.age >= h.maxAge) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (h.kind === 'nova_wave') continue;

      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = h.x - e.x;
        const dy = h.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d <= h.radius + e.radius) {
          this.damageEnemy(e, h.damagePerSec * dtWorld, h.color);
        }
        if (h.pullStrength > 0 && d <= h.radius * 1.9 && !e.isBoss) {
          const pull = h.pullStrength * dtReal * (1 - d / (h.radius * 2));
          e.x += (dx / d) * pull;
          e.y += (dy / d) * pull;
        }
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
        if (dist <= hurtR + l.width * 0.42) {
          this.damagePlayer(l.damage);
        } else if (dist <= p.grazeRadius + l.width * 0.5 && Math.random() < 0.22) {
          this.registerGraze(p.x, p.y);
        }
      }
    }
  }

  private updatePlayerBullets(dtWorld: number, dtReal: number): void {
    const teslaEvolved = this.player.weapons.some((w) => w.id === 'arc_tether' && w.evolved);
    const phantomEvolved = this.player.weapons.some((w) => w.id === 'phase_daggers' && w.evolved);

    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      if (i >= this.playerBullets.length) i = this.playerBullets.length - 1;
      if (i < 0) break;
      const b = this.playerBullets[i];
      if (!b) continue;

      // Chrono Scythe special boomerang + Stillpoint buzzsaw behavior!
      if (b.kind === 'scythe') {
        b.spinAngle = (b.spinAngle ?? 0) + dtReal * (this.player.inStillpoint ? 26 : 16);
        const dtS = this.player.inStillpoint ? dtReal * 0.08 : dtWorld;
        b.age += dtS;
        if (b.age >= b.maxAge) {
          this.playerBullets.splice(i, 1);
          continue;
        }
        // Boomerang return curve after 0.65s
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
        // Shred enemy bullets in Stillpoint or when Evolved!
        if (this.player.inStillpoint || b.evolved) {
          for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
            const eb = this.enemyBullets[bi];
            if (!eb.parryable) continue;
            if ((eb.x - b.x) ** 2 + (eb.y - b.y) ** 2 <= (b.radius + eb.radius + 4) ** 2) {
              this.particles.burst(eb.x, eb.y, b.color, 3, 30, 110, 2, 0.2);
              this.enemyBullets.splice(bi, 1);
            }
          }
        }
        // Periodic hit reset so spinning scythes slice repeatedly!
        if (Math.floor(b.age * 7) !== Math.floor((b.age - dtS) * 7)) {
          b.hitSet.clear();
        }
      } else {
        const dt =
          b.kind === 'parry_shard' || b.kind === 'dagger_homing'
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
            for (const e of this.enemies) {
              if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) <= r + e.radius) {
                this.damageEnemy(e, b.damage, '#d387ff');
              }
            }
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
            const nextAng = cur + diff * Math.min(1, b.homing * dt);
            b.vx = Math.cos(nextAng) * speed;
            b.vy = Math.sin(nextAng) * speed;
          }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Ricochet bounce off Boss Enclosure walls!
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

      // Check breakable Resonance Shrines!
      for (let ni = this.nodes.length - 1; ni >= 0; ni--) {
        const n = this.nodes[ni];
        if (n.kind !== 'shrine') continue;
        if ((n.x - b.x) ** 2 + (n.y - b.y) ** 2 <= (n.radius + b.radius) ** 2) {
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
      for (const e of this.enemies) {
        if (e.hp <= 0 || b.hitSet.has(e.id)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        if (dx * dx + dy * dy <= (e.radius + b.radius) ** 2) {
          b.hitSet.add(e.id);
          let finalDmg = b.damage;
          const isCrit = Math.random() < this.player.critChance;
          if (isCrit) finalDmg *= 1.8;

          if (phantomEvolved && b.kind === 'dagger_homing' && !e.isBoss && e.hp / e.maxHp <= 0.2) {
            finalDmg = e.hp + 10;
          }
          this.damageEnemy(e, finalDmg, isCrit ? '#e5b34c' : b.color, isCrit || b.kind === 'parry_shard');
          this.particles.burst(b.x, b.y, b.color, 3, 40, 120, 2, 0.2);

          if (teslaEvolved && b.kind === 'parry_shard') {
            const chain = findNearestEnemy(e.x, e.y, this.enemies, 155, false, e.id);
            if (chain) {
              this.particles.arc(e.x, e.y, chain.x, chain.y, '#9cf6ff', 2.4, 0.16);
              this.damageEnemy(chain, b.damage * 0.65, '#9cf6ff');
            }
          }

          // Ricochet bounce to next nearest enemy (+ split in Stillpoint!)
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
    this.pickups.push({
      id: this.nextEntityId++,
      kind: 'chest',
      x: shrine.x,
      y: shrine.y,
      vx: 0,
      vy: 0,
      value: 1,
      age: 0,
      magnetized: false
    });
    this.pickups.push({
      id: this.nextEntityId++,
      kind: 'shard',
      x: shrine.x + 18,
      y: shrine.y - 10,
      vx: 0,
      vy: 0,
      value: Math.round(22 * this.player.shardMult),
      age: 0,
      magnetized: false
    });
    this.pickups.push({
      id: this.nextEntityId++,
      kind: 'magnet',
      x: shrine.x - 18,
      y: shrine.y + 8,
      vx: 0,
      vy: 0,
      value: 1,
      age: 0,
      magnetized: false
    });
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
    const skin = resolveSkinColors(SKINS[this.skinId], this.realTime);
    const pactGrazeMult = p.pacts.includes('bullet_magnet') ? 1.75 : 1.0;

    this.stats.grazes++;
    p.grazeCombo++;
    p.grazeComboTimer = 2.2;
    this.stats.score += 12 + Math.min(40, p.grazeCombo * 3);
    p.kineticCharge = Math.min(
      p.maxKineticCharge,
      p.kineticCharge + 9.5 * p.chargeRateMult * pactGrazeMult
    );

    this.particles.arc(p.x, p.y, bx, by, skin.accent, 1.4, 0.12);
    this.particles.burst((p.x + bx) * 0.5, (p.y + by) * 0.5, skin.accent, 3, 30, 100, 1.8, 0.22);
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
      if (e.hp <= 0) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (hurtR + e.radius * 0.78) ** 2) {
        this.damagePlayer(e.isBoss ? 22 : e.isElite ? 16 : 12);
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
        this.collectPickup(pk);
        this.pickups.splice(i, 1);
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

    p.xp += pk.value * p.xpMult;
    this.stats.score += pk.value;
    sound.playXp();
    if (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = Math.round(26 + p.level * 16 + Math.pow(p.level, 1.46) * 5);
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
    this.currentChoices = generateUpgradeChoices(this.player, 3, isBossChest);
    this.callbacks.onPhaseChange('levelup', this.currentChoices);
    this.emitHud();
  }

  private damageEnemy = (enemy: Enemy, rawDmg: number, color: string, isCrit = false): void => {
    if (enemy.hp <= 0) return;
    enemy.hp -= rawDmg;
    enemy.hitFlash = 1;

    if (enemy.hp <= 0) {
      this.handleEnemyKilled(enemy);
    } else if (isCrit && Math.random() < 0.25) {
      this.particles.callout(
        enemy.x,
        enemy.y - enemy.radius - 6,
        `${Math.round(rawDmg)}`,
        color,
        0.85,
        0.42
      );
    }
  };

  private handleEnemyKilled(enemy: Enemy): void {
    this.stats.kills++;
    this.stats.score += enemy.scoreValue;
    this.particles.shatter(
      enemy.x,
      enemy.y,
      enemy.accent,
      enemy.isBoss ? 22 : enemy.isElite ? 10 : 5,
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

    if (enemy.isBoss) {
      this.handleBossDefeated(enemy);
    } else {
      this.spawnXp(enemy.x, enemy.y, enemy.xpValue);
      if (enemy.isElite) {
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
        if (Math.random() < 0.48) {
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
      } else if (Math.random() < 0.015) {
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

    if (!this.enclosure.playerHitDuringBoss) {
      this.save.noHitBossClears++;
    }
    this.save.bossesCleared++;

    // Unlock next sector automatically on Boss I / II / III clear!
    if (bossIndexCleared === 0 && !this.save.unlockedSectors.includes('helix')) {
      this.save.unlockedSectors.push('helix');
      this.callbacks.onUnlockNotice('02 SUNKEN METRO UNLOCKED');
    } else if (bossIndexCleared === 1 && !this.save.unlockedSectors.includes('furnace')) {
      this.save.unlockedSectors.push('furnace');
      this.callbacks.onUnlockNotice('03 SLAG FOUNDRY UNLOCKED');
    } else if (bossIndexCleared === 2 && !this.save.unlockedSectors.includes('singularity')) {
      this.save.unlockedSectors.push('singularity');
      this.callbacks.onUnlockNotice('04 THE MONOLITH UNLOCKED');
    }

    this.enclosure.active = false;
    this.enclosure.bossId = null;
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
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.4);
    this.player.kineticCharge = this.player.maxKineticCharge;

    const finalBossKind = this.sectorId === 'singularity' ? 'boss_leviathan' : 'boss_archon';
    if (boss.kind === finalBossKind && !this.stats.endlessMode && !this.stats.victory) {
      this.stats.victory = true;
      if (!this.save.sectorsCleared.includes(this.sectorId)) {
        this.save.sectorsCleared.push(this.sectorId);
      }
      this.finalizeMetaProgress(true);
      this.phase = 'victory';
      this.input.setEnabled(false);
      sound.setStillpointBlend(0);
      this.callbacks.onPhaseChange('victory', undefined, { ...this.stats });
      this.emitHud();
      return;
    }

    this.checkAndToastMilestones();
    this.openUpgradeDraft(true);
  }

  private damagePlayer(rawDmg: number): void {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    if (this.enclosure.active) this.enclosure.playerHitDuringBoss = true;

    let dmg = Math.max(4, rawDmg - p.armor);
    p.invulnTimer = 0.62;
    p.hitFlash = 1;
    p.grazeCombo = 0;

    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      dmg -= absorbed;
    }
    p.hp = Math.max(0, p.hp - dmg);

    sound.playPlayerHit();
    bridge.haptic('error');
    this.addShake(11);
    this.particles.shatter(p.x, p.y, '#e34b42', 8, 1);
    this.particles.ripple(p.x, p.y, 140, 12, '#e34b42', 0.32);

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 95 * 95) {
        this.enemyBullets.splice(i, 1);
      }
    }

    if (p.hp <= 0) this.handleGameOver();
    this.emitHud();
  }

  private handleGameOver(): void {
    this.finalizeMetaProgress(false);
    this.phase = 'gameover';
    this.input.setEnabled(false);
    this.player.inStillpoint = false;
    sound.setGameState(false, false);
    sound.setStillpointBlend(0);
    this.callbacks.onPhaseChange('gameover', undefined, { ...this.stats });
  }

  private finalizeMetaProgress(isVictory: boolean): void {
    const runBonus = Math.round(
      (this.stats.elapsed * 0.28 + this.stats.parries * 0.5 + (isVictory ? 140 : 0)) *
        this.player.shardMult
    );
    const totalPayout = Math.max(12, this.stats.shardsEarned + runBonus);
    this.stats.shardsEarned = totalPayout;

    this.save.shards += totalPayout;
    this.save.totalRuns += 1;
    this.save.totalKills += this.stats.kills;
    this.save.totalParries += this.stats.parries;
    this.save.totalGrazes += this.stats.grazes;
    if (this.stats.bestSingleParry > this.save.bestSingleParry) {
      this.save.bestSingleParry = this.stats.bestSingleParry;
    }
    if (this.stats.elapsed > this.save.bestTimeSec) {
      this.save.bestTimeSec = Math.floor(this.stats.elapsed);
    }
    if (this.stats.score > this.save.bestScore) {
      this.save.bestScore = this.stats.score;
    }
    persistMetaSave(this.save);
    this.checkAndToastMilestones();
  }

  private checkAndToastMilestones(): void {
    const notices = evaluateMilestones(this.save);
    if (notices.length > 0) {
      this.callbacks.onUnlockNotice(notices[0]);
    }
  }

  private spawnXp = (x: number, y: number, value: number): void => {
    if (this.pickups.length > 160) {
      const first = this.pickups.find((pk) => pk.kind.startsWith('xp'));
      if (first) {
        first.value += value;
        first.kind = first.value >= 35 ? 'xp_large' : first.value >= 16 ? 'xp_mid' : 'xp_small';
        return;
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
    const skin = resolveSkinColors(SKINS[this.skinId], this.realTime);
    return {
      player: this.player,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      pylons: this.pylons,
      hazards: this.hazards,
      lasers: this.lasers,
      particles: this.particles,
      accentColor: skin.accent,
      nextId: () => this.nextEntityId++,
      damageEnemy: this.damageEnemy,
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
      weapons: this.player.weapons,
      passives: this.player.passives,
      boss: boss
        ? {
            name: boss.bossName ?? 'ANOMALY',
            hp: Math.max(0, Math.ceil(boss.hp)),
            maxHp: Math.ceil(boss.maxHp)
          }
        : null,
      bossWarning,
      endlessMode: this.stats.endlessMode,
      rerolls: this.player.rerolls
    });
  }

  private renderFrame(): void {
    const shakeX = (Math.random() - 0.5) * 2 * this.shakeMag;
    const shakeY = (Math.random() - 0.5) * 2 * this.shakeMag;

    this.renderer.render({
      player: this.player,
      vesselId: this.vesselId,
      skinId: this.skinId,
      sectorId: this.sectorId,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      pylons: this.pylons,
      hazards: this.hazards,
      nodes: this.nodes,
      lasers: this.lasers,
      parryWaves: this.parryWaves,
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
