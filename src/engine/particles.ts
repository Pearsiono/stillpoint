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
  shape: 'dot' | 'spark' | 'ring' | 'shard' | 'fire' | 'smoke' | 'flash';
  rot?: number;
  vrot?: number;
  grow?: number;
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

const MAX_PARTICLES = 540;
const MAX_TEXTS = 36;

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

  shatter(x: number, y: number, color: string, count = 7, scale = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const spd = (65 + Math.random() * 140) * scale;
      const life = 0.38 + Math.random() * 0.28;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: (4.5 + Math.random() * 4.5) * scale,
        color,
        alpha: 1,
        life,
        maxLife: life,
        drag: 0.91,
        shape: 'shard',
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14
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

  /** Chunky Metal-Slug layered fireball + drifting soot smoke + bright flashburst + hot sparks! */
  explode(x: number, y: number, scale = 1, accent = '#ff8a34'): void {
    const pushP = (p: Particle) => {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push(p);
    };

    // 1. Expanding dark soot clouds behind fireball
    const smokeCount = Math.min(6, Math.max(2, Math.round(3 * scale)));
    for (let i = 0; i < smokeCount; i++) {
      const ang = (i / smokeCount) * Math.PI * 2 + Math.random() * 0.9;
      const spd = (24 + Math.random() * 54) * scale;
      const life = 0.44 + Math.random() * 0.24;
      pushP({
        x: x + Math.cos(ang) * 4 * scale,
        y: y + Math.sin(ang) * 4 * scale,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: (7.5 + Math.random() * 5.5) * scale,
        color: '#2b2826',
        alpha: 0.85,
        life,
        maxLife: life,
        drag: 0.91,
        shape: 'smoke',
        grow: 16 * scale
      });
    }

    // 2. Layered incandescent fireball puffs (white-gold -> amber -> ember with bold comic ink rim)
    const fireCount = Math.min(8, Math.max(3, Math.round(4.5 * scale)));
    for (let i = 0; i < fireCount; i++) {
      const ang = (i / fireCount) * Math.PI * 2 + Math.random() * 0.7;
      const spd = (28 + Math.random() * 82) * scale;
      const life = 0.24 + Math.random() * 0.14;
      pushP({
        x: x + (Math.random() - 0.5) * 6 * scale,
        y: y + (Math.random() - 0.5) * 6 * scale,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: (6.5 + Math.random() * 5.5) * scale,
        color: accent,
        alpha: 1,
        life,
        maxLife: life,
        drag: 0.89,
        shape: 'fire',
        grow: 18 * scale
      });
    }

    // 3. Incandescent starburst detonation flash at core
    pushP({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 15 * scale,
      color: accent,
      alpha: 1,
      life: 0.13,
      maxLife: 0.13,
      drag: 1,
      shape: 'flash',
      rot: Math.random() * Math.PI,
      grow: 38 * scale
    });

    // 4. High-velocity molten sparks
    const sparkCount = Math.min(10, Math.max(4, Math.round(5 * scale)));
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (95 + Math.random() * 175) * scale;
      const life = 0.22 + Math.random() * 0.16;
      pushP({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: (2.2 + Math.random() * 1.6) * Math.min(1.5, scale),
        color: i % 2 === 0 ? '#fff2be' : accent,
        alpha: 1,
        life,
        maxLife: life,
        drag: 0.91,
        shape: 'spark'
      });
    }
  }

  smokePuff(x: number, y: number, vx = 0, vy = 0, size = 4.6, life = 0.34, color = '#4c4844'): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 0.72,
      life,
      maxLife: life,
      drag: 0.9,
      shape: 'smoke',
      grow: 11
    });
  }

  ripple(
    x: number,
    y: number,
    maxRadius: number,
    strength: number,
    color: string,
    duration = 0.55
  ): void {
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

  callout(x: number, y: number, text: string, color: string, scale = 1, life = 0.8): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x,
      y,
      vy: -44,
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
    if (this.arcs.length > 40) this.arcs.shift();
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
        p.size += 185 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const damp = Math.pow(p.drag, dt * 60);
        p.vx *= damp;
        p.vy *= damp;
        if (p.grow) {
          p.size += p.grow * dt;
        }
        if (p.rot !== undefined && p.vrot !== undefined) {
          p.rot += p.vrot * dt;
        }
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
