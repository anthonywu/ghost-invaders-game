# Ghost Invaders Kids Game

A fun, kid-friendly Space Invaders game featuring colorful Pac-Man style ghosts!

Free Play at: http://ghost-invaders.anthony-wu.com

No logins, no ads, Wi-Fi not required.

# Development

## Prerequisites

- [Bun](https://bun.sh)
- A modern web browser

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   bun install
   ```

## Running the Game

Start the development server:
```bash
just dev
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
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
bun run preview
```

## Development

Vibe coded with a very tight leash.

### Tech Stack

**Core Technologies:**
- **TypeScript** - Type-safe JavaScript for robust game logic
- **Vite** - Lightning-fast build tool and dev server
- **HTML5 Canvas API** - Hardware-accelerated 2D graphics rendering

**Game Architecture:**
- **Object-Oriented Design** - Modular classes for Player, Ghost, Projectile, and Game entities
- **Game Loop Pattern** - 60 FPS update/render cycle using `requestAnimationFrame`
- **Entity-Component System** - Composable visual effects and behaviors

**Audio System:**
- **Web Audio API** - Dynamic sound effect generation and spatial audio
- **HTML5 Audio** - Background music playback with seamless looping
- **Procedural Audio** - Custom-generated retro sound effects using oscillators

**Graphics & Effects:**
- **Particle Systems** - Explosion and visual effect animations
- **Parallax Scrolling** - Multi-layer star field for depth
- **Sprite Animation** - Frame-based ghost animations
- **Dynamic Scaling** - Responsive design for all screen sizes

**Modern Web Features:**
- **ES Modules** - Clean dependency management
- **Async/Await** - Smooth resource loading
- **Touch Events** - Full mobile/tablet support
- **Performance API** - Precise timing and optimization

See `SPEC.md` for detailed technical specifications.
