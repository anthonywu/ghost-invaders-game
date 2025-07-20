import { GameObject, Vector2D } from './types';

export class Player implements GameObject {
  position: Vector2D;
  velocity: Vector2D;
  width: number = 60;
  height: number = 40;
  color: string = '#00FF00';
  speed: number = 600;

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
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw player as a simple triangle spaceship
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(this.position.x - this.width / 2, this.position.y + this.height);
    ctx.lineTo(this.position.x + this.width / 2, this.position.y + this.height);
    ctx.closePath();
    ctx.fill();
  }
}