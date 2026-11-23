// Procedural WebAudio Synthesizer for STILLPOINT
// Zero external asset files, reactive low-pass time-dilation filter, iOS WKWebView safe.

const PENTATONIC_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const BASS_NOTES = [55.0, 55.0, 65.41, 73.42, 55.0, 55.0, 82.41, 73.42]; // A1 cyber-minor
const ARP_NOTES = [220.0, 261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private musicEnabled = true;
  private sfxEnabled = true;
  private unlocked = false;
  private seqTimer: number | null = null;
  private seqStep = 0;
  private inGame = false;
  private inBoss = false;
  private stillpointBlend = 0;
  private lastShootAt = 0;
  private lastXpAt = 0;
  private xpStreak = 0;
  private lastGrazeAt = 0;

  setSettings(music: boolean, sfx: boolean): void {
    this.musicEnabled = music;
    this.sfxEnabled = sfx;
    this.syncGains();
  }

  unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 6400;
      this.musicFilter.Q.value = 1.4;

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.22 : 0;
      this.musicGain.connect(this.musicFilter);
      this.musicFilter.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.55 : 0;
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.startSequencer();
    }
    this.syncGains();
  }

  setGameState(inGame: boolean, inBoss: boolean): void {
    this.inGame = inGame;
    this.inBoss = inBoss;
  }

  setStillpointBlend(blend: number): void {
    this.stillpointBlend = Math.max(0, Math.min(1, blend));
    if (!this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    // Smooth dramatic underwater low-pass sweep during Stillpoint slow-mo!
    const targetFreq = 6800 * Math.pow(0.052, this.stillpointBlend); // ~6800Hz -> ~350Hz
    const targetQ = 1.2 + this.stillpointBlend * 2.8;
    this.musicFilter.frequency.setTargetAtTime(targetFreq, now, 0.045);
    this.musicFilter.Q.setTargetAtTime(targetQ, now, 0.045);
  }

  private syncGains(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.22 : 0, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.56 : 0, now, 0.03);
  }

  private startSequencer(): void {
    if (this.seqTimer !== null) return;
    // 16th-note pulse at ~122 BPM (~123ms per step)
    this.seqTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !this.musicEnabled || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const step = this.seqStep++ % 16;

      // Subtle sub-bass pulse on beats
      if (step % 2 === 0) {
        const bassIdx = Math.floor(step / 2) % BASS_NOTES.length;
        const freq = BASS_NOTES[bassIdx] * (this.inBoss ? 1.122 : 1);
        this.playMusicTone(freq, 'sawtooth', 0.14, this.inGame ? 0.24 : 0.12, now);
      }

      // Shimmering cyber arpeggio during active runs
      if (this.inGame && (step % 2 === 1 || this.inBoss)) {
        const arpFreq = ARP_NOTES[step % ARP_NOTES.length] * (this.inBoss ? 1.5 : 1);
        this.playMusicTone(arpFreq, 'triangle', 0.11, this.inBoss ? 0.14 : 0.09, now);
      }

      // Soft hi-hat tick on off-beats when in normal time
      if (this.inGame && step % 4 === 2 && this.stillpointBlend < 0.5) {
        this.playNoiseTick(0.03, 0.045, now, true);
      }
    }, 125);
  }

  private playMusicTone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    startTime: number
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  private playNoiseTick(dur: number, vol: number, startTime: number, toMusic = false): void {
    if (!this.ctx) return;
    const dest = toMusic ? this.musicGain : this.sfxGain;
    if (!dest) return;
    const bufSize = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3400;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(startTime);
  }

  playStillpointEnter(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    // Deep velvety sub-drop
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.24);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Shimmer overtone
    const hi = this.ctx.createOscillator();
    const hg = this.ctx.createGain();
    hi.type = 'triangle';
    hi.frequency.setValueAtTime(880, now);
    hi.frequency.exponentialRampToValueAtTime(523.25, now + 0.18);
    hg.gain.setValueAtTime(0.14, now);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    hi.connect(hg);
    hg.connect(this.sfxGain);
    hi.start(now);
    hi.stop(now + 0.22);
  }

  playStillpointExit(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.11);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playParry(count: number, hasBonus: boolean): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const baseIdx = Math.min(PENTATONIC_HZ.length - 3, 2 + Math.min(5, Math.floor(count / 2)));
    const chord = hasBonus
      ? [PENTATONIC_HZ[baseIdx], PENTATONIC_HZ[baseIdx + 1], PENTATONIC_HZ[baseIdx + 2] * 1.5]
      : [PENTATONIC_HZ[baseIdx], PENTATONIC_HZ[baseIdx + 2]];

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + idx * 0.02 + 0.22);
      g.gain.setValueAtTime(0.28 / chord.length + 0.08, now + idx * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.3);
    });

    this.playNoiseTick(0.09, hasBonus ? 0.22 : 0.12, now, false);
  }

  playGraze(combo: number): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t = performance.now();
    if (t - this.lastGrazeAt < 42) return;
    this.lastGrazeAt = t;

    const now = this.ctx.currentTime;
    const freq = PENTATONIC_HZ[Math.min(PENTATONIC_HZ.length - 1, combo % PENTATONIC_HZ.length)] * 2;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.055);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playShoot(style: 'pulse' | 'rail' | 'zap' | 'mortar' | 'dagger'): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t = performance.now();
    if (style === 'pulse' && t - this.lastShootAt < 75) return;
    this.lastShootAt = t;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    if (style === 'rail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else if (style === 'zap') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.07);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    } else if (style === 'mortar') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.14);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (style === 'dagger') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520 + Math.random() * 80, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    }

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playXp(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t = performance.now();
    if (t - this.lastXpAt < 50) return;
    if (t - this.lastXpAt > 650) this.xpStreak = 0;
    this.lastXpAt = t;

    const now = this.ctx.currentTime;
    const freq = PENTATONIC_HZ[this.xpStreak % PENTATONIC_HZ.length] * 1.5;
    this.xpStreak++;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playLevelUp(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [392.0, 523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.22, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.3);
    });
  }

  playBossWarn(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const st = now + i * 0.38;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, st);
      osc.frequency.linearRampToValueAtTime(115, st + 0.26);
      g.gain.setValueAtTime(0.2, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.3);
    }
  }

  playBossDefeat(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    // Deep boom + rising crystal fanfare
    const boom = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(130, now);
    boom.frequency.exponentialRampToValueAtTime(34, now + 0.55);
    bg.gain.setValueAtTime(0.5, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    boom.connect(bg);
    bg.connect(this.sfxGain);
    boom.start(now);
    boom.stop(now + 0.62);

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + 0.12 + i * 0.08;
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.24, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.48);
    });
  }

  playPlayerHit(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
    this.playNoiseTick(0.14, 0.25, now, false);
  }
}

export const sound = new SoundEngine();
