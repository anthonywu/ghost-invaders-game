import { Game } from './Game';
import { GameState } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const splashOverlay = document.getElementById('splashOverlay')!;
const gameOverOverlay = document.getElementById('gameOverOverlay')!;
const finalScoreEl = document.getElementById('finalScore')!;

const game = new Game(canvas);

// Handle state changes for overlay transitions
game.setStateChangeCallback((state: GameState, data?: { score?: number }) => {
  if (state === 'playing') {
    // Hide both overlays
    splashOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  } else if (state === 'gameOver') {
    // Show game over overlay with score
    finalScoreEl.textContent = String(data?.score ?? 0);
    gameOverOverlay.classList.remove('hidden');
  }
});

// Add click/touch handlers to tap targets for iOS compatibility
const splashTapTarget = splashOverlay.querySelector('.tap-target') as HTMLElement;
const gameOverTapTarget = gameOverOverlay.querySelector('.tap-target') as HTMLElement;

if (splashTapTarget) {
  splashTapTarget.addEventListener('click', () => {
    game.startFromMenu();
  });
  splashTapTarget.addEventListener('touchend', (e) => {
    e.preventDefault();
    game.startFromMenu();
  });
}

if (gameOverTapTarget) {
  gameOverTapTarget.addEventListener('click', () => {
    game.restart();
    // Manually trigger state change to playing
    splashOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  });
  gameOverTapTarget.addEventListener('touchend', (e) => {
    e.preventDefault();
    game.restart();
    // Manually trigger state change to playing
    splashOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  });
}

// Start the game loop (begins in menu state)
game.start();