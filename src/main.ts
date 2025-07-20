import { Game } from './Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

// Start the game
game.start();