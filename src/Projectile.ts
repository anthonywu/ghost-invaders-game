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
    // Draw projectile with trail effect
    const gradient = ctx.createLinearGradient(
      this.position.x, 
      this.position.y + this.height,
      this.position.x, 
      this.position.y
    );
    gradient.addColorStop(0, 'rgba(255, 255, 0, 0.2)');
    gradient.addColorStop(1, this.color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
      this.position.x - this.width/2, 
      this.position.y, 
      this.width, 
      this.height
    );
  }

  isOffScreen(): boolean {
    return this.position.y < -this.height;
  }
}