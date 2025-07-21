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
    
    // Draw multiple layers for fireball effect without gradients
    const layers = [
      { scale: 1.0, color: `rgba(128, 0, 0, ${this.opacity * 0.2})` },
      { scale: 0.8, color: `rgba(255, 0, 0, ${this.opacity * 0.3})` },
      { scale: 0.6, color: `rgba(255, 127, 0, ${this.opacity * 0.4})` },
      { scale: 0.4, color: `rgba(255, 255, 0, ${this.opacity * 0.6})` },
      { scale: 0.2, color: `rgba(255, 255, 255, ${this.opacity * 0.8})` }
    ];
    
    // Draw layers from outside to inside
    layers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = layer.color;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius * layer.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Reset shadow for shockwave
    ctx.shadowBlur = 0;
    
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
  duration: number = 1.0; // seconds - made public for customization
  private elapsed: number = 0;
  private baseColor: string;

  constructor(position: Vector2D, color: string = '#FF00FF') {
    this.position = { ...position };
    this.baseColor = color;
    
    // Create explosion particles with more variety
    const particleCount = 30; // More particles for dramatic effect
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2; // Random angles for more natural explosion
      const speed = 50 + Math.random() * 250; // Varied speeds
      const size = 2 + Math.random() * 6; // Varied sizes
      
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: color,
        opacity: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10
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
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Add gravity effect
      particle.vy += 200 * deltaTime; // Gravity
      
      // Update opacity with easing
      particle.opacity = Math.pow(1 - progress, 2);
      
      // Shrink particles more dramatically
      particle.size *= 0.95;
      
      // Rotate particles
      particle.rotation += particle.rotationSpeed * deltaTime;
      
      // Slow down horizontal movement
      particle.vx *= 0.98;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isComplete) return;

    ctx.save();
    
    // Parse base color once for all particles
    const r = parseInt(this.baseColor.slice(1, 3), 16);
    const g = parseInt(this.baseColor.slice(3, 5), 16);
    const b = parseInt(this.baseColor.slice(5, 7), 16);
    
    this.particles.forEach(particle => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      
      // Use simple color with opacity instead of gradient
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.opacity})`;
      
      // Draw particle as a simple circle with glow effect
      ctx.shadowBlur = particle.size * 2;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${particle.opacity * 0.5})`;
      
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add a bright center
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
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
  rotation: number;
  rotationSpeed: number;
}