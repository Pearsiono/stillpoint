export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  shape: 'dot' | 'spark' | 'ring';
}

export interface GridRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  color: string;
  age: number;
  duration: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface ArcFlash {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 420;
const MAX_TEXTS = 40;

export class ParticleSystem {
  particles: Particle[] = [];
  ripples: GridRipple[] = [];
  texts: FloatingText[] = [];
  arcs: ArcFlash[] = [];

  clear(): void {
    this.particles.length = 0;
    this.ripples.length = 0;
    this.texts.length = 0;
    this.arcs.length = 0;
  }

  burst(
    x: number,
    y: number,
    color: string,
    count: number,
    speedMin = 40,
    speedMax = 180,
    size = 3,
    life = 0.42
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: size * (0.7 + Math.random() * 0.6),
        color,
        alpha: 1,
        life: life * (0.7 + Math.random() * 0.5),
        maxLife: life,
        drag: 0.92,
        shape: Math.random() < 0.65 ? 'spark' : 'dot'
      });
    }
  }

  ring(x: number, y: number, color: string, size = 18, life = 0.35): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size,
      color,
      alpha: 0.9,
      life,
      maxLife: life,
      drag: 1,
      shape: 'ring'
    });
  }

  ripple(x: number, y: number, maxRadius: number, strength: number, color: string, duration = 0.55): void {
    this.ripples.push({
      x,
      y,
      radius: 12,
      maxRadius,
      strength,
      color,
      age: 0,
      duration
    });
    if (this.ripples.length > 8) this.ripples.shift();
  }

  callout(x: number, y: number, text: string, color: string, scale = 1, life = 0.85): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x,
      y,
      vy: -42,
      text,
      color,
      scale,
      life,
      maxLife: life
    });
  }

  arc(x1: number, y1: number, x2: number, y2: number, color: string, width = 2.2, life = 0.14): void {
    const segs = 5;
    const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jitter = (Math.random() - 0.5) * Math.min(18, len * 0.16);
      pts.push({
        x: x1 + dx * t + nx * jitter,
        y: y1 + dy * t + ny * jitter
      });
    }
    pts.push({ x: x2, y: y2 });
    this.arcs.push({ points: pts, color, width, life, maxLife: life });
    if (this.arcs.length > 36) this.arcs.shift();
  }

  update(dtWorld: number, dtReal: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dt = p.shape === 'ring' ? dtReal : dtWorld * 0.65 + dtReal * 0.35;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.shape === 'ring') {
        p.size += 180 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const damp = Math.pow(p.drag, dt * 60);
        p.vx *= damp;
        p.vy *= damp;
      }
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dtReal;
      if (r.age >= r.duration) {
        this.ripples.splice(i, 1);
        continue;
      }
      const t = r.age / r.duration;
      const eased = 1 - Math.pow(1 - t, 3);
      r.radius = 12 + (r.maxRadius - 12) * eased;
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i];
      f.life -= dtReal;
      if (f.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      f.y += f.vy * dtReal;
      f.vy *= Math.pow(0.92, dtReal * 60);
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.life -= dtReal;
      if (a.life <= 0) {
        this.arcs.splice(i, 1);
      }
    }
  }
}
