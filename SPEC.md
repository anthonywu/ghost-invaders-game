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

### Visual Enhancements
- **Background Stars**: Parallax scrolling starfield for depth
- **Score Popups**: Floating "+10" text when destroying ghosts
- **Ghost Destruction Particles**: Colorful explosion effects matching ghost color
- **Projectile Trails**: Glowing bullet trails with fade effect
- **Shield Indicator**: Visual health/shield bar below player craft

### Power-ups System
- **Rapid Fire**: 2x fire rate for 10 seconds
- **Shield**: Absorb 1-2 hits without taking damage
- **Multi-shot**: 3-way spread shot pattern
- **Laser Beam**: Continuous damage beam weapon
- **Slow Time**: Temporarily slow ghost movement
- **Bomb**: Clear small area of ghosts

### Ghost Varieties
- **Speed Ghost**: Moves 2x faster than regular ghosts
- **Tank Ghost**: Requires 2-3 hits to destroy, darker color
- **Zigzag Ghost**: Moves in erratic patterns
- **Splitter Ghost**: Divides into 2 smaller ghosts when hit
- **Teleport Ghost**: Can teleport short distances
- **Shield Ghost**: Has rotating shield that blocks frontal shots

### Boss Battles
- Large boss ghost at end of each wave set (every 5 waves)
- Health bar display for boss
- Multiple attack patterns
- Special rewards for defeating bosses

### Audio System
- **Sound Effects**:
  - Player shoot sound
  - Ghost hit/destruction sound  
  - Power-up pickup sound
  - Warning sound for low health
  - Boss appearance fanfare
- **Background Music**: Dynamic music that intensifies with waves
- **Voice Acting**: Kid-friendly announcements ("Wave Clear!", "Power Up!")

### UI Improvements
- **Wave Counter**: "Wave 1/10" display
- **Combo Meter**: Visual streak indicator with multiplier
- **Minimap**: Radar showing incoming threats
- **Pause Menu**: Options, volume control, restart
- **Stats Screen**: Post-game statistics (accuracy, ghosts destroyed, etc.)

### Quality of Life Features
- **Auto-fire Option**: Accessibility feature for continuous firing
- **Difficulty Settings**: Easy (slower ghosts), Medium (default), Hard (faster + more ghosts)
- **High Score Leaderboard**: Local storage of top 10 scores with names
- **Tutorial Mode**: Interactive tutorial for new players
- **Color Blind Mode**: Alternative ghost identification system

### Multiplayer Features
- Local co-op support (2 players on same screen)
- Competitive mode (who survives longer)
- Shared power-ups system

### Mobile Support
- Touch controls with virtual joystick
- Tap to shoot mechanics
- Responsive design for different screen sizes
