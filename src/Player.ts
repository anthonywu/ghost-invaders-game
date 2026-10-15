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

  /** Visual tier, raised as the player levels up. Set by Game. */
  tier: 1 | 2 | 3 = 1;
  /** Level accent colour used for trim and engine glow. Set by Game. */
  accentColor: string = '#00E5FF';
  /** Shield charges held, drawn as a bubble around the ship. Set by Game. */
  shieldCharges: number = 0;

  private smokeParticles: SmokeParticle[] = [];
  private smokeTimer: number = 0;
  private thrusterPhase: number = 0;
  private shieldPhase: number = 0;

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
    this.thrusterPhase += deltaTime * 18;
    this.shieldPhase += deltaTime * 2.5;

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
    this.renderSmoke(ctx);

    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    this.renderThruster(ctx, w, h);
    this.renderWings(ctx, w, h);
    this.renderFuselage(ctx, w, h);
    this.renderCockpit(ctx, w, h);
    if (this.tier >= 2) this.renderCannons(ctx, w, h);
    if (this.tier >= 3) this.renderWingtipFins(ctx, w, h);

    ctx.restore();

    if (this.shieldCharges > 0) this.renderShield(ctx);
  }

  private renderSmoke(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.smokeParticles.forEach(particle => {
      ctx.globalAlpha = particle.opacity * 0.5;
      ctx.fillStyle = this.accentColor;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /** Flickering twin exhaust plume behind the ship. */
  private renderThruster(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const flicker = 0.75 + Math.sin(this.thrusterPhase) * 0.25;
    const length = h * (this.tier >= 3 ? 0.62 : 0.48) * flicker;
    const offsets = this.tier >= 2 ? [-w / 10, w / 10] : [0];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    offsets.forEach(dx => {
      ctx.fillStyle = this.accentColor;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(dx - w / 14, h / 2);
      ctx.lineTo(dx, h / 2 + length);
      ctx.lineTo(dx + w / 14, h / 2);
      ctx.closePath();
      ctx.fill();

      // Hot white core
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(dx - w / 32, h / 2);
      ctx.lineTo(dx, h / 2 + length * 0.55);
      ctx.lineTo(dx + w / 32, h / 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  private renderWings(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Swept delta wings, wider and more raked at higher tiers
    const span = this.tier >= 3 ? w / 1.85 : this.tier >= 2 ? w / 2.05 : w / 2.25;

    ctx.fillStyle = '#5A6472';
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * w / 10, -h / 8);
      ctx.lineTo(side * span, h / 4);
      ctx.lineTo(side * span, h / 2.4);
      ctx.lineTo(side * w / 7, h / 3);
      ctx.closePath();
      ctx.fill();
    });

    // Accent leading edge
    ctx.strokeStyle = this.accentColor;
    ctx.lineWidth = Math.max(1, w / 55);
    ctx.globalAlpha = 0.9;
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * w / 10, -h / 8);
      ctx.lineTo(side * span, h / 4);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  private renderFuselage(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Body: a sharp nose tapering into engine housing
    ctx.fillStyle = '#9AA5B1';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 9, -h / 8);
    ctx.lineTo(-w / 8, h / 4);
    ctx.lineTo(-w / 14, h / 2);
    ctx.lineTo(w / 14, h / 2);
    ctx.lineTo(w / 8, h / 4);
    ctx.lineTo(w / 9, -h / 8);
    ctx.closePath();
    ctx.fill();

    // Centre spine highlight for a bit of dimensionality
    ctx.fillStyle = '#C7D0DA';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 26, -h / 8);
    ctx.lineTo(-w / 26, h / 3);
    ctx.lineTo(w / 26, h / 3);
    ctx.lineTo(w / 26, -h / 8);
    ctx.closePath();
    ctx.fill();
  }

  private renderCockpit(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.accentColor;
    ctx.fillStyle = this.accentColor;
    ctx.beginPath();
    ctx.ellipse(0, -h / 5, w / 14, h / 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, -h / 4.4, w / 30, h / 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Tier 2+: under-wing cannon pods. */
  private renderCannons(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#3E4650';
    [-1, 1].forEach(side => {
      ctx.fillRect(side * w / 3.4 - w / 40, -h / 5, w / 20, h / 2.6);
    });
    ctx.fillStyle = this.accentColor;
    [-1, 1].forEach(side => {
      ctx.fillRect(side * w / 3.4 - w / 60, -h / 4.2, w / 30, h / 9);
    });
  }

  /** Tier 3: raked wingtip fins. */
  private renderWingtipFins(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = this.accentColor;
    ctx.globalAlpha = 0.9;
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * w / 1.85, h / 4);
      ctx.lineTo(side * w / 1.7, -h / 12);
      ctx.lineTo(side * w / 1.95, h / 4);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  private renderShield(ctx: CanvasRenderingContext2D) {
    const radius = Math.max(this.width, this.height) * 0.78;
    const pulse = 0.55 + Math.sin(this.shieldPhase) * 0.2;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
    ctx.lineWidth = Math.max(1.5, this.width / 28);
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Second ring while two charges are held
    if (this.shieldCharges > 1) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
