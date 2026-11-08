import { Player } from './Player';
import { Ghost, GhostType } from './Ghost';
import { Projectile } from './Projectile';
import { GameState, Vector2D } from './types';
import { VisualEffect, NukeEffect, ExplosionEffect, ScorePopup } from './effects/VisualEffect';
import { PowerUp, PowerUpType } from './PowerUp';
import {
  LevelTheme, KILLS_PER_LEVEL, levelFromKills, themeForLevel,
  difficultyForLevel, shipTierForLevel
} from './levels';
import { SoundManager } from './audio/SoundManager';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 1200;
  private scale: number = 1;
  
  private player: Player;
  private ghosts: Ghost[] = [];
  private projectiles: Projectile[] = [];
  private visualEffects: VisualEffect[] = [];
  
  private state: GameState = 'menu';
  private onStateChange?: (state: GameState, data?: GameOverData) => void;
  private score: number = 0;
  private lives: number = 3;
  private ghostsDestroyed: number = 0;
  private lastTime: number = 0;
  private lastShot: number = 0;
  private shotCooldown: number = 250; // 0.25 seconds
  
  // --- Difficulty tuning ---------------------------------------------------
  // Difficulty is driven by the current level (see levels.ts). It steps up each
  // level until MAX_DIFFICULTY_LEVEL and then plateaus, so the game stays
  // beatable for younger players. Adjust these three numbers plus the level
  // constants in levels.ts to retune the whole curve.
  private readonly spawnIntervalStart = 2000; // ms between spawns at level 1
  private readonly spawnIntervalMin = 700; // ms between spawns at max level
  private readonly ghostSpeedMaxMultiplier = 1.8; // ghost speed at max level
  // -------------------------------------------------------------------------

  // Level state
  private level: number = 1;
  private levelUpBannerUntil: number = 0;
  private readonly levelBannerDuration = 2200; // ms

  private highScore: number = 0;
  private static readonly highScoreKey = 'ghostInvaders.highScore';

  // Combo: consecutive kills without a missed shot
  private combo: number = 0;
  private bestCombo: number = 0;
  private readonly comboKillsPerStep = 5; // kills needed per +1 multiplier
  private readonly comboMaxMultiplier = 5;

  // Run stats (reported on the game over screen)
  private shotsFired: number = 0;
  private shotsHit: number = 0;
  private runStartTime: number = 0;

  // Power-ups
  private powerUps: PowerUp[] = [];
  private shieldCharges: number = 0;
  private rapidFireUntil: number = 0;
  private multiShotUntil: number = 0;
  private readonly powerUpDropChance = 0.12;
  private readonly powerUpDuration = 8000; // ms
  private readonly rapidFireCooldown = 90; // ms between shots while active

  private ghostSpawnTimer: number = 0;
  private specialGhostTimer: number = 0;
  private specialGhostInterval: number = 30000; // 30 seconds
  private rainbowGhostTimer: number = 0;
  private rainbowGhostInterval: number = 120000; // 2 minutes
  private bossGhostTimer: number = 0;
  private bossGhostInterval: number = 180000; // 3 minutes
  private forceBossSpawn: boolean = false;
  private forceBossSpawnTimer: number = 0;
  
  private keys: Set<string> = new Set();
  
  // Nuke power-up
  private lastNuke: number = 0;
  private nukeCooldown: number = 60000; // 1 minute
  private nukeReady: boolean = false;
  
  // Life lost blinking effect
  private lifeLostTime: number = 0;
  private lifeLostBlinkDuration: number = 3000; // 3 seconds
  private lifeLostBlinkInterval: number = 200; // Blink every 200ms
  
  // UI controls
  private showControls: boolean = true;
  
  // Mobile controls
  private isMobile: boolean = false;
  private touchStartX: number = 0;
  private swipeThreshold: number = 20; // pixels - increased for better control
  private isMovingLeft: boolean = false;
  private isMovingRight: boolean = false;
  private swipeSpeedMultiplier: number = 1.5; // 1.5x speed for better control
  private controlsBoxBounds?: { x: number; y: number; width: number; height: number };
  
  // Parallax stars
  private starLayers: StarLayer[] = [];
  
  // Sound manager
  private soundManager: SoundManager;
  private soundInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Calculate responsive dimensions
    this.calculateDimensions();
    
    this.player = new Player(this.width / 2, this.height - 60 * this.scale);
    this.player.width *= this.scale;
    this.player.height *= this.scale;
    this.player.speed *= this.scale;
    
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    ('ontouchstart' in window);
    
    // Initialize parallax star layers
    this.initializeStarLayers();
    
    // Initialize sound manager
    this.soundManager = new SoundManager();

    this.loadHighScore();
    
    this.setupEventListeners();
  }

  private calculateDimensions() {
    const maxWidth = window.innerWidth - 40; // 20px padding on each side
    const maxHeight = window.innerHeight - 40;
    const targetAspectRatio = 800 / 1200; // Original aspect ratio
    
    // Calculate dimensions maintaining aspect ratio
    if (maxWidth / maxHeight > targetAspectRatio) {
      // Height-constrained
      this.height = maxHeight;
      this.width = maxHeight * targetAspectRatio;
    } else {
      // Width-constrained
      this.width = maxWidth;
      this.height = maxWidth / targetAspectRatio;
    }
    
    // Calculate scale factor for game objects
    this.scale = Math.min(this.width / 800, this.height / 1200);
    
    // Set canvas dimensions
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private setupEventListeners() {
    window.addEventListener('keydown', async (e) => {
      // Initialize sound on first key press
      await this.ensureSoundInitialized();

      // Start from menu
      if (this.state === 'menu' && e.key === ' ') {
        this.startFromMenu();
        return;
      }

      // Check for restart
      if (this.state === 'gameOver' && e.key === ' ') {
        this.restart();
        this.onStateChange?.('playing');
        return;
      }
      
      this.keys.add(e.key);
      if (e.key === 'Escape') {
        this.togglePause();
      }
      if (e.key.toLowerCase() === 'h') {
        this.showControls = !this.showControls;
      }
      if (e.key.toLowerCase() === 'b') {
        // Trigger boss spawn in 5 seconds
        this.forceBossSpawn = true;
        this.forceBossSpawnTimer = 5000; // 5 seconds
      }
      if (e.key.toLowerCase() === 'm') {
        this.soundManager.cycleBackgroundMusic();
      }
      if (e.key.toLowerCase() === 's') {
        // Toggle mute with S
        const enabled = this.soundManager.toggleSound();
        console.log(`Sound ${enabled ? 'enabled' : 'muted'}`);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Mobile controls
    if (this.isMobile) {
      this.setupMobileControls();
    }
    
    // Auto-pause when browser loses focus
    window.addEventListener('blur', () => {
      if (this.state === 'playing') {
        this.state = 'paused';
      }
    });
  }

  private setupMobileControls() {
    // Touch start - record position and shoot
    this.canvas.addEventListener('touchstart', async (e) => {
      e.preventDefault();

      // Initialize sound on first touch
      await this.ensureSoundInitialized();

      // Start from menu on tap
      if (this.state === 'menu') {
        this.startFromMenu();
        return;
      }

      // If game is paused, unpause on any touch
      if (this.state === 'paused') {
        this.state = 'playing';
        this.soundManager.playPause();
        return;
      }

      // If game is over, restart on any touch
      if (this.state === 'gameOver') {
        this.restart();
        this.onStateChange?.('playing');
        return;
      }
      
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      
      // Shoot on tap
      const currentTime = performance.now();
      if (currentTime - this.lastShot >= this.currentShotCooldown) {
        this.shoot();
        this.lastShot = currentTime;
      }
    });
    
    // Touch move - detect swipe direction for movement
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      
      // Check if swiping on controls box to hide it
      if (this.showControls && this.controlsBoxBounds) {
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Scale touch coordinates to canvas coordinates
        const canvasX = touchX * (this.width / rect.width);
        const canvasY = touchY * (this.height / rect.height);
        
        // Check if touch is within controls box
        if (canvasX >= this.controlsBoxBounds.x &&
            canvasX <= this.controlsBoxBounds.x + this.controlsBoxBounds.width &&
            canvasY >= this.controlsBoxBounds.y &&
            canvasY <= this.controlsBoxBounds.y + this.controlsBoxBounds.height) {
          // Hide controls on any swipe within the box
          if (Math.abs(deltaX) > this.swipeThreshold) {
            this.showControls = false;
            return;
          }
        }
      }
      
      // Check for horizontal swipe (movement)
      if (Math.abs(deltaX) > this.swipeThreshold) {
        if (deltaX > 0) {
          // Swipe right
          this.isMovingRight = true;
          this.isMovingLeft = false;
        } else {
          // Swipe left
          this.isMovingLeft = true;
          this.isMovingRight = false;
        }
        
        // Reset start position for continuous swiping
        this.touchStartX = touch.clientX;
      }
    });
    
    // Touch end - stop movement
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMovingLeft = false;
      this.isMovingRight = false;
    });
    
    // Double tap for nuke
    let lastTapTime = 0;
    this.canvas.addEventListener('touchstart', () => {
      const currentTime = performance.now();
      if (currentTime - lastTapTime < 300 && this.nukeReady) {
        // Double tap detected
        this.fireNuke();
        this.lastNuke = currentTime;
        this.nukeReady = false;
      }
      lastTapTime = currentTime;
    });
  }

  private handleResize() {
    const oldWidth = this.width;
    const oldHeight = this.height;
    
    this.calculateDimensions();
    
    // Adjust player position proportionally
    if (this.player) {
      this.player.position.x = (this.player.position.x / oldWidth) * this.width;
      this.player.position.y = this.height - 60 * this.scale;
    }
    
    // Adjust ghost positions proportionally
    this.ghosts.forEach(ghost => {
      ghost.position.x = (ghost.position.x / oldWidth) * this.width;
      ghost.position.y = (ghost.position.y / oldHeight) * this.height;
    });
    
    // Adjust projectile positions proportionally
    this.projectiles.forEach(projectile => {
      projectile.position.x = (projectile.position.x / oldWidth) * this.width;
      projectile.position.y = (projectile.position.y / oldHeight) * this.height;
    });
    
    // Adjust star positions proportionally and rescale drift to the new height
    this.starLayers.forEach(layer => {
      layer.speed = layer.speedFactor * this.height;
      layer.stars.forEach(star => {
        star.x = (star.x / oldWidth) * this.width;
        star.y = (star.y / oldHeight) * this.height;
      });
    });
  }

  private togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
    this.soundManager.playPause();
  }
  
  restart() {
    // Reset game state
    this.state = 'playing';
    this.score = 0;
    this.lives = 3;
    this.ghostsDestroyed = 0;

    // Clear entities
    this.ghosts = [];
    this.projectiles = [];
    this.visualEffects = [];

    // Reset timers
    this.lastShot = 0;
    this.lastNuke = 0;
    this.nukeReady = false;
    this.ghostSpawnTimer = 0;
    this.specialGhostTimer = 0;
    this.rainbowGhostTimer = 0;
    this.bossGhostTimer = 0;
    this.lifeLostTime = 0;

    // Reset combo, power-ups and run stats
    this.level = 1;
    this.levelUpBannerUntil = 0;
    this.player.tier = 1;
    this.player.accentColor = this.theme.accent;
    this.player.shieldCharges = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.runStartTime = performance.now();
    this.powerUps = [];
    this.shieldCharges = 0;
    this.rapidFireUntil = 0;
    this.multiShotUntil = 0;

    // Reset player position
    this.player.position.x = this.width / 2;
    this.player.position.y = this.height - 60 * this.scale;

    // Resume background music
    this.soundManager.resumeBackgroundMusic();
  }

  /** Audio needs a user gesture before it can start; safe to call repeatedly. */
  async ensureSoundInitialized() {
    if (this.soundInitialized) return;
    await this.soundManager.init();
    this.soundInitialized = true;
  }

  /**
   * Returns true when sound is enabled after the toggle. The preload is started
   * in the background rather than awaited: muting has to respond on the first
   * tap, and neither control depends on the decoded effect buffers.
   */
  toggleSound(): boolean {
    void this.ensureSoundInitialized();
    return this.soundManager.toggleSound();
  }

  cycleMusic() {
    void this.ensureSoundInitialized();
    this.soundManager.cycleBackgroundMusic();
  }

  setStateChangeCallback(callback: (state: GameState, data?: GameOverData) => void) {
    this.onStateChange = callback;
  }

  startFromMenu() {
    if (this.state === 'menu') {
      this.state = 'playing';
      this.runStartTime = performance.now();
      this.onStateChange?.('playing');
    }
  }

  start() {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    const currentTime = performance.now();
    // Clamp the step so a backgrounded tab does not resume with one huge frame
    // that teleports ghosts and stars across the screen.
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    // The starfield drifts in every state, so the menu and game over screens
    // are alive rather than a frozen picture.
    this.updateStarLayers(deltaTime);

    if (this.state === 'playing') {
      this.update(deltaTime, currentTime);
    }

    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  /** 0 on level 1, reaching 1 at the max difficulty level, flat after that. */
  private get difficulty(): number {
    return difficultyForLevel(this.level);
  }

  private get theme(): LevelTheme {
    return themeForLevel(this.level);
  }

  /**
   * Recomputes the level from the kill count. Called after every kill so the
   * banner, palette and ship tier stay in step with progress.
   */
  private updateLevel() {
    const next = levelFromKills(this.ghostsDestroyed);
    if (next === this.level) return;

    this.level = next;
    this.levelUpBannerUntil = performance.now() + this.levelBannerDuration;
    this.player.tier = shipTierForLevel(this.level);
    this.player.accentColor = this.theme.accent;
    this.soundManager.playExtraLife();
    this.visualEffects.push(new ScorePopup(
      { x: this.width / 2, y: this.height * 0.32 },
      `LEVEL ${this.level}`,
      this.theme.accent,
      Math.max(20, 38 * this.scale)
    ));
  }

  private get currentSpawnInterval(): number {
    return this.spawnIntervalStart -
      (this.spawnIntervalStart - this.spawnIntervalMin) * this.difficulty;
  }

  private get ghostSpeedMultiplier(): number {
    return 1 + (this.ghostSpeedMaxMultiplier - 1) * this.difficulty;
  }

  private loadHighScore() {
    try {
      this.highScore = parseInt(localStorage.getItem(Game.highScoreKey) ?? '', 10) || 0;
    } catch {
      this.highScore = 0; // storage disabled or private browsing
    }
  }

  private saveHighScore() {
    if (this.score <= this.highScore) return;
    this.highScore = this.score;
    try {
      localStorage.setItem(Game.highScoreKey, String(this.highScore));
    } catch {
      // storage unavailable - keep the in-memory value for this session
    }
  }

  private update(deltaTime: number, currentTime: number) {
    // Update nuke availability
    if (currentTime - this.lastNuke >= this.nukeCooldown) {
      if (!this.nukeReady) {
        this.nukeReady = true;
        this.soundManager.playNukeReady();
      }
    }
    
    // Handle player input
    this.handleInput(currentTime);
    
    // Update player
    this.player.shieldCharges = this.shieldCharges;
    this.player.update(deltaTime);
    
    // Keep player on screen
    if (this.player.position.x < this.player.width / 2) {
      this.player.position.x = this.player.width / 2;
    } else if (this.player.position.x > this.width - this.player.width / 2) {
      this.player.position.x = this.width - this.player.width / 2;
    }
    
    // Update projectiles - a shot that leaves the screen breaks the combo
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      if (projectile.isOffScreen()) {
        this.resetCombo();
        return false;
      }
      return true;
    });

    // Update power-ups and check for pickup
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.update(deltaTime);
      if (this.checkPowerUpPlayerCollision(powerUp)) {
        this.applyPowerUp(powerUp.type, currentTime);
        return false;
      }
      return !powerUp.isOffScreen(this.height);
    });
    
    // Update visual effects
    this.visualEffects = this.visualEffects.filter(effect => {
      effect.update(deltaTime);
      return !effect.isComplete;
    });
    
    // Update ghosts
    this.ghosts.forEach(ghost => {
      ghost.update(deltaTime);
      
      // Check for nearby projectiles for evasion
      const nearbyProjectile = this.projectiles.find(p => 
        Math.abs(p.position.x - ghost.position.x) < 100 &&
        p.position.y < ghost.position.y &&
        p.position.y > ghost.position.y - 200
      );
      
      if (nearbyProjectile) {
        ghost.startEvasion(nearbyProjectile.position.x);
      } else {
        ghost.stopEvasion();
      }
      
      // Keep ghosts on screen
      if (ghost.position.x < ghost.width / 2) {
        ghost.position.x = ghost.width / 2;
        ghost.evasionDirection *= -1;
      } else if (ghost.position.x > this.width - ghost.width / 2) {
        ghost.position.x = this.width - ghost.width / 2;
        ghost.evasionDirection *= -1;
      }
    });
    
    // Spawn regular ghosts
    this.ghostSpawnTimer += deltaTime * 1000;
    if (this.ghostSpawnTimer >= this.currentSpawnInterval) {
      this.spawnGhost(this.pickRegularGhostType());
      this.ghostSpawnTimer = 0;
    }
    
    // Spawn special white ghost every 30 seconds
    this.specialGhostTimer += deltaTime * 1000;
    if (this.specialGhostTimer >= this.specialGhostInterval) {
      this.spawnGhost('special');
      this.specialGhostTimer = 0;
    }
    
    // Spawn rainbow ghost every 2 minutes
    this.rainbowGhostTimer += deltaTime * 1000;
    if (this.rainbowGhostTimer >= this.rainbowGhostInterval) {
      this.spawnGhost('rainbow');
      this.rainbowGhostTimer = 0;
    }
    
    // Spawn boss ghost every 3 minutes or on demand
    this.bossGhostTimer += deltaTime * 1000;
    if (this.bossGhostTimer >= this.bossGhostInterval) {
      this.spawnGhost('boss');
      this.bossGhostTimer = 0;
    }
    
    // Handle forced boss spawn from hotkey
    if (this.forceBossSpawn) {
      this.forceBossSpawnTimer -= deltaTime * 1000;
      if (this.forceBossSpawnTimer <= 0) {
        this.spawnGhost('boss');
        this.forceBossSpawn = false;
        this.bossGhostTimer = 0; // Reset regular timer
      }
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Check for ghosts that have reached the bottom or hit player
    this.ghosts = this.ghosts.filter(ghost => {
      if (ghost.position.y + ghost.height / 2 >= this.height) {
        // Ghost escaped - lose a life (a shield does not stop an escape)
        this.loseLife();
        return false;
      }

      if (this.checkGhostPlayerCollision(ghost)) {
        // A shield charge absorbs the hit instead of costing a life
        if (this.absorbWithShield(ghost.position)) {
          return false;
        }
        this.loseLife();
        return false;
      }

      return true;
    });
  }

  private handleInput(currentTime: number) {
    // Player movement
    if (this.isMobile) {
      // Use swipe controls for mobile with speed multiplier
      if (this.isMovingLeft) {
        this.player.velocity.x = -this.player.speed * this.swipeSpeedMultiplier;
      } else if (this.isMovingRight) {
        this.player.velocity.x = this.player.speed * this.swipeSpeedMultiplier;
      } else {
        this.player.stop();
      }
    } else {
      // Use keyboard for desktop
      if (this.keys.has('ArrowLeft')) {
        this.player.moveLeft();
      } else if (this.keys.has('ArrowRight')) {
        this.player.moveRight();
      } else {
        this.player.stop();
      }
    }
    
    // Shooting (keyboard only - touch is handled in event listener)
    if (this.keys.has(' ') && currentTime - this.lastShot >= this.currentShotCooldown) {
      this.shoot();
      this.lastShot = currentTime;
    }
    
    // Nuke
    if (this.keys.has('n') && this.nukeReady) {
      this.fireNuke();
      this.lastNuke = currentTime;
      this.nukeReady = false;
    }
  }

  private shoot() {
    // Multi-shot fires a three-way spread; otherwise a single straight shot
    const angles = performance.now() < this.multiShotUntil ? [-0.28, 0, 0.28] : [0];

    for (const angle of angles) {
      const projectile = new Projectile(
        this.player.position.x,
        this.player.position.y
      );
      projectile.width *= this.scale;
      projectile.height *= this.scale;
      projectile.speed *= this.scale;
      projectile.velocity.x = projectile.speed * Math.sin(angle);
      projectile.velocity.y = -projectile.speed * Math.cos(angle);
      this.projectiles.push(projectile);
      this.shotsFired++;
    }

    // Play shoot sound
    this.soundManager.playShoot();
  }

  private get currentShotCooldown(): number {
    return performance.now() < this.rapidFireUntil ? this.rapidFireCooldown : this.shotCooldown;
  }

  private get comboMultiplier(): number {
    return Math.min(
      this.comboMaxMultiplier,
      1 + Math.floor(this.combo / this.comboKillsPerStep)
    );
  }

  /** Adds score with the combo multiplier applied and floats a popup at `at`. */
  private addScore(basePoints: number, at?: Vector2D) {
    const multiplier = this.comboMultiplier;
    const gained = basePoints * multiplier;
    this.score += gained;

    if (at) {
      this.visualEffects.push(new ScorePopup(
        at,
        multiplier > 1 ? `+${gained} x${multiplier}` : `+${gained}`,
        multiplier > 1 ? '#FFD700' : '#FFFFFF',
        Math.max(14, 22 * this.scale)
      ));
    }
  }

  private resetCombo() {
    this.combo = 0;
  }

  /** Shared bookkeeping for a destroyed ghost: score, combo, drops, extra life. */
  private registerKill(ghost: Ghost) {
    this.visualEffects.push(new ExplosionEffect(
      ghost.position,
      ghost.color === 'rainbow' ? '#FF00FF' : ghost.color
    ));
    this.soundManager.playGhostDestroyed(ghost.type);

    let points = 10;
    if (ghost.type === 'rainbow') points = 20;
    else if (ghost.type === 'special') points = 50;
    else if (ghost.type === 'boss') points = 100;
    else if (ghost.type === 'splitter') points = 15;
    else if (ghost.type === 'zigzag') points = 15;

    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;

    this.addScore(points, ghost.position);
    this.ghostsDestroyed++;
    this.updateLevel();

    // Check for life recovery every 100 ghosts
    if (this.ghostsDestroyed % 100 === 0) {
      this.lives++;
      this.soundManager.playExtraLife();
      this.visualEffects.push(new ScorePopup(
        { x: this.width / 2, y: this.height / 2 },
        'EXTRA LIFE!', '#88FF88', Math.max(18, 34 * this.scale)
      ));
    }

    this.maybeDropPowerUp(ghost);
  }

  /** Splitter ghosts break into two ordinary ghosts that cannot split again. */
  private spawnSplitterFragments(parent: Ghost) {
    for (const dir of [-1, 1]) {
      const fragment = new Ghost(
        parent.position.x + dir * parent.width * 0.4,
        parent.position.y,
        'normal'
      );
      fragment.isFragment = true;
      fragment.width *= this.scale;
      fragment.height *= this.scale;
      fragment.baseSpeed *= this.scale * this.ghostSpeedMultiplier;
      fragment.evasionSpeed *= this.scale * this.ghostSpeedMultiplier;
      fragment.velocity.y = fragment.baseSpeed;
      this.ghosts.push(fragment);
    }
  }

  private maybeDropPowerUp(ghost: Ghost) {
    // Big ghosts always reward a power-up; ordinary ghosts drop occasionally
    const guaranteed = ghost.type === 'boss' || ghost.type === 'rainbow';
    if (!guaranteed && Math.random() > this.powerUpDropChance) return;

    const types: PowerUpType[] = ['shield', 'rapidFire', 'multiShot'];
    const powerUp = new PowerUp(
      ghost.position.x,
      ghost.position.y,
      types[Math.floor(Math.random() * types.length)]
    );
    powerUp.width *= this.scale;
    powerUp.height *= this.scale;
    powerUp.velocity.y *= this.scale;
    this.powerUps.push(powerUp);
  }

  private checkPowerUpPlayerCollision(powerUp: PowerUp): boolean {
    const dx = Math.abs(powerUp.position.x - this.player.position.x);
    const dy = Math.abs(powerUp.position.y - this.player.position.y);
    return dx < (powerUp.width + this.player.width) / 2 &&
           dy < (powerUp.height + this.player.height) / 2;
  }

  private applyPowerUp(type: PowerUpType, currentTime: number) {
    let label = '';
    switch (type) {
      case 'shield':
        this.shieldCharges = Math.min(2, this.shieldCharges + 1);
        label = 'SHIELD';
        break;
      case 'rapidFire':
        this.rapidFireUntil = currentTime + this.powerUpDuration;
        label = 'RAPID FIRE';
        break;
      case 'multiShot':
        this.multiShotUntil = currentTime + this.powerUpDuration;
        label = 'MULTI SHOT';
        break;
    }

    this.soundManager.playExtraLife();
    this.visualEffects.push(new ScorePopup(
      { x: this.player.position.x, y: this.player.position.y - 40 * this.scale },
      label, '#00E5FF', Math.max(14, 20 * this.scale)
    ));
  }

  /** Consumes a shield charge to absorb a hit. Returns true if absorbed. */
  private absorbWithShield(at: Vector2D): boolean {
    if (this.shieldCharges <= 0) return false;
    this.shieldCharges--;
    this.soundManager.playGhostHit();
    this.visualEffects.push(new ScorePopup(
      at, 'BLOCKED!', '#00E5FF', Math.max(14, 20 * this.scale)
    ));
    return true;
  }

  private loseLife() {
    this.lives--;
    this.lifeLostTime = performance.now();
    this.resetCombo();
    this.soundManager.playLifeLost();
    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    const isNewHighScore = this.score > this.highScore;
    this.saveHighScore();

    this.state = 'gameOver';
    this.soundManager.playGameOver();
    this.onStateChange?.('gameOver', {
      score: this.score,
      highScore: this.highScore,
      isNewHighScore,
      ghostsDestroyed: this.ghostsDestroyed,
      accuracy: this.shotsFired > 0
        ? Math.round((this.shotsHit / this.shotsFired) * 100)
        : 0,
      bestCombo: this.bestCombo,
      timeSurvived: this.runStartTime > 0
        ? (performance.now() - this.runStartTime) / 1000
        : 0
    });
  }

  /** Zigzag and splitter ghosts start appearing as difficulty ramps up. */
  private pickRegularGhostType(): GhostType {
    const d = this.difficulty;
    const roll = Math.random();
    if (d > 0.5 && roll < 0.15) return 'splitter';
    if (d > 0.2 && roll < 0.35) return 'zigzag';
    return 'normal';
  }

  private fireNuke() {
    // Calculate blast radius (half screen height)
    const blastRadius = this.height / 2;
    
    // Create nuke visual effect
    this.visualEffects.push(new NukeEffect(this.player.position, blastRadius));
    
    // Play nuke sound
    this.soundManager.playNukeFire();
    
    // Remove all ghosts within blast radius
    this.ghosts = this.ghosts.filter(ghost => {
      const distance = Math.sqrt(
        Math.pow(ghost.position.x - this.player.position.x, 2) +
        Math.pow(ghost.position.y - this.player.position.y, 2)
      );
      
      if (distance <= blastRadius) {
        // Create explosion effect for each destroyed ghost
        this.visualEffects.push(new ExplosionEffect(ghost.position, ghost.color));
        // Bonus points for nuke kills. The combo multiplier still applies, but
        // a nuke does not build the combo itself - that rewards aimed shots.
        this.addScore(50, ghost.position);
        this.ghostsDestroyed++;

        // Check for life recovery every 100 ghosts
        if (this.ghostsDestroyed % 100 === 0) {
          this.lives++;
          this.soundManager.playExtraLife();
        }
        
        return false;
      }
      return true;
    });
  }

  private spawnGhost(type: GhostType = 'normal') {
    let baseSize = 40;
    if (type === 'special') baseSize = 80;
    if (type === 'rainbow') baseSize = 120;
    if (type === 'boss') baseSize = 160; // 4x regular size
    if (type === 'splitter') baseSize = 60;
    
    const x = Math.random() * (this.width - baseSize * this.scale) + (baseSize / 2) * this.scale;
    const ghost = new Ghost(x, -baseSize * this.scale, type);

    // Ordinary ghosts wear the level palette; special types keep their identity
    if (type === 'normal' || type === 'zigzag' || type === 'splitter') {
      const palette = this.theme.ghostColors;
      ghost.color = palette[Math.floor(Math.random() * palette.length)];
    }
    ghost.width *= this.scale;
    ghost.height *= this.scale;
    ghost.baseSpeed *= this.scale * this.ghostSpeedMultiplier;
    ghost.evasionSpeed *= this.scale * this.ghostSpeedMultiplier;
    ghost.velocity.y = ghost.baseSpeed;
    this.ghosts.push(ghost);
    
    // Play spawn sound
    this.soundManager.playGhostSpawn(type, x, this.width);
  }

  private checkCollisions() {
    const bossGhostsToExplode: Ghost[] = [];
    const rainbowGhostsToExplode: Ghost[] = [];
    const splittersToSplit: Ghost[] = [];

    this.projectiles = this.projectiles.filter(projectile => {
      // A projectile is spent on the first ghost it touches
      const ghost = this.ghosts.find(g => this.checkProjectileGhostCollision(projectile, g));
      if (!ghost) return true;

      this.shotsHit++;
      const isDestroyed = ghost.takeDamage();

      if (isDestroyed) {
        this.ghosts = this.ghosts.filter(g => g !== ghost);
        this.registerKill(ghost);

        // Area effects are resolved after the loop so the arrays stay stable
        if (ghost.type === 'rainbow') {
          rainbowGhostsToExplode.push(ghost);
        } else if (ghost.type === 'boss') {
          bossGhostsToExplode.push(ghost);
        } else if (ghost.isSplitter && !ghost.isFragment) {
          splittersToSplit.push(ghost);
        }
      } else {
        // Ghost survived the hit - smaller burst and partial credit
        const smallExplosion = new ExplosionEffect(
          ghost.position,
          ghost.color === 'rainbow' ? '#FF00FF' : ghost.color
        );
        smallExplosion.duration = 0.3;
        this.visualEffects.push(smallExplosion);
        this.soundManager.playGhostHit();
        this.addScore(ghost.type === 'rainbow' ? 30 : 25, ghost.position);
      }

      return false; // projectile consumed
    });

    rainbowGhostsToExplode.forEach(ghost => this.handleRainbowGhostExplosion(ghost));
    bossGhostsToExplode.forEach(ghost => this.handleBossGhostExplosion(ghost));
    splittersToSplit.forEach(ghost => this.spawnSplitterFragments(ghost));
  }

  private checkProjectileGhostCollision(projectile: Projectile, ghost: Ghost): boolean {
    return projectile.position.x >= ghost.position.x - ghost.width / 2 &&
           projectile.position.x <= ghost.position.x + ghost.width / 2 &&
           projectile.position.y <= ghost.position.y + ghost.height / 2 &&
           projectile.position.y + projectile.height >= ghost.position.y - ghost.height / 2;
  }

  private checkGhostPlayerCollision(ghost: Ghost): boolean {
    const dx = Math.abs(ghost.position.x - this.player.position.x);
    const dy = Math.abs(ghost.position.y - this.player.position.y);
    
    return dx < (ghost.width + this.player.width) / 2 &&
           dy < (ghost.height + this.player.height) / 2;
  }

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw stars
    this.drawStars();

    // Menu state - just show animated background, overlay handles the rest
    if (this.state === 'menu') {
      return;
    }

    // Draw game objects
    if (this.state !== 'gameOver') {
      this.player.render(this.ctx);
      this.ghosts.forEach(ghost => ghost.render(this.ctx));
      this.projectiles.forEach(projectile => projectile.render(this.ctx));
      this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
      this.visualEffects.forEach(effect => effect.render(this.ctx));
    }

    // Draw UI
    this.drawUI();
    this.drawLevelBanner();
  }

  private initializeStarLayers() {
    // Three depth layers. Speed, size and brightness all increase together so
    // nearer stars visibly overtake farther ones - that contrast is the whole
    // parallax effect. Speeds are in units of "screens per second" and get
    // multiplied by canvas height, so the illusion holds at any size.
    const layers = [
      { speedFactor: 0.020, count: 60, sizeRange: [0.6, 1.2], opacity: 0.45 }, // far
      { speedFactor: 0.055, count: 32, sizeRange: [1.2, 2.0], opacity: 0.75 }, // mid
      { speedFactor: 0.120, count: 18, sizeRange: [2.0, 3.2], opacity: 1.0 }   // near
    ];

    this.starLayers = [];
    layers.forEach((config) => {
      const stars: Star[] = [];
      for (let i = 0; i < config.count; i++) {
        stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: (config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0])) * this.scale,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.5 + Math.random() * 2
        });
      }

      this.starLayers.push({
        stars,
        speedFactor: config.speedFactor,
        speed: config.speedFactor * this.height,
        opacity: config.opacity
      });
    });
  }

  private updateStarLayers(deltaTime: number) {
    this.starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        star.y += layer.speed * deltaTime;
        star.twinkle += star.twinkleSpeed * deltaTime;

        // Wrap to the top once fully off the bottom
        if (star.y - star.size > this.height) {
          star.y = -star.size;
          star.x = Math.random() * this.width;
        }
      });
    });
  }

  private drawStars() {
    const tint = this.theme.star;
    const r = parseInt(tint.slice(1, 3), 16);
    const g = parseInt(tint.slice(3, 5), 16);
    const b = parseInt(tint.slice(5, 7), 16);

    this.ctx.save();
    // Draw back to front. Only the nearest layer pays for a glow: shadowBlur is
    // the most expensive canvas op here and 100+ blurred stars per frame was
    // measurably costly on low-end tablets.
    this.starLayers.forEach((layer, layerIndex) => {
      const isNearLayer = layerIndex === this.starLayers.length - 1;

      if (isNearLayer) {
        this.ctx.shadowBlur = 6 * this.scale;
        this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
      } else {
        this.ctx.shadowBlur = 0;
      }

      layer.stars.forEach(star => {
        const twinkle = 0.55 + 0.45 * Math.sin(star.twinkle);
        const alpha = layer.opacity * twinkle;

        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Bright core keeps near stars reading as points, not blobs
        if (isNearLayer) {
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(star.x, star.y, star.size * 0.22, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    });
    this.ctx.restore();
  }

  /** Full-width level-up flash, shown briefly when a new level starts. */
  private drawLevelBanner() {
    const remaining = this.levelUpBannerUntil - performance.now();
    if (remaining <= 0) return;

    const progress = 1 - remaining / this.levelBannerDuration;
    // Fade in fast, hold, then fade out
    const alpha = progress < 0.15
      ? progress / 0.15
      : progress > 0.7
        ? Math.max(0, 1 - (progress - 0.7) / 0.3)
        : 1;

    const bandHeight = Math.round(70 * this.scale);
    const centreY = this.height * 0.42;

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
    this.ctx.fillRect(0, centreY - bandHeight / 2, this.width, bandHeight);

    this.ctx.strokeStyle = this.hexToRgba(this.theme.accent, alpha * 0.9);
    this.ctx.lineWidth = Math.max(1, 2 * this.scale);
    this.ctx.beginPath();
    this.ctx.moveTo(0, centreY - bandHeight / 2);
    this.ctx.lineTo(this.width, centreY - bandHeight / 2);
    this.ctx.moveTo(0, centreY + bandHeight / 2);
    this.ctx.lineTo(this.width, centreY + bandHeight / 2);
    this.ctx.stroke();

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = this.theme.accent;
    this.ctx.fillStyle = this.hexToRgba(this.theme.accent, alpha);
    this.ctx.font = `bold ${Math.round(34 * this.scale)}px 'Oxanium', sans-serif`;
    this.ctx.fillText(`LEVEL ${this.level}`, this.width / 2, centreY - bandHeight * 0.16);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
    this.ctx.font = `${Math.round(16 * this.scale)}px 'Oxanium', sans-serif`;
    this.ctx.fillText(this.theme.name, this.width / 2, centreY + bandHeight * 0.26);
    this.ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /** Active power-up indicators, stacked under the left-hand HUD column. */
  private drawPowerUpStatus(padding: number, fontSize: number) {
    const now = performance.now();
    const entries: { label: string; color: string }[] = [];

    if (this.shieldCharges > 0) {
      entries.push({
        label: `Shield x${this.shieldCharges}`,
        color: '#00E5FF'
      });
    }
    if (now < this.rapidFireUntil) {
      entries.push({
        label: `Rapid Fire ${Math.ceil((this.rapidFireUntil - now) / 1000)}s`,
        color: '#FFD700'
      });
    }
    if (now < this.multiShotUntil) {
      entries.push({
        label: `Multi Shot ${Math.ceil((this.multiShotUntil - now) / 1000)}s`,
        color: '#FF4FD8'
      });
    }
    if (entries.length === 0) return;

    this.ctx.save();
    this.ctx.textAlign = 'left';
    this.ctx.font = `bold ${fontSize}px 'Oxanium', sans-serif`;
    entries.forEach((entry, index) => {
      this.ctx.fillStyle = entry.color;
      this.ctx.fillText(entry.label, padding, padding * (9.9 + index * 1.1));
    });
    this.ctx.restore();
  }

  private drawUI() {
    const baseFontSize = Math.round(24 * this.scale);
    const smallFontSize = Math.round(18 * this.scale);
    const padding = Math.round(20 * this.scale);
    
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;

    // Level and progress toward the next one
    const killsIntoLevel = this.ghostsDestroyed % KILLS_PER_LEVEL;
    const levelProgress = killsIntoLevel / KILLS_PER_LEVEL;
    this.ctx.fillStyle = this.theme.accent;
    this.ctx.font = `bold ${smallFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillText(
      `Level ${this.level} - ${this.theme.name}`,
      padding,
      padding * 4.1
    );

    const barWidth = Math.round(150 * this.scale);
    const barHeight = Math.max(3, Math.round(5 * this.scale));
    const barY = padding * 4.1 + barHeight;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    this.ctx.fillRect(padding, barY, barWidth, barHeight);
    this.ctx.fillStyle = this.theme.accent;
    this.ctx.fillRect(padding, barY, barWidth * levelProgress, barHeight);

    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillText(`Score: ${this.score}`, padding, padding * 2);

    // Personal best, highlighted once this run overtakes it
    const beatingBest = this.score > this.highScore && this.highScore > 0;
    this.ctx.font = `${smallFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillStyle = beatingBest ? '#FFD700' : 'rgba(255, 255, 255, 0.65)';
    this.ctx.fillText(
      beatingBest ? 'NEW BEST!' : `Best: ${Math.max(this.highScore, this.score)}`,
      padding,
      padding * 3.1
    );
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
    
    // Lives indicator with blinking effect
    const currentTime = performance.now();
    const timeSinceLifeLost = currentTime - this.lifeLostTime;
    
    if (timeSinceLifeLost < this.lifeLostBlinkDuration) {
      // Blink between red and white
      const blinkPhase = Math.floor(timeSinceLifeLost / this.lifeLostBlinkInterval);
      this.ctx.fillStyle = blinkPhase % 2 === 0 ? 'red' : 'white';
    } else {
      this.ctx.fillStyle = 'white';
    }
    
    this.ctx.fillText(`Lives: ${this.lives}`, padding, padding * 6.1);
    
    // Reset fill style for subsequent drawing
    this.ctx.fillStyle = 'white';
    
    // Ghosts destroyed counter and progress to next life
    const ghostsToNextLife = 100 - (this.ghostsDestroyed % 100);
    this.ctx.fillStyle = '#88FF88';
    this.ctx.font = `${smallFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillText(`Ghosts: ${this.ghostsDestroyed} (${ghostsToNextLife} to +1 life)`, padding, padding * 7.5);

    // Combo meter - only while a streak is actually running
    if (this.combo > 1) {
      const multiplier = this.comboMultiplier;
      this.ctx.fillStyle = multiplier > 1 ? '#FFD700' : '#FFFFFF';
      this.ctx.font = `bold ${smallFontSize}px 'Oxanium', sans-serif`;
      this.ctx.fillText(
        `Combo: ${this.combo}${multiplier > 1 ? `  (x${multiplier})` : ''}`,
        padding,
        padding * 8.7
      );
    }

    this.drawPowerUpStatus(padding, smallFontSize);
    
    // Reset font for other UI elements
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
    
    // Nuke indicator
    this.ctx.textAlign = 'center';
    if (this.nukeReady) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText('NUKE READY! (Press N)', this.width / 2, padding * 4);
    } else {
      // Show countdown
      const timeElapsed = performance.now() - this.lastNuke;
      const timeRemaining = Math.max(0, this.nukeCooldown - timeElapsed);
      const secondsRemaining = Math.ceil(timeRemaining / 1000);
      this.ctx.fillStyle = '#888888';
      this.ctx.fillText(`Nuke in: ${secondsRemaining}s`, this.width / 2, padding * 4);
    }
    
    // Sound indicator
    this.ctx.font = `${smallFontSize}px 'Oxanium', sans-serif`;
    const soundEnabled = this.soundManager.isSoundEnabled();
    this.ctx.fillStyle = soundEnabled ? '#88FF88' : '#FF8888';
    this.ctx.fillText(soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF', this.width / 2, padding * 6);
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
    
    this.ctx.textAlign = 'left';
    
    // Controls legend
    if (this.showControls) {
      this.drawControlsLegend();
    }
    
    // Game state messages
    if (this.state === 'paused') {
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.round(48 * this.scale)}px 'Oxanium', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
      this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
      const resumeText = this.isMobile ? 'Tap to resume' : 'Press ESC to resume';
      this.ctx.fillText(resumeText, this.width / 2, this.height / 2 + 40 * this.scale);
      this.ctx.textAlign = 'left';
    }
    // Game over UI handled by HTML overlay
  }

  private handleRainbowGhostExplosion(rainbowGhost: Ghost) {
    // Calculate blast radius (smaller than nuke)
    const blastRadius = 150 * this.scale;
    
    // Destroy nearby ghosts
    this.ghosts = this.ghosts.filter(ghost => {
      if (ghost === rainbowGhost) return true; // Skip the rainbow ghost itself
      
      const distance = Math.sqrt(
        Math.pow(ghost.position.x - rainbowGhost.position.x, 2) +
        Math.pow(ghost.position.y - rainbowGhost.position.y, 2)
      );
      
      if (distance <= blastRadius) {
        // Create explosion effect for each destroyed ghost
        this.visualEffects.push(new ExplosionEffect(ghost.position, ghost.color));
        this.score += 10; // Bonus points for chain destruction
        this.ghostsDestroyed++;
        
        // Check for life recovery
        if (this.ghostsDestroyed % 100 === 0) {
          this.lives++;
        }
        
        return false;
      }
      return true;
    });
  }

  private handleBossGhostExplosion(bossGhost: Ghost) {
    // Calculate massive blast radius (almost full screen)
    const blastRadius = Math.max(this.width, this.height) * 0.8;
    
    // Create massive nuke visual effect
    this.visualEffects.push(new NukeEffect(bossGhost.position, blastRadius));
    
    // Destroy all ghosts on screen (boss is already destroyed)
    const ghostsDestroyed: Ghost[] = [];
    
    this.ghosts = this.ghosts.filter(ghost => {
      // Create explosion effect for each destroyed ghost
      this.visualEffects.push(new ExplosionEffect(ghost.position, ghost.color));
      ghostsDestroyed.push(ghost);
      return false; // Remove all ghosts
    });
    
    const destroyedCount = ghostsDestroyed.length;
    
    // Massive points for chain destruction
    this.score += destroyedCount * 20; // 20 per ghost destroyed by explosion
    this.ghostsDestroyed += destroyedCount;
    
    // Check for life recovery
    const livesGained = Math.floor(this.ghostsDestroyed / 100) - Math.floor((this.ghostsDestroyed - destroyedCount) / 100);
    if (livesGained > 0) {
      this.lives += livesGained;
    }
  }

  private drawControlsLegend() {
    // Draw controls on the right side
    const boxWidth = Math.round(this.isMobile ? 250 * this.scale : 190 * this.scale);
    const boxHeight = Math.round(this.isMobile ? 200 * this.scale : 200 * this.scale);
    const x = this.width - boxWidth - Math.round(10 * this.scale);
    const startY = Math.round(40 * this.scale);
    const lineHeight = Math.round(this.isMobile ? 40 * this.scale : 30 * this.scale);
    const padding = Math.round(10 * this.scale);
    
    this.ctx.save();
    
    // Background for controls
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - padding, startY - Math.round(25 * this.scale), boxWidth, boxHeight);
    
    // Store box bounds for swipe detection
    if (this.isMobile) {
      this.controlsBoxBounds = {
        x: x - padding,
        y: startY - Math.round(25 * this.scale),
        width: boxWidth,
        height: boxHeight
      };
    }
    
    // Title
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `bold ${Math.round(this.isMobile ? 28 * this.scale : 20 * this.scale)}px 'Oxanium', sans-serif`;
    this.ctx.fillText('CONTROLS', x, startY);
    
    // Control items
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${Math.round(this.isMobile ? 22 * this.scale : 16 * this.scale)}px 'Oxanium', sans-serif`;
    
    const controls = this.isMobile ? [
      { key: 'SWIPE ←→', action: 'Move' },
      { key: 'TAP', action: 'Shoot' },
      { key: '2xTAP', action: 'Nuke' },
      { key: 'SWIPE AWAY', action: 'Hide' }
    ] : [
      { key: '← →', action: 'Move' },
      { key: 'SPACE', action: 'Shoot' },
      { key: 'N', action: 'Nuke' },
      { key: 'B', action: 'Boss in 5s' },
      { key: 'ESC', action: 'Pause Game' },
      { key: 'S', action: 'Mute Sounds' },
      { key: 'M', action: 'Music Change' },
      { key: 'H', action: 'Hide Help' }
    ];
    
    controls.forEach((control, index) => {
      const y = startY + (index + 1) * lineHeight;
      
      // Key
      this.ctx.fillStyle = '#88CCFF';
      this.ctx.font = `bold ${Math.round(this.isMobile ? 20 * this.scale : 14 * this.scale)}px 'Oxanium', sans-serif`;
      this.ctx.fillText(control.key, x, y);
      
      // Action
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.round(this.isMobile ? 20 * this.scale : 14 * this.scale)}px 'Oxanium', sans-serif`;
      this.ctx.fillText(control.action, x + Math.round(this.isMobile ? 120 * this.scale : 60 * this.scale), y);
    });
    
    this.ctx.restore();
  }
}

export interface GameOverData {
  score?: number;
  highScore?: number;
  isNewHighScore?: boolean;
  ghostsDestroyed?: number;
  accuracy?: number; // percent, 0-100
  bestCombo?: number;
  timeSurvived?: number; // seconds
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
  twinkleSpeed: number;
}

interface StarLayer {
  stars: Star[];
  /** Screens per second; multiplied by canvas height to get pixels per second. */
  speedFactor: number;
  speed: number;
  opacity: number;
}
