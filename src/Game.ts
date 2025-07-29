import { Player } from './Player';
import { Ghost, GhostType } from './Ghost';
import { Projectile } from './Projectile';
import { GameState } from './types';
import { VisualEffect, NukeEffect, ExplosionEffect } from './effects/VisualEffect';
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
  
  private state: GameState = 'playing';
  private score: number = 0;
  private lives: number = 3;
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
      if (!this.soundInitialized) {
        await this.soundManager.init();
        this.soundInitialized = true;
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
      if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 's') {
        // Toggle mute with M or S
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
      
      // If game is paused, unpause on any touch
      if (this.state === 'paused') {
        this.state = 'playing';
        this.soundManager.playPause();
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
    
    // Update player
    this.player.update(deltaTime);
    
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
        // Ghost escaped - lose a life
        this.lives--;
        this.lifeLostTime = performance.now();
        this.soundManager.playLifeLost();
        if (this.lives <= 0) {
          this.state = 'gameOver';
          this.soundManager.playGameOver();
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
    const projectile = new Projectile(
      this.player.position.x,
      this.player.position.y
    );
    projectile.width *= this.scale;
    projectile.height *= this.scale;
    projectile.speed *= this.scale;
    this.projectiles.push(projectile);
    
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

  private spawnGhost(type: GhostType = 'normal') {
    let baseSize = 40;
    if (type === 'special') baseSize = 80;
    if (type === 'rainbow') baseSize = 120;
    if (type === 'boss') baseSize = 160; // 4x regular size
    
    const x = Math.random() * (this.width - baseSize * this.scale) + (baseSize / 2) * this.scale;
    const ghost = new Ghost(x, -baseSize * this.scale, type);
    ghost.width *= this.scale;
    ghost.height *= this.scale;
    ghost.baseSpeed *= this.scale;
    ghost.evasionSpeed *= this.scale;
    this.ghosts.push(ghost);
    
    // Play spawn sound
    this.soundManager.playGhostSpawn(type, x, this.width);
  }

  private checkCollisions() {
    // Check projectile-ghost collisions
    let bossGhostToExplode: Ghost | null = null;
    let rainbowGhostsToExplode: Ghost[] = [];
    
    this.projectiles = this.projectiles.filter(projectile => {
      let hit = false;
      this.ghosts = this.ghosts.filter(ghost => {
        if (this.checkProjectileGhostCollision(projectile, ghost)) {
          const isDestroyed = ghost.takeDamage();
          
          if (isDestroyed) {
            // Create explosion effect for destroyed ghost
            this.visualEffects.push(new ExplosionEffect(ghost.position, ghost.color === 'rainbow' ? '#FF00FF' : ghost.color));
            
            // Play destroyed sound
            this.soundManager.playGhostDestroyed(ghost.type);
            
            // Points based on ghost type
            let points = 10;
            if (ghost.type === 'rainbow') {
              points = 20; // Rainbow ghost destroyed
            } else if (ghost.type === 'special') {
              points = 50; // Original white ghost
            } else if (ghost.type === 'boss') {
              points = 100; // Boss ghost base points
            }
            
            this.score += points;
            this.ghostsDestroyed++;
            
            // Check for life recovery every 100 ghosts
            if (this.ghostsDestroyed % 100 === 0) {
              this.lives++;
              this.soundManager.playExtraLife();
            }
            
            // Mark for area damage handling after the filter completes
            if (ghost.type === 'rainbow') {
              rainbowGhostsToExplode.push(ghost);
            } else if (ghost.type === 'boss') {
              bossGhostToExplode = ghost;
            }
          } else {
            // Ghost survived hit
            // Create a smaller explosion effect for the hit
            const smallExplosion = new ExplosionEffect(ghost.position, ghost.color === 'rainbow' ? '#FF00FF' : ghost.color);
            smallExplosion.duration = 0.3; // Shorter duration
            this.visualEffects.push(smallExplosion);
            
            // Play hit sound
            this.soundManager.playGhostHit();
            
            // Points for hitting but not destroying
            if (ghost.type === 'rainbow') {
              this.score += 30; // Rainbow ghost hit
            } else {
              this.score += 25; // Special ghost hit
            }
          }
          
          hit = true;
          return !isDestroyed; // Keep ghost if not destroyed
        }
        return true;
      });
      return !hit;
    });
    
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
    
    // Draw game objects
    if (this.state !== 'gameOver') {
      this.player.render(this.ctx);
      this.ghosts.forEach(ghost => ghost.render(this.ctx));
      this.projectiles.forEach(projectile => projectile.render(this.ctx));
      this.visualEffects.forEach(effect => effect.render(this.ctx));
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
    this.ctx.font = `${baseFontSize}px Arial`;
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
    this.ctx.font = `${smallFontSize}px Arial`;
    this.ctx.fillText(`Ghosts: ${this.ghostsDestroyed} (${ghostsToNextLife} to +1 life)`, padding, padding * 5);
    
    // Reset font for other UI elements
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px Arial`;
    
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
    this.ctx.font = `${smallFontSize}px Arial`;
    const soundEnabled = this.soundManager.isSoundEnabled();
    this.ctx.fillStyle = soundEnabled ? '#88FF88' : '#FF8888';
    this.ctx.fillText(soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF', this.width / 2, padding * 6);
    this.ctx.font = `${baseFontSize}px Arial`;
    
    this.ctx.textAlign = 'left';
    
    // Controls legend
    if (this.showControls) {
      this.drawControlsLegend();
    }
    
    // Game state messages
    if (this.state === 'paused') {
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.round(48 * this.scale)}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
      this.ctx.font = `${baseFontSize}px Arial`;
      const resumeText = this.isMobile ? 'Tap to resume' : 'Press ESC to resume';
      this.ctx.fillText(resumeText, this.width / 2, this.height / 2 + 40 * this.scale);
      this.ctx.textAlign = 'left';
    } else if (this.state === 'gameOver') {
      this.ctx.fillStyle = 'red';
      this.ctx.font = `${Math.round(48 * this.scale)}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${baseFontSize}px Arial`;
      this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 40 * this.scale);
      this.ctx.fillText('Refresh to play again', this.width / 2, this.height / 2 + 80 * this.scale);
      this.ctx.textAlign = 'left';
    }
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
    this.ctx.font = `bold ${Math.round(this.isMobile ? 28 * this.scale : 20 * this.scale)}px Arial`;
    this.ctx.fillText('CONTROLS', x, startY);
    
    // Control items
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${Math.round(this.isMobile ? 22 * this.scale : 16 * this.scale)}px Arial`;
    
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
      { key: 'ESC', action: 'Pause' },
      { key: 'H', action: 'Hide' },
      { key: 'S', action: 'Sound' }
    ];
    
    controls.forEach((control, index) => {
      const y = startY + (index + 1) * lineHeight;
      
      // Key
      this.ctx.fillStyle = '#88CCFF';
      this.ctx.font = `bold ${Math.round(this.isMobile ? 20 * this.scale : 14 * this.scale)}px monospace`;
      this.ctx.fillText(control.key, x, y);
      
      // Action
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.round(this.isMobile ? 20 * this.scale : 14 * this.scale)}px Arial`;
      this.ctx.fillText(control.action, x + Math.round(this.isMobile ? 120 * this.scale : 60 * this.scale), y);
    });
    
    this.ctx.restore();
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