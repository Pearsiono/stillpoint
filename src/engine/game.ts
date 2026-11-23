import { sound } from '../audio';
import { bridge } from '../bridge';
import { persistMetaSave } from '../data/meta';
import { generateUpgradeChoices, PASSIVES, WEAPONS } from '../data/upgrades';
import { VESSELS } from '../data/vessels';
import {
  BossEnclosure,
  Enemy,
  EnemyBullet,
  GamePhase,
  HazardZone,
  LaserBeam,
  MetaSave,
  ParryWave,
  PassiveId,
  Pickup,
  PlayerBullet,
  PlayerState,
  RunStats,
  UpgradeChoice,
  VesselId,
  WeaponId
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
import { NeonRenderer } from './renderer';
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
  parryReady: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  score: number;
  kills: number;
  parries: number;
  grazeCombo: number;
  weapons: PlayerState['weapons'];
  passives: PlayerState['passives'];
  boss: { name: string; title: string; hp: number; maxHp: number; phase: number } | null;
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
  private renderer: NeonRenderer;
  private input: InputController;
  private particles = new ParticleSystem();
  private callbacks: GameCallbacks;
  private save: MetaSave;

  phase: GamePhase = 'menu';
  player!: PlayerState;
  vesselId: VesselId = 'vesper';
  enemies: Enemy[] = [];
  enemyBullets: EnemyBullet[] = [];
  playerBullets: PlayerBullet[] = [];
  hazards: HazardZone[] = [];
  lasers: LaserBeam[] = [];
  parryWaves: ParryWave[] = [];
  pickups: Pickup[] = [];
  enclosure!: BossEnclosure;
  stats!: RunStats;

  private nextEntityId = 1;
  private realTime = 0;
  private cameraX = 0;
  private cameraY = 0;
  private shakeMag = 0;
  private hitStopTimer = 0;
  private spawnAccum = { value: 0 };
  private eliteTimer = { value: 0 };
  private nextBossIdx = 0;
  private endlessBossTimer = 95;
  private pendingBossDraft = false;
  private currentChoices: UpgradeChoice[] = [];
  private hasUsedStillpoint = false;
  private tutorialTimer = 0;
  private hudThrottle = 0;
  private rafId = 0;
  private lastFrameTs = 0;
  private menuDemoTimer = 0;

  constructor(canvas: HTMLCanvasElement, save: MetaSave, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.save = save;
    this.callbacks = callbacks;
    this.vesselId = save.selectedVessel;
    this.renderer = new NeonRenderer(canvas);
    this.input = new InputController(canvas, () => sound.unlock());

    this.resetWorldState(this.vesselId);
    this.seedMenuDemo();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.phase === 'playing') {
        this.pauseGame();
      }
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
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
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

  getSave(): MetaSave {
    return this.save;
  }

  setVessel(id: VesselId): void {
    this.vesselId = id;
    this.save.selectedVessel = id;
    persistMetaSave(this.save);
  }

  startNewRun(vesselId?: VesselId): void {
    sound.unlock();
    this.vesselId = vesselId ?? this.save.selectedVessel;
    this.resetWorldState(this.vesselId);
    this.seedOpeningWave();
    this.input.resetForNewRun();
    this.input.setEnabled(true);
    this.phase = 'playing';
    sound.setGameState(true, false);
    bridge.haptic('medium');
    this.callbacks.onPhaseChange('playing');
    this.emitHud();
  }

  private seedOpeningWave(): void {
    const ctx = this.makeEnemyCtx();
    // Spawn an immediate welcoming ring so action & parries kick off right away!
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + 0.4;
      spawnEnemy(ctx, 'swarmer', Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1);
    }
    const turret = spawnEnemy(ctx, 'turret', 0, -235, false, 1);
    turret.fireTimer = 0.9;
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
    this.seedMenuDemo();
    this.callbacks.onPhaseChange('menu');
  }

  continueEndless(): void {
    if (this.phase !== 'victory') return;
    this.stats.endlessMode = true;
    this.endlessBossTimer = 95;
    this.phase = 'playing';
    this.input.setEnabled(true);
    this.player.hp = this.player.maxHp;
    this.player.kineticCharge = this.player.maxKineticCharge;
    sound.setGameState(true, false);
    this.particles.callout(this.player.x, this.player.y - 40, 'ENDLESS OVERDRIVE', '#ffd166', 1.3, 1.3);
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
        this.particles.ripple(this.player.x, this.player.y, 230, 18, '#ffd166', 0.55);
        this.particles.callout(this.player.x, this.player.y - 44, `EVOLVED: ${WEAPONS[w.id].evolvedName}!`, '#ffd166', 1.25, 1.3);
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
    this.hazards = [];
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
      shield: vesselId === 'aegis' ? 16 : 0,
      maxShield: vesselId === 'aegis' ? 32 : 20,
      invulnTimer: 0,
      hitFlash: 0,
      kineticCharge: vessel.stats.maxCharge,
      maxKineticCharge: vessel.stats.maxCharge,
      inStillpoint: false,
      stillpointBlend: 0,
      stillpointTimeHeld: 0,
      parryCooldown: 0,
      parryCooldownMax: vesselId === 'phantom' ? 0.36 : 0.48,
      level: 1,
      xp: 0,
      xpToNext: 28,
      rerolls: 1 + (u.reroll_module ?? 0),
      grazeCombo: 0,
      grazeComboTimer: 0,
      moveSpeed: vessel.stats.moveSpeed,
      damageMult: 1,
      fireRateMult: 1,
      areaMult: 1,
      parryMult: 1,
      chargeRateMult: vessel.stats.chargeRateMult,
      stillpointDrainMult: 1,
      grazeRadius: vessel.stats.grazeRadius,
      magnetRadius: 72,
      armor: vessel.stats.armor,
      weapons: [
        {
          id: vessel.starterWeapon,
          level: 1,
          evolved: false,
          cooldown: 0.2,
          auxTimer: 0
        }
      ],
      passives: [],
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
      targetHalfW: 215,
      targetHalfH: 315,
      bossIndex: 0,
      bossId: null,
      pulse: 0
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
      endlessMode: false,
      victory: false
    };

    this.cameraX = 0;
    this.cameraY = 0;
    this.shakeMag = 0;
    this.hitStopTimer = 0;
    this.spawnAccum = { value: 0 };
    this.eliteTimer = { value: 0 };
    this.nextBossIdx = 0;
    this.endlessBossTimer = 95;
    this.hasUsedStillpoint = false;
    this.tutorialTimer = 14;
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

    const prevMaxHp = this.player.maxHp;
    this.player.maxHp = v.stats.maxHp + (u.hull_integrity ?? 0) * 14;
    if (this.player.maxHp > prevMaxHp) {
      this.player.hp += this.player.maxHp - prevMaxHp;
    }

    this.player.maxKineticCharge = v.stats.maxCharge + capLv * 18;
    this.player.stillpointDrainMult =
      Math.pow(0.9, capLv) * Math.pow(0.93, u.time_lattice ?? 0);
    this.player.moveSpeed = v.stats.moveSpeed * (1 + thrLv * 0.09);
    this.player.chargeRateMult =
      v.stats.chargeRateMult * (1 + thrLv * 0.16) * (1 + (u.kinetic_core ?? 0) * 0.09);
    this.player.fireRateMult = 1 + coilLv * 0.13;
    this.player.parryCooldownMax =
      (this.vesselId === 'phantom' ? 0.36 : 0.48) * Math.pow(0.88, coilLv);
    this.player.areaMult = 1 + lensLv * 0.15;
    this.player.damageMult = Math.max(this.player.damageMult, 1 + coreLv * 0.16);
    this.player.parryMult =
      (1 + coreLv * 0.24) * (1 + (u.parry_resonance ?? 0) * 0.12);
    this.player.grazeRadius = v.stats.grazeRadius + grazeLv * 14;
    this.player.magnetRadius = 72 + (u.magnet_field ?? 0) * 18 + grazeLv * 18;
    this.player.armor = v.stats.armor;
  }

  private seedMenuDemo(): void {
    // Beautiful ambient bullet-hell vortex dancing softly behind title screen
    this.enemies = [];
    this.enemyBullets = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const e = spawnEnemy(this.makeEnemyCtx(), i % 2 === 0 ? 'ring_caster' : 'spinner', Math.cos(a) * 140, Math.sin(a) * 140, false, 1);
      e.fireTimer = i * 0.35;
    }
  }

  private update(dtReal: number): void {
    this.realTime += dtReal;

    if (this.phase === 'menu') {
      this.menuDemoTimer += dtReal;
      this.cameraX = Math.sin(this.realTime * 0.3) * 45;
      this.cameraY = Math.cos(this.realTime * 0.24) * 35;
      for (const e of this.enemies) {
        e.angle += dtReal * 1.4;
      }
      if (this.menuDemoTimer > 0.36) {
        this.menuDemoTimer = 0;
        const a = this.realTime * 1.5;
        for (let i = 0; i < 4; i++) {
          const ang = a + (i * Math.PI) / 2;
          this.enemyBullets.push({
            id: this.nextEntityId++,
            kind: i === 0 ? 'parry_orb' : 'orb',
            x: 0,
            y: 0,
            vx: Math.cos(ang) * 95,
            vy: Math.sin(ang) * 95,
            radius: i === 0 ? 7.5 : 5,
            damage: 0,
            age: 0,
            maxAge: 4.2,
            grazed: false,
            parryable: true,
            isParryBonus: i === 0,
            color: i === 0 ? '#ff4df0' : '#ff4d6d'
          });
        }
      }
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const b = this.enemyBullets[i];
        b.age += dtReal;
        b.x += b.vx * dtReal;
        b.y += b.vy * dtReal;
        if (b.age > b.maxAge) this.enemyBullets.splice(i, 1);
      }
      this.particles.update(dtReal, dtReal);
      return;
    }

    if (this.phase !== 'playing') {
      return;
    }

    // Brief celebratory hit-stop on big multi-parry or boss breaks
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtReal;
      this.shakeMag *= Math.pow(0.82, dtReal * 60);
      this.particles.update(dtReal * 0.1, dtReal);
      return;
    }

    const input = this.input.sample();
    const player = this.player;

    // 1. Stillpoint (Lift-to-Focus) State Transition & Time Dilation!
    const wasStillpoint = player.inStillpoint;
    const minToEnter = wasStillpoint ? 0.5 : 5;
    const wantsStillpoint = input.wantsStillpoint && player.kineticCharge > minToEnter;

    player.inStillpoint = wantsStillpoint;
    const justEnteredStillpoint = !wasStillpoint && player.inStillpoint;
    const justExitedStillpoint = wasStillpoint && !player.inStillpoint;

    if (player.parryCooldown > 0) {
      player.parryCooldown = Math.max(0, player.parryCooldown - dtReal);
    }

    if (justEnteredStillpoint) {
      this.hasUsedStillpoint = true;
      player.stillpointTimeHeld = 0;
      sound.playStillpointEnter();
      bridge.haptic('light');
      // Fire PARRY SHOCKWAVE if enough Kinetic Charge & off cooldown!
      if (player.parryCooldown <= 0 && player.kineticCharge >= 18) {
        this.triggerParryShockwave();
      }
    } else if (justExitedStillpoint) {
      sound.playStillpointExit();
    }

    // Smooth blend (rapid ease-in for snappy arcade feel)
    const targetBlend = player.inStillpoint ? 1 : 0;
    const blendRate = player.inStillpoint ? 22 : 16;
    player.stillpointBlend += (targetBlend - player.stillpointBlend) * Math.min(1, dtReal * blendRate);
    sound.setStillpointBlend(player.stillpointBlend);

    // Core Time-Dilation curve: 1.0x -> 0.17x in Stillpoint!
    const timeScale = 1 - player.stillpointBlend * 0.83;
    const dtWorld = dtReal * timeScale;
    this.stats.elapsed += dtWorld;

    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dtReal;
    }

    // 2. Kinetic Charge Management
    if (player.inStillpoint) {
      player.stillpointTimeHeld += dtReal;
      const drainRate = 25 * player.stillpointDrainMult;
      player.kineticCharge = Math.max(0, player.kineticCharge - drainRate * dtReal);
      if (player.kineticCharge <= 0.1) {
        player.inStillpoint = false;
        sound.playStillpointExit();
      }
    } else {
      // Passive trickle + strong generation while moving
      const moveBonus = input.isMoving ? 15.5 : 4.2;
      player.kineticCharge = Math.min(
        player.maxKineticCharge,
        player.kineticCharge + moveBonus * player.chargeRateMult * dtReal
      );
    }

    // 3. Player Movement & Trail
    if (!player.inStillpoint && input.isMoving) {
      player.vx = input.moveX * player.moveSpeed;
      player.vy = input.moveY * player.moveSpeed;
      const stepDist = Math.hypot(player.vx * dtReal, player.vy * dtReal);
      player.x += player.vx * dtReal;
      player.y += player.vy * dtReal;
      player.distanceMovedSinceDagger += stepDist;
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

    // Keep player inside Boss Containment Enclosure when active
    if (this.enclosure.active) {
      const margin = 14;
      const minX = this.enclosure.cx - this.enclosure.halfW + margin;
      const maxX = this.enclosure.cx + this.enclosure.halfW - margin;
      const minY = this.enclosure.cy - this.enclosure.halfH + margin;
      const maxY = this.enclosure.cy + this.enclosure.halfH - margin;
      player.x = Math.max(minX, Math.min(maxX, player.x));
      player.y = Math.max(minY, Math.min(maxY, player.y));
    }

    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dtReal);
    if (player.hitFlash > 0) player.hitFlash = Math.max(0, player.hitFlash - dtReal * 5);
    if (player.grazeComboTimer > 0) {
      player.grazeComboTimer -= dtReal;
      if (player.grazeComboTimer <= 0) player.grazeCombo = 0;
    }

    // Smooth camera tracking
    const camTargetX = this.enclosure.active ? this.enclosure.cx * 0.42 + player.x * 0.58 : player.x;
    const camTargetY = this.enclosure.active ? this.enclosure.cy * 0.42 + player.y * 0.58 : player.y;
    this.cameraX += (camTargetX - this.cameraX) * Math.min(1, dtReal * 8.5);
    this.cameraY += (camTargetY - this.cameraY) * Math.min(1, dtReal * 8.5);
    this.shakeMag *= Math.pow(0.84, dtReal * 60);

    // 4. Boss Schedule & Neon Enclosure Director
    this.updateBossDirector(dtWorld, dtReal);

    // 5. Regular Wave Spawner & Enemy AI
    const enemyCtx = this.makeEnemyCtx();
    updateWaveDirector(enemyCtx, dtWorld, this.spawnAccum, this.eliteTimer);
    updateEnemies(enemyCtx, dtWorld);

    // 6. Dual-State Weapons Update
    const weaponCtx = this.makeWeaponCtx(justEnteredStillpoint, justExitedStillpoint);
    updateWeapons(weaponCtx, dtWorld, dtReal);

    // 7. Parry Shockwaves Update (runs in REAL TIME so parrying feels ultra-snappy!)
    this.updateParryWaves(dtReal);

    // 8. Hazards, Lasers, Bullets, Grazing, Collisions & Pickups
    this.updateHazards(dtWorld, dtReal);
    this.updateLasers(dtWorld, dtReal);
    this.updatePlayerBullets(dtWorld, dtReal);
    this.updateEnemyBulletsAndGrazing(dtWorld);
    this.updateEnemyContactCollisions();
    this.updatePickups(dtWorld, dtReal);

    this.particles.update(dtWorld, dtReal);

    // 9. Throttled HUD sync (~20Hz DOM update for crisp perf)
    this.hudThrottle += dtReal;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private triggerParryShockwave(): void {
    const p = this.player;
    const v = VESSELS[this.vesselId];
    const metaParryRadiusMult = 1 + (this.save.upgrades.parry_resonance ?? 0) * 0.07;

    p.kineticCharge = Math.max(0, p.kineticCharge - 16);
    p.parryCooldown = p.parryCooldownMax;

    const maxR = 136 * p.areaMult * v.stats.parryRadiusMult * metaParryRadiusMult;
    this.parryWaves.push({
      x: p.x,
      y: p.y,
      radius: 22,
      maxRadius: maxR,
      age: 0,
      duration: 0.25,
      parryCount: 0,
      bonusParryCount: 0,
      color: v.accent
    });
    this.particles.ripple(p.x, p.y, maxR * 1.45, 16, v.accent, 0.45);
    this.addShake(4.5);

    // Evolved ECLIPSE GYRO (Halo Blades) flares out a burst of homing sparks on every parry!
    const halo = p.weapons.find((w) => w.id === 'halo_blades' && w.evolved);
    if (halo) {
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6;
        this.playerBullets.push({
          id: this.nextEntityId++,
          kind: 'parry_shard',
          x: p.x + Math.cos(ang) * 28,
          y: p.y + Math.sin(ang) * 28,
          vx: Math.cos(ang) * 440,
          vy: Math.sin(ang) * 440,
          radius: 6,
          damage: 34 * p.damageMult,
          pierce: 2,
          age: 0,
          maxAge: 1.5,
          color: '#4effb4',
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
      const eased = 1 - Math.pow(1 - t, 2.5);
      wave.radius = 22 + (wave.maxRadius - 22) * eased;

      // Reflect enemy bullets caught inside expanding Parry Shockwave!
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

          const shardCount = hasPrism ? 2 : 1;
          const baseDmg =
            (eb.isParryBonus ? 78 : 30) * p.damageMult * p.parryMult;

          if (eb.isParryBonus) {
            wave.bonusParryCount++;
            // Huge Kinetic Charge refund on Magenta Boss/Elite Parry Orbs!
            p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + 15);
            this.particles.burst(eb.x, eb.y, '#ff66f5', 10, 80, 220, 3.2, 0.4);
          } else {
            p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + 2.6);
            this.particles.burst(eb.x, eb.y, '#22e6ff', 5, 60, 170, 2.5, 0.3);
          }

          for (let s = 0; s < shardCount; s++) {
            const target = findNearestEnemy(eb.x, eb.y, this.enemies, 680, true);
            const ang = target
              ? Math.atan2(target.y - eb.y, target.x - eb.x) + (s - (shardCount - 1) / 2) * 0.25
              : Math.atan2(dy, dx);
            const spd = this.vesselId === 'vesper' ? 560 : 490;
            this.playerBullets.push({
              id: this.nextEntityId++,
              kind: 'parry_shard',
              x: eb.x,
              y: eb.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              radius: eb.isParryBonus ? 7.5 : 5.5,
              damage: baseDmg / (shardCount === 2 ? 1.45 : 1),
              pierce: eb.isParryBonus ? 3 : 1,
              age: 0,
              maxAge: 2.0,
              color: eb.isParryBonus ? '#ffd166' : '#4effe8',
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
          const label =
            wave.bonusParryCount > 0
              ? `OVERPARRY ×${wave.parryCount}!`
              : `PARRY ×${wave.parryCount}`;
          this.particles.callout(
            p.x,
            p.y - 36,
            label,
            wave.bonusParryCount > 0 ? '#ffd166' : '#4effe8',
            wave.parryCount >= 5 ? 1.3 : 1.05,
            0.95
          );

          // AEGIS-04 vessel perk: +12 Energy Shield on 4+ parry!
          if (this.vesselId === 'aegis' && wave.parryCount >= 4) {
            p.shield = Math.min(p.maxShield, p.shield + 12);
          }
          // Graze Conduit passive perk: heal tiny hull on 3+ parry!
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

    // Trigger next scheduled boss
    if (!enc.active && enc.warningTimer <= 0) {
      if (!this.stats.endlessMode && this.nextBossIdx < BOSS_SCHEDULE.length) {
        const nextBoss = BOSS_SCHEDULE[this.nextBossIdx];
        if (this.stats.elapsed >= nextBoss.time) {
          this.beginBossWarning(this.nextBossIdx);
        }
      } else if (this.stats.endlessMode) {
        this.endlessBossTimer -= dtWorld;
        if (this.endlessBossTimer <= 0) {
          this.endlessBossTimer = 95;
          this.beginBossWarning(this.nextBossIdx % BOSS_SCHEDULE.length);
        }
      }
    }

    // Countdown warning -> lock enclosure & spawn boss!
    if (enc.warningTimer > 0) {
      enc.warningTimer -= dtReal;
      enc.cx += (this.player.x - enc.cx) * Math.min(1, dtReal * 3);
      enc.cy += (this.player.y - enc.cy) * Math.min(1, dtReal * 3);
      if (enc.warningTimer <= 0) {
        enc.active = true;
        sound.setGameState(true, true);
        bridge.haptic('heavy');
        this.addShake(9);

        // Vaporize leftover regular enemies outside enclosure into XP gems
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e.isBoss) {
            this.spawnXp(e.x, e.y, e.xpValue);
            this.particles.burst(e.x, e.y, e.accent, 6, 40, 120, 2.5, 0.3);
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
          enc.cy - enc.halfH * 0.56,
          false,
          endlessScale
        );
        enc.bossId = boss.id;
        this.particles.ripple(boss.x, boss.y, 290, 22, boss.accent, 0.65);
        this.particles.callout(boss.x, boss.y + 44, sched.name, '#ffd166', 1.4, 1.5);
        this.emitHud();
      }
    }
  }

  private beginBossWarning(bossIndex: number): void {
    const enc = this.enclosure;
    enc.bossIndex = bossIndex;
    enc.warningTimer = 2.8;
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
      h.age += h.kind === 'singularity' ? dtReal * 0.45 : dtWorld;
      if (h.age >= h.maxAge) {
        this.hazards.splice(i, 1);
        continue;
      }

      // Gravity pull & DoT
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

      // Evolved EVENT HORIZON singularities eat nearby enemy bullets into XP gems!
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
    const hurtR = p.inStillpoint ? 4.5 : 8.5;

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= l.isEnemy ? dtWorld : dtReal;
      if (l.life <= 0) {
        if (l.isTelegraph) {
          // Convert finished telegraph into live lethal beam!
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
      const b = this.playerBullets[i];
      // Parry shards & recalled homing daggers slice through Stillpoint at near-real speed!
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
          this.particles.burst(b.x, b.y, '#d96bff', 12, 50, 180, 3.2, 0.36);
          this.particles.ring(b.x, b.y, '#d96bff', 16, 0.28);
          for (const e of this.enemies) {
            if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) <= r + e.radius) {
              this.damageEnemy(e, b.damage, '#d96bff');
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

      // Homing guidance
      if (b.homing > 0) {
        const target =
          (b.targetId ? this.enemies.find((e) => e.id === b.targetId && e.hp > 0) : null) ??
          findNearestEnemy(b.x, b.y, this.enemies, 520, true);
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

      // Enemy collision
      for (const e of this.enemies) {
        if (e.hp <= 0 || b.hitSet.has(e.id)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const hitR = e.radius + b.radius;
        if (dx * dx + dy * dy <= hitR * hitR) {
          b.hitSet.add(e.id);
          let finalDmg = b.damage;
          // Evolved PHANTOM BARRAGE executes non-boss foes below 20% HP!
          if (phantomEvolved && b.kind === 'dagger_homing' && !e.isBoss && e.hp / e.maxHp <= 0.2) {
            finalDmg = e.hp + 10;
          }
          this.damageEnemy(e, finalDmg, b.color, b.kind === 'parry_shard');
          this.particles.burst(b.x, b.y, b.color, 3, 40, 120, 2, 0.2);

          // Evolved TESLA LATTICE arcs lightning from every Parry Shard impact!
          if (teslaEvolved && b.kind === 'parry_shard') {
            const chain = findNearestEnemy(e.x, e.y, this.enemies.filter((x) => x.id !== e.id), 150);
            if (chain) {
              this.particles.arc(e.x, e.y, chain.x, chain.y, '#9cf6ff', 2.4, 0.16);
              this.damageEnemy(chain, b.damage * 0.65, '#9cf6ff');
            }
          }

          b.pierce--;
          if (b.pierce <= 0) {
            this.playerBullets.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private updateEnemyBulletsAndGrazing(dtWorld: number): void {
    const p = this.player;
    const hurtR = p.inStillpoint ? 4.5 : 8.2;
    const grazeR = p.grazeRadius;

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
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

      // Cull bullets way outside active camera
      if (d2 > 760 * 760) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Direct hit check (fair arcade core hitbox!)
      const hitDist = hurtR + b.radius * 0.72;
      if (d2 <= hitDist * hitDist) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer(b.damage);
        continue;
      }

      // Bullet Grazing check!
      if (!b.grazed && d2 <= (grazeR + b.radius) ** 2) {
        b.grazed = true;
        this.registerGraze(b.x, b.y);
      }
    }
  }

  private registerGraze(bx: number, by: number): void {
    const p = this.player;
    this.stats.grazes++;
    p.grazeCombo++;
    p.grazeComboTimer = 2.2;
    this.stats.score += 12 + Math.min(40, p.grazeCombo * 3);

    const chargeGain = 9.5 * p.chargeRateMult;
    p.kineticCharge = Math.min(p.maxKineticCharge, p.kineticCharge + chargeGain);

    this.particles.arc(p.x, p.y, bx, by, '#5ef2ff', 1.5, 0.12);
    this.particles.burst((p.x + bx) * 0.5, (p.y + by) * 0.5, '#5ef2ff', 3, 30, 100, 1.8, 0.22);
    sound.playGraze(p.grazeCombo);
    bridge.haptic('light');

    if (p.grazeCombo % 5 === 0) {
      this.particles.callout(p.x, p.y - 26, `GRAZE ×${p.grazeCombo}`, '#5ef2ff', 0.9, 0.65);
    }

    // Evolved PHANTOM BARRAGE spawns free Phase Daggers whenever you graze!
    const daggers = p.weapons.find((w) => w.id === 'phase_daggers' && w.evolved);
    if (daggers) {
      spawnPlantedDagger(this.makeWeaponCtx(false, false), daggers, p.x, p.y);
    }
  }

  private updateEnemyContactCollisions(): void {
    const p = this.player;
    const hurtR = p.inStillpoint ? 5 : 10;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const hitR = hurtR + e.radius * 0.78;
      if (dx * dx + dy * dy <= hitR * hitR) {
        this.damagePlayer(e.isBoss ? 22 : e.isElite ? 16 : 12);
        break;
      }
    }
  }

  private updatePickups(dtWorld: number, dtReal: number): void {
    const p = this.player;
    // Stillpoint subtly surges pickup pull range so Focus never starves XP!
    const pullR = p.magnetRadius * (p.inStillpoint ? 1.55 : 1.0);
    const pullR2 = pullR * pullR;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.age += dtWorld;
      if (pk.age > 34) {
        this.pickups.splice(i, 1);
        continue;
      }

      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= pullR2) {
        pk.magnetized = true;
      }

      if (pk.magnetized) {
        const d = Math.sqrt(d2) || 1;
        const spd = 390 + (p.inStillpoint ? 90 : 0);
        const dtMove = p.inStillpoint ? dtReal * 0.75 : dtReal;
        pk.x += (dx / d) * spd * dtMove;
        pk.y += (dy / d) * spd * dtMove;
      }

      if (d2 <= 22 * 22) {
        this.collectPickup(pk);
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(pk: Pickup): void {
    const p = this.player;
    if (pk.kind === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
      this.particles.callout(p.x, p.y - 26, '+HULL RESTORED', '#4effb4', 0.95, 0.8);
      sound.playLevelUp();
      bridge.haptic('light');
      return;
    }
    if (pk.kind === 'shard') {
      this.stats.shardsEarned += pk.value;
      this.particles.callout(p.x, p.y - 24, `+${pk.value} SHARDS`, '#ff66e5', 0.9, 0.75);
      sound.playXp();
      return;
    }
    if (pk.kind === 'magnet') {
      for (const other of this.pickups) {
        if (other.kind.startsWith('xp')) other.magnetized = true;
      }
      this.particles.ripple(p.x, p.y, 260, 10, '#22e6ff', 0.45);
      this.particles.callout(p.x, p.y - 28, 'VOID MAGNET', '#22e6ff', 1.0, 0.85);
      sound.playLevelUp();
      return;
    }

    // XP gem
    p.xp += pk.value;
    this.stats.score += pk.value;
    sound.playXp();
    if (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = Math.round(28 + p.level * 16 + Math.pow(p.level, 1.48) * 5);
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
      this.handleEnemyKilled(enemy, color);
    } else if (isCrit && Math.random() < 0.28) {
      this.particles.callout(enemy.x, enemy.y - enemy.radius - 6, `${Math.round(rawDmg)}`, color, 0.82, 0.45);
    }
  };

  private handleEnemyKilled(enemy: Enemy, _color: string): void {
    this.stats.kills++;
    this.stats.score += enemy.scoreValue;
    this.particles.burst(
      enemy.x,
      enemy.y,
      enemy.accent,
      enemy.isBoss ? 48 : enemy.isElite ? 18 : 8,
      60,
      enemy.isBoss ? 340 : 190,
      enemy.isBoss ? 4.5 : 2.8,
      enemy.isBoss ? 0.85 : 0.38
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
          value: 14,
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

    // Shatter enclosure & clear all hostile bullets
    this.enclosure.active = false;
    this.enclosure.bossId = null;
    this.enemyBullets.length = 0;
    this.lasers = this.lasers.filter((l) => !l.isEnemy);

    sound.setGameState(true, false);
    sound.playBossDefeat();
    bridge.haptic('success');
    this.hitStopTimer = 0.08;
    this.addShake(15);
    this.particles.ripple(boss.x, boss.y, 380, 26, '#ffd166', 0.8);

    const shardBonus = 45 + bossIndexCleared * 35;
    this.stats.shardsEarned += shardBonus;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.4);
    this.player.kineticCharge = this.player.maxKineticCharge;

    // Milestone vessel unlocks!
    if (bossIndexCleared === 0 && !this.save.unlockedVessels.includes('aegis')) {
      this.save.unlockedVessels.push('aegis');
      persistMetaSave(this.save);
      this.callbacks.onUnlockNotice('VESSEL UNLOCKED: AEGIS-04');
    } else if (bossIndexCleared === 1 && !this.save.unlockedVessels.includes('phantom')) {
      this.save.unlockedVessels.push('phantom');
      persistMetaSave(this.save);
      this.callbacks.onUnlockNotice('VESSEL UNLOCKED: PHANTOM-09');
    }

    // Defeating Boss III (Chrono Archon) for the first time triggers Victory celebration!
    if (boss.kind === 'boss_archon' && !this.stats.endlessMode && !this.stats.victory) {
      this.stats.victory = true;
      this.finalizeMetaProgress(true);
      this.phase = 'victory';
      this.input.setEnabled(false);
      sound.setStillpointBlend(0);
      this.callbacks.onPhaseChange('victory', undefined, { ...this.stats });
      this.emitHud();
      return;
    }

    // Otherwise open guaranteed Catalyst Evolution / Boss Draft Chest!
    this.particles.callout(boss.x, boss.y, 'ENCLOSURE SHATTERED!', '#ffd166', 1.4, 1.3);
    this.openUpgradeDraft(true);
  }

  private damagePlayer(rawDmg: number): void {
    const p = this.player;
    if (p.invulnTimer > 0) return;

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
    this.particles.burst(p.x, p.y, '#ff3366', 14, 70, 220, 3.2, 0.42);
    this.particles.ripple(p.x, p.y, 140, 12, '#ff3366', 0.32);

    // Clear immediate nearby bullets on hit for fair recovery window
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 95 * 95) {
        this.enemyBullets.splice(i, 1);
      }
    }

    if (p.hp <= 0) {
      this.handleGameOver();
    }
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
    const runBonus =
      Math.floor(this.stats.elapsed * 0.25) +
      Math.floor(this.stats.parries * 0.45) +
      (isVictory ? 120 : 0);
    const totalPayout = Math.max(10, this.stats.shardsEarned + runBonus);
    this.stats.shardsEarned = totalPayout;

    this.save.shards += totalPayout;
    this.save.totalRuns += 1;
    this.save.totalParries += this.stats.parries;
    this.save.bossesCleared += this.stats.bossesDefeated;
    if (this.stats.elapsed > this.save.bestTimeSec) {
      this.save.bestTimeSec = Math.floor(this.stats.elapsed);
    }
    if (this.stats.score > this.save.bestScore) {
      this.save.bestScore = this.stats.score;
    }
    persistMetaSave(this.save);
  }

  private spawnXp = (x: number, y: number, value: number): void => {
    if (this.pickups.length > 160) {
      // Merge into an existing nearby gem to keep frame rate silky
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
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      lasers: this.lasers,
      enclosure: this.enclosure,
      particles: this.particles,
      elapsed: this.stats.elapsed,
      endlessMode: this.stats.endlessMode,
      nextId: () => this.nextEntityId++
    };
  }

  private makeWeaponCtx(
    justEnteredStillpoint: boolean,
    justExitedStillpoint: boolean
  ): WeaponWorldContext {
    return {
      player: this.player,
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      hazards: this.hazards,
      lasers: this.lasers,
      particles: this.particles,
      nextId: () => this.nextEntityId++,
      damageEnemy: this.damageEnemy,
      spawnXp: this.spawnXp,
      time: this.realTime,
      justEnteredStillpoint,
      justExitedStillpoint
    };
  }

  private emitHud(): void {
    const boss = this.enclosure.bossId
      ? this.enemies.find((e) => e.id === this.enclosure.bossId) ?? null
      : null;
    const bossWarning =
      this.enclosure.warningTimer > 0
        ? `⚠ CONTAINMENT LOCK · ${BOSS_SCHEDULE[this.enclosure.bossIndex % BOSS_SCHEDULE.length].name}`
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
      parryReady: this.player.parryCooldown <= 0 && this.player.kineticCharge >= 18,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      score: this.stats.score,
      kills: this.stats.kills,
      parries: this.stats.parries,
      grazeCombo: this.player.grazeCombo,
      weapons: this.player.weapons,
      passives: this.player.passives,
      boss: boss
        ? {
            name: boss.bossName ?? 'ANOMALY',
            title: boss.bossTitle ?? '',
            hp: Math.max(0, Math.ceil(boss.hp)),
            maxHp: Math.ceil(boss.maxHp),
            phase: boss.phase
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
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      playerBullets: this.playerBullets,
      hazards: this.hazards,
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
      elapsed: this.stats.elapsed,
      showTutorialHint: !this.hasUsedStillpoint && this.tutorialTimer > 0,
      reduceFlash: this.save.settings.reduceFlash,
      menuMode: this.phase === 'menu'
    });
  }
}
