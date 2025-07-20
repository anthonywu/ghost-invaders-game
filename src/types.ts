export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  position: Vector2D;
  velocity: Vector2D;
  width: number;
  height: number;
  color: string;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

export const RAINBOW_COLORS = [
  '#FF0000', // Red
  '#FF8C00', // Orange  
  '#FFD700', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3'  // Violet
];