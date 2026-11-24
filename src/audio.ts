import { SectorId } from './types';

// Multi-instrument Procedural Synth Soundtrack & SFX Engine for STILLPOINT
// 4 bespoke per-sector synth themes (Ash Flats, Sunken Metro, Slag Foundry, The Monolith),
// punchy drum synth, tempo-synced feedback delay, reactive Stillpoint low-pass sweep, instant mute.

const PENTATONIC_HZ = [293.66, 329.63, 349.23, 440.0, 523.25, 587.33, 659.25, 698.46, 880.0, 1046.5];

interface SectorTheme {
  bpm: number;
  delayGain: number;
  bassCutoff: number;
  kickSteps: number[];
  snareSteps: number[];
  bassPattern: number[];
  chords: Array<{ root: number; pad: number[]; arp: number[] }>;
  lead: number[];
  bossLead: number[];
}

const SECTOR_THEMES: Record<SectorId, SectorTheme> = {
  // 01 Ash Flats: D minor relic wasteland pulse (128 BPM)
  drift: {
    bpm: 128,
    delayGain: 0.28,
    bassCutoff: 860,
    kickSteps: [0, 4, 8, 12],
    snareSteps: [4, 12],
    bassPattern: [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 2, 0, 2],
    chords: [
      { root: 73.42, pad: [293.66, 349.23, 440.0, 523.25], arp: [587.33, 523.25, 440.0, 349.23] },
      { root: 58.27, pad: [233.08, 293.66, 349.23, 440.0], arp: [587.33, 440.0, 349.23, 293.66] },
      { root: 49.0,  pad: [196.0, 233.08, 293.66, 349.23], arp: [466.16, 392.0, 349.23, 293.66] },
      { root: 55.0,  pad: [220.0, 277.18, 329.63, 440.0], arp: [554.37, 440.0, 329.63, 277.18] }
    ],
    lead: [
      587.33, 0, 0, 523.25, 0, 440.0, 0, 0, 523.25, 0, 587.33, 0, 659.25, 0, 587.33, 0,
      698.46, 0, 0, 587.33, 0, 440.0, 0, 0, 466.16, 0, 587.33, 0, 523.25, 0, 440.0, 0,
      392.0,  0, 0, 466.16, 0, 587.33, 0, 0, 698.46, 0, 659.25, 0, 587.33, 0, 466.16, 0,
      440.0,  0, 554.37, 0, 659.25, 0, 554.37, 0, 880.0, 0, 0, 659.25, 587.33, 0, 554.37, 0
    ],
    bossLead: [
      587.33, 0, 587.33, 659.25, 698.46, 0, 659.25, 587.33, 880.0, 0, 698.46, 0, 659.25, 587.33, 523.25, 0,
      466.16, 0, 587.33, 0, 698.46, 0, 880.0, 698.46, 587.33, 0, 659.25, 587.33, 523.25, 0, 440.0, 0,
      392.0,  466.16, 587.33, 0, 783.99, 0, 698.46, 587.33, 698.46, 0, 659.25, 587.33, 466.16, 0, 587.33, 0,
      554.37, 0, 659.25, 0, 880.0, 0, 1108.73, 0, 880.0, 659.25, 554.37, 659.25, 880.0, 0, 659.25, 0
    ]
  },

  // 02 Sunken Metro: C minor cavernous subterranean dub groove (122 BPM)
  helix: {
    bpm: 122,
    delayGain: 0.36,
    bassCutoff: 680,
    kickSteps: [0, 3, 8, 11],
    snareSteps: [4, 12],
    bassPattern: [1, 0, 0, 2, 0, 1, 0, 2, 1, 0, 2, 0, 0, 1, 2, 0],
    chords: [
      { root: 65.41, pad: [261.63, 311.13, 392.0, 466.16], arp: [523.25, 466.16, 392.0, 311.13] }, // Cm7
      { root: 51.91, pad: [207.65, 261.63, 311.13, 392.0], arp: [523.25, 392.0, 311.13, 261.63] }, // Abmaj7
      { root: 43.65, pad: [174.61, 207.65, 261.63, 311.13], arp: [466.16, 349.23, 311.13, 261.63] }, // Fm7
      { root: 49.0,  pad: [196.0, 246.94, 293.66, 392.0], arp: [493.88, 392.0, 293.66, 246.94] }  // G7
    ],
    lead: [
      523.25, 0, 0, 0, 466.16, 0, 392.0, 0, 0, 311.13, 392.0, 0, 466.16, 0, 392.0, 0,
      622.25, 0, 0, 523.25, 0, 392.0, 0, 0, 311.13, 0, 392.0, 0, 523.25, 0, 466.16, 0,
      349.23, 0, 415.3, 0, 523.25, 0, 0, 466.16, 0, 392.0, 0, 349.23, 311.13, 0, 261.63, 0,
      392.0, 0, 493.88, 0, 587.33, 0, 493.88, 0, 783.99, 0, 0, 587.33, 493.88, 0, 392.0, 0
    ],
    bossLead: [
      523.25, 0, 523.25, 622.25, 587.33, 0, 523.25, 466.16, 783.99, 0, 622.25, 0, 587.33, 523.25, 466.16, 0,
      415.3, 0, 523.25, 0, 622.25, 0, 783.99, 622.25, 523.25, 0, 587.33, 523.25, 466.16, 0, 392.0, 0,
      349.23, 415.3, 523.25, 0, 698.46, 0, 622.25, 523.25, 622.25, 0, 587.33, 523.25, 415.3, 0, 523.25, 0,
      493.88, 0, 587.33, 0, 783.99, 0, 987.77, 0, 783.99, 587.33, 493.88, 587.33, 783.99, 0, 587.33, 0
    ]
  },

  // 03 Slag Foundry: E Phrygian aggressive industrial metal-synth (136 BPM)
  furnace: {
    bpm: 136,
    delayGain: 0.22,
    bassCutoff: 1180,
    kickSteps: [0, 2, 6, 8, 10, 14],
    snareSteps: [4, 12],
    bassPattern: [1, 1, 2, 0, 1, 0, 2, 1, 1, 1, 2, 0, 1, 2, 1, 2],
    chords: [
      { root: 82.41, pad: [329.63, 392.0, 493.88, 587.33], arp: [659.25, 493.88, 392.0, 329.63] }, // Em
      { root: 87.31, pad: [349.23, 440.0, 523.25, 659.25], arp: [698.46, 523.25, 440.0, 349.23] }, // Fmaj7
      { root: 73.42, pad: [293.66, 349.23, 440.0, 523.25], arp: [587.33, 440.0, 349.23, 293.66] }, // Dm
      { root: 61.74, pad: [246.94, 311.13, 369.99, 493.88], arp: [622.25, 493.88, 369.99, 311.13] }  // B7
    ],
    lead: [
      659.25, 0, 698.46, 0, 659.25, 493.88, 0, 0, 587.33, 0, 659.25, 0, 783.99, 0, 659.25, 0,
      698.46, 0, 659.25, 0, 523.25, 0, 440.0, 0, 523.25, 0, 659.25, 0, 698.46, 0, 659.25, 0,
      587.33, 0, 523.25, 0, 440.0, 0, 587.33, 0, 659.25, 0, 587.33, 0, 523.25, 0, 440.0, 0,
      493.88, 0, 622.25, 0, 739.99, 0, 622.25, 0, 987.77, 0, 739.99, 0, 659.25, 0, 622.25, 0
    ],
    bossLead: [
      659.25, 698.46, 659.25, 0, 783.99, 0, 698.46, 659.25, 987.77, 0, 783.99, 0, 698.46, 659.25, 587.33, 0,
      698.46, 0, 783.99, 0, 880.0, 0, 783.99, 698.46, 659.25, 0, 698.46, 659.25, 587.33, 0, 523.25, 0,
      587.33, 659.25, 698.46, 0, 880.0, 0, 783.99, 698.46, 783.99, 0, 698.46, 659.25, 587.33, 0, 659.25, 0,
      622.25, 0, 739.99, 0, 987.77, 0, 1244.51, 0, 987.77, 739.99, 622.25, 739.99, 987.77, 0, 739.99, 0
    ]
  },

  // 04 The Monolith: F# minor crystalline cathedral tension (132 BPM)
  singularity: {
    bpm: 132,
    delayGain: 0.34,
    bassCutoff: 980,
    kickSteps: [0, 4, 8, 12, 15],
    snareSteps: [4, 12],
    bassPattern: [1, 0, 2, 1, 0, 2, 1, 0, 1, 0, 2, 1, 2, 0, 1, 2],
    chords: [
      { root: 92.5,  pad: [369.99, 440.0, 554.37, 659.25], arp: [739.99, 659.25, 554.37, 440.0] }, // F#m7
      { root: 73.42, pad: [293.66, 369.99, 440.0, 554.37], arp: [739.99, 554.37, 440.0, 369.99] }, // Dmaj7
      { root: 61.74, pad: [246.94, 293.66, 369.99, 440.0], arp: [587.33, 493.88, 440.0, 369.99] }, // Bm7
      { root: 69.3,  pad: [277.18, 349.23, 415.3, 554.37], arp: [698.46, 554.37, 415.3, 349.23] }  // C#7
    ],
    lead: [
      739.99, 0, 0, 659.25, 0, 554.37, 0, 0, 659.25, 0, 739.99, 0, 880.0, 0, 739.99, 0,
      880.0, 0, 0, 739.99, 0, 554.37, 0, 0, 587.33, 0, 739.99, 0, 659.25, 0, 554.37, 0,
      493.88, 0, 0, 587.33, 0, 739.99, 0, 0, 880.0, 0, 830.61, 0, 739.99, 0, 587.33, 0,
      554.37, 0, 698.46, 0, 830.61, 0, 698.46, 0, 1108.73, 0, 0, 830.61, 739.99, 0, 698.46, 0
    ],
    bossLead: [
      739.99, 0, 739.99, 830.61, 880.0, 0, 830.61, 739.99, 1108.73, 0, 880.0, 0, 830.61, 739.99, 659.25, 0,
      587.33, 0, 739.99, 0, 880.0, 0, 1108.73, 880.0, 739.99, 0, 830.61, 739.99, 659.25, 0, 554.37, 0,
      493.88, 587.33, 739.99, 0, 987.77, 0, 880.0, 739.99, 880.0, 0, 830.61, 739.99, 587.33, 0, 739.99, 0,
      698.46, 0, 830.61, 0, 1108.73, 0, 1396.91, 0, 1108.73, 830.61, 698.46, 830.61, 1108.73, 0, 830.61, 0
    ]
  }
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicEnabled = true;
  private sfxEnabled = true;
  private unlocked = false;
  private seqTimer: number | null = null;
  private nextStepTime = 0;
  private seqStep = 0;
  private phraseCount = 0;
  private inGame = false;
  private inBoss = false;
  private sectorId: SectorId = 'drift';
  private stillpointBlend = 0;
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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.78;
      this.masterGain.connect(this.ctx.destination);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 7400;
      this.musicFilter.Q.value = 1.2;

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.3 : 0;
      this.musicGain.connect(this.musicFilter);
      this.musicFilter.connect(this.masterGain);

      // Subtle atmospheric stereo/tempo echo for pluck & lead synth
      this.delayNode = this.ctx.createDelay(0.5);
      this.delayNode.delayTime.value = 0.234; // dotted-8th at ~128 BPM
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = 0.28;
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.musicGain);
      this.delayGain.connect(this.delayNode);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.56 : 0;
      this.sfxGain.connect(this.masterGain);

      // Pre-allocate a single reusable white-noise buffer to avoid per-hit GC churn on iOS
      const noiseLen = Math.max(1, Math.floor(this.ctx.sampleRate * 0.2));
      const nb = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
      const data = nb.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = nb;
    }

    // Resume from both 'suspended' and iOS WebKit's 'interrupted' state
    if ((this.ctx.state as string) !== 'running' && this.ctx.state !== 'closed') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.setSector(this.sectorId);
      this.startSequencer();
    }
    this.syncGains();
  }

  setSuspended(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) {
      if (this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    } else if (
      this.unlocked &&
      (this.ctx.state as string) !== 'running' &&
      this.ctx.state !== 'closed'
    ) {
      this.nextStepTime = 0;
      this.ctx.resume().catch(() => {});
    }
  }

  setGameState(inGame: boolean, inBoss: boolean): void {
    this.inGame = inGame;
    this.inBoss = inBoss;
  }

  setSector(sectorId: SectorId): void {
    this.sectorId = sectorId;
    if (!this.ctx || !this.delayNode || !this.delayGain) return;
    const theme = SECTOR_THEMES[sectorId] ?? SECTOR_THEMES.drift;
    const now = this.ctx.currentTime;
    const dottedEighth = (60 / theme.bpm) * 0.75;
    this.delayNode.delayTime.setTargetAtTime(Math.min(0.45, dottedEighth), now, 0.08);
    this.delayGain.gain.setTargetAtTime(theme.delayGain, now, 0.08);
  }

  setStillpointBlend(blend: number): void {
    this.stillpointBlend = Math.max(0, Math.min(1, blend));
    if (!this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const targetFreq = 7400 * Math.pow(0.048, this.stillpointBlend);
    const targetQ = 1.2 + this.stillpointBlend * 2.6;
    this.musicFilter.frequency.setTargetAtTime(targetFreq, now, 0.045);
    this.musicFilter.Q.setTargetAtTime(targetQ, now, 0.045);
  }

  private syncGains(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.3 : 0.0, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.56 : 0.0, now, 0.03);
  }

  private startSequencer(): void {
    if (this.seqTimer !== null) return;
    const lookahead = 0.12;
    this.seqTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !this.musicEnabled || !this.musicGain) {
        this.nextStepTime = 0;
        return;
      }

      const theme = SECTOR_THEMES[this.sectorId] ?? SECTOR_THEMES.drift;
      const stepDur = 60 / theme.bpm / 4;
      const ct = this.ctx.currentTime;
      if (this.nextStepTime < ct - 0.15 || this.nextStepTime > ct + 1.0) {
        this.nextStepTime = ct + 0.03;
      }

      while (this.nextStepTime < ct + lookahead) {
        this.scheduleMusicStep(this.nextStepTime, theme);
        this.nextStepTime += stepDur;
      }
    }, 25);
  }

  private scheduleMusicStep(now: number, theme: SectorTheme): void {
    const step = this.seqStep % 64;
    const bar = Math.floor(step / 16);
    const sub = step % 16;
    const chord = theme.chords[bar];

    if (step === 0) this.phraseCount++;

    // 1. Warm Cinematic Pad Chord on beat 1 of each bar
    if (sub === 0) {
      const barDur = (60 / theme.bpm) * 4 * 0.96;
      chord.pad.forEach((hz, idx) => {
        this.playPadVoice(hz, barDur, this.inGame ? 0.042 : 0.052, now, idx % 2 === 0 ? -4 : 4);
      });
    }

    // 2. Driving Percussion (sector-specific groove; boss adds energetic fills)
    if (this.inGame) {
      if (theme.kickSteps.includes(sub) || (this.inBoss && sub === 14)) {
        this.playKick(now, this.inBoss ? 0.36 : 0.28);
      }
      if (theme.snareSteps.includes(sub)) {
        this.playSnare(now, this.inBoss ? 0.16 : 0.11);
      }
      if (this.stillpointBlend < 0.55 && (sub % 2 === 0 || this.inBoss)) {
        const accent = sub % 4 === 2 ? 0.055 : 0.026;
        this.playNoiseTick(0.025, accent, now, true);
      }
    } else {
      if (sub === 0 || sub === 10) {
        this.playKick(now, 0.12);
      }
    }

    // 3. Rolling Octave Sub-Bass Line
    const bassPattern = this.inGame
      ? theme.bassPattern
      : [1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    const bVal = bassPattern[sub];
    if (bVal > 0) {
      const freq = chord.root * (bVal === 2 ? 2 : 1);
      this.playBassVoice(freq, 0.14, this.inGame ? 0.17 : 0.09, now, theme.bassCutoff);
    }

    // 4. Shimmering Pluck Arpeggio (routed through tempo-synced delay)
    if (sub % 2 === 1 || (this.inBoss && sub % 2 === 0)) {
      const arpHz = chord.arp[sub % chord.arp.length];
      this.playPluckVoice(arpHz, 0.13, this.inGame ? 0.065 : 0.045, now, true);
    }

    // 5. Expressive Melodic Lead
    if (this.inGame || this.phraseCount % 2 === 1) {
      const motif = this.inBoss ? theme.bossLead : theme.lead;
      const leadHz = motif[step];
      if (leadHz > 0) {
        this.playLeadVoice(leadHz, 0.24, this.inBoss ? 0.11 : 0.085, now);
      }
    }

    this.seqStep++;
  }

  private playPadVoice(
    freq: number,
    dur: number,
    vol: number,
    startTime: number,
    detuneCents: number
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.5, startTime);
    osc.detune.setValueAtTime(detuneCents, startTime);

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(900, startTime);
    flt.frequency.linearRampToValueAtTime(1400, startTime + dur * 0.5);
    flt.frequency.linearRampToValueAtTime(750, startTime + dur);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.24);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.04);
  }

  private playBassVoice(
    freq: number,
    dur: number,
    vol: number,
    startTime: number,
    cutoff = 860
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(cutoff, startTime);
    flt.frequency.exponentialRampToValueAtTime(Math.max(180, cutoff * 0.25), startTime + dur);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  private playPluckVoice(
    freq: number,
    dur: number,
    vol: number,
    startTime: number,
    sendDelay = false
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(g);
    g.connect(this.musicGain);
    if (sendDelay && this.delayNode) g.connect(this.delayNode);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  private playLeadVoice(freq: number, dur: number, vol: number, startTime: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(3200, startTime);
    flt.frequency.exponentialRampToValueAtTime(950, startTime + dur);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);
    if (this.delayNode) g.connect(this.delayNode);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.03);
  }

  private playKick(startTime: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.11);
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.14);
  }

  private playSnare(startTime: number, vol: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const dur = 0.095;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 1850;
    flt.Q.value = 0.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    src.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);
    src.start(startTime);
    src.stop(startTime + dur + 0.01);
  }

  private playNoiseTick(dur: number, vol: number, startTime: number, toMusic = false): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const dest = toMusic ? this.musicGain : this.sfxGain;
    if (!dest) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4800;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(startTime);
    src.stop(startTime + dur + 0.01);
  }

  // ---------- SFX ----------
  playStillpointEnter(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.24);
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    const hi = this.ctx.createOscillator();
    const hg = this.ctx.createGain();
    hi.type = 'triangle';
    hi.frequency.setValueAtTime(880, now);
    hi.frequency.exponentialRampToValueAtTime(587.33, now + 0.18);
    hg.gain.setValueAtTime(0.13, now);
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

  playCoreBurst(intensity: number, isHeavy: boolean): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const baseIdx = Math.min(PENTATONIC_HZ.length - 3, 2 + Math.min(5, Math.floor(intensity / 2)));
    const chord = isHeavy
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
    this.playNoiseTick(0.09, isHeavy ? 0.22 : 0.12, now, false);
  }

  playGraze(combo: number): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t = performance.now();
    if (t - this.lastGrazeAt < 42) return;
    this.lastGrazeAt = t;

    const now = this.ctx.currentTime;
    const freq = PENTATONIC_HZ[combo % PENTATONIC_HZ.length] * 1.8;
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

  private lastShootByStyle: Record<string, number> = {};

  playShoot(style: 'pulse' | 'rail' | 'zap' | 'mortar' | 'dagger'): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t = performance.now();
    const minGap = style === 'rail' ? 85 : style === 'pulse' ? 75 : style === 'mortar' ? 70 : style === 'zap' ? 55 : 50;
    if (t - (this.lastShootByStyle[style] ?? 0) < minGap) return;
    this.lastShootByStyle[style] = t;

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
    const freq = PENTATONIC_HZ[this.xpStreak % PENTATONIC_HZ.length] * 1.4;
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
    [440.0, 523.25, 659.25, 880.0].forEach((freq, i) => {
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

    [587.33, 698.46, 880.0, 1174.66].forEach((freq, i) => {
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

  playReactorStall(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    // Heavy industrial stall power-down groan + steam vent hiss
    this.playNoiseTick(0.22, 0.26, now, false);
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.34);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(900, now);
    flt.frequency.exponentialRampToValueAtTime(180, now + 0.34);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(flt);
    flt.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playCrateTick(pitch = 1): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(220 * pitch, now + 0.025);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  playCrateReveal(rarityOrder: number): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const notes =
      rarityOrder >= 4
        ? [293.66, 440, 587.33, 880, 1174.66]
        : rarityOrder >= 3
          ? [293.66, 440, 587.33, 880]
          : rarityOrder >= 2
            ? [293.66, 440, 659.25]
            : [293.66, 440];
    notes.forEach((hz, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = rarityOrder >= 3 ? 'sawtooth' : 'triangle';
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 2800;
      const st = now + idx * 0.065;
      osc.frequency.setValueAtTime(hz, st);
      g.gain.setValueAtTime(0.2, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.45);
      osc.connect(flt);
      flt.connect(g);
      g.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.48);
    });
  }
}

export const sound = new SoundEngine();
