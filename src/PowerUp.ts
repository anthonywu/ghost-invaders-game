import { Vector2D } from './types';

export type PowerUpType = 'shield' | 'rapidFire' | 'multiShot';

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  shield: '#00E5FF',
  rapidFire: '#FFD700',
  multiShot: '#FF4FD8'
};

export class PowerUp {
  position: Vector2D;
  velocity: Vector2D;
  width: number = 30;
  height: number = 30;
  type: PowerUpType;
  color: string;
  private spin: number = 0;

  constructor(x: number, y: number, type: PowerUpType) {
    this.position = { x, y };
    this.type = type;
    this.color = POWER_UP_COLORS[type];
    this.velocity = { x: 0, y: 120 };
  }

  update(deltaTime: number) {
    this.position.y += this.velocity.y * deltaTime;
    this.spin += deltaTime * 2;
  }

  isOffScreen(screenHeight: number): boolean {
    return this.position.y - this.height > screenHeight;
  }

  render(ctx: CanvasRenderingContext2D) {
    const r = this.width / 2;
    const bob = Math.sin(this.spin * 2) * 2;

    ctx.save();
    ctx.translate(this.position.x, this.position.y + bob);

    // Glowing capsule body
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Dark inset so the glyph reads against the glow
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    switch (this.type) {
      case 'shield':
        // Arc over a baseline, like a buckler
        ctx.beginPath();
        ctx.arc(0, r * 0.15, r * 0.42, Math.PI, 0, false);
        ctx.lineTo(r * 0.42, r * 0.3);
        ctx.lineTo(-r * 0.42, r * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'rapidFire':
        // Stacked chevrons pointing up
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.35, i * r * 0.28 + r * 0.12);
          ctx.lineTo(0, i * r * 0.28 - r * 0.16);
          ctx.lineTo(r * 0.35, i * r * 0.28 + r * 0.12);
          ctx.stroke();
        }
        break;
      case 'multiShot':
        // Three bullets fanning outward
        for (const dx of [-r * 0.34, 0, r * 0.34]) {
          ctx.beginPath();
          ctx.arc(dx, dx === 0 ? -r * 0.12 : r * 0.06, r * 0.13, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }

    ctx.restore();
  }
}
