# Space Invaders Kids Game - Technical Specification

## Game Overview
A kid-friendly space invaders game featuring colorful Pac-Man style ghosts as enemies, with simple controls and engaging gameplay mechanics.

## Game Mechanics

### Player Ship
- **Position**: The player's craft is at at bottom of screen, can only move horizontally
- **Movement**: Left/Right arrow keys control horizontal movement
- **Constraints**: Cannot move beyond screen boundaries

### Shooting Mechanics
- **Control**: Spacebar to fire projectiles
- **Projectile**: Single bullet traveling upward from player position
- **Fire Rate**: Limited to prevent spam (e.g., max 1 shot per 0.5 seconds)
- **Special Power Up**: every minute can fire a "nuke" that obliterates a blast radius from the craft as big as half the screen
- **Projectile Speed**: Constant upward velocity

### Enemy Ghosts
- **Appearance**: Pac-Man ghost sprites
- **Colors**: Randomly assigned rainbow colors (red, orange, yellow, green, blue, indigo, violet)
- **Spawn**: Appear from top of screen at random horizontal positions
- **Movement Pattern**:
  - Base downward movement at constant speed
  - Evasive lateral movement when detecting incoming projectiles
  - Movement decisions based on projectile proximity and trajectory

### Collision Detection
- **Player Projectile vs Ghost**: Ghost destroyed on hit, score increases
- **Ghost vs Player**: Game over condition
- **Ghost vs Bottom Screen**: Game over condition

## Technical Implementation

### Display
- **Resolution**: 1200x800 pixels (adjustable)
- **Frame Rate**: 60 FPS target
- **Background**: Space theme (stars, dark background)

### Controls
- **Left Arrow**: Move player left
- **Right Arrow**: Move player right
- **Spacebar**: Fire projectile
- **ESC**: Pause/Menu

### Game States
1. **Main Menu**: Start game, view high scores, exit
2. **Playing**: Active gameplay
3. **Paused**: Gameplay frozen, menu overlay
4. **Game Over**: Display score, option to restart

### Scoring System
- **Ghost Hit**: 10 points base value
- **Combo Multiplier**: Consecutive hits increase score multiplier
- **High Score**: Persistent storage of top scores

### Difficulty Progression
- **Wave System**: Ghosts spawn in waves with increasing difficulty
- **Speed Increase**: Ghost movement speed increases per wave
- **Spawn Rate**: More ghosts spawn simultaneously as waves progress
- **AI Enhancement**: Ghost evasion becomes more sophisticated

### Audio
- **Sound Effects**:
  - Player shoot sound
  - Ghost hit/destruction sound
  - Player movement sound
  - Game over sound
  - Background music (optional)

### Visual Effects
- **Ghost Destruction**: Particle effect or fade animation
- **Projectile Trail**: Visual trail for bullets
- **Score Popup**: Points display when ghost destroyed

## Technical Requirements

### Platform
- Web-based (HTML5 Canvas or WebGL)
- Cross-browser compatible (Chrome, Firefox, Safari, Edge)

### Performance
- Smooth 60 FPS on modest hardware
- Efficient collision detection algorithm
- Sprite batching for rendering optimization

### Development Stack
- **Language**: TypeScript
- **Graphics**: Canvas API or Pixi.js
- **Build System**: Vite
- **Testing**: Jest for unit tests

## Future Enhancements
- Power-ups (rapid fire, shield, multi-shot)
- Different ghost types with unique behaviors
- Boss ghosts at end of waves
- Local multiplayer support
- Mobile touch controls
