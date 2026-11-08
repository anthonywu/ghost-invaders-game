import { Game, GameOverData } from './Game';
import { GameState } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const splashOverlay = document.getElementById('splashOverlay')!;
const gameOverOverlay = document.getElementById('gameOverOverlay')!;
const finalScoreEl = document.getElementById('finalScore')!;
const newHighScoreEl = document.getElementById('newHighScore')!;
const statBestEl = document.getElementById('statBest')!;
const statGhostsEl = document.getElementById('statGhosts')!;
const statAccuracyEl = document.getElementById('statAccuracy')!;
const statComboEl = document.getElementById('statCombo')!;
const statTimeEl = document.getElementById('statTime')!;

// Side decorations are hidden below 900px (see style.css), so don't download
// them there. Loaded lazily on first resize past the breakpoint.
let decorLoaded = false;
function loadDecorations() {
  if (decorLoaded || window.innerWidth <= 900) return;
  decorLoaded = true;

  // Pick 2 of the 3 decoration panels at random so repeat visits vary
  const decorPanels = ['graphic01', 'graphic02', 'graphic05'];
  for (let i = decorPanels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [decorPanels[i], decorPanels[j]] = [decorPanels[j], decorPanels[i]];
  }
  (document.getElementById('decorLeft') as HTMLImageElement).src = `/images/${decorPanels[0]}.webp`;
  (document.getElementById('decorRight') as HTMLImageElement).src = `/images/${decorPanels[1]}.webp`;
}
loadDecorations();
window.addEventListener('resize', loadDecorations);

const game = new Game(canvas);

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  return `${mins}:${String(total % 60).padStart(2, '0')}`;
}

// Handle state changes for overlay transitions
game.setStateChangeCallback((state: GameState, data?: GameOverData) => {
  if (state === 'playing') {
    // Hide both overlays
    splashOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  } else if (state === 'gameOver') {
    // Show game over overlay with score and run statistics
    finalScoreEl.textContent = String(data?.score ?? 0);
    statBestEl.textContent = String(data?.highScore ?? 0);
    statGhostsEl.textContent = String(data?.ghostsDestroyed ?? 0);
    statAccuracyEl.textContent = `${data?.accuracy ?? 0}%`;
    statComboEl.textContent = String(data?.bestCombo ?? 0);
    statTimeEl.textContent = formatDuration(data?.timeSurvived ?? 0);
    newHighScoreEl.classList.toggle('hidden', !data?.isNewHighScore);
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

// On-screen audio controls, so touch devices can mute without a keyboard
const muteButton = document.getElementById('muteButton') as HTMLButtonElement;
const musicButton = document.getElementById('musicButton') as HTMLButtonElement;

muteButton.addEventListener('click', () => {
  const enabled = game.toggleSound();
  muteButton.textContent = enabled ? 'Sound on' : 'Sound off';
  muteButton.setAttribute('aria-pressed', String(!enabled));
});

musicButton.addEventListener('click', () => {
  game.cycleMusic();
});

// Start the game loop (begins in menu state)
game.start();