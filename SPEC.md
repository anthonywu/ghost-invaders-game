# Ghost Invaders - Technical Specification

Implementation reference for the game as it currently stands. For player-facing
rules and controls see `README.md`.

## Game Overview
A kid-friendly space invaders game featuring colorful Pac-Man style ghosts as
enemies, with simple controls, a level-based difficulty curve and a short
progression loop (levels, combos, power-ups, ship upgrades).

## Game Mechanics

### Player Ship
- **Position**: Fixed near the bottom of the screen, moves horizontally only
- **Movement**: Left/Right arrow keys, or swipe on touch devices
- **Constraints**: Clamped to the screen edges
- **Visual tiers**: Three ship builds, upgrading at levels 1 / 3 / 6. Higher
  tiers add cannon pods, dual thrusters and wingtip fins, and the ship is tinted
  with the current level's accent color (`src/Player.ts`)

### Shooting Mechanics
- **Control**: Spacebar, or tap on touch devices
- **Projectile**: Travels upward from the player's position
- **Fire Rate**: One shot per 250ms, dropping to 90ms while Rapid Fire is active
- **Multi Shot**: While active, each shot fires a three-way spread (±0.28 rad)
- **Nuke**: Available once per minute; destroys every ghost within half a screen
  radius of the player

### Enemy Ghosts
Ghosts are drawn procedurally with Canvas paths (no sprite sheets), which is what
allows them to be recolored per level.

| Type | Hit points | Notes |
| --- | --- | --- |
| `normal` | 1 | Base enemy |
| `zigzag` | 1 | Sinusoidal lateral drift; unlocks at level 3 |
| `splitter` | 1 | Spawns two `normal` ghosts on death; unlocks at level 5 |
| `special` | 2 | Shrinks as it takes damage; spawns every 30s |
| `rainbow` | 3 | Shrinks per hit, area explosion on death; every 2 min |
| `boss` | 1 | 4x size, large area explosion on death; every 3 min |

- **Colors**: `normal`, `zigzag` and `splitter` are tinted from the current
  level's palette. `special`, `rainbow` and `boss` keep fixed signature colors so
  they stay recognizable.
- **Spawn**: From the top of the screen at random horizontal positions
- **Movement**: Constant downward velocity, plus evasive lateral movement when a
  projectile is detected nearby. Evasion behaviour is the same at all levels;
  only speed and spawn rate scale.
- **Health bars**: Rendered above any ghost with more than one hit point

### Collision Detection
- **Projectile vs Ghost**: A projectile is spent on the first ghost it touches.
  The ghost takes one point of damage; it is destroyed at zero.
- **Ghost vs Player**: Costs a life, unless a Shield charge absorbs it
- **Ghost vs Bottom of screen**: Costs a life (Shields do not prevent escapes)
- **Power-up vs Player**: Collected on overlap
- **Lives**: Three at the start; one is granted every 100 ghosts destroyed. Game
  over at zero.

## Technical Implementation

### Display
- **Aspect ratio**: 800x1200 (portrait), scaled responsively to the viewport
- **Scaling**: A single `scale` factor derived from the canvas size is applied to
  entity dimensions, speeds and font sizes
- **Frame Rate**: 60 FPS target via `requestAnimationFrame`
- **Delta clamp**: The per-frame delta is capped at 50ms so a backgrounded tab
  does not resume with one oversized simulation step
- **Background**: Three parallax star layers drifting at 0.020 / 0.055 / 0.120
  screen-heights per second, tinted to the level theme. Star speeds are relative
  to canvas height, so the effect holds at any size, and the field animates in
  every game state rather than only during play.

### Controls
| Input | Action |
| --- | --- |
| Left / Right Arrow | Move |
| Spacebar | Shoot, start, restart |
| N | Nuke |
| ESC | Pause / unpause |
| S | Mute / unmute |
| M | Cycle background music |
| H | Toggle the on-screen help |
| B | Summon a boss in 5 seconds (debug aid) |
| Swipe | Move (touch) |
| Tap | Shoot, start, restart, unpause (touch) |
| Double tap | Nuke (touch) |

On-screen Sound and Music buttons are always present so touch devices can control
audio without a keyboard.

### Game States
1. **Menu**: Splash overlay; starfield animates behind it
2. **Playing**: Active gameplay
3. **Paused**: Simulation frozen, entered via ESC or window blur
4. **Game Over**: Score plus run statistics, restart on Space or tap

### Scoring System
| Event | Base points |
| --- | --- |
| `normal` destroyed | 10 |
| `zigzag` / `splitter` destroyed | 15 |
| `rainbow` destroyed | 20 (30 per non-fatal hit) |
| `special` destroyed | 50 (25 per non-fatal hit) |
| `boss` destroyed | 100 |
| Nuke kill | 50 each |

