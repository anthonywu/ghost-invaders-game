import { Game } from './Game';
import { GameState } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const splashOverlay = document.getElementById('splashOverlay')!;
const gameOverOverlay = document.getElementById('gameOverOverlay')!;
const finalScoreEl = document.getElementById('finalScore')!;
const highestScoreEl = document.getElementById('highestScore')!;
const lowestScoreEl = document.getElementById('lowestScore')!;

const HIGH_SCORE_KEY = 'ghostInvadersHighestScore';
const LOW_SCORE_KEY = 'ghostInvadersLowestScore';
const SCORE_HISTORY_KEY = 'ghostInvadersScoreHistory';

const storedHigh = Number(localStorage.getItem(HIGH_SCORE_KEY));
const storedLow = Number(localStorage.getItem(LOW_SCORE_KEY));

let highestScore = Number.isFinite(storedHigh) ? storedHigh : 0;
let lowestScore = Number.isFinite(storedLow) ? storedLow : 0;

const parseScoreHistory = (): number[] => {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => Number.isFinite(value) && value > 0);
  } catch {
    return [];
  }
};

const scoreHistory = parseScoreHistory();
if (scoreHistory.length > 0) {
  highestScore = Math.max(...scoreHistory);
  lowestScore = Math.min(...scoreHistory);
  localStorage.setItem(HIGH_SCORE_KEY, String(highestScore));
  localStorage.setItem(LOW_SCORE_KEY, String(lowestScore));
}

highestScoreEl.textContent = String(highestScore);
lowestScoreEl.textContent = String(lowestScore);

const game = new Game(canvas);

// Handle state changes for overlay transitions
game.setStateChangeCallback((state: GameState, data?: { score?: number }) => {
  if (state === 'playing') {
    // Hide both overlays
    splashOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
  } else if (state === 'gameOver') {
    // Show game over overlay with score
    const score = data?.score ?? 0;
    finalScoreEl.textContent = String(score);

    if (score > 0) {
      scoreHistory.push(score);
      localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(scoreHistory));
    }

    if (scoreHistory.length === 0) {
      highestScore = 0;
      lowestScore = 0;
      localStorage.setItem(HIGH_SCORE_KEY, '0');
      localStorage.setItem(LOW_SCORE_KEY, '0');
      highestScoreEl.textContent = '0';
      lowestScoreEl.textContent = '0';
      gameOverOverlay.classList.remove('hidden');
      return;
    }

    highestScore = Math.max(...scoreHistory);
    lowestScore = Math.min(...scoreHistory);
    localStorage.setItem(HIGH_SCORE_KEY, String(highestScore));
    localStorage.setItem(LOW_SCORE_KEY, String(lowestScore));
    highestScoreEl.textContent = String(highestScore);
    lowestScoreEl.textContent = String(lowestScore);

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
