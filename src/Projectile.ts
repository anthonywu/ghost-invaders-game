import { GameObject, Vector2D } from './types';

export class Projectile implements GameObject {
  position: Vector2D;
  velocity: Vector2D;
  width: number = 4;
  height: number = 15;
  color: string = '#FFFF00';
  speed: number = 500;

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.velocity = { x: 0, y: -this.speed };
  }

  update(deltaTime: number) {
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw projectile with trail effect using simple colors
    ctx.save();
    
    // Draw trail
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fillRect(
      this.position.x - this.width/2, 
      this.position.y + this.height * 0.5, 
      this.width, 
      this.height * 0.7
    );
    
    // Draw main projectile body
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillRect(
      this.position.x - this.width/2, 
      this.position.y, 
      this.width, 
      this.height * 0.6
    );
    
    ctx.restore();
  }

  isOffScreen(): boolean {
    return this.position.y < -this.height;
  }
}