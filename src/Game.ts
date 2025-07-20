import { Player } from './Player';
import { Ghost } from './Ghost';
import { Projectile } from './Projectile';
import { GameState } from './types';
import { VisualEffect, NukeEffect, ExplosionEffect } from './effects/VisualEffect';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
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
  
  private keys: Set<string> = new Set();
  
  // Nuke power-up
  private lastNuke: number = 0;
  private nukeCooldown: number = 60000; // 1 minute
  private nukeReady: boolean = false;
  
  // UI controls
  private showControls: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Calculate responsive dimensions
    this.calculateDimensions();
    
    this.player = new Player(this.width / 2, this.height - 60 * this.scale);
    this.player.width *= this.scale;
    this.player.height *= this.scale;
    this.player.speed *= this.scale;
    
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
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === 'Escape') {
        this.togglePause();
      }
      if (e.key.toLowerCase() === 'h') {
        this.showControls = !this.showControls;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
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
  }

  private togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
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
    // Update nuke availability
    if (currentTime - this.lastNuke >= this.nukeCooldown) {
      this.nukeReady = true;
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
    
    // Spawn ghosts
    this.ghostSpawnTimer += deltaTime * 1000;
    if (this.ghostSpawnTimer >= this.ghostSpawnInterval) {
      this.spawnGhost();
      this.ghostSpawnTimer = 0;
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Check for ghosts that have reached the bottom or hit player
    this.ghosts = this.ghosts.filter(ghost => {
      if (ghost.position.y + ghost.height / 2 >= this.height) {
        // Ghost escaped - lose a life
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'gameOver';
        }
        return false;
      }
      
      if (this.checkGhostPlayerCollision(ghost)) {
        // Ghost hit player - game over immediately
        this.state = 'gameOver';
        return false;
      }
      
      return true;
    });
  }

  private handleInput(currentTime: number) {
    // Player movement
    if (this.keys.has('ArrowLeft')) {
      this.player.moveLeft();
    } else if (this.keys.has('ArrowRight')) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }
    
    // Shooting
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
  }

  private fireNuke() {
    // Calculate blast radius (half screen height)
    const blastRadius = this.height / 2;
    
    // Create nuke visual effect
    this.visualEffects.push(new NukeEffect(this.player.position, blastRadius));
    
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

  private spawnGhost() {
    const x = Math.random() * (this.width - 40 * this.scale) + 20 * this.scale;
    const ghost = new Ghost(x, -40 * this.scale);
    ghost.width *= this.scale;
    ghost.height *= this.scale;
    ghost.speed *= this.scale;
    this.ghosts.push(ghost);
  }

  private checkCollisions() {
    // Check projectile-ghost collisions
    this.projectiles = this.projectiles.filter(projectile => {
      let hit = false;
      this.ghosts = this.ghosts.filter(ghost => {
        if (this.checkProjectileGhostCollision(projectile, ghost)) {
          this.score += 10;
          this.ghostsDestroyed++;
          
          // Check for life recovery every 100 ghosts
          if (this.ghostsDestroyed % 100 === 0) {
            this.lives++;
          }
          
          hit = true;
          return false;
        }
        return true;
      });
      return !hit;
    });
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

  private drawStars() {
    this.ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
      const x = (i * 137) % this.width;
      const y = (i * 89) % this.height;
      const size = (i % 3) + 1;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawUI() {
    const baseFontSize = Math.round(24 * this.scale);
    const smallFontSize = Math.round(18 * this.scale);
    const padding = Math.round(20 * this.scale);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${baseFontSize}px Arial`;
    this.ctx.fillText(`Score: ${this.score}`, padding, padding * 2);
    
    // Lives indicator
    this.ctx.fillText(`Lives: ${this.lives}`, padding, padding * 3.5);
    
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
      this.ctx.fillText('Press ESC to resume', this.width / 2, this.height / 2 + 40 * this.scale);
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

  private drawControlsLegend() {
    // Draw controls on the right side
    const boxWidth = Math.round(190 * this.scale);
    const boxHeight = Math.round(170 * this.scale);
    const x = this.width - boxWidth - Math.round(10 * this.scale);
    const startY = Math.round(40 * this.scale);
    const lineHeight = Math.round(30 * this.scale);
    const padding = Math.round(10 * this.scale);
    
    this.ctx.save();
    
    // Background for controls
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - padding, startY - Math.round(25 * this.scale), boxWidth, boxHeight);
    
    // Title
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `bold ${Math.round(20 * this.scale)}px Arial`;
    this.ctx.fillText('CONTROLS', x, startY);
    
    // Control items
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${Math.round(16 * this.scale)}px Arial`;
    
    const controls = [
      { key: '← →', action: 'Move' },
      { key: 'SPACE', action: 'Shoot' },
      { key: 'N', action: 'Nuke' },
      { key: 'ESC', action: 'Pause' },
      { key: 'H', action: 'Hide' }
    ];
    
    controls.forEach((control, index) => {
      const y = startY + (index + 1) * lineHeight;
      
      // Key
      this.ctx.fillStyle = '#88CCFF';
      this.ctx.font = `bold ${Math.round(14 * this.scale)}px monospace`;
      this.ctx.fillText(control.key, x, y);
      
      // Action
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.round(14 * this.scale)}px Arial`;
      this.ctx.fillText(control.action, x + Math.round(60 * this.scale), y);
    });
    
    this.ctx.restore();
  }
}