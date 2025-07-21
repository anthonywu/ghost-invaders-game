import { GameObject, Vector2D, RAINBOW_COLORS } from './types';

export type GhostType = 'normal' | 'special' | 'rainbow';

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
  hitPoints: number = 1;
  maxHitPoints: number = 1;
  type: GhostType = 'normal';
  originalWidth: number = 40;
  originalHeight: number = 40;
  isRainbow: boolean = false;

  constructor(x: number, y: number, type: GhostType = 'normal') {
    this.position = { x, y };
    this.type = type;
    
    switch (type) {
      case 'rainbow':
        // Rainbow ghost - 3x size, 3 hit points
        this.width = 120;
        this.height = 120;
        this.originalWidth = 120;
        this.originalHeight = 120;
        this.color = 'rainbow'; // Special color indicator
        this.hitPoints = 3;
        this.maxHitPoints = 3;
        this.baseSpeed = 100; // 2x speed of regular ghosts
        this.isRainbow = true;
        break;
      case 'special':
        // Special white ghost - 2x size, 2 hit points
        this.width = 80;
        this.height = 80;
        this.originalWidth = 80;
        this.originalHeight = 80;
        this.color = '#FFFFFF';
        this.hitPoints = 2;
        this.maxHitPoints = 2;
        this.baseSpeed = 75; // 1.5x speed of regular ghosts
        break;
      default:
        this.color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
        break;
    }
    
    this.velocity = { x: 0, y: this.baseSpeed };
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

  takeDamage(): boolean {
    this.hitPoints--;
    
    if (this.hitPoints > 0) {
      if (this.type === 'rainbow') {
        // Rainbow ghost shrinks but stays rainbow
        if (this.hitPoints === 2) {
          // Shrink to 2x size
          this.width = 80;
          this.height = 80;
        } else if (this.hitPoints === 1) {
          // Shrink to normal size
          this.width = 40;
          this.height = 40;
        }
      } else if (this.type === 'special') {
        // Special white ghost shrinks to normal size
        this.width = 40;
        this.height = 40;
      }
      return false; // Ghost survives
    }
    
    return this.hitPoints <= 0; // Ghost is destroyed
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw Pac-Man style ghost
    ctx.save();
    
    // Ghost body
    if (this.isRainbow) {
      // Create ghost shape path for clipping
      ctx.save();
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
      ctx.clip(); // Clip to ghost shape
      
      // Draw rainbow stripes
      const stripeWidth = this.width / RAINBOW_COLORS.length;
      RAINBOW_COLORS.forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.fillRect(
          this.position.x - this.width/2 + (index * stripeWidth),
          this.position.y - this.height/2,
          stripeWidth,
          this.height * 1.5
        );
      });
      
      ctx.restore();
      
      // Add rainbow glow
      ctx.shadowColor = '#FF00FF';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw the outline with glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    } else {
      ctx.fillStyle = this.color;
      
      // Add glow effect for special ghost
      if (this.type === 'special') {
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    }
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
    
    // Reset shadow for other elements
    if (this.type === 'special' || this.isRainbow) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
  }
}