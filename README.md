# Ghost Invaders Kids Game

A fun, kid-friendly Space Invaders game featuring colorful Pac-Man style ghosts!

Fly a fighter against waves of ghosts that dodge your shots. Clear ghosts to
climb through levels, each with its own color theme and a faster, denser wave
than the last. Chain kills without missing to build a score multiplier, collect
power-ups dropped by the big ghosts, and upgrade your ship as you go. Runs get
harder up to a point and then hold steady, so younger players can keep playing
rather than hitting a wall.

Free Play at: https://ghost-invaders.com/

No logins, no ads, Wi-Fi not required.

**Privacy Note:** We collect aggregate country-level visitor data (no personal data, no IP logging).

# Development

## Prerequisites

- [Bun](https://bun.sh), or [Node.js](https://nodejs.org) 18+ with npm
- A modern web browser


## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   bun install
   ```
   Using npm instead:
   ```bash
   npm install
   ```

## Running the Game

Start the development server:
```bash
just dev 

```

Without `just` installed:
```bash
bun run dev    # or: npm run dev
```

Then open your browser and navigate to: http://localhost:5173/

To play from another device on your network (phone or tablet), expose the
server and browse to the Network URL it prints:
```bash
npm run dev -- --host 0.0.0.0
```

## How to Play

Shoot the ghosts before they reach the bottom of the screen. You start with 3
lives: you lose one when a ghost escapes past you or crashes into your ship, and
earn one back every 100 ghosts destroyed.

### Keyboard

| Key | Action |
| --- | --- |
| **Left / Right Arrow** | Move your ship |
| **Spacebar** | Shoot (also starts the game and restarts after game over) |
| **N** | Fire a nuke (once per minute) |
| **ESC** | Pause / unpause |
| **S** | Mute / unmute all sound |
| **M** | Change the background music track |
| **H** | Show / hide the on-screen help |
| **B** | Summon a boss ghost in 5 seconds |

### Touch (phone and tablet)

| Gesture | Action |
| --- | --- |
| **Swipe left / right** | Move your ship |
| **Tap** | Shoot (also starts and restarts the game) |
| **Double tap** | Fire a nuke |
| **Swipe across the help box** | Hide the help |

The **Sound** and **Music** buttons in the top-right corner work on any device,
so you can mute without a keyboard.

## Game Features

### Levels

Every 20 ghosts destroyed advances a level. Each level has its own color theme
that recolors the ghosts, the starfield and the interface, and each one spawns
ghosts faster and moves them quicker. The difficulty climbs until level 8 and
then holds steady, while the themes keep cycling, so the game stays playable no
matter how long a run lasts.

### Ghosts

| Ghost | Behaviour | Points |
| --- | --- | --- |
| Regular | Drifts down, dodges incoming shots | 10 |
| Zigzag (from level 3) | Weaves side to side, harder to line up | 15 |
| Splitter (from level 5) | Breaks into two regular ghosts when destroyed | 15 |
| Special white (every 30s) | Takes 2 hits, shrinks when damaged | 50 (25 per hit) |
| Rainbow (every 2 min) | Takes 3 hits, explodes and damages nearby ghosts | 20 (30 per hit) |
| Boss (every 3 min) | Huge and slow, sets off a large blast when destroyed | 100 |

Ghosts that survive a hit show a health bar so you can see how close they are to
going down.

### Combo multiplier

Consecutive kills without a missed shot build a combo. Every 5 kills raises the
multiplier by one, up to **x5**, and it applies to every point you score. Firing
a shot that sails off the top of the screen, or losing a life, resets it.

### Power-ups

Ordinary ghosts drop a power-up around 12% of the time; boss and rainbow ghosts
always drop one. Catch it with your ship to collect it.

- **Shield** - absorbs one collision with a ghost. Stacks up to 2 charges and is
  drawn as a ring around your ship.
- **Rapid Fire** - fires roughly three times faster for 8 seconds.
- **Multi Shot** - fires a three-way spread for 8 seconds.

The **nuke** is always available once per minute and destroys every ghost within
half a screen, worth 50 points each.

### Ship upgrades

Your fighter is rebuilt as you progress: twin cannons and dual thrusters at
level 3, and raked wingtip fins with a heavier exhaust at level 6. It also takes
on the accent color of the current level.

### Score and stats

Your high score is saved in the browser and shown on the heads-up display and
the game over screen. After each run you get a summary of your best score,
ghosts destroyed, shot accuracy, best combo and time survived.

## Building for Production

To build the game for deployment:
```bash
bun run build    # or: npm run build
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
bun run preview    # or: npm run preview
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
- **Web Audio API** - Sound effect playback with stereo panning, so ghosts are
  audible from the side of the screen they spawn on
- **HTML5 Audio** - Background music playback with seamless looping
- **Offline Sound Generation** - The retro effects in `public/sounds` are
  generated by the `generate-*.js` scripts and shipped as audio files

**Graphics & Effects:**
- **Particle Systems** - Explosion and visual effect animations
- **Parallax Scrolling** - Three star layers drifting at different speeds, sized
  and tinted to the current level theme
- **Procedural Rendering** - Ghosts, ship and power-ups drawn with Canvas paths
  rather than sprite sheets, so everything recolors per level
- **Dynamic Scaling** - Responsive design for all screen sizes

**Modern Web Features:**
- **ES Modules** - Clean dependency management
- **Async/Await** - Smooth resource loading
- **Touch Events** - Full mobile/tablet support
- **Performance API** - Precise timing and optimization

See `SPEC.md` for detailed technical specifications.
