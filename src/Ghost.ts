import { GameObject, Vector2D, RAINBOW_COLORS } from './types';

export class Ghost implements GameObject {
  position: Vector2D;
  velocity: Vector2D;
  width: number = 40;
  height: number = 40;
  color: string;
  baseSpeed: number = 50;
  evasionSpeed: number = 100;
  isEvading: boolean = false;
  evasionDirection: number = 0;

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.velocity = { x: 0, y: this.baseSpeed };
    this.color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
  }

  startEvasion(projectileX: number) {
    this.isEvading = true;
    // Evade in opposite direction of projectile
    this.evasionDirection = this.position.x > projectileX ? 1 : -1;
  }

  stopEvasion() {
    this.isEvading = false;
    this.velocity.x = 0;
  }

  update(deltaTime: number) {
    if (this.isEvading) {
      this.velocity.x = this.evasionSpeed * this.evasionDirection;
    }
    
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw Pac-Man style ghost
    ctx.save();
    
    // Ghost body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    // Rounded top
    ctx.arc(this.position.x, this.position.y, this.width/2, Math.PI, 0, false);
    
    // Straight sides
    ctx.lineTo(this.position.x + this.width/2, this.position.y + this.height/2);
    
    // Wavy bottom edge
    const waves = 3;
    const waveWidth = this.width / waves;
    
    for (let i = waves - 1; i >= 0; i--) {
      const x = this.position.x - this.width/2 + (i * waveWidth);
      ctx.lineTo(x + waveWidth, this.position.y + this.height/2);
      ctx.arc(
        x + waveWidth/2,
        this.position.y + this.height/2,
        waveWidth/2,
        0,
        Math.PI,
        false
      );
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Eyes
    const eyeY = this.position.y - this.height/8;
    const eyeSpacing = this.width/4;
    
    // White of eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.position.x - eyeSpacing, eyeY, this.width/8, 0, Math.PI * 2);
    ctx.arc(this.position.x + eyeSpacing, eyeY, this.width/8, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils (looking down towards player)
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(this.position.x - eyeSpacing, eyeY + 2, this.width/16, 0, Math.PI * 2);
    ctx.arc(this.position.x + eyeSpacing, eyeY + 2, this.width/16, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}