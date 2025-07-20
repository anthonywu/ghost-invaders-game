# Space Invaders Kids Game

A fun, kid-friendly Space Invaders game featuring colorful Pac-Man style ghosts!

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js
- A modern web browser

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   bun install
   # or if using npm:
   # npm install
   ```

## Running the Game

Start the development server:
```bash
bun run dev
# or if using npm:
# npm run dev
```

Then open your browser and navigate to: http://localhost:5173/

## How to Play

- **Left/Right Arrow Keys**: Move your spaceship
- **Spacebar**: Shoot projectiles at the ghosts
- **N Key**: Fire a nuke (available once per minute)
- **ESC**: Pause/unpause the game

## Game Features

- Colorful rainbow ghosts that dodge your shots
- Score tracking (10 points per ghost, 50 for nuke kills)
- Special nuke power-up that clears half the screen
- Increasing difficulty as you play

## Building for Production

To build the game for deployment:
```bash
bun run build
# or if using npm:
# npm run build
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
bun run preview
# or if using npm:
# npm run preview
```

## Development

Built with:
- TypeScript
- Vite
- HTML5 Canvas

See `SPEC.md` for detailed technical specifications.