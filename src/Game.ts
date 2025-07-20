import { Player } from './Player';
import { Ghost } from './Ghost';
import { Projectile } from './Projectile';
import { GameState } from './types';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1200;
  private height: number = 800;
  
  private player: Player;
  private ghosts: Ghost[] = [];
  private projectiles: Projectile[] = [];
  
  private state: GameState = 'playing';
  private score: number = 0;
  private lastTime: number = 0;
  private lastShot: number = 0;
  private shotCooldown: number = 500; // 0.5 seconds
  
  private ghostSpawnTimer: number = 0;
  private ghostSpawnInterval: number = 2000; // 2 seconds
  
  private keys: Set<string> = new Set();
  
  // Nuke power-up
  private lastNuke: number = 0;
  private nukeCooldown: number = 60000; // 1 minute
  private nukeReady: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    this.player = new Player(this.width / 2, this.height - 60);
    
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === 'Escape') {
        this.togglePause();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
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
    
    // Check game over conditions
    this.ghosts.forEach(ghost => {
      if (ghost.position.y + ghost.height / 2 >= this.height ||
          this.checkGhostPlayerCollision(ghost)) {
        this.state = 'gameOver';
      }
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
    this.projectiles.push(projectile);
  }

  private fireNuke() {
    // Calculate blast radius (half screen height)
    const blastRadius = this.height / 2;
    
    // Remove all ghosts within blast radius
    this.ghosts = this.ghosts.filter(ghost => {
      const distance = Math.sqrt(
        Math.pow(ghost.position.x - this.player.position.x, 2) +
        Math.pow(ghost.position.y - this.player.position.y, 2)
      );
      
      if (distance <= blastRadius) {
        this.score += 50; // Bonus points for nuke kills
        return false;
      }
      return true;
    });
  }

  private spawnGhost() {
    const x = Math.random() * (this.width - 40) + 20;
    const ghost = new Ghost(x, -40);
    this.ghosts.push(ghost);
  }

  private checkCollisions() {
    // Check projectile-ghost collisions
    this.projectiles = this.projectiles.filter(projectile => {
      let hit = false;
      this.ghosts = this.ghosts.filter(ghost => {
        if (this.checkProjectileGhostCollision(projectile, ghost)) {
          this.score += 10;
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
    this.ctx.fillStyle = 'white';
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Score: ${this.score}`, 20, 40);
    
    // Nuke indicator
    if (this.nukeReady) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText('NUKE READY! (Press N)', this.width - 250, 40);
    }
    
    // Game state messages
    if (this.state === 'paused') {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
      this.ctx.font = '24px Arial';
      this.ctx.fillText('Press ESC to resume', this.width / 2, this.height / 2 + 40);
      this.ctx.textAlign = 'left';
    } else if (this.state === 'gameOver') {
      this.ctx.fillStyle = 'red';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
      this.ctx.fillStyle = 'white';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 40);
      this.ctx.fillText('Refresh to play again', this.width / 2, this.height / 2 + 80);
      this.ctx.textAlign = 'left';
    }
  }
}