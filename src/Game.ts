import { Player } from './Player';
import { Ghost, GhostType } from './Ghost';
import { Projectile } from './Projectile';
import { GameState } from './types';
import { VisualEffect, NukeEffect, ExplosionEffect, HurricaneSliceEffect, GhostChopEffect } from './effects/VisualEffect';
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
  private onStateChange?: (state: GameState, data?: { score?: number }) => void;
  private score: number = 0;
  private lives: number = 3;
  private ammo: bigint = 1_000_000_000_000_000_000_000_000_000n; // 1 octillion
  private ghostsDestroyed: number = 0;
  private lastTime: number = 0;
  private lastShot: number = 0;
  private shotCooldown: number = 250; // 0.25 seconds
  
  private ghostSpawnTimer: number = 0;
  private ghostSpawnInterval: number = 2000; // 2 seconds
  private specialGhostTimer: number = 0;
  private specialGhostInterval: number = 30000; // 30 seconds
  private rainbowGhostTimer: number = 0;
  private rainbowGhostInterval: number = 120000; // 2 minutes
  private outlinedGhostTimer: number = 0;
  private outlinedGhostInterval: number = 120000; // 2 minutes (testing default)
  private outlinedGhostPauseTimer: number = 0;
  private outlinedGhostPauseDuration: number = 20000; // 20 seconds
  private pendingHurricaneGhost: Ghost | null = null;
  private pendingHurricaneGhostLastY: number = 0;
  private bossGhostTimer: number = 0;
  private bossGhostInterval: number = 180000; // 3 minutes
  private bossWarningThreshold: number = 5000; // 5 seconds
  private nextBossSpawnX: number | null = null;
  private forceBossSpawn: boolean = false;
  private forceBossSpawnTimer: number = 0;
  
  private keys: Set<string> = new Set();
  private speechInputActive: boolean = false;
  private speechDraft: string = '';
  private speechText: string = '';
  private speechBubbleTimer: number = 0;
  private ghostTalkTimer: number = 0;
  private ghostTalkInterval: number = 4500;
  
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
    const isTesting = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.outlinedGhostInterval = isTesting ? 120000 : 300000; // 2 min testing, 5 min gaming
    
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
      if (this.speechInputActive) {
        e.preventDefault();
        if (e.key === 'Escape') {
          this.speechText = this.speechDraft.replace(/\s+/g, ' ').trim().slice(0, 80);
          this.speechBubbleTimer = 10000;
          this.speechInputActive = false;
          this.speechDraft = '';
          this.state = 'playing';
        } else if (e.key === 'Backspace') {
          this.speechDraft = this.speechDraft.slice(0, -1);
        } else if (e.key === 'Enter') {
          this.speechDraft += ' ';
        } else if (e.key.length === 1 && this.speechDraft.length < 80) {
          this.speechDraft += e.key;
        }
        return;
      }

      // Initialize sound on first key press
      if (!this.soundInitialized) {
        await this.soundManager.init();
        this.soundInitialized = true;
      }

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
      if (e.key.toLowerCase() === 'e' && this.state === 'playing') {
        this.state = 'gameOver';
        this.soundManager.playGameOver();
        this.onStateChange?.('gameOver', { score: this.score });
        return;
      }
      if (e.key.toLowerCase() === 'b') {
        // Trigger boss spawn in 5 seconds
        this.forceBossSpawn = true;
        this.forceBossSpawnTimer = 5000; // 5 seconds
        this.nextBossSpawnX = this.nextBossSpawnX ?? this.getRandomGhostSpawnX(160);
      }
      if (e.key.toLowerCase() === 'm') {
        this.soundManager.cycleBackgroundMusic();
      }
      if (e.key.toLowerCase() === 's' && this.state === 'playing') {
        this.state = 'paused';
        this.speechInputActive = true;
        this.speechDraft = '';
      }
      if (e.key.toLowerCase() === 'v') {
        // Toggle mute with V
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
    
    // Optional: Resume when browser gains focus (can be removed if you prefer manual resume)
    // window.addEventListener('focus', () => {
    //   if (this.state === 'paused') {
    //     this.state = 'playing';
    //   }
    // });
  }

  private setupMobileControls() {
    // Touch start - record position and shoot
    this.canvas.addEventListener('touchstart', async (e) => {
      e.preventDefault();

      // Initialize sound on first touch
      if (!this.soundInitialized) {
        await this.soundManager.init();
        this.soundInitialized = true;
      }

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
      if (currentTime - this.lastShot >= this.shotCooldown) {
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
    
    // Adjust star positions proportionally
    this.starLayers.forEach(layer => {
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
    this.ammo = 1_000_000_000_000_000_000_000_000_000n;
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
    this.outlinedGhostTimer = 0;
    this.outlinedGhostPauseTimer = 0;
    this.pendingHurricaneGhost = null;
    this.pendingHurricaneGhostLastY = 0;
    this.bossGhostTimer = 0;
    this.nextBossSpawnX = null;
    this.lifeLostTime = 0;

    // Reset player position
    this.player.position.x = this.width / 2;
    this.player.position.y = this.height - 60 * this.scale;

    // Resume background music
    this.soundManager.resumeBackgroundMusic();
  }

  setStateChangeCallback(callback: (state: GameState, data?: { score?: number }) => void) {
    this.onStateChange = callback;
  }

  startFromMenu() {
    if (this.state === 'menu') {
      this.state = 'playing';
      this.onStateChange?.('playing');
    }
  }

  start() {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    if (this.state === 'playing') {
      this.update(deltaTime, currentTime);
    }
    
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number, currentTime: number) {
    // Update parallax stars
    this.updateStarLayers(deltaTime);
    
    // Update nuke availability
    if (currentTime - this.lastNuke >= this.nukeCooldown) {
      if (!this.nukeReady) {
        this.nukeReady = true;
        this.soundManager.playNukeReady();
      }
    }
    
    // Handle player input
    this.handleInput(currentTime);

    if (this.speechBubbleTimer > 0) {
      this.speechBubbleTimer = Math.max(0, this.speechBubbleTimer - deltaTime * 1000);
    }
    
    // Update player
    this.player.update(deltaTime);

    if (this.outlinedGhostPauseTimer > 0) {
      this.outlinedGhostPauseTimer = Math.max(0, this.outlinedGhostPauseTimer - deltaTime * 1000);
    }

    const bossTimerSpeedMultiplier = this.outlinedGhostPauseTimer > 0 ? 1 / 3 : 1;
    
    // Keep player on screen
    if (this.player.position.x < this.player.width / 2) {
      this.player.position.x = this.player.width / 2;
    } else if (this.player.position.x > this.width - this.player.width / 2) {
      this.player.position.x = this.width - this.player.width / 2;
    }
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      return !projectile.isOffScreen();
    });
    
    // Update visual effects
    this.visualEffects = this.visualEffects.filter(effect => {
      effect.update(deltaTime);
      return !effect.isComplete;
    });

    this.ghostTalkTimer += deltaTime * 1000;
    if (this.ghostTalkTimer >= this.ghostTalkInterval) {
      this.makeGhostTalk();
      this.ghostTalkTimer = 0;
    }
    
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
    
    // Queue outlined ghost event every 2 min testing / 5 min gaming
    this.outlinedGhostTimer += deltaTime * 1000;
    if (this.outlinedGhostTimer >= this.outlinedGhostInterval) {
      this.queueOutlinedGhostAppearance();
      this.outlinedGhostTimer = 0;
    }

    this.updatePendingHurricaneTrigger();

    if (this.outlinedGhostPauseTimer <= 0) {
      // Spawn regular ghosts
      this.ghostSpawnTimer += deltaTime * 1000;
      if (this.ghostSpawnTimer >= this.ghostSpawnInterval) {
        this.spawnGhost();
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
    }
    
    // Boss timer runs 3x slower during outlined ghost pause effect
    this.bossGhostTimer += deltaTime * 1000 * bossTimerSpeedMultiplier;

    if (this.forceBossSpawn) {
      this.forceBossSpawnTimer -= deltaTime * 1000 * bossTimerSpeedMultiplier;
    }

    if (this.outlinedGhostPauseTimer <= 0) {
      const timeToBossSpawn = this.bossGhostInterval - this.bossGhostTimer;
      if (this.nextBossSpawnX === null && timeToBossSpawn <= this.bossWarningThreshold) {
        this.nextBossSpawnX = this.getRandomGhostSpawnX(160);
      }

      // Spawn boss ghost every 3 minutes or on demand
      if (this.bossGhostTimer >= this.bossGhostInterval) {
        this.spawnGhost('boss', this.nextBossSpawnX ?? undefined);
        this.bossGhostTimer = 0;
        this.nextBossSpawnX = null;
      }
      
      // Handle forced boss spawn from hotkey
      if (this.forceBossSpawn) {
        if (this.forceBossSpawnTimer <= 0) {
          const shouldSpawnBoss = Math.random() < 0.85;
          if (shouldSpawnBoss) {
            this.spawnGhost('boss', this.nextBossSpawnX ?? undefined);
            this.bossGhostTimer = 0; // Reset regular timer only if boss actually spawns
          }
          this.forceBossSpawn = false;
          this.nextBossSpawnX = null;
        }
      }
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Check for ghosts that have reached the bottom or hit player
    this.ghosts = this.ghosts.filter(ghost => {
      if (ghost.position.y + ghost.height / 2 >= this.height) {
        // Ghost escaped - lose a life
        this.lives--;
        this.lifeLostTime = performance.now();
        this.soundManager.playLifeLost();
        if (this.lives <= 0) {
          this.state = 'gameOver';
          this.soundManager.playGameOver();
          this.onStateChange?.('gameOver', { score: this.score });
        }
        return false;
      }

      if (this.checkGhostPlayerCollision(ghost)) {
        // Ghost hit player - lose a life
        this.lives--;
        this.lifeLostTime = performance.now();
        this.soundManager.playLifeLost();
        if (this.lives <= 0) {
          this.state = 'gameOver';
          this.soundManager.playGameOver();
          this.onStateChange?.('gameOver', { score: this.score });
        }
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
    if (this.keys.has(' ') && currentTime - this.lastShot >= this.shotCooldown) {
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
    if (this.ammo <= 0n) {
      this.state = 'gameOver';
      this.soundManager.playGameOver();
      this.onStateChange?.('gameOver', { score: this.score });
      return;
    }

    const projectile = new Projectile(
      this.player.position.x,
      this.player.position.y
    );
    projectile.width *= this.scale;
    projectile.height *= this.scale;
    projectile.speed *= this.scale;
    this.projectiles.push(projectile);
    this.ammo -= 1n;

    if (this.ammo === 0n) {
      this.state = 'gameOver';
      this.soundManager.playGameOver();
      this.onStateChange?.('gameOver', { score: this.score });
    }
    
    // Play shoot sound
    this.soundManager.playShoot();
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
        this.score += 50; // Bonus points for nuke kills
        this.ghostsDestroyed++;
        
        // Check for life recovery every 100 ghosts
        if (this.ghostsDestroyed % 100 === 0) {
          this.lives++;
        }
        
        return false;
      }
      return true;
    });
  }

  private spawnGhost(type: GhostType = 'normal', spawnX?: number) {
    let baseSize = 40;
    if (type === 'special') baseSize = 80;
    if (type === 'rainbow') baseSize = 120;
    if (type === 'boss') baseSize = 160; // 4x regular size
    
    const x = spawnX ?? this.getRandomGhostSpawnX(baseSize);
    const ghost = new Ghost(x, -baseSize * this.scale, type);
    ghost.width *= this.scale;
    ghost.height *= this.scale;
    ghost.baseSpeed *= this.scale;
    ghost.evasionSpeed *= this.scale;
    this.ghosts.push(ghost);
    
    // Play spawn sound
    this.soundManager.playGhostSpawn(type, x, this.width);
  }

  private getRandomGhostSpawnX(baseSize: number): number {
    return Math.random() * (this.width - baseSize * this.scale) + (baseSize / 2) * this.scale;
  }

  private handleOutlinedGhostShot() {
    this.ghosts = [];
    this.projectiles = [];
    this.visualEffects = [];
    this.outlinedGhostPauseTimer = this.outlinedGhostPauseDuration;
    this.pendingHurricaneGhost = null;
    this.pendingHurricaneGhostLastY = 0;
  }

  private queueOutlinedGhostAppearance() {
    const unluckyGhost = this.chooseUnluckyGhostForCenterSlash();

    if (unluckyGhost) {
      this.pendingHurricaneGhost = unluckyGhost;
      this.pendingHurricaneGhostLastY = unluckyGhost.position.y;
      return;
    }

    this.spawnGhost();
    this.pendingHurricaneGhost = this.chooseUnluckyGhostForCenterSlash();
    if (this.pendingHurricaneGhost) {
      this.pendingHurricaneGhostLastY = this.pendingHurricaneGhost.position.y;
    }
  }

  private chooseUnluckyGhostForCenterSlash(): Ghost | null {
    const centerY = this.height / 2;
    const candidates = this.ghosts.filter(ghost => ghost.type !== 'boss');
    if (candidates.length === 0) {
      return null;
    }

    const approachingCenter = candidates.filter(ghost => ghost.position.y < centerY);
    if (approachingCenter.length > 0) {
      return approachingCenter[Math.floor(Math.random() * approachingCenter.length)];
    }

    return candidates.reduce((closestGhost, ghost) => {
      const ghostDistance = Math.abs(ghost.position.y - centerY);
      const closestDistance = Math.abs(closestGhost.position.y - centerY);
      return ghostDistance < closestDistance ? ghost : closestGhost;
    });
  }

  private updatePendingHurricaneTrigger() {
    if (!this.pendingHurricaneGhost) {
      return;
    }

    const trackedGhost = this.ghosts.find(ghost => ghost === this.pendingHurricaneGhost);
    if (!trackedGhost || trackedGhost.type === 'boss') {
      this.pendingHurricaneGhost = this.chooseUnluckyGhostForCenterSlash();
      this.pendingHurricaneGhostLastY = this.pendingHurricaneGhost?.position.y ?? 0;
      return;
    }

    const centerY = this.height / 2;
    const overlapsCenterLine = Math.abs(trackedGhost.position.y - centerY) <= trackedGhost.height / 2;
    const crossedCenterLine = (this.pendingHurricaneGhostLastY - centerY) * (trackedGhost.position.y - centerY) <= 0;
    this.pendingHurricaneGhostLastY = trackedGhost.position.y;
    if (overlapsCenterLine || crossedCenterLine) {
      this.pendingHurricaneGhost = null;
      this.pendingHurricaneGhostLastY = 0;
      this.triggerOutlinedGhostAppearance(trackedGhost);
    }
  }

  private triggerOutlinedGhostAppearance(forceChopGhost?: Ghost) {
    this.soundManager.playHurricaneSlice();

    const middleY = this.height / 2;
    this.visualEffects.push(new HurricaneSliceEffect(this.width, middleY));
    this.ghosts = this.ghosts.filter(ghost => {
      if (ghost.type === 'boss') return true;
      if (ghost === forceChopGhost || Math.abs(ghost.position.y - middleY) <= ghost.height / 2) {
        this.visualEffects.push(new GhostChopEffect(ghost.position, ghost.width, ghost.height, ghost.color));
        return false;
      }
      return true;
    });

    this.spawnGhost('outlined');
  }

  private checkCollisions() {
    // Check projectile-ghost collisions
    let bossGhostToExplode: Ghost | null = null;
    let rainbowGhostsToExplode: Ghost[] = [];
    let outlinedGhostWasShot = false;
    
    this.projectiles = this.projectiles.filter(projectile => {
      let hit = false;
      this.ghosts = this.ghosts.filter(ghost => {
        if (this.checkProjectileGhostCollision(projectile, ghost)) {
          const isDestroyed = ghost.takeDamage();

          if (isDestroyed) {
            // Create explosion effect for destroyed ghost
            this.visualEffects.push(new ExplosionEffect(ghost.position, ghost.color === 'rainbow' ? '#FF00FF' : ghost.color));
            this.soundManager.playGhostDestroyed(ghost.type);

            // Points based on ghost type
            let points = 10;
            if (ghost.type === 'rainbow') {
              points = 20;
            } else if (ghost.type === 'special') {
              points = 50;
            } else if (ghost.type === 'outlined') {
              points = 50;
            } else if (ghost.type === 'boss') {
              points = 100;
            }

            this.score += points;
            this.ghostsDestroyed++;

            if (this.ghostsDestroyed % 100 === 0) {
              this.lives++;
              this.soundManager.playExtraLife();
            }

            if (ghost.type === 'rainbow') {
              rainbowGhostsToExplode.push(ghost);
            } else if (ghost.type === 'boss') {
              bossGhostToExplode = ghost;
            } else if (ghost.type === 'outlined') {
              outlinedGhostWasShot = true;
            }
          } else {
            // Ghost survived hit
            const smallExplosion = new ExplosionEffect(ghost.position, ghost.color === 'rainbow' ? '#FF00FF' : ghost.color);
            smallExplosion.duration = 0.3;
            this.visualEffects.push(smallExplosion);

            this.soundManager.playGhostHit();

            if (ghost.type === 'rainbow') {
              this.score += 30;
            } else if (ghost.type === 'outlined') {
              this.score += 50;
            } else {
              this.score += 25;
            }
          }

          hit = true;
          return !isDestroyed; // Keep ghost if not destroyed
        }
        return true;
      });
      return !hit;
    });

    if (outlinedGhostWasShot) {
      this.handleOutlinedGhostShot();
      return;
    }
    
    // Handle area explosions after the main collision loop
    rainbowGhostsToExplode.forEach(ghost => {
      this.handleRainbowGhostExplosion(ghost);
    });
    
    if (bossGhostToExplode) {
      this.handleBossGhostExplosion(bossGhostToExplode);
    }
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
      if (this.speechBubbleTimer > 0 && this.speechText) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = Math.max(1, this.scale);
        this.ctx.font = `${Math.round(18 * this.scale)}px 'Oxanium', sans-serif`;
        this.ctx.textAlign = 'center';
        const bubbleY = this.player.position.y - this.player.height;
        this.ctx.fillRect(this.player.position.x - 140 * this.scale, bubbleY - 38 * this.scale, 280 * this.scale, 32 * this.scale);
        this.ctx.strokeRect(this.player.position.x - 140 * this.scale, bubbleY - 38 * this.scale, 280 * this.scale, 32 * this.scale);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(this.speechText, this.player.position.x, bubbleY - 16 * this.scale);
        this.ctx.textAlign = 'left';
      }
      this.ghosts.forEach(ghost => ghost.render(this.ctx));
      this.projectiles.forEach(projectile => projectile.render(this.ctx));
      this.visualEffects.forEach(effect => effect.render(this.ctx));
      this.drawBossIncomingIndicator();
    }

    // Draw UI
    this.drawUI();
  }

  private initializeStarLayers() {
    // Create 3 layers of stars for parallax effect
    const layers = [
      { speed: 20, count: 50, sizeRange: [0.5, 1], opacity: 0.4 }, // Far layer
      { speed: 50, count: 30, sizeRange: [1, 2], opacity: 0.7 },   // Middle layer
      { speed: 100, count: 20, sizeRange: [2, 3], opacity: 1.0 }   // Near layer
    ];
    
    layers.forEach((config) => {
      const stars: Star[] = [];
      for (let i = 0; i < config.count; i++) {
        stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.5 + Math.random() * 2
        });
      }
      
      this.starLayers.push({
        stars,
        speed: config.speed,
        opacity: config.opacity
      });
    });
  }
  
  private updateStarLayers(deltaTime: number) {
    this.starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        // Move star downward
        star.y += layer.speed * deltaTime;
        
        // Update twinkle effect
        star.twinkle += star.twinkleSpeed * deltaTime;
        
        // Wrap star to top when it goes off bottom
        if (star.y > this.height + star.size) {
          star.y = -star.size;
          star.x = Math.random() * this.width;
        }
      });
    });
  }
  
  private drawStars() {
    // Draw parallax star layers from back to front
    this.starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        // Calculate twinkle effect
        const twinkleOpacity = 0.5 + 0.5 * Math.sin(star.twinkle);
        const finalOpacity = layer.opacity * twinkleOpacity;
        
        // Draw star with simple glow effect instead of gradient
        this.ctx.save();
        
        // Outer glow using shadowBlur
        this.ctx.shadowBlur = star.size * 3;
        this.ctx.shadowColor = `rgba(150, 150, 255, ${finalOpacity * 0.5})`;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
        
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Center bright point
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
      });
    });
  }

  private drawUI() {
    const baseFontSize = Math.round(24 * this.scale);
    const smallFontSize = Math.round(18 * this.scale);
    const padding = Math.round(20 * this.scale);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillText(`Score: ${this.score}`, padding, padding * 2);
    
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
    
    this.ctx.fillText(`Lives: ${this.lives}`, padding, padding * 3.5);
    
    // Reset fill style for subsequent drawing
    this.ctx.fillStyle = 'white';
    
    // Ghosts destroyed counter and progress to next life
    const ghostsToNextLife = 100 - (this.ghostsDestroyed % 100);
    this.ctx.fillStyle = '#88FF88';
    this.ctx.font = `${smallFontSize}px 'Oxanium', sans-serif`;
    this.ctx.fillText(`Ghosts: ${this.ghostsDestroyed} (${ghostsToNextLife} to +1 life)`, padding, padding * 5);

    // Ammo counter
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(`Ammo: ${this.ammo.toLocaleString()}`, padding, padding * 6.2);
    
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

    // Boss spawn timer
    const bossTimeRemaining = this.forceBossSpawn
      ? Math.max(0, this.forceBossSpawnTimer)
      : Math.max(0, this.bossGhostInterval - this.bossGhostTimer);
    const bossSecondsRemaining = Math.ceil(bossTimeRemaining / 1000);
    this.ctx.fillStyle = '#FF9CCB';
    this.ctx.fillText(`Boss in: ${bossSecondsRemaining}s`, this.width / 2, padding * 5.2);
    
    // Sound indicator
    this.ctx.font = `${smallFontSize}px 'Oxanium', sans-serif`;
    const soundEnabled = this.soundManager.isSoundEnabled();
    this.ctx.fillStyle = soundEnabled ? '#88FF88' : '#FF8888';
    this.ctx.fillText(soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF', this.width / 2, padding * 6.4);
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
      if (this.speechInputActive) {
        this.ctx.fillText('TYPE YOUR SPEECH', this.width / 2, this.height / 2);
        this.ctx.font = `${Math.round(26 * this.scale)}px 'Oxanium', sans-serif`;
        this.ctx.fillStyle = '#88CCFF';
        this.ctx.fillText(this.speechDraft || '...', this.width / 2, this.height / 2 + 40 * this.scale);
        this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Press ESC to show bubble', this.width / 2, this.height / 2 + 80 * this.scale);
      } else {
        this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        this.ctx.font = `${baseFontSize}px 'Oxanium', sans-serif`;
        const resumeText = this.isMobile ? 'Tap to resume' : 'Press ESC to resume';
        this.ctx.fillText(resumeText, this.width / 2, this.height / 2 + 40 * this.scale);
      }
      this.ctx.textAlign = 'left';
    }
    // Game over UI handled by HTML overlay
  }

  private drawBossIncomingIndicator() {
    const bossOnScreen = this.ghosts.some(ghost => ghost.type === 'boss');
    if (bossOnScreen || this.state !== 'playing') {
      return;
    }

    const isForceIncoming = this.forceBossSpawn;
    const isTimedIncoming = (this.bossGhostInterval - this.bossGhostTimer) <= this.bossWarningThreshold;
    if (!isForceIncoming && !isTimedIncoming) {
      return;
    }

    if (this.nextBossSpawnX === null) {
      this.nextBossSpawnX = this.getRandomGhostSpawnX(160);
    }

    const x = this.nextBossSpawnX;
    const y = 24 * this.scale;
    const arrowSize = 20 * this.scale;

    this.ctx.save();
    this.ctx.fillStyle = '#FF69B4';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = Math.max(2, 2 * this.scale);

    this.ctx.beginPath();
    this.ctx.moveTo(x, y + arrowSize);
    this.ctx.lineTo(x - arrowSize * 0.6, y);
    this.ctx.lineTo(x + arrowSize * 0.6, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
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
      { key: 'E', action: 'End Game' },
      { key: 'S', action: 'Type Speech' },
      { key: 'V', action: 'Mute Sounds' },
      { key: 'ESC', action: 'Pause Game' },
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

  private makeGhostTalk() {
    if (this.ghosts.length === 0 || this.outlinedGhostPauseTimer > 0) {
      return;
    }

    const talkingGhosts = this.ghosts.filter(ghost => ghost.speechTimer > 0);
    if (talkingGhosts.length >= 2) {
      return;
    }

    const speaker = this.ghosts[Math.floor(Math.random() * this.ghosts.length)];
    const phrases = [
      'Boo!',
      'Hello!',
      'Run!',
      'Wee!',
      'Hola!',
      'Salut!',
      'Ciao!',
      'Konnichiwa!',
      'Ni hao!',
      'Namaste!'
    ];

    speaker.speak(phrases[Math.floor(Math.random() * phrases.length)]);
  }
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
  speed: number;
  opacity: number;
}