- **Combo Multiplier**: Consecutive kills without a missed shot. Each 5 kills
  adds +1 to the multiplier, capped at x5, applied to all points scored. Reset by
  a projectile leaving the screen or by losing a life. A nuke honors the current
  multiplier but does not build the combo.
- **High Score**: A single best score persisted to `localStorage` under
  `ghostInvaders.highScore`. All access is wrapped for private-browsing failures.
- **Run statistics**: Ghosts destroyed, shot accuracy, best combo and time
  survived, shown on the game over screen.

### Level and Difficulty Progression
Defined in `src/levels.ts`.

- **Level**: `floor(ghostsDestroyed / 20) + 1`
- **Themes**: Eight palettes, cycling once exhausted. Each defines ghost colors,
  a UI/ship accent and a star tint.
- **Difficulty**: Scales linearly from level 1 to level 8, then plateaus, so long
  runs stay playable for younger players.
- **Spawn interval**: 2000ms at level 1 down to 700ms at the plateau
- **Ghost speed**: x1.00 at level 1 up to x1.80 at the plateau
- **Ship tier**: 1 below level 3, 2 at levels 3-5, 3 from level 6
- **Level-up**: Triggers a banner, a sound and a palette change

### Power-ups
Dropped by ordinary ghosts at a 12% rate; guaranteed from `boss` and `rainbow`.

| Power-up | Effect | Duration |
| --- | --- | --- |
| Shield | Absorbs one ghost collision, stacks to 2 charges | Until consumed |
| Rapid Fire | Fire interval 250ms to 90ms | 8s |
| Multi Shot | Three-way spread | 8s |

### Audio
- **Effects**: shoot, ghost spawn (per type), ghost hit, ghost destroyed,
  explosion, rainbow explosion, boss explosion, nuke ready, nuke fire, extra
  life, life lost, game over, pause
- **Playback**: Web Audio API with stereo panning based on the sound's screen
  position; effects are decoded once at startup
- **Background music**: Two looping tracks via `HTMLAudioElement`, cycled with M
- **Generation**: Effects are produced offline by the `generate-*.js` scripts and
  committed to `public/sounds` as audio files

### Visual Effects
- **Ghost destruction**: Colored particle explosion matching the ghost
- **Projectile trail**: Glowing bullet trail with fade
- **Score popups**: Floating `+N` text, showing the multiplier when above x1
- **Level banner**: Full-width flash naming the new level and theme
- **Shield indicator**: Pulsing ring around the ship, doubled at two charges
- **Nuke**: Expanding multi-layer fireball with a shockwave ring

## Technical Requirements

### Platform
- Web-based, HTML5 Canvas 2D
- Cross-browser (Chrome, Firefox, Safari, Edge), desktop and touch

### Performance
- Smooth 60 FPS on modest hardware
- `shadowBlur` is restricted to the nearest star layer and a few accent elements,
  as it is the most expensive Canvas operation in the render path

### Development Stack
- **Language**: TypeScript
- **Graphics**: Canvas 2D API
- **Build System**: Vite
- **Testing**: None currently. There is no test runner configured and no
  automated build check in CI.

## Future Enhancements

Items below are not implemented. Anything previously listed here that now exists
has been folded into the sections above.

### Gameplay
- **Laser Beam**: Continuous damage beam weapon
- **Slow Time**: Temporarily slow ghost movement
- **Teleport Ghost**: Can teleport short distances
- **Shield Ghost**: Rotating shield that blocks frontal shots
- **Boss attack patterns**: Bosses currently only descend; they do not attack
- **Adaptive ghost AI**: Evasion does not currently change with level

### Audio
- **Dynamic music**: Music that intensifies with the level
- **Voice announcements**: Kid-friendly callouts ("Level up!", "Power up!")
- **Dedicated power-up pickup sound**: Currently reuses the extra life sound

### UI
- **Pause menu**: Options and volume control rather than a bare paused state
- **Minimap**: Radar showing incoming threats
- **High score leaderboard**: Top 10 with names, rather than a single best score

### Quality of Life
- **Auto-fire option**: Accessibility feature for continuous firing
- **Difficulty settings**: Easy / Medium / Hard presets
- **Tutorial mode**: Interactive tutorial for new players
- **Color blind mode**: Alternative ghost identification

### Multiplayer
- Local co-op (2 players on one screen)
- Competitive mode (who survives longer)

### Known Gaps
- **Startup latency**: The first key press awaits the full sound preload before
  the game starts, which delays the first frame on slow connections
- **Audio payload**: Effects ship as uncompressed PCM WAV (~1.9MB total)
