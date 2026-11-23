export type SpriteKey =
  | 'bullet_coral'
  | 'bullet_amber'
  | 'bullet_crimson'
  | 'bullet_parry'
  | 'bullet_cyan'
  | 'bullet_shard'
  | 'bullet_prism'
  | 'bullet_violet'
  | 'xp_small'
  | 'xp_mid'
  | 'xp_large'
  | 'pickup_heal'
  | 'pickup_shard'
  | 'pickup_magnet'
  | 'glow_cyan'
  | 'glow_magenta'
  | 'glow_coral'
  | 'glow_gold'
  | 'glow_emerald';

class SpriteBank {
  private bank = new Map<SpriteKey, HTMLCanvasElement>();
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Enemy bullets: unmistakable bright white core + vivid neon halo
    this.bank.set('bullet_coral', this.makeOrb(40, '#ff4d6d', '#ff1f4c', '#ffffff'));
    this.bank.set('bullet_amber', this.makeOrb(40, '#ffb703', '#ff6b00', '#fff8d6'));
    this.bank.set('bullet_crimson', this.makeOrb(44, '#ff2e63', '#b8003c', '#ffffff'));
    this.bank.set('bullet_parry', this.makeParryOrb(56));

    // Player bullets: cool bioluminescent cyan/emerald/violet
    this.bank.set('bullet_cyan', this.makeOrb(36, '#22e6ff', '#0077ff', '#e8ffff'));
    this.bank.set('bullet_shard', this.makeDiamond(40, '#4effe8', '#00b4d8', '#ffffff'));
    this.bank.set('bullet_prism', this.makeDiamond(36, '#8cf7ff', '#5e60ce', '#ffffff'));
    this.bank.set('bullet_violet', this.makeOrb(44, '#d96bff', '#7b2cbf', '#fff0ff'));

    // Pickups
    this.bank.set('xp_small', this.makeDiamond(24, '#38f9d7', '#00b4d8', '#eaffff'));
    this.bank.set('xp_mid', this.makeDiamond(30, '#4facfe', '#00f2fe', '#ffffff'));
    this.bank.set('xp_large', this.makeDiamond(38, '#ffd166', '#ff8c42', '#ffffff'));
    this.bank.set('pickup_heal', this.makePlus(38, '#4effb4', '#00b87c'));
    this.bank.set('pickup_shard', this.makeDiamond(38, '#f15bb5', '#9b5de5', '#ffffff'));
    this.bank.set('pickup_magnet', this.makeRingOrb(38, '#38e8ff', '#0077ff'));

    // Soft ambient radial glows (used with additive blending)
    this.bank.set('glow_cyan', this.makeGlow(128, 'rgba(34,230,255,0.7)', 'rgba(0,119,255,0)'));
    this.bank.set('glow_magenta', this.makeGlow(128, 'rgba(255,68,230,0.75)', 'rgba(155,30,255,0)'));
    this.bank.set('glow_coral', this.makeGlow(128, 'rgba(255,58,95,0.68)', 'rgba(255,0,50,0)'));
    this.bank.set('glow_gold', this.makeGlow(128, 'rgba(255,209,102,0.72)', 'rgba(255,120,0,0)'));
    this.bank.set('glow_emerald', this.makeGlow(128, 'rgba(78,255,180,0.68)', 'rgba(0,180,120,0)'));
  }

  get(key: SpriteKey): HTMLCanvasElement {
    if (!this.initialized) this.init();
    return this.bank.get(key)!;
  }

  private createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    return [c, ctx];
  }

  private makeGlow(size: number, inner: string, outer: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, inner.replace(/0\.\d+\)/, '0.22)'));
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  private makeOrb(size: number, mid: string, outer: string, core: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, core);
    g.addColorStop(0.28, core);
    g.addColorStop(0.48, mid);
    g.addColorStop(0.72, outer + '88');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private makeParryOrb(size: number): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.26, '#ffd6ff');
    g.addColorStop(0.5, '#ff3df0');
    g.addColorStop(0.78, 'rgba(190, 30, 255, 0.35)');
    g.addColorStop(1, 'rgba(190, 30, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    // Crisp outer magenta-white parry halo ring
    ctx.strokeStyle = '#ff9ef8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  }

  private makeDiamond(size: number, mid: string, outer: string, core: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, mid + 'cc');
    g.addColorStop(0.5, outer + '55');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(half, half);
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.62);
    ctx.lineTo(half * 0.44, 0);
    ctx.lineTo(0, half * 0.62);
    ctx.lineTo(-half * 0.44, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.34);
    ctx.lineTo(half * 0.22, 0);
    ctx.lineTo(0, half * 0.34);
    ctx.lineTo(-half * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return c;
  }

  private makePlus(size: number, color: string, outer: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, color + 'aa');
    g.addColorStop(0.6, outer + '44');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#ffffff';
    const arm = size * 0.36;
    const thick = size * 0.14;
    ctx.fillRect(half - thick / 2, half - arm / 2, thick, arm);
    ctx.fillRect(half - arm / 2, half - thick / 2, arm, thick);
    return c;
  }

  private makeRingOrb(size: number, color: string, outer: string): HTMLCanvasElement {
    const [c, ctx] = this.createCanvas(size);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 2, half, half, half);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color + 'aa');
    g.addColorStop(1, outer + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  }
}

export const sprites = new SpriteBank();
