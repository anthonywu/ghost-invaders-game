import { GameObject, Vector2D } from './types';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

export class Player implements GameObject {
  position: Vector2D;
  velocity: Vector2D;
  width: number = 60;
  height: number = 40;
  color: string = '#00FF00';
  speed: number = 600;
  private smokeParticles: SmokeParticle[] = [];
  private smokeTimer: number = 0;

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
  }

  moveLeft() {
    this.velocity.x = -this.speed;
  }

  moveRight() {
    this.velocity.x = this.speed;
  }

  stop() {
    this.velocity.x = 0;
  }

  update(deltaTime: number) {
    this.position.x += this.velocity.x * deltaTime;
    
    // Update smoke particles
    this.smokeTimer += deltaTime;
    if (this.smokeTimer > 0.02) { // Create smoke every 20ms
      this.createSmokeParticle();
      this.smokeTimer = 0;
    }
    
    // Update existing smoke particles
    this.smokeParticles = this.smokeParticles.filter(particle => {
      particle.y += particle.vy * deltaTime;
      particle.x += particle.vx * deltaTime;
      particle.life -= deltaTime;
      particle.opacity = Math.max(0, particle.life);
      particle.size *= 1.02; // Smoke expands as it rises
      
      return particle.life > 0;
    });
  }
  
  private createSmokeParticle() {
    const exhaustY = this.position.y + this.height / 2 + this.height / 8;
    this.smokeParticles.push({
      x: this.position.x + (Math.random() - 0.5) * this.width / 6,
      y: exhaustY,
      vx: (Math.random() - 0.5) * 30,
      vy: 50 + Math.random() * 30,
      size: 3 + Math.random() * 3,
      opacity: 0.8,
      life: 0.8
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw smoke particles first (behind the jet)
    this.smokeParticles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#CC0000';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    // Draw player as a Joint Strike Fighter (F-35) style jet
    const x = this.position.x;
    const y = this.position.y;
    const w = this.width;
    const h = this.height;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Main fuselage
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(0, -h/2);
    ctx.lineTo(-w/8, -h/4);
    ctx.lineTo(-w/8, h/4);
    ctx.lineTo(-w/12, h/2);
    ctx.lineTo(w/12, h/2);
    ctx.lineTo(w/8, h/4);
    ctx.lineTo(w/8, -h/4);
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.moveTo(-w/8, 0);
    ctx.lineTo(-w/2, h/3);
    ctx.lineTo(-w/2, h/2);
    ctx.lineTo(-w/4, h/3);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(w/8, 0);
    ctx.lineTo(w/2, h/3);
    ctx.lineTo(w/2, h/2);
    ctx.lineTo(w/4, h/3);
    ctx.closePath();
    ctx.fill();
    
    // Vertical stabilizers
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(-w/12, h/4);
    ctx.lineTo(-w/6, h/2);
    ctx.lineTo(-w/12, h/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(w/12, h/4);
    ctx.lineTo(w/6, h/2);
    ctx.lineTo(w/12, h/2);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.moveTo(0, -h/2);
    ctx.lineTo(-w/16, -h/3);
    ctx.lineTo(0, -h/4);
    ctx.lineTo(w/16, -h/3);
    ctx.closePath();
    ctx.fill();
    
    // Engine exhaust
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.moveTo(-w/12, h/2);
    ctx.lineTo(-w/16, h/2 + h/8);
    ctx.lineTo(w/16, h/2 + h/8);
    ctx.lineTo(w/12, h/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}