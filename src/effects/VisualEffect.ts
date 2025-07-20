import { Vector2D } from '../types';

export interface VisualEffect {
  position: Vector2D;
  isComplete: boolean;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export class NukeEffect implements VisualEffect {
  position: Vector2D;
  isComplete: boolean = false;
  private radius: number = 0;
  private maxRadius: number;
  private duration: number = 1.5; // seconds
  private elapsed: number = 0;
  private opacity: number = 1;

  constructor(position: Vector2D, maxRadius: number) {
    this.position = { ...position };
    this.maxRadius = maxRadius;
  }

  update(deltaTime: number): void {
    this.elapsed += deltaTime;
    const progress = this.elapsed / this.duration;
    
    if (progress >= 1) {
      this.isComplete = true;
      return;
    }

    // Expand radius with easing
    this.radius = this.maxRadius * this.easeOutCubic(progress);
    
    // Fade out
    this.opacity = 1 - progress;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isComplete) return;

    ctx.save();
    
    // Create gradient for fireball effect
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.radius
    );
    
    // Fireball colors
    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
    gradient.addColorStop(0.2, `rgba(255, 255, 0, ${this.opacity * 0.8})`);
    gradient.addColorStop(0.5, `rgba(255, 127, 0, ${this.opacity * 0.6})`);
    gradient.addColorStop(0.8, `rgba(255, 0, 0, ${this.opacity * 0.4})`);
    gradient.addColorStop(1, `rgba(128, 0, 0, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Add shockwave ring
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

export class ExplosionEffect implements VisualEffect {
  position: Vector2D;
  isComplete: boolean = false;
  private particles: Particle[] = [];
  private duration: number = 1.0; // seconds
  private elapsed: number = 0;

  constructor(position: Vector2D, color: string = '#FF00FF') {
    this.position = { ...position };
    
    // Create explosion particles
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: color,
        opacity: 1
      });
    }
  }

  update(deltaTime: number): void {
    this.elapsed += deltaTime;
    
    if (this.elapsed >= this.duration) {
      this.isComplete = true;
      return;
    }

    const progress = this.elapsed / this.duration;
    
    this.particles.forEach(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.opacity = 1 - progress;
      particle.size *= 0.98; // Shrink particles
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isComplete) return;

    ctx.save();
    
    this.particles.forEach(particle => {
      ctx.fillStyle = `rgba(255, ${Math.floor(255 * particle.opacity)}, ${Math.floor(255 * particle.opacity)}, ${particle.opacity})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}